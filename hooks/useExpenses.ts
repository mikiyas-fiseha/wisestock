
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Expense {
    id: string;
    company_id: string;
    date: string;
    category: string;
    amount: number;
    payment_method: string;
    reference?: string;
    description?: string;
    created_by: string;
    created_at: string;
}

interface DateRange {
    start: Date;
    end: Date;
}

export const useExpenses = (range?: DateRange) => {
    const { company, branch } = useAuth();

    return useQuery({
        queryKey: ['expenses', company?.id, range?.start.toISOString(), range?.end.toISOString()],
        queryFn: async () => {
            if (!company?.id) throw new Error('No company ID');

            let query = supabase
                .from('expenses')
                .select('*')
                .eq('company_id', company.id)
                .order('date', { ascending: false });

            if (range) {
                // Adjust for time zone if needed, but standard ISO strings work well for broad ranges
                // Ensure end date covers the full day
                const end = new Date(range.end);
                end.setHours(23, 59, 59, 999);

                query = query
                    .gte('date', range.start.toISOString())
                    .lte('date', end.toISOString());
            }

            if (branch?.id) {
                query = query.eq('branch_id', branch.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Expense[];
        },
        enabled: !!company?.id,
    });
};

export const useAddExpense = () => {
    const queryClient = useQueryClient();
    const { company, branch } = useAuth();

    return useMutation({
        mutationFn: async (expenseData: Omit<Expense, 'id' | 'created_at' | 'created_by' | 'company_id'>) => {
            if (!company?.id) throw new Error('No company ID');

            const { data, error } = await supabase
                .from('expenses')
                .insert([{ ...expenseData, company_id: company.id, branch_id: branch?.id }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['advanced-reports'] }); // Refresh financials too
        },
    });
};

export const useDeleteExpense = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['advanced-reports'] });
        },
    });
};
