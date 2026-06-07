import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface SaleFilters {
    status?: string;
    paymentMethod?: string;
    dateRange?: 'today' | 'week' | 'month' | 'all';
    dateFrom?: string;
    dateTo?: string;
}

const toSupa = (obj: any) => {
    const { is_synced, ...rest } = obj;
    return rest;
};

function getDateRangeFilter(range?: string): { from?: string; to?: string } {
    if (!range || range === 'all') return {};
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const to = now.toISOString();
    
    if (range === 'today') {
        const from = d.toISOString();
        return { from, to };
    }
    if (range === 'week') {
        const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        return { from, to };
    }
    if (range === 'month') {
        const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        return { from, to };
    }
    return {};
}

export const useSales = (search?: string, filters?: SaleFilters) => {
    const { company, branch } = useAuth();
    return useQuery({
        queryKey: ['sales', company?.id, branch?.id, search, filters],
        queryFn: async () => {
            if (!company?.id) return [];

            const { from, to } = filters?.dateRange
                ? getDateRangeFilter(filters.dateRange)
                : { from: filters?.dateFrom, to: filters?.dateTo };

            let query = supabase
                .from('sales')
                .select(`id, created_at, total_amount, type, status, payment_method, branch_id, customer_id, subtotal, tax, discount, paid_amount, balance_due, due_date, notes, customers(name, phone)`)
                .eq('company_id', company.id)
                .order('created_at', { ascending: false })
                .limit(200);

            if (branch?.id) query = query.eq('branch_id', branch.id);
            if (filters?.status) query = query.eq('status', filters.status);
            if (filters?.paymentMethod && filters.paymentMethod !== 'all') query = query.eq('type', filters.paymentMethod);
            if (from) query = query.gte('created_at', from);
            if (to) query = query.lte('created_at', to);
            if (search) query = query.or(`id.ilike.%${search}%`);

            const { data, error } = await query;
            if (error) throw error;
            
            return (data || []).map((s: any) => ({ 
                ...s, 
                payment_method: s.type || s.payment_method || 'cash' 
            }));
        },
        enabled: !!company?.id,
    });
};

export const useSaleDetail = (saleId: string | null) => {
    return useQuery({
        queryKey: ['sale_detail', saleId],
        queryFn: async () => {
            if (!saleId) return null;
            
            const { data, error } = await supabase
                .from('sales')
                .select(`*, customers(name, phone), profiles!sales_created_by_fkey(full_name), sale_items(*), payments(*)`)
                .eq('id', saleId)
                .single();

            if (error) {
                console.error('useSaleDetail Supabase error:', error);
                return null;
            }

            return {
                sale: { ...data, payment_method: data?.type, profiles: data?.profiles },
                items: data?.sale_items || [],
                payments: data?.payments || [],
            };
        },
        enabled: !!saleId,
    });
};

export const useProcessSale = () => {
    const queryClient = useQueryClient();
    const { company, branch, user } = useAuth();

    return useMutation({
        mutationFn: async ({ cart, customer, paymentMethod, amountPaid, total, subtotal, tax, discount, note }: any) => {
            if (!company?.id) throw new Error('No company ID');

            const { logActivity } = await import('@/lib/activityLogger');
            const uuid = require('react-native-uuid').default;
            const paid = parseFloat(amountPaid) || 0;
            const newSaleId = uuid.v4();
            const now = new Date().toISOString();

            const newSale = {
                id: newSaleId,
                created_at: now,
                updated_at: now,
                company_id: company.id,
                branch_id: branch?.id || null,
                customer_id: customer?.id || null,
                total_amount: total,
                subtotal: subtotal || 0,
                tax: tax || 0,
                discount: discount || 0,
                paid_amount: paid,
                balance_due: total - paid,
                payment_status: paid >= total ? 'paid' : (paid > 0 ? 'partial' : 'unpaid'),
                type: paymentMethod,
                status: 'completed',
                notes: note || null,
                created_by: user?.id || null
            };

            const { error: saleErr } = await supabase.from('sales').insert(toSupa(newSale));
            if (saleErr) throw saleErr;

            for (const item of cart) {
                const itemData = { 
                    id: uuid.v4(), 
                    company_id: company.id, 
                    sale_id: newSaleId, 
                    product_id: item.id, 
                    quantity: item.quantity, 
                    unit_price: item.price, 
                    cost_price: item.cost_price || 0, 
                    total_price: item.price * item.quantity, 
                    product_name: item.name 
                };
                const { error: itemErr } = await supabase.from('sale_items').insert(itemData);
                if (itemErr) throw itemErr;

                if (branch?.id) {
                    const { data: bpData } = await supabase.from('branch_products').select('id, stock').eq('branch_id', branch.id).eq('product_id', item.id).maybeSingle();
                    if (bpData) {
                        await supabase.from('branch_products').update({ stock: (bpData.stock || 0) - item.quantity }).eq('id', bpData.id);
                    }

                    await supabase.from('stock_movements').insert({
                        id: uuid.v4(),
                        created_at: now,
                        company_id: company.id,
                        branch_id: branch.id,
                        product_id: item.id,
                        qty_change: -item.quantity,
                        type: 'sale',
                        reason: `Sale #${newSaleId.slice(0, 8)}`,
                        user_id: user?.id || null
                    });
                }
            }

            const payment = { 
                id: uuid.v4(), 
                company_id: company.id, 
                created_at: now, 
                sale_id: newSaleId, 
                customer_id: customer?.id || null, 
                amount: paid, 
                method: paymentMethod, 
                notes: note || null, 
                created_by: user?.id || null 
            };
            const { error: payErr } = await supabase.from('payments').insert(payment);
            if (payErr) throw payErr;

            if (customer?.id && (total - paid) > 0) {
                const { data: cust } = await supabase.from('customers').select('current_balance, total_spent').eq('id', customer.id).single();
                if (cust) {
                    await supabase.from('customers').update({ 
                        current_balance: (Number(cust.current_balance) || 0) + (total - paid), 
                        total_spent: (Number(cust.total_spent) || 0) + total, 
                        last_purchase_date: now 
                    }).eq('id', customer.id);
                }
            }

            await logActivity({
                userId: user?.id || 'unknown',
                userName: user?.name || 'User',
                companyId: company.id,
                action: 'created_sale',
                entityType: 'sale',
                entityId: newSaleId,
                entityLabel: `Sale #${newSaleId.slice(0, 8)}`,
                details: { totalAmount: total, items: cart.length, customerName: customer?.name }
            });

            return newSale;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
    });
};

export const useCancelSale = () => {
    const queryClient = useQueryClient();
    const { company, branch, user } = useAuth();

    return useMutation({
        mutationFn: async ({ saleId, items, customerId, totalAmount, paidAmount }: any) => {
            if (!company?.id) throw new Error('No company ID');

            const { logActivity } = await import('@/lib/activityLogger');
            const uuid = require('react-native-uuid').default;
            const now = new Date().toISOString();

            const { error } = await supabase.from('sales').update({ 
                status: 'cancelled', 
                balance_due: 0, 
                updated_at: now 
            }).eq('id', saleId);
            if (error) throw error;

            for (const item of items) {
                if (branch?.id) {
                    const { data: bpData } = await supabase.from('branch_products').select('id, stock').eq('branch_id', branch.id).eq('product_id', item.product_id).maybeSingle();
                    if (bpData) {
                        await supabase.from('branch_products').update({ stock: (bpData.stock || 0) + item.quantity }).eq('id', bpData.id);
                    }
                    
                    await supabase.from('stock_movements').insert({
                        id: uuid.v4(),
                        created_at: now,
                        company_id: company.id,
                        branch_id: branch.id,
                        product_id: item.product_id,
                        qty_change: item.quantity,
                        type: 'return',
                        reason: `Reversal Sale #${saleId.slice(0, 8)}`,
                        user_id: user?.id || null
                    });
                }
            }

            const creditAmount = (totalAmount - paidAmount);
            if (customerId && creditAmount > 0) {
                const { data: cust } = await supabase.from('customers').select('current_balance').eq('id', customerId).single();
                if (cust) {
                    await supabase.from('customers').update({ 
                        current_balance: (Number(cust.current_balance) || 0) - creditAmount 
                    }).eq('id', customerId);
                }
            }

            await logActivity({
                userId: user?.id || 'unknown',
                userName: user?.name || 'User',
                companyId: company.id,
                action: 'cancelled_sale',
                entityType: 'sale',
                entityId: saleId,
                entityLabel: `Sale #${saleId.slice(0, 8)}`,
                details: { totalAmount, paidAmount }
            });

            return { success: true };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['sale_detail', variables.saleId] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }
    });
};
