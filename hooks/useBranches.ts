
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Branch {
    id: string;
    company_id: string;
    name: string;
    address?: string;
    phone?: string;
    is_main: boolean;
    status?: string;
    created_at: string;
}

export const useBranches = () => {
    const { company } = useAuth();
    const queryClient = useQueryClient();

    const fetchBranches = async () => {
        if (!company?.id) return [];
        const { data, error } = await supabase
            .from('branches')
            .select('*')
            .eq('company_id', company.id)
            .order('is_main', { ascending: false }) // Main branch first
            .order('name');

        if (error) throw error;
        return data as Branch[];
    };

    const queries = {
        list: useQuery({
            queryKey: ['branches', company?.id],
            queryFn: fetchBranches,
            enabled: !!company?.id,
        }),
    };

    const mutations = {
        create: useMutation({
            mutationFn: async (branchData: Omit<Branch, 'id' | 'created_at' | 'company_id' | 'is_main'>) => {
                if (!company?.id) throw new Error('No company ID');
                const { data, error } = await supabase
                    .from('branches')
                    .insert([{ ...branchData, company_id: company.id, is_main: false }]) // Default new branches to not main
                    .select()
                    .single();

                if (error) throw error;
                return data;
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['branches'] });
            },
        }),
        update: useMutation({
            mutationFn: async ({ id, ...updates }: Partial<Branch> & { id: string }) => {
                const { error } = await supabase
                    .from('branches')
                    .update(updates)
                    .eq('id', id);

                if (error) throw error;
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['branches'] });
            },
        }),
        delete: useMutation({
            mutationFn: async (id: string) => {
                const { error } = await supabase
                    .from('branches')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['branches'] });
            },
        }),
    };

    return {
        branches: queries.list.data,
        isLoading: queries.list.isLoading,
        createBranch: mutations.create.mutateAsync,
        updateBranch: mutations.update.mutateAsync,
        deleteBranch: mutations.delete.mutateAsync,
        isCreating: mutations.create.isPending,
        isUpdating: mutations.update.isPending,
        isDeleting: mutations.delete.isPending,
    };
};
