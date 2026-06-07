import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useProductDetail(id: string) {
    const { company, branch } = useAuth();

    return useQuery({
        queryKey: ['product-detail', id, company?.id, branch?.id],
        queryFn: async () => {
            if (!company?.id || !id) return null;

            const [prodRes, bpRes, varRes] = await Promise.all([
                supabase.from('products').select('*, categories(name)').eq('id', id).single(),
                supabase.from('branch_products').select('stock, branch_id').eq('product_id', id),
                supabase.from('product_variants').select('*').eq('product_id', id)
            ]);

            if (prodRes.error) throw prodRes.error;

            const product = prodRes.data;
            const variantList = varRes.data || [];

            // For variable products, total stock = sum of all variant stocks
            // For simple products, total stock = sum of branch_products stock (branch-filtered)
            // Fallback: if no branch_products exist for this product, use products.stock directly
            const branchRows = (bpRes.data || []).filter((bp: any) => !branch?.id || bp.branch_id === branch.id);
            const branchStock = branchRows.reduce((sum: number, bp: any) => sum + Number(bp.stock || 0), 0);
            const stockQty = variantList.length > 0
                ? variantList.reduce((sum, v: any) => sum + Number(v.stock || 0), 0)
                : branchRows.length > 0
                    ? branchStock
                    : Number(product.stock || 0); // fallback to global product stock


            return {
                ...product,
                stockQty,
                variants: variantList,
            };
        },
        enabled: !!id && !!company?.id,
    });
}
