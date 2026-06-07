
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface ProductFilters {
    search?: string;
    status?: string;
    stockStatus?: string;
}

export function useProducts(filters: ProductFilters = {}) {
    const { company, branch } = useAuth();
    const { search, status, stockStatus } = filters;

    return useQuery({
        queryKey: ['products', company?.id, branch?.id, search, status, stockStatus],
        queryFn: async () => {
            // Always use Supabase (No SQLite)
            let query = supabase
                .from('products')
                .select('id, name, primary_sku, cost_price, sale_price, unit, image_url, status, stock, categories(name), branch_products(stock, min_stock_level, branch_id)')
                .eq('company_id', company?.id)
                .order('name');

            if (branch?.id) {
                query = query.eq('branch_products.branch_id', branch.id);
            }

            if (search) {
                query = query.or(`name.ilike.%${search}%,primary_sku.ilike.%${search}%`);
            }

            if (status && status !== 'all') {
                query = query.eq('status', status);
            }

            const { data, error } = await query;
            if (error) throw error;

            let result = (data || []).map((p: any) => {
                const branchRows = branch?.id
                    ? (p.branch_products || []).filter((bp: any) => bp.branch_id === branch.id)
                    : (p.branch_products || []);

                const totalStock = branchRows.reduce((sum: number, bp: any) => sum + (Number(bp.stock) || 0), 0);

                return {
                    ...p,
                    stock: totalStock,
                    min_stock_level: branchRows[0]?.min_stock_level ?? 0,
                };
            });

            if (stockStatus) {
                if (stockStatus === 'in_stock') result = result.filter(p => p.stock > 10);
                else if (stockStatus === 'low_stock') result = result.filter(p => p.stock <= 10 && p.stock > 0);
                else if (stockStatus === 'out_of_stock') result = result.filter(p => p.stock === 0);
            }

            return result;
        },
        enabled: !!company?.id,
    });
}
