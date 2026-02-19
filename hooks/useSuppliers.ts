
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

type Supplier = Database['public']['Tables']['suppliers']['Row'];
type SupplierInsert = Database['public']['Tables']['suppliers']['Insert'];
type SupplierUpdate = Database['public']['Tables']['suppliers']['Update'];
type SupplierPayment = Database['public']['Tables']['supplier_payments']['Row'];

export function useSuppliers() {
    const { company, user } = useAuth();
    const queryClient = useQueryClient();

    const fetchSuppliers = async () => {
        if (!company?.id) return [];

        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('company_id', company.id)
            .order('name');

        if (error) throw error;
        return data;
    };

    const fetchSupplierById = async (id: string) => {
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    };

    const fetchSupplierPayments = async (id: string) => {
        const { data, error } = await supabase
            .from('supplier_payments')
            .select('*')
            .eq('supplier_id', id)
            .order('payment_date', { ascending: false });

        if (error) throw error;
        return data;
    };

    const queries = {
        list: useQuery({
            queryKey: ['suppliers', company?.id],
            queryFn: fetchSuppliers,
            enabled: !!company?.id,
        }),
        detail: (id: string) => useQuery({
            queryKey: ['supplier', id],
            queryFn: () => fetchSupplierById(id),
            enabled: !!id,
        }),
        payments: (id: string) => useQuery({
            queryKey: ['supplier_payments', id],
            queryFn: () => fetchSupplierPayments(id),
            enabled: !!id,
        }),
    };

    const mutations = {
        create: useMutation({
            mutationFn: async (newSupplier: Omit<SupplierInsert, 'company_id'>) => {
                const { data, error } = await supabase
                    .from('suppliers')
                    .insert({ ...newSupplier, company_id: company?.id })
                    .select()
                    .single();

                if (error) throw error;
                return data;
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            },
            onError: (error: any) => {
                Alert.alert('Error', error.message);
            },
        }),
        update: useMutation({
            mutationFn: async ({ id, updates }: { id: string; updates: SupplierUpdate }) => {
                const { data, error } = await supabase
                    .from('suppliers')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            },
            onSuccess: (_, { id }) => {
                queryClient.invalidateQueries({ queryKey: ['suppliers'] });
                queryClient.invalidateQueries({ queryKey: ['supplier', id] });
            },
            onError: (error: any) => {
                Alert.alert('Error', error.message);
            },
        }),
        delete: useMutation({
            mutationFn: async (id: string) => {
                const { error } = await supabase
                    .from('suppliers')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            },
            onError: (error: any) => {
                Alert.alert('Error', error.message);
            },
        }),
        recordPayment: useMutation({
            mutationFn: async (params: { supplier_id: string; amount: number; payment_date: Date; method: string; notes?: string }) => {
                if (!company?.id || !user?.id) throw new Error("Missing context");

                const { data, error } = await supabase.rpc('process_supplier_payment', {
                    p_company_id: company.id,
                    p_supplier_id: params.supplier_id,
                    p_amount: params.amount,
                    p_payment_date: params.payment_date.toISOString(),
                    p_method: params.method,
                    p_notes: params.notes || '',
                    p_created_by: user.id
                });

                if (error) throw error;
                return data;
            },
            onSuccess: (_, { supplier_id }) => {
                queryClient.invalidateQueries({ queryKey: ['suppliers'] }); // Update list balance
                queryClient.invalidateQueries({ queryKey: ['supplier', supplier_id] }); // Update detail balance
                queryClient.invalidateQueries({ queryKey: ['supplier_payments', supplier_id] }); // Update history
            },
            onError: (error: any) => {
                Alert.alert('Error', error.message);
            },
        })
    };

    return {
        suppliers: queries.list.data,
        isLoading: queries.list.isLoading,
        error: queries.list.error,
        getSupplier: queries.detail,
        getPayments: queries.payments,
        createSupplier: mutations.create.mutateAsync,
        updateSupplier: mutations.update.mutateAsync,
        deleteSupplier: mutations.delete.mutateAsync,
        recordPayment: mutations.recordPayment.mutateAsync,
        isCreating: mutations.create.isPending,
        isUpdating: mutations.update.isPending,
        isDeleting: mutations.delete.isPending,
        isRecordingPayment: mutations.recordPayment.isPending,
    };
}
