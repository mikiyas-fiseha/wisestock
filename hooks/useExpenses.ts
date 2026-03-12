
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface ExpenseCategory {
    id: string;
    company_id: string;
    name: string;
    status: 'active' | 'disabled';
    is_system: boolean;
    created_at: string;
}

export interface Expense {
    id: string;
    company_id: string;
    branch_id?: string;
    category_id?: string;
    category?: string; // Legacy or joined
    date: string;
    amount: number;
    payment_method: string;
    reference?: string;
    description?: string;
    attachment_url?: string;
    is_recurring: boolean;
    recurring_frequency?: 'daily' | 'weekly' | 'monthly';
    recurring_start_date?: string;
    recurring_end_date?: string;
    parent_expense_id?: string;
    created_by: string;
    created_at: string;
    branches?: { name: string };
    profiles?: { full_name: string };
    expense_categories?: { name: string };
}

interface ExpenseFilters {
    start?: Date;
    end?: Date;
    branch_id?: string;
    category_id?: string;
    payment_method?: string;
    search?: string;
}

export const useExpenses = (filters?: ExpenseFilters) => {
    const { company, isManager, isSales, branch: currentBranch } = useAuth();

    return useQuery({
        queryKey: ['expenses', company?.id, filters, currentBranch?.id],
        queryFn: async () => {
            if (!company?.id) throw new Error('No company ID');

            let query = supabase
                .from('expenses')
                .select('*, branches(name), expense_categories(name)')
                .eq('company_id', company.id)
                .order('date', { ascending: false });

            if (filters?.start) {
                query = query.gte('date', filters.start.toISOString());
            }
            if (filters?.end) {
                const end = new Date(filters.end);
                end.setHours(23, 59, 59, 999);
                query = query.lte('date', end.toISOString());
            }

            // Permissions / Filtering
            if (isManager || isSales) {
                // Non-admins see only their branch
                query = query.eq('branch_id', currentBranch?.id);
            } else if (filters?.branch_id && filters.branch_id !== 'all') {
                query = query.eq('branch_id', filters.branch_id);
            }

            if (filters?.category_id && filters.category_id !== 'all') {
                query = query.eq('category_id', filters.category_id);
            }

            if (filters?.payment_method && filters.payment_method !== 'all') {
                query = query.eq('payment_method', filters.payment_method);
            }

            if (filters?.search) {
                query = query.ilike('description', `%${filters.search}%`);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Map to ensure joins are objects and not arrays (Supabase quirk)
            const mapped = (data || []).map(ex => ({
                ...ex,
                branches: Array.isArray(ex.branches) ? ex.branches[0] : ex.branches,
                profiles: Array.isArray(ex.profiles) ? ex.profiles[0] : ex.profiles,
                expense_categories: Array.isArray(ex.expense_categories) ? ex.expense_categories[0] : ex.expense_categories,
            }));

            return mapped as Expense[];
        },
        enabled: !!company?.id,
    });
};

export const useExpenseStats = (filters?: ExpenseFilters) => {
    const { company, isManager, isSales, branch: currentBranch } = useAuth();

    return useQuery({
        queryKey: ['expense_stats', company?.id, filters, currentBranch?.id],
        queryFn: async () => {
            if (!company?.id) return { totalMonth: 0, today: 0, totalYear: 0, topCategory: 'None' };

            // For stats, we fetch a broader range or specific points
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const startOfToday = new Date(now.setHours(0, 0, 0, 0));

            let query = supabase
                .from('expenses')
                .select('amount, date, expense_categories(name)')
                .eq('company_id', company.id);

            // Apply branch filtering
            if (isManager || isSales) {
                query = query.eq('branch_id', currentBranch?.id);
            } else if (filters?.branch_id && filters.branch_id !== 'all') {
                query = query.eq('branch_id', filters.branch_id);
            }

            const { data, error } = await query;
            if (error) throw error;

            let totalMonth = 0;
            let todayAmount = 0;
            let totalYear = 0;
            const categorySums: Record<string, number> = {};

            const todayStr = startOfToday.toISOString().split('T')[0];
            const monthStr = startOfMonth.toISOString().split('T')[0];
            const yearStr = startOfYear.toISOString().split('T')[0];

            data.forEach(ex => {
                const amt = Number(ex.amount);
                const rawDate = ex.date;
                if (!rawDate) return;

                // Use substring for robust ISO date extraction
                const exDate = rawDate.substring(0, 10);

                if (exDate >= yearStr) totalYear += amt;
                if (exDate >= monthStr) totalMonth += amt;
                if (exDate === todayStr) todayAmount += amt;

                const rawCat = ex.expense_categories;
                const catName = (Array.isArray(rawCat) ? rawCat[0]?.name : (rawCat as any)?.name) || 'Uncategorized';
                categorySums[catName] = (categorySums[catName] || 0) + amt;
            });

            const topCat = Object.entries(categorySums).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

            return {
                totalMonth,
                today: todayAmount,
                totalYear,
                topCategory: topCat
            };
        },
        enabled: !!company?.id,
    });
};

export const useExpenseCategories = () => {
    const { company } = useAuth();
    return useQuery({
        queryKey: ['expense_categories', company?.id],
        queryFn: async () => {
            if (!company?.id) return [];
            const { data, error } = await supabase
                .from('expense_categories')
                .select('*')
                .eq('company_id', company.id)
                .order('name');
            if (error) throw error;
            return data as ExpenseCategory[];
        },
        enabled: !!company?.id,
    });
};

export const useAddExpense = () => {
    const queryClient = useQueryClient();
    const { company, branch, user } = useAuth();

    return useMutation({
        mutationFn: async (expenseData: Partial<Expense>) => {
            if (!company?.id) throw new Error('No company ID');

            const { data, error } = await supabase
                .from('expenses')
                .insert([{
                    ...expenseData,
                    company_id: company.id,
                    branch_id: expenseData.branch_id || branch?.id,
                    created_by: user?.id
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
};

export const useProcessRecurringExpenses = () => {
    const { company } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            if (!company?.id) return;

            // 1. Fetch all active recurring expenses that are not instances of other recurring expenses
            const { data: activeRecurring, error } = await supabase
                .from('expenses')
                .select('*')
                .eq('company_id', company.id)
                .eq('is_recurring', true)
                .is('parent_expense_id', null);

            if (error) throw error;
            if (!activeRecurring || activeRecurring.length === 0) return;

            const now = new Date();
            const newEntries: any[] = [];

            for (const parent of activeRecurring) {
                // 2. Find the last entry for this recurrence
                const { data: lastEntry } = await supabase
                    .from('expenses')
                    .select('date')
                    .eq('parent_expense_id', parent.id)
                    .order('date', { ascending: false })
                    .limit(1)
                    .single();

                let lastDate = lastEntry ? new Date(lastEntry.date) : new Date(parent.recurring_start_date || parent.date);
                const endDate = parent.recurring_end_date ? new Date(parent.recurring_end_date) : null;

                // 3. Increment and generate missing ones
                while (true) {
                    let nextDate = new Date(lastDate);
                    if (parent.recurring_frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
                    else if (parent.recurring_frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                    else if (parent.recurring_frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                    else break;

                    if (nextDate > now || (endDate && nextDate > endDate)) break;

                    newEntries.push({
                        ...parent,
                        id: undefined, // Let DB generate
                        date: nextDate.toISOString(),
                        parent_expense_id: parent.id,
                        created_at: undefined,
                        updated_at: undefined,
                        is_recurring: false // Instances aren't recurring parents
                    });

                    lastDate = nextDate;
                }
            }

            if (newEntries.length > 0) {
                const { error: insertError } = await supabase
                    .from('expenses')
                    .insert(newEntries);
                if (insertError) throw insertError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        }
    });
};

export const useAddExpenseCategory = () => {
    const queryClient = useQueryClient();
    const { company } = useAuth();

    return useMutation({
        mutationFn: async (name: string) => {
            if (!company?.id) throw new Error('No company ID');
            const { data, error } = await supabase
                .from('expense_categories')
                .insert([{ name, company_id: company.id }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense_categories'] });
        },
    });
};

export const useExpenseReports = (filters?: ExpenseFilters) => {
    const { company, isManager, isSales, branch: currentBranch } = useAuth();

    return useQuery({
        queryKey: ['expense_reports', company?.id, filters, currentBranch?.id],
        queryFn: async () => {
            if (!company?.id) return { byCategory: [], byBranch: [], monthlyTrend: [] };

            let query = supabase
                .from('expenses')
                .select(`
                    amount, 
                    date, 
                    branch_id, 
                    branches(name), 
                    expense_categories(name)
                `)
                .eq('company_id', company.id);

            if (isManager || isSales) {
                query = query.eq('branch_id', currentBranch?.id);
            } else if (filters?.branch_id && filters.branch_id !== 'all') {
                query = query.eq('branch_id', filters.branch_id);
            }

            if (filters?.start) query = query.gte('date', filters.start.toISOString());
            if (filters?.end) query = query.lte('date', filters.end.toISOString());

            const { data, error } = await query;
            if (error) throw error;

            // 1. By Category
            const categorySums: Record<string, number> = {};
            // 2. By Branch
            const branchSums: Record<string, number> = {};
            // 3. Monthly Trend
            const monthSums: Record<string, number> = {};

            data.forEach(ex => {
                const amt = Number(ex.amount);
                const rawDate = ex.date;

                // Handle potential array responses for joins
                const rawCat = ex.expense_categories;
                const cat = (Array.isArray(rawCat) ? rawCat[0]?.name : (rawCat as any)?.name) || 'Uncategorized';

                const rawBranch = ex.branches;
                const branch = (Array.isArray(rawBranch) ? rawBranch[0]?.name : (rawBranch as any)?.name) || 'Main';

                const month = rawDate ? rawDate.substring(0, 7) : 'Unknown'; // YYYY-MM

                categorySums[cat] = (categorySums[cat] || 0) + amt;
                branchSums[branch] = (branchSums[branch] || 0) + amt;
                monthSums[month] = (monthSums[month] || 0) + amt;
            });

            const byCategory = Object.entries(categorySums).map(([label, value]) => ({ label, value }));
            const byBranch = Object.entries(branchSums).map(([label, value]) => ({ label, value }));
            const monthlyTrend = Object.entries(monthSums)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([label, value]) => ({ label, value }));

            return { byCategory, byBranch, monthlyTrend };
        },
        enabled: !!company?.id,
    });
};

export const useDeleteExpense = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
    });
};
