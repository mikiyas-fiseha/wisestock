import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const toSupa = (obj: any) => { const { is_synced, ...rest } = obj; return rest; };

export const useCustomers = (search?: string, filters?: any) => {
    const { company } = useAuth();
    return useQuery({
        queryKey: ['customers', company?.id, search, filters],
        queryFn: async () => {
            if (!company?.id) return [];
            
            let query = supabase.from('customers').select('*').eq('company_id', company.id).order('name');
            if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
            if (filters?.balance === 'outstanding') query = query.gt('current_balance', 0);
            if (filters?.customer_type && filters.customer_type !== 'all') query = query.eq('customer_type', filters.customer_type);
            if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
            
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!company?.id,
    });
};

export const useAddCustomer = () => {
    const queryClient = useQueryClient();
    const { company } = useAuth();
    return useMutation({
        mutationFn: async (customerData: any) => {
            if (!company?.id) throw new Error('No company ID');
            const uuid = require('react-native-uuid').default;
            const now = new Date().toISOString();
            const newId = customerData.id || uuid.v4();
            const newCustomer = { 
                id: newId, 
                company_id: company.id, 
                ...customerData, 
                current_balance: customerData.current_balance || 0, 
                total_spent: customerData.total_spent || 0, 
                created_at: now, 
                updated_at: now 
            };

            const { error } = await supabase.from('customers').insert(toSupa(newCustomer));
            if (error) throw error;
            
            return newCustomer;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); },
    });
};

export const useUpdateCustomer = () => {
    const queryClient = useQueryClient();
    const { company } = useAuth();
    return useMutation({
        mutationFn: async ({ id, ...updates }: any) => {
            if (!company?.id) throw new Error('No company ID');
            const now = new Date().toISOString();
            const payload = { ...updates, id, updated_at: now };

            const { error } = await supabase.from('customers').update(toSupa(payload)).eq('id', id);
            if (error) throw error;
            
            return updates;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['customer', variables.id] });
        },
    });
};

export const useCustomerDetail = (customerId: string) => {
    const { company } = useAuth();
    return useQuery({
        queryKey: ['customer', customerId],
        queryFn: async () => {
            if (!company?.id || !customerId) return null;
            
            const { data: cust, error } = await supabase.from('customers').select('*').eq('id', customerId).single();
            if (error) throw error;
            
            const { data: salesData } = await supabase.from('sales').select('total_amount').eq('customer_id', customerId);
            return { 
                ...cust, 
                ordersCount: salesData?.length || 0, 
                totalPurchases: (salesData || []).reduce((s: number, r: any) => s + (Number(r.total_amount) || 0), 0) 
            };
        },
        enabled: !!company?.id && !!customerId,
    });
};

export const useCustomerHistory = (customerId: string, branchId?: string) => {
    const { company } = useAuth();
    return useQuery({
        queryKey: ['customer_history', customerId, branchId],
        queryFn: async () => {
            if (!company?.id || !customerId) return { sales: [], payments: [] };
            
            let q = supabase.from('sales').select(`*, branches(name)`).eq('customer_id', customerId).order('created_at', { ascending: false });
            if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId);
            
            const { data: salesData } = await q;
            const { data: paymentsData } = await supabase.from('payments').select(`*, profiles(full_name)`).eq('customer_id', customerId).order('created_at', { ascending: false });
            
            return { sales: salesData || [], payments: paymentsData || [] };
        },
        enabled: !!company?.id && !!customerId,
    });
};

export const useCollectPayment = () => {
    const queryClient = useQueryClient();
    const { company, user } = useAuth();

    return useMutation({
        mutationFn: async ({ customerId, amount, method, notes, receiptUrl, saleId }: any) => {
            if (!company?.id) throw new Error('No company ID');
            const uuid = require('react-native-uuid').default;
            const now = new Date().toISOString();
            const payAmount = parseFloat(amount.toString()) || 0;
            const newPayment = { 
                id: uuid.v4(), 
                created_at: now, 
                company_id: company.id, 
                customer_id: customerId, 
                sale_id: saleId || null, 
                amount: payAmount, 
                method, 
                notes: notes || null, 
                receipt_url: receiptUrl || null, 
                created_by: user?.id || null 
            };

            const { error: pErr } = await supabase.from('payments').insert(toSupa(newPayment));
            if (pErr) throw pErr;
            
            const { data: cust } = await supabase.from('customers').select('current_balance').eq('id', customerId).single();
            if (cust) {
                await supabase.from('customers').update({ 
                    current_balance: (Number(cust.current_balance) || 0) - payAmount 
                }).eq('id', customerId);
            }
            
            if (saleId) {
                const { data: sale } = await supabase.from('sales').select('paid_amount, total_amount').eq('id', saleId).single();
                if (sale) {
                    const newPaid = (Number(sale.paid_amount) || 0) + payAmount;
                    const newDue = (Number(sale.total_amount) || 0) - newPaid;
                    await supabase.from('sales').update({ 
                        paid_amount: newPaid, 
                        balance_due: newDue, 
                        payment_status: newDue <= 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'unpaid') 
                    }).eq('id', saleId);
                }
            }
            
            return newPayment;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] });
            queryClient.invalidateQueries({ queryKey: ['customer_history', variables.customerId] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }
    });
};
