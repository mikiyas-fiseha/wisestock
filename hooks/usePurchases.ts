
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/activityLogger';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

type Purchase = Database['public']['Tables']['purchases']['Row'];
type PurchaseItem = { product_id: string; quantity: number; unit_cost: number };

export function usePurchases() {
    const { company, user, branch } = useAuth();
    const queryClient = useQueryClient();

    const fetchPurchases = async () => {
        if (!company?.id) return [];

        let query = supabase
            .from('purchases')
            .select('id, purchase_date, invoice_number, total_amount, amount_paid, payment_status, notes, branch_id, supplier_id, created_at, supplier:suppliers(name)')
            .eq('company_id', company.id)
            .order('created_at', { ascending: false })
            .limit(200);

        if (branch?.id) {
            query = query.eq('branch_id', branch.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    };

    const fetchPurchaseById = async (id: string) => {
        const { data, error } = await supabase
            .from('purchases')
            .select(`
                *,
                profiles(*),
                supplier:suppliers(*),
                items:purchase_items(
                    *,
                    product:products(name, primary_sku)
                ),
                payments:supplier_payments(
                    id,
                    amount,
                    payment_date,
                    method,
                    notes,
                    receipt_url,
                    created_at
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    };

    const queries = {
        list: useQuery({
            queryKey: ['purchases', company?.id, branch?.id],
            queryFn: fetchPurchases,
            enabled: !!company?.id,
        }),
        detail: (id: string) => useQuery({
            queryKey: ['purchase', id],
            queryFn: () => fetchPurchaseById(id),
            enabled: !!id,
        }),
    };

    const mutations = {
        create: useMutation({
            mutationFn: async (params: {
                supplier_id?: string;
                purchase_date: Date;
                invoice_number: string;
                total_amount: number;
                amount_paid: number;
                payment_method: string;
                notes: string;
                items: PurchaseItem[];
                receipt_url?: string | null;
            }) => {
                if (!company?.id || !user?.id) throw new Error("Missing company or user ID");

                // Call the RPC function
                const { data: purchaseId, error } = await supabase.rpc('create_purchase', {
                    p_company_id: company.id,
                    p_supplier_id: params.supplier_id || null,
                    p_purchase_date: params.purchase_date.toISOString(),
                    p_invoice_number: params.invoice_number,
                    p_total_amount: params.total_amount,
                    p_amount_paid: params.amount_paid,
                    p_payment_method: params.payment_method,
                    p_notes: params.notes,
                    p_items: params.items,
                    p_created_by: user.id,
                    p_branch_id: branch?.id || null
                });

                if (error) throw error;

                // If a receipt URL was provided, update the record immediately
                if (params.receipt_url && purchaseId) {
                    const { error: updateError } = await supabase
                        .from('purchases')
                        .update({ receipt_url: params.receipt_url })
                        .eq('id', purchaseId);

                    if (updateError) console.error('Error updating receipt_url:', updateError);
                }

                await logActivity({
                    userId: user.id || 'unknown',
                    userName: user?.name || 'User',
                    companyId: company.id,
                    action: 'created_purchase',
                    entityType: 'purchase',
                    entityId: purchaseId,
                    entityLabel: `Invoice ${params.invoice_number}`,
                    details: { total_amount: params.total_amount, amount_paid: params.amount_paid }
                });

                return purchaseId;
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['purchases'] });
                queryClient.invalidateQueries({ queryKey: ['products'] });
                queryClient.invalidateQueries({ queryKey: ['product-detail'] }); // Refresh stock on product detail screen
                queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            },
            onError: (error: any) => {
                Alert.alert('Error', error.message);
            },
        }),
    };

    return {
        purchases: queries.list.data,
        isLoading: queries.list.isLoading,
        getPurchase: queries.detail,
        createPurchase: mutations.create.mutateAsync,
        isCreating: mutations.create.isPending,
    };
}
