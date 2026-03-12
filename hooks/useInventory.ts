import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InventoryProduct {
    id: string;
    name: string;
    primary_sku: string | null;
    unit: string | null;
    cost_price: number;
    sale_price: number;
    category_id: string | null;
    stock: number;
    min_stock_level: number;
    branch_id: string;
    branch_name?: string;
    value: number; // stock * cost_price
    status: 'ok' | 'low' | 'out';
}

export interface InventoryMovement {
    id: string;
    product_id: string;
    product_name: string;
    branch_id: string | null;
    branch_name: string | null;
    type: string;
    quantity: number;
    previous_stock: number;
    new_stock: number;
    reference_type: string | null;
    reference_id: string | null;
    notes: string | null;
    created_at: string;
    created_by: string | null;
    created_by_name: string | null;
}

export interface BranchStock {
    branch_id: string;
    branch_name: string;
    stock: number;
    min_stock_level: number;
    value: number;
    status: 'ok' | 'low' | 'out';
}

export interface MovementFilters {
    type?: string;
    branchId?: string | null;
    productId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** All products with their stock for the current branch (or all branches) */
export function useInventoryStock(search?: string, lowStockOnly?: boolean) {
    const { company, branch } = useAuth();

    return useQuery({
        queryKey: ['inventory-stock', company?.id, branch?.id, search, lowStockOnly],
        queryFn: async (): Promise<InventoryProduct[]> => {
            if (!company?.id) return [];

            let query = supabase
                .from('branch_products')
                .select(`
                    stock,
                    min_stock_level,
                    branch_id,
                    branch:branches!inner(id, name, company_id),
                    product:products!inner(
                        id, name, primary_sku, unit, cost_price, sale_price, category_id, company_id
                    )
                `)
                .eq('product.company_id', company.id);

            if (branch?.id) {
                query = query.eq('branch_id', branch.id);
            }

            const { data, error } = await query;
            if (error) {
                console.error("Inventory fetch error:", error);
                throw error;
            }

            let results = (data || []).map((row: any) => {
                const p = row.product; // Using alias from select
                const b = row.branch;
                const stock = Number(row.stock || 0);
                const min = Number(row.min_stock_level || 0);
                const cost = Number(p?.cost_price || 0);

                const status: 'ok' | 'low' | 'out' =
                    stock === 0 ? 'out' : stock <= min ? 'low' : 'ok';

                return {
                    id: p?.id || '',
                    name: p?.name || 'Unknown Product',
                    primary_sku: p?.primary_sku,
                    unit: p?.unit,
                    cost_price: cost,
                    sale_price: Number(p?.sale_price || 0),
                    category_id: p?.category_id,
                    stock,
                    min_stock_level: min,
                    branch_id: row.branch_id,
                    branch_name: b?.name ?? null,
                    value: stock * cost,
                    status,
                } satisfies InventoryProduct;
            });

            if (search) {
                const q = search.toLowerCase();
                results = results.filter(
                    r => r.name.toLowerCase().includes(q) || (r.primary_sku ?? '').toLowerCase().includes(q)
                );
            }

            if (lowStockOnly) {
                results = results.filter(r => r.status !== 'ok');
            }

            // Sort: low/out first, then alphabetically
            results.sort((a, b) => {
                const order = { out: 0, low: 1, ok: 2 };
                const diff = order[a.status] - order[b.status];
                return diff !== 0 ? diff : a.name.localeCompare(b.name);
            });

            return results;
        },
        enabled: !!company?.id,
    });
}

/** Summary KPIs for the Inventory Summary screen */
export function useInventorySummary() {
    const { company, branch } = useAuth();

    return useQuery({
        queryKey: ['inventory-summary', company?.id, branch?.id],
        queryFn: async () => {
            if (!company?.id) return null;

            let query = supabase
                .from('branch_products')
                .select(`
                    stock, min_stock_level, branch_id,
                    branch:branches!inner(name),
                    product:products!inner(cost_price, company_id)
                `)
                .eq('product.company_id', company.id);

            if (branch?.id) query = query.eq('branch_id', branch.id);

            const { data, error } = await query;
            if (error) {
                console.error("Inventory summary error:", error);
                throw error;
            }

            let totalValue = 0;
            let totalItems = 0;
            let lowStockCount = 0;
            let outOfStockCount = 0;
            const branchMap = new Map<string, { name: string; value: number; count: number; itemCount: number }>();

            for (const row of data || []) {
                const stock = Number(row.stock) || 0;
                const min = Number(row.min_stock_level) || 0;
                const cost = Number((row as any).product?.cost_price) || 0;
                const value = stock * cost;
                const bName = (row as any).branch?.name ?? 'Unknown';

                totalValue += value;
                totalItems++;
                if (stock === 0) outOfStockCount++;
                else if (stock <= min) lowStockCount++;

                if (!branchMap.has(row.branch_id)) {
                    branchMap.set(row.branch_id, { name: bName, value: 0, count: 0, itemCount: 0 });
                }
                const b = branchMap.get(row.branch_id)!;
                b.value += value;
                b.itemCount += stock;
                b.count++;
            }

            return {
                totalValue,
                totalProducts: totalItems,
                lowStockCount,
                outOfStockCount,
                branches: Array.from(branchMap.entries()).map(([id, v]) => ({
                    branch_id: id,
                    branch_name: v.name,
                    totalValue: v.value,
                    totalItems: v.count,
                    totalStock: v.itemCount,
                })),
            };
        },
        enabled: !!company?.id,
    });
}

/** Full movement feed from stock_transactions with filters and pagination */
export function useInventoryMovements(filters: MovementFilters = {}) {
    const { company, branch } = useAuth();
    const { type, branchId, productId, dateFrom, dateTo, page = 0, pageSize = 30 } = filters;
    const activeBranchId = branchId !== undefined ? branchId : branch?.id;

    return useQuery({
        queryKey: ['inventory-movements', company?.id, activeBranchId, type, productId, dateFrom, dateTo, page],
        queryFn: async (): Promise<{ data: InventoryMovement[]; count: number }> => {
            if (!company?.id) return { data: [], count: 0 };

            const from = page * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from('stock_movements')
                .select(`
                    id, product_id, branch_id, type, qty_change,
                    reason, created_at, user_id,
                    product:products(name),
                    branch:branches(name)
                `, { count: 'exact' })
                .eq('company_id', company.id)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (activeBranchId) query = query.eq('branch_id', activeBranchId);

            if (type && type !== 'all') {
                if (type === 'customer_return') {
                    // Match "Customer return", "Return for Sale", or records where the reason is empty but stock increased
                    query = query.eq('type', 'return')
                        .or('reason.ilike.%Customer%,reason.ilike.%Sale%,and(reason.eq."",qty_change.gt.0)');
                } else if (type === 'supplier_return') {
                    // Match "Supplier return" or records where the reason is empty but stock decreased
                    query = query.eq('type', 'return')
                        .or('reason.ilike.%Supplier%,and(reason.eq."",qty_change.lt.0)');
                } else {
                    query = query.eq('type', type);
                }
            }

            if (productId) query = query.eq('product_id', productId);
            if (dateFrom) query = query.gte('created_at', dateFrom);
            if (dateTo) query = query.lte('created_at', dateTo);

            const { data, error, count } = await query;
            if (error) {
                console.error("Movements fetch error:", error);
                throw error;
            }

            const movements: InventoryMovement[] = (data || []).map((row: any) => {
                // Determine specific return type for UI configuration
                let displayType = row.type;
                if (row.type === 'return') {
                    const reason = (row.reason || '').toLowerCase();
                    const qty = Number(row.qty_change || 0);

                    if (reason.includes('supplier')) {
                        displayType = 'supplier_return';
                    } else if (reason.includes('customer') || reason.includes('sale')) {
                        displayType = 'customer_return';
                    } else {
                        // Fallback for empty reasons: positive change is customer, negative is supplier
                        displayType = qty < 0 ? 'supplier_return' : 'customer_return';
                    }
                }

                return {
                    id: row.id,
                    product_id: row.product_id,
                    product_name: row.product?.name ?? 'Unknown',
                    branch_id: row.branch_id,
                    branch_name: row.branch?.name ?? null,
                    type: displayType,
                    quantity: Number(row.qty_change || 0),
                    previous_stock: 0,
                    new_stock: 0,
                    reference_type: displayType,
                    reference_id: row.reason,
                    notes: row.reason,
                    created_at: row.created_at,
                    created_by: row.user_id,
                    created_by_name: 'User',
                };
            });

            return { data: movements, count: count || 0 };
        },
        enabled: !!company?.id,
    });
}

/** Per-branch stock breakdown for a single product */
export function useProductBranchBreakdown(productId: string) {
    const { company } = useAuth();

    return useQuery({
        queryKey: ['product-branch-breakdown', productId],
        queryFn: async (): Promise<BranchStock[]> => {
            if (!company?.id || !productId) return [];

            const { data, error } = await supabase
                .from('branch_products')
                .select(`
                    stock, min_stock_level, branch_id,
                    branches(name),
                    products!inner(cost_price, company_id)
                `)
                .eq('product_id', productId)
                .eq('products.company_id', company.id);

            if (error) throw error;

            return (data || []).map((row: any) => {
                const stock = Number(row.stock) || 0;
                const min = Number(row.min_stock_level) || 0;
                const cost = Number(row.products?.cost_price) || 0;
                const status: 'ok' | 'low' | 'out' =
                    stock === 0 ? 'out' : stock <= min ? 'low' : 'ok';

                return {
                    branch_id: row.branch_id,
                    branch_name: row.branches?.name ?? 'Unknown',
                    stock,
                    min_stock_level: min,
                    value: stock * cost,
                    status,
                };
            });
        },
        enabled: !!company?.id && !!productId,
    });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/** Create a customer return or supplier return */
export function useCreateReturn() {
    const { company, user, branch } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            type,
            productId,
            branchId,
            quantity,
            reason,
            referenceId,
            notes,
        }: {
            type: 'customer_return' | 'supplier_return';
            productId: string;
            branchId: string;
            quantity: number;
            reason: string;
            referenceId?: string;
            notes?: string;
        }) => {
            if (!company?.id || !user?.id) throw new Error('Missing auth');

            // 1. Get current stock
            const { data: bp, error: bpErr } = await supabase
                .from('branch_products')
                .select('id, stock')
                .eq('product_id', productId)
                .eq('branch_id', branchId)
                .single();

            if (bpErr || !bp) throw new Error('Stock record not found');

            const currentStock = Number(bp.stock) || 0;
            const actualQtyChange = type === 'customer_return' ? quantity : -quantity;
            const newStock = currentStock + actualQtyChange;

            if (newStock < 0) throw new Error('Stock cannot go below zero for a supplier return');

            // 2. Record the movement in BOTH history tables
            // NOTE: The database has a trigger 'update_stock_after_movement' on 'stock_movements'
            // that automatically updates branch_products.stock. We do NOT update it manually here
            // to avoid double-deduction.

            // Table A: stock_movements (for Inventory Movements tab)
            const movementData = {
                product_id: productId,
                company_id: company.id,
                branch_id: branchId,
                type: 'return',
                qty_change: actualQtyChange,
                user_id: user.id,
                reason: notes || `${type === 'customer_return' ? 'Customer' : 'Supplier'} return: ${reason}`,
            };

            // Table B: stock_transactions (for Product details Stock History tab)
            const transactionData = {
                product_id: productId,
                company_id: company.id,
                branch_id: branchId,
                type: 'return',
                quantity: actualQtyChange,
                previous_stock: currentStock,
                new_stock: newStock,
                reference_type: reason,
                notes: notes || `${type === 'customer_return' ? 'Customer' : 'Supplier'} return: ${reason}`,
                created_by: user.id,
            };

            const [moveRes, transRes] = await Promise.all([
                supabase.from('stock_movements').insert(movementData),
                supabase.from('stock_transactions').insert(transactionData)
            ]);

            if (moveRes.error) throw moveRes.error;
            if (transRes.error) throw transRes.error;

            return { previousStock: currentStock, newStock };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-logs'] });
        },
    });
}
