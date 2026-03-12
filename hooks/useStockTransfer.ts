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

            // 1. Get source branch_products
            const { data: sourceBP, error: sourceErr } = await supabase
                .from('branch_products')
                .select('id, stock')
                .eq('product_id', productId)
                .eq('branch_id', fromBranchId)
                .single();

            if (sourceErr || !sourceBP) throw new Error('Product not found in source branch');

            const sourceStock = Number(sourceBP.stock) || 0;
            if (sourceStock < quantity) throw new Error(`Insufficient stock. Available: ${sourceStock}`);

            // 2. Get or create destination branch_products
            let { data: destBP } = await supabase
                .from('branch_products')
                .select('id, stock')
                .eq('product_id', productId)
                .eq('branch_id', toBranchId)
                .single();

            if (!destBP) {
                // Create branch_products row for destination
                const { data: newBP, error: createErr } = await supabase
                    .from('branch_products')
                    .insert({
                        product_id: productId,
                        branch_id: toBranchId,
                        stock: 0,
                        company_id: company.id,
                    })
                    .select()
                    .single();

                if (createErr) throw new Error('Could not create stock record for destination branch');
                destBP = newBP;
            }

            if (!destBP) throw new Error('Failed to get destination branch stock record');

            const destStock = Number(destBP.stock) || 0;

            // 3. Update source: decrease stock
            const { error: srcUpdateErr } = await supabase
                .from('branch_products')
                .update({ stock: sourceStock - quantity })
                .eq('id', sourceBP.id);

            if (srcUpdateErr) throw srcUpdateErr;

            // 4. Update destination: increase stock
            const { error: destUpdateErr } = await supabase
                .from('branch_products')
                .update({ stock: destStock + quantity })
                .eq('id', destBP.id);

            if (destUpdateErr) throw destUpdateErr;

            // 5. Log transfer in stock_transactions (two entries)
            const fromBranch = allBranches.find(b => b.id === fromBranchId);
            const toBranch = allBranches.find(b => b.id === toBranchId);
            const transferNote = notes || `Transfer: ${fromBranch?.name || 'Branch'} → ${toBranch?.name || 'Branch'}`;

            await supabase.from('stock_transactions').insert([
                {
                    product_id: productId,
                    type: 'transfer_out',
                    quantity: -quantity,
                    previous_stock: sourceStock,
                    new_stock: sourceStock - quantity,
                    reference_type: 'transfer',
                    notes: transferNote,
                    company_id: company.id,
                    created_by: user.id,
                    branch_id: fromBranchId,
                },
                {
                    product_id: productId,
                    type: 'transfer_in',
                    quantity: quantity,
                    previous_stock: destStock,
                    new_stock: destStock + quantity,
                    reference_type: 'transfer',
                    notes: transferNote,
                    company_id: company.id,
                    created_by: user.id,
                    branch_id: toBranchId,
                },
            ]);

            return { from: sourceStock - quantity, to: destStock + quantity };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-logs'] });
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
