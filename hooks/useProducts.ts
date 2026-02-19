
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { useQuery } from '@tanstack/react-query';

type Product = Database['public']['Tables']['products']['Row'];

export function useProducts(search?: string) {
    const { company, branch } = useAuth();

    return useQuery({
        queryKey: ['products', company?.id, branch?.id, search],
        queryFn: async () => {
            if (!company?.id || !branch?.id) return [];

            let query = supabase
                .from('products')
                .select('*, branch_products!inner(stock, min_stock_level)')
                .eq('company_id', company.id)
                .eq('branch_products.branch_id', branch.id)
                .order('name');

            if (search) {
                query = query.ilike('name', `%${search}%`);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Map to flatten structure (UI expects stock at root)
            return data.map((p: any) => ({
                ...p,
                stock: p.branch_products?.[0]?.stock ?? 0,
                min_stock_level: p.branch_products?.[0]?.min_stock_level ?? 0,
            }));
        },
        enabled: !!company?.id,
    });
}
