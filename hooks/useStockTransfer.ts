import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface StockTransfer {
    id: string;
    from_branch_id: string;
    to_branch_id: string;
    product_id: string;
    quantity: number;
    notes?: string;
    created_by: string;
    created_at: string;
    company_id: string;
}

export function useStockTransfer() {
    const { company, user, allBranches } = useAuth();
    const queryClient = useQueryClient();

    const transferMutation = useMutation({
        mutationFn: async ({
            productId,
            fromBranchId,
            toBranchId,
            quantity,
            notes,
        }: {
            productId: string;
            fromBranchId: string;
            toBranchId: string;
            quantity: number;
            notes?: string;
        }) => {
            if (!company?.id || !user?.id) throw new Error('Missing company or user ID');
            if (fromBranchId === toBranchId) throw new Error('Source and destination must be different');
            if (quantity <= 0) throw new Error('Quantity must be positive');

            // 1. Verify source has enough stock
            const { data: sourceBP, error: sourceErr } = await supabase
                .from('branch_products')
                .select('id, stock')
                .eq('product_id', productId)
                .eq('branch_id', fromBranchId)
                .single();

            if (sourceErr || !sourceBP) throw new Error('Product not found in source branch');

            const sourceStock = Number(sourceBP.stock) || 0;
            if (sourceStock < quantity) throw new Error(`Insufficient stock. Available: ${sourceStock}`);

            // 2. Get destination stock for history logging
            const { data: destBP } = await supabase
                .from('branch_products')
                .select('id, stock')
                .eq('product_id', productId)
                .eq('branch_id', toBranchId)
                .maybeSingle();

            const destStock = Number(destBP?.stock) || 0;

            // 3. Insert stock_movements — the DB trigger handles updating branch_products automatically
            const fromBranch = allBranches.find(b => b.id === fromBranchId);
            const toBranch = allBranches.find(b => b.id === toBranchId);
            const transferNote = notes || `Transfer: ${fromBranch?.name || 'Branch'} → ${toBranch?.name || 'Branch'}`;

            const movements = [
                {
                    product_id: productId,
                    company_id: company.id,
                    branch_id: fromBranchId,
                    type: 'transfer_out',
                    qty_change: -quantity,
                    user_id: user.id,
                    reason: transferNote,
                },
                {
                    product_id: productId,
                    company_id: company.id,
                    branch_id: toBranchId,
                    type: 'transfer_in',
                    qty_change: quantity,
                    user_id: user.id,
                    reason: transferNote,
                },
            ];

            const { error: moveErr } = await supabase.from('stock_movements').insert(movements);
            if (moveErr) throw moveErr;

            return { from: sourceStock - quantity, to: destStock + quantity };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-logs'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
            queryClient.invalidateQueries({ queryKey: ['product-branch-breakdown'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['branch-stock'] });
        },
    });

    return {
        transfer: transferMutation.mutateAsync,
        isTransferring: transferMutation.isPending,
        transferError: transferMutation.error,
    };
}

export function useBranchStock(productId: string) {
    const { company, allBranches } = useAuth();

    return useQuery({
        queryKey: ['branch-stock', productId, company?.id],
        queryFn: async () => {
            if (!company?.id || !productId) return [];

            const { data, error } = await supabase
                .from('branch_products')
                .select('branch_id, stock')
                .eq('product_id', productId);

            if (error) throw error;

            return allBranches.map(branch => {
                const bp = data?.find(d => d.branch_id === branch.id);
                return {
                    branchId: branch.id,
                    branchName: branch.name,
                    isMain: branch.isMain,
                    stock: Number(bp?.stock) || 0,
                };
            });
        },
        enabled: !!company?.id && !!productId,
    });
}
