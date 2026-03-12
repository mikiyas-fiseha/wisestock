import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface InventoryLog {
    id: string;
    stock_id: string;
    product_id: string;
    type: string;
    quantity: number;
    previous_stock: number;
    new_stock: number;
    reference_type: string;
    reference_id: string;
    created_at: string;
    created_by: string | null;
    notes: string | null;
    company_id: string;
    branch_id: string | null;
}

export function useInventoryLogs(productId: string, page: number = 0, pageSize: number = 10) {
    const { company, branch } = useAuth();

    return useQuery({
        queryKey: ['inventory-logs', productId, branch?.id, page, pageSize],
        queryFn: async () => {
            if (!company?.id || !productId) return { data: [], count: 0 };

            const from = page * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from('stock_movements')
                .select('*', { count: 'exact' })
                .eq('product_id', productId)
                .eq('company_id', company.id)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (branch?.id) {
                query = query.eq('branch_id', branch.id);
            }

            const { data, error, count } = await query;
            if (error) throw error;

            const mapped = (data || []).map(row => ({
                ...row,
                quantity: row.qty_change,
                reference_id: row.reason,
            }));

            return { data: mapped || [], count: count || 0 };
        },
        enabled: !!company?.id && !!productId,
    });
}

export function useAdjustStock() {
    const { company, user, branch } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            productId,
            adjustmentType,
            quantity,
            reason,
            notes,
        }: {
            productId: string;
            adjustmentType: 'add' | 'remove';
            quantity: number;
            reason: string;
            notes?: string;
        }) => {
            if (!company?.id || !user?.id) throw new Error('Missing company or user ID');

            // 1. Get current stock for logging purposes (optional but good for history tables)
            let bpQuery = supabase
                .from('branch_products')
                .select('stock, branch_id')
                .eq('product_id', productId);
            if (branch?.id) bpQuery = bpQuery.eq('branch_id', branch.id);
            const { data: bpRow, error: bpErr } = await bpQuery.single();

            if (bpErr || !bpRow) throw new Error('Could not find stock record');

            const currentQty = Number(bpRow.stock) || 0;
            const change = adjustmentType === 'add' ? quantity : -quantity;
            const newQty = currentQty + change;

            if (newQty < 0) throw new Error('Stock cannot go below zero');

            // 2. Record the movement in BOTH history tables
            // NOTE: The database has a trigger 'update_stock_after_movement' on 'stock_movements'
            // that automatically updates branch_products.stock. We do NOT update it manually here
            // to avoid double-deduction.

            const movementData = {
                product_id: productId,
                company_id: company.id,
                branch_id: bpRow.branch_id || branch?.id || null,
                type: 'adjustment',
                qty_change: change,
                user_id: user.id,
                reason: notes || `${adjustmentType === 'add' ? 'Added' : 'Removed'} ${quantity} — ${reason}`,
            };

            const transactionData = {
                product_id: productId,
                company_id: company.id,
                branch_id: bpRow.branch_id || branch?.id || null,
                type: 'adjustment',
                quantity: change,
                previous_stock: currentQty,
                new_stock: newQty,
                reference_type: reason,
                notes: notes || `${adjustmentType === 'add' ? 'Added' : 'Removed'} ${quantity} — ${reason}`,
                created_by: user.id,
            };

            const [moveRes, transRes] = await Promise.all([
                supabase.from('stock_movements').insert(movementData),
                supabase.from('stock_transactions').insert(transactionData)
            ]);

            if (moveRes.error) throw moveRes.error;
            if (transRes.error) throw transRes.error;

            return { previousStock: currentQty, newStock: newQty };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-logs'] });
        },
    });
}
