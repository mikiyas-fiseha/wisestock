
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// --- Sales Hooks ---


// ─── DateRange helper ────────────────────────────────────────────────────────
function getDateRangeFilter(range?: string): { from?: string; to?: string } {
    if (!range || range === 'all') return {};
    const now = new Date();
    const to = now.toISOString();
    if (range === 'today') {
        const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
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

export interface SaleFilters {
    status?: string;
    paymentMethod?: string;
    dateRange?: 'today' | 'week' | 'month' | 'all';
    dateFrom?: string;
    dateTo?: string;
}

export const useSales = (search?: string, filters?: SaleFilters) => {
    const { company, branch } = useAuth();
    return useQuery({
        queryKey: ['sales', company?.id, branch?.id, search, filters],
        queryFn: async () => {
            if (!company?.id) return [];
            let query = supabase
                .from('sales')
                .select('*, customers(name, phone)')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false });

            if (branch?.id) {
                query = query.eq('branch_id', branch.id);
            }

            if (search && search.trim()) {
                // Cast id (UUID) to text for ilike search
                query = query.filter('id', 'ilike', `%${search}%`);
            }

            if (filters?.status) {
                query = query.eq('status', filters.status);
            }

            if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
                query = query.eq('type', filters.paymentMethod);
            }

            // Date range
            const { from, to } = filters?.dateRange
                ? getDateRangeFilter(filters.dateRange)
                : { from: filters?.dateFrom, to: filters?.dateTo };

            if (from) query = query.gte('created_at', from);
            if (to) query = query.lte('created_at', to);

            const { data, error } = await query;
            if (error) throw error;

            const mappedData = (data || []).map((s: any) => ({
                ...s,
                payment_method: s.type || 'cash', // Default fallback
            }));

            // Client-side filter for customer name / phone if search doesn't look like uuid fragment
            if (search && search.trim() && !search.includes('-')) {
                const lower = search.toLowerCase();
                return mappedData.filter(
                    (s: any) =>
                        s.id?.toLowerCase().includes(lower) ||
                        s.customers?.name?.toLowerCase().includes(lower) ||
                        s.customers?.phone?.toLowerCase().includes(lower)
                );
            }

            return mappedData;
        },
        enabled: !!company?.id,
    });
};

// ─── Sale Detail (sale + items + payments) ────────────────────────────────────
export const useSaleDetail = (saleId: string | null) => {
    return useQuery({
        queryKey: ['sale_detail', saleId],
        queryFn: async () => {
            if (!saleId) return null;
            const [saleRes, itemsRes, paymentsRes] = await Promise.all([
                supabase.from('sales').select('*, customers(name, phone)').eq('id', saleId).single(),
                supabase.from('sale_items').select('*').eq('sale_id', saleId),
                supabase.from('payments').select('*').eq('sale_id', saleId),
            ]);
            if (saleRes.error) throw saleRes.error;
            return {
                sale: { ...saleRes.data, payment_method: saleRes.data.type }, // Map 'type' to 'payment_method'
                items: itemsRes.data || [],
                payments: paymentsRes.data || [],
            };
        },
        enabled: !!saleId,
    });
};


export const useProcessSale = () => {
    const queryClient = useQueryClient();
    const { company, user, branch } = useAuth(); // kept user for consistency, though RPC uses auth.uid()

    return useMutation({
        mutationFn: async ({ cart, customer, paymentMethod, amountPaid, total }: any) => {
            if (!company?.id) throw new Error('No company ID');

            const paid = parseFloat(amountPaid) || 0;

            const { data, error } = await supabase.rpc('process_sale', {
                cart: cart,
                customer_id: customer?.id || null, // Handle guest
                payment_method: paymentMethod,
                amount_paid: paid,
                total_amount: total,
                p_branch_id: branch?.id // Use branch from context
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            // Invalidate everything to ensure UI is fresh
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['products'] }); // Critical: Updates stock on POS and Product list
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });

            // Force refetch where accurate immediate data is needed
            queryClient.refetchQueries({ queryKey: ['products'] });
            queryClient.refetchQueries({ queryKey: ['dashboard'] });
        },
    });
};

export const useProcessReturn = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ saleId, items, refundAmount }: any) => {
            const { data, error } = await supabase.rpc('process_return', {
                sale_id: saleId,
                return_items: items,
                refund_amount: refundAmount
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.refetchQueries({ queryKey: ['products'] });
        },
    });
};

// --- Customers Hooks ---

export const useCustomers = (search?: string, filters?: any) => {
    const { company } = useAuth();
    return useQuery({
        queryKey: ['customers', company?.id, search, filters],
        queryFn: async () => {
            if (!company?.id) return [];
            let query = supabase
                .from('customers')
                .select('*, sales!sales_customer_id_fkey(count)')
                .eq('company_id', company.id)
                .order('name');

            if (search) {
                // Search by name or phone
                query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
            }

            // Filters
            if (filters?.balance === 'outstanding') {
                query = query.gt('current_balance', 0);
            }

            if (filters?.customer_type && filters.customer_type !== 'all') {
                query = query.eq('customer_type', filters.customer_type);
            }

            if (filters?.status && filters.status !== 'all') {
                query = query.eq('status', filters.status);
            }

            // Branch filter: customers who have made purchases in a specific branch
            if (filters?.branch_id && filters.branch_id !== 'all') {
                // This requires a subquery or join. Since Supabase doesn't support easy subqueries in .select() for filtering,
                // we can use a join with sales if we want to be strict, or just filter on the client side if data is small.
                // However, a better way is to use .rpc or a view if it gets complex.
                // For now, let's assume branch filtering is for sales history in the profile, 
                // but if we want it in the list, we might need a more complex query.
                // Let's stick to the simplest join/filter if possible.
                // query = query.filter('sales.branch_id', 'eq', filters.branch_id); // This won't work without inner join
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
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
            const { data, error } = await supabase
                .from('customers')
                .insert([{ ...customerData, company_id: company.id }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
    });
};

export const useUpdateCustomer = () => {
    const queryClient = useQueryClient();
    const { company } = useAuth();
    return useMutation({
        mutationFn: async ({ id, ...updates }: any) => {
            if (!company?.id) throw new Error('No company ID');
            const { data, error } = await supabase
                .from('customers')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
    });
};

export const useCustomerDetail = (customerId: string) => {
    const { company } = useAuth();
    return useQuery({
        queryKey: ['customer', customerId],
        queryFn: async () => {
            if (!company?.id || !customerId) return null;

            // Fetch customer
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('id', customerId)
                .single();
            if (error) throw error;

            // Fetch total sales count and sum
            const { data: salesData, error: salesError } = await supabase
                .from('sales')
                .select('total_amount')
                .eq('customer_id', customerId);

            if (salesError) throw salesError;

            const ordersCount = salesData?.length || 0;
            const totalPurchases = salesData?.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0) || 0;

            return {
                ...data,
                ordersCount,
                totalPurchases
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

            let salesQuery = supabase
                .from('sales')
                .select('*, branches(name)')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (branchId && branchId !== 'all') {
                salesQuery = salesQuery.eq('branch_id', branchId);
            }

            const [salesRes, paymentsRes] = await Promise.all([
                salesQuery,
                supabase
                    .from('payments')
                    .select('*, profiles(full_name)')
                    .eq('customer_id', customerId)
                    .order('created_at', { ascending: false })
            ]);

            return {
                sales: salesRes.data || [],
                payments: paymentsRes.data || []
            };
        },
        enabled: !!company?.id && !!customerId,
    });
};

export const useUpdateCustomerNotes = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
            const { data, error } = await supabase
                .from('customers')
                .update({ notes })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['customer', variables.id] });
        },
    });
};

// --- Dashboard Hooks ---

export const useDashboardData = () => {
    const { company, branch } = useAuth();
    return useQuery({
        queryKey: ['dashboard', company?.id, branch?.id],

        queryFn: async () => {
            if (!company?.id) throw new Error('No company ID');

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // Yesterday
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            // 7 days ago
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
            const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

            // 30 days ago
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
            const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

            // First of current month
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthStartStr = monthStart.toISOString().split('T')[0];

            // ─── Parallel fetch all data ───
            const [
                todaySalesReq,
                yesterdaySalesReq,
                weekSalesReq,
                monthSalesReq,
                finReq,
                valuationReq,
                expensesTodayReq,
                customerStatsReq,
                expensesMonthReq
            ] = await Promise.all([
                supabase.rpc('get_daily_sales', { p_company_id: company.id, start_date: todayStr, end_date: todayStr, p_branch_id: branch?.id || null }),
                supabase.rpc('get_daily_sales', { p_company_id: company.id, start_date: yesterdayStr, end_date: yesterdayStr, p_branch_id: branch?.id || null }),
                supabase.rpc('get_daily_sales', { p_company_id: company.id, start_date: sevenDaysAgoStr, end_date: todayStr, p_branch_id: branch?.id || null }),
                supabase.rpc('get_daily_sales', { p_company_id: company.id, start_date: monthStartStr, end_date: todayStr, p_branch_id: branch?.id || null }),
                supabase.rpc('get_financial_summary', { p_company_id: company.id, p_branch_id: branch?.id || null }),
                supabase.rpc('get_stock_valuation', { p_company_id: company.id, p_branch_id: branch?.id || null }),
                // Today Expenses
                (() => {
                    let q = supabase
                        .from('expenses')
                        .select('amount')
                        .eq('company_id', company.id)
                        .gte('date', `${todayStr}T00:00:00.000Z`)
                        .lte('date', `${todayStr}T23:59:59.999Z`);
                    if (branch?.id) q = q.eq('branch_id', branch.id);
                    return q;
                })(),
                supabase.rpc('get_customer_metrics', { p_company_id: company.id }),
                // Month Expenses & Categories
                (() => {
                    let q = supabase
                        .from('expenses')
                        .select('amount, category_id, expense_categories(name)')
                        .eq('company_id', company.id)
                        .gte('date', `${monthStartStr}T00:00:00.000Z`);
                    if (branch?.id) q = q.eq('branch_id', branch.id);
                    return q;
                })()
            ]);

            // ─── Low Stock (stock < 10) ───
            let lowStockQuery = supabase
                .from('products')
                .select('id, name, primary_sku, min_stock, branch_products!inner(stock)')
                .eq('company_id', company.id)
                .lt('branch_products.stock', 10)
                .order('name')
                .limit(10);
            if (branch?.id) lowStockQuery = lowStockQuery.eq('branch_products.branch_id', branch.id);
            const { data: lowStockData } = await lowStockQuery;

            const lowStockItems = lowStockData?.map((p: any) => ({
                ...p,
                stock: p.branch_products?.[0]?.stock ?? 0,
                min_stock: p.min_stock ?? 5,
            })) || [];

            // ─── Out of Stock count ───
            let outOfStockQuery = supabase
                .from('branch_products')
                .select('*', { count: 'exact', head: true })
                .lte('stock', 0);
            if (branch?.id) outOfStockQuery = outOfStockQuery.eq('branch_id', branch.id);
            const { count: outOfStockCount } = await outOfStockQuery;

            // ─── Top Credit Customers ───
            const { data: creditCustomers } = await supabase
                .from('customers')
                .select('id, name, phone, current_balance')
                .eq('company_id', company.id)
                .gt('current_balance', 0)
                .order('current_balance', { ascending: false })
                .limit(3);

            let recentSalesQuery = supabase
                .from('sales')
                .select('id, total_amount, type, status, created_at, customers(name)')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false })
                .limit(5);
            if (branch?.id) recentSalesQuery = recentSalesQuery.eq('branch_id', branch.id);
            const { data: recentSales } = await recentSalesQuery;

            // ─── Top Selling Products Today ───
            let topProductsQuery = supabase
                .from('sales')
                .select('sale_items(product_id, product_name, quantity, total_price)')
                .eq('company_id', company.id)
                .gte('created_at', `${todayStr}T00:00:00.000Z`)
                .lte('created_at', `${todayStr}T23:59:59.999Z`);
            if (branch?.id) topProductsQuery = topProductsQuery.eq('branch_id', branch.id);
            const { data: todaySalesWithItems } = await topProductsQuery;

            const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
            todaySalesWithItems?.forEach((sale: any) => {
                sale.sale_items?.forEach((item: any) => {
                    const key = item.product_id;
                    const existing = productMap.get(key) || { name: item.product_name || 'Unknown', quantity: 0, revenue: 0 };
                    productMap.set(key, {
                        name: existing.name,
                        quantity: existing.quantity + (item.quantity || 0),
                        revenue: existing.revenue + (item.total_price || 0),
                    });
                });
            });
            const topSellingProducts = Array.from(productMap.entries())
                .map(([id, data]) => ({ id, ...data }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);

            // ─── Parse results ───
            const todayStats = todaySalesReq.data?.[0] || { total_sales: 0, total_profit: 0 };
            const yesterdayStats = yesterdaySalesReq.data?.[0] || { total_sales: 0, total_profit: 0 };
            const financials = finReq.data?.[0] || { total_receivables: 0, total_payables: 0 };
            const valuation = valuationReq.data?.[0] || { total_value: 0 };
            const todayExpenses = expensesTodayReq.data?.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0) || 0;
            const monthExpensesList = expensesMonthReq.data || [];
            const monthExpenses = monthExpensesList.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0) || 0;
            const custMetrics = customerStatsReq.data?.[0] || { total_customers: 0, with_balance: 0, new_this_month: 0 };

            // Find top expense category
            const categorySums: Record<string, number> = {};
            monthExpensesList.forEach((e: any) => {
                const name = e.expense_categories?.name || 'Uncategorized';
                categorySums[name] = (categorySums[name] || 0) + Number(e.amount);
            });
            const topExpenseCategory = Object.entries(categorySums).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

            // Monthly totals
            const monthSales = monthSalesReq.data?.reduce((sum: number, d: any) => sum + (d.total_sales || 0), 0) || 0;

            // Sales trend data for charts
            const salesTrend7d = (weekSalesReq.data || []).map((d: any) => ({
                label: new Date(d.sale_date).toLocaleDateString('en', { weekday: 'short' }),
                value: d.total_sales || 0,
                profit: d.total_profit || 0,
            }));

            const salesTrend30d = (monthSalesReq.data || []).map((d: any) => ({
                label: new Date(d.sale_date).toLocaleDateString('en', { day: 'numeric' }),
                value: d.total_sales || 0,
                profit: d.total_profit || 0,
            }));

            // Percentage changes
            const salesChange = yesterdayStats.total_sales > 0
                ? ((todayStats.total_sales - yesterdayStats.total_sales) / yesterdayStats.total_sales) * 100
                : 0;
            const profitChange = yesterdayStats.total_profit > 0
                ? (((todayStats.total_profit - todayExpenses) - yesterdayStats.total_profit) / yesterdayStats.total_profit) * 100
                : 0;

            return {
                stats: {
                    todaySales: todayStats.total_sales,
                    todayProfit: todayStats.total_profit - todayExpenses,
                    todayExpenses,
                    monthSales,
                    monthExpenses,
                    topExpenseCategory,
                    lowStockCount: lowStockItems.length,
                    outOfStockCount: outOfStockCount || 0,
                    creditDue: financials.total_receivables,
                    totalPayables: financials.total_payables || 0,
                    inventoryValue: valuation.total_value || 0,
                    salesChange: Math.round(salesChange),
                    profitChange: Math.round(profitChange),
                    totalCustomers: custMetrics.total_customers,
                    customersWithBalanceCount: custMetrics.with_balance,
                    newCustomersMonth: custMetrics.new_this_month,
                },
                lowStockItems,
                salesTrend7d,
                salesTrend30d,
                creditCustomers: creditCustomers || [],
                recentSales: (recentSales || []).map((s: any) => ({
                    ...s,
                    payment_method: s.type,
                    customerName: s.customers?.name || 'Walk-in',
                })),
                topSellingProducts,
            };
        },
        enabled: !!company?.id,
    });
};

// --- Reports Hooks ---

export const useReportsData = () => {
    const { company, branch } = useAuth();
    return useQuery({
        queryKey: ['reports', company?.id, branch?.id],
        queryFn: async () => {
            if (!company?.id) throw new Error('No company ID');

            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 7);

            const [finReq, valReq, salesReq] = await Promise.all([
                supabase.rpc('get_financial_summary', { p_company_id: company.id, p_branch_id: branch?.id || null }),
                supabase.rpc('get_stock_valuation', { p_company_id: company.id, p_branch_id: branch?.id || null }),
                supabase.rpc('get_daily_sales', {
                    p_company_id: company.id,
                    start_date: start.toISOString().split('T')[0],
                    end_date: end.toISOString().split('T')[0],
                    p_branch_id: branch?.id || null
                })
            ]);

            if (finReq.error) throw finReq.error;
            if (valReq.error) throw valReq.error;
            if (salesReq.error) throw salesReq.error;

            return {
                financials: finReq.data?.[0] || {},
                valuation: valReq.data?.[0] || {},
                dailySales: salesReq.data || []
            };
        },
        enabled: !!company?.id,
    });
};

// --- Products Hooks ---

export const useAddProduct = () => {
    const queryClient = useQueryClient();
    const { company } = useAuth();
    return useMutation({
        mutationFn: async ({ productData, variants, isVariable, minStockLevel }: any) => {
            if (!company?.id) throw new Error('No company ID');

            // 1. Insert Product
            const { data: product, error: prodError } = await supabase
                .from('products')
                .insert([productData])
                .select()
                .single();

            if (prodError) throw prodError;

            // 2. Insert Variants (if applicable)
            if (isVariable && variants.length > 0) {
                const variantsToInsert = variants.map((v: any) => ({
                    product_id: product.id,
                    sku: v.sku,
                    price_override: parseFloat(v.price),
                    stock: parseInt(v.stock, 10),
                    attributes: v.attributes,
                    status: 'active'
                }));

                const { error: varError } = await supabase.from('product_variants').insert(variantsToInsert);
                if (varError) throw varError;
            }

            // 3. Auto-create branch_products with stock=0 for all active branches
            const { data: branches } = await supabase
                .from('branches')
                .select('id')
                .eq('company_id', company.id)
                .eq('status', 'active');

            if (branches && branches.length > 0) {
                const branchProducts = branches.map((b: any) => ({
                    product_id: product.id,
                    branch_id: b.id,
                    stock: 0,
                    min_stock_level: minStockLevel || 0,
                }));

                const { error: bpError } = await supabase
                    .from('branch_products')
                    .insert(branchProducts);

                if (bpError) console.warn('Failed to create branch_products:', bpError);
            }

            return product;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            queryClient.refetchQueries({ queryKey: ['dashboard'] });
        },
    });
};

export const useUpdateProduct = () => {
    const queryClient = useQueryClient();
    const { company } = useAuth();
    return useMutation({
        mutationFn: async ({ id, productData, variants, isVariable }: any) => {
            if (!company?.id) throw new Error('No company ID');

            // 1. Update Product
            const { error: prodError } = await supabase
                .from('products')
                .update(productData)
                .eq('id', id);

            if (prodError) throw prodError;

            // 2. Handle Variants
            if (isVariable) {
                // Fetch current IDs to identify deletions
                const { data: currentVars } = await supabase.from('product_variants').select('id').eq('product_id', id);
                const currentIds = currentVars?.map(v => v.id) || [];
                const keptIds = variants.filter((v: any) => v.id).map((v: any) => v.id);
                const idsToDelete = currentIds.filter(cid => !keptIds.includes(cid));

                if (idsToDelete.length > 0) {
                    await supabase.from('product_variants').delete().in('id', idsToDelete);
                }

                if (variants.length > 0) {
                    const variantsToUpsert = variants.map((v: any) => ({
                        ...(v.id ? { id: v.id } : {}),
                        product_id: id,
                        sku: v.sku,
                        price_override: parseFloat(v.price),
                        stock: parseInt(v.stock, 10),
                        attributes: v.attributes,
                        status: 'active'
                    }));

                    const { error: varError } = await supabase.from('product_variants').upsert(variantsToUpsert);
                    if (varError) throw varError;
                }
            }

            return { id };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['product', variables.id] }); // Invalidate specific product details
            queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Critical for Low Stock
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            queryClient.refetchQueries({ queryKey: ['dashboard'] });
        },
    });
};

export const useCollectPayment = () => {
    const queryClient = useQueryClient();
    const { company, user } = useAuth();
    return useMutation({
        mutationFn: async ({ customerId, amount, notes }: any) => {
            if (!company?.id) throw new Error('No company ID');

            const paid = parseFloat(amount);
            if (isNaN(paid) || paid <= 0) throw new Error('Invalid amount');

            // 1. Record Payment
            const { data: payment, error: payError } = await supabase.from('payments').insert([{
                company_id: company.id,
                customer_id: customerId,
                amount: paid,
                method: 'cash', // Default to cash for debt collection for now
                created_by: user?.id
            }]).select().single();

            if (payError) throw payError;

            // 2. Fetch Customer to confirm current balance
            const { data: customer } = await supabase.from('customers').select('current_balance').eq('id', customerId).single();
            const currentBalance = customer?.current_balance || 0;
            // Balance logic: If positive balance = DEBT. So paying reduces it.
            const newBalance = currentBalance - paid;

            // 3. Update Customer Balance
            const { error: custError } = await supabase.from('customers').update({
                current_balance: newBalance
            }).eq('id', customerId);

            if (custError) throw custError;

            // 4. Log Transaction
            await supabase.from('customer_transactions').insert([{
                company_id: company.id,
                customer_id: customerId,
                type: 'payment',
                amount: -paid, // Negative amount for payments (credits)
                reference_id: payment.id,
                description: notes || 'Debt Payment'
            }]);

            return payment;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] }); // If specific query exists? currently manually fetching in screen
            // Since CustomerDetailScreen fetches manually, we might need to trigger a refetch there or use useQuery
        },
    });
};
