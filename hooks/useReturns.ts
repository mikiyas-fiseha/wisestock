import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/activityLogger';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReturnItem {
    id: string;
    return_id: string;
    product_id: string | null;
    variant_id: string | null;
    product_name: string | null;
    quantity: number;
    unit_price: number;
    unit_cost: number;
    total_amount: number;
    cost_amount: number;
}

export interface ReturnRecord {
    id: string;
    company_id: string;
    branch_id: string | null;
    type: 'customer_return' | 'supplier_return';
    reference_type: 'sale' | 'purchase' | null;
    reference_id: string | null;
    customer_id: string | null;
    supplier_id: string | null;
    total_amount: number;
    refund_method: 'cash' | 'ar_adjustment' | 'store_credit' | 'ap_adjustment';
    reason: string | null;
    notes: string | null;
    status: 'completed' | 'cancelled';
    created_by: string | null;
    created_at: string;
    items?: ReturnItem[];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Returns linked to a specific sale */
export function useSaleReturns(saleId: string | null | undefined) {
    return useQuery({
        queryKey: ['sale-returns', saleId],
        queryFn: async (): Promise<ReturnRecord[]> => {
            if (!saleId) return [];
            const { data, error } = await supabase
                .from('returns')
                .select('*, return_items(*)')
                .eq('reference_id', saleId)
                .eq('type', 'customer_return')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as ReturnRecord[];
        },
        enabled: !!saleId,
    });
}

/** Returns linked to a specific purchase */
export function usePurchaseReturns(purchaseId: string | null | undefined) {
    return useQuery({
        queryKey: ['purchase-returns', purchaseId],
        queryFn: async (): Promise<ReturnRecord[]> => {
            if (!purchaseId) return [];
            const { data, error } = await supabase
                .from('returns')
                .select('*, return_items(*)')
                .eq('reference_id', purchaseId)
                .eq('type', 'supplier_return')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as ReturnRecord[];
        },
        enabled: !!purchaseId,
    });
}

/** All returns for a company with optional type filter */
export function useAllReturns(type?: 'customer_return' | 'supplier_return') {
    const { company } = useAuth();
    return useQuery({
        queryKey: ['all-returns', company?.id, type],
        queryFn: async (): Promise<ReturnRecord[]> => {
            if (!company?.id) return [];
            let query = supabase
                .from('returns')
                .select('*, return_items(*)')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false })
                .limit(100);
            if (type) query = query.eq('type', type);
            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as ReturnRecord[];
        },
        enabled: !!company?.id,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface ReturnItemInput {
    product_id: string;
    variant_id?: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    unit_cost: number;
}

export interface CreateSaleReturnInput {
    saleId: string;
    items: ReturnItemInput[];
    refundMethod: 'cash' | 'ar_adjustment' | 'store_credit';
    refundAmount: number;
    reason?: string;
    notes?: string;
    branchId?: string;
}

export interface CreatePurchaseReturnInput {
    purchaseId: string;
    items: ReturnItemInput[];
    refundMethod: 'cash' | 'ap_adjustment';
    refundAmount: number;
    reason?: string;
    notes?: string;
    branchId?: string;
}

/** Create a sale (customer) return — calls process_return RPC */
export function useCreateSaleReturn() {
    const queryClient = useQueryClient();
    const { company, user } = useAuth();
    return useMutation({
        mutationFn: async (input: CreateSaleReturnInput) => {
            const { data, error } = await supabase.rpc('process_return', {
                p_sale_id: input.saleId,
                p_items: input.items,
                p_refund_method: input.refundMethod,
                p_refund_amount: input.refundAmount,
                p_reason: input.reason ?? null,
                p_notes: input.notes ?? null,
                p_branch_id: input.branchId ?? null,
            });
            if (error) throw error;

            await logActivity({
                userId: user?.id || 'unknown',
                userName: user?.name || 'User',
                companyId: company?.id || 'unknown',
                action: 'created_return',
                entityType: 'return',
                entityId: data,
                entityLabel: `Return for Sale`,
                details: { amount: input.refundAmount, method: input.refundMethod }
            });

            return data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['sale_detail', variables.saleId] });
            queryClient.invalidateQueries({ queryKey: ['sale-returns', variables.saleId] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
}

/** Create a purchase (supplier) return — calls process_purchase_return RPC */
export function useCreatePurchaseReturn() {
    const queryClient = useQueryClient();
    const { company, user } = useAuth();
    return useMutation({
        mutationFn: async (input: CreatePurchaseReturnInput) => {
            const { data, error } = await supabase.rpc('process_purchase_return', {
                p_purchase_id: input.purchaseId,
                p_items: input.items,
                p_refund_method: input.refundMethod,
                p_refund_amount: input.refundAmount,
                p_reason: input.reason ?? null,
                p_notes: input.notes ?? null,
                p_branch_id: input.branchId ?? null,
            });
            if (error) throw error;

            await logActivity({
                userId: user?.id || 'unknown',
                userName: user?.name || 'User',
                companyId: company?.id || 'unknown',
                action: 'created_return',
                entityType: 'return',
                entityId: data,
                entityLabel: `Return for Purchase`,
                details: { amount: input.refundAmount, method: input.refundMethod }
            });

            return data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['purchases'] });
            queryClient.invalidateQueries({ queryKey: ['purchase-returns', variables.purchaseId] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
}
