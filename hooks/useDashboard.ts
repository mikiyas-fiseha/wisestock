import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export const useDashboardData = () => {
    const { company, branch } = useAuth();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStartStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const sevenDaysAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const thirtyDaysAgoStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return useQuery({
        queryKey: ['dashboard', company?.id, branch?.id],
        queryFn: async () => {
            if (!company?.id) throw new Error('No company ID');

            // Use Supabase — use server-side filtering; don't fetch all data
            const branchEq = (q: any) => branch?.id ? q.eq('branch_id', branch.id) : q;

            const [
                todaySalesRes, monthSalesRes, todayExpRes, monthExpRes,
                lowStockRes, customersRes, recentSalesRes, creditCustRes,
                totalCustomersRes, newCustRes, trend30dRes
            ] = await Promise.all([
                // Today's sales (for KPIs)
                branchEq(supabase.from('sales').select('total_amount, paid_amount').eq('company_id', company.id).gte('created_at', todayStr).neq('status', 'cancelled')),
                // This month's sales
                branchEq(supabase.from('sales').select('total_amount, created_at').eq('company_id', company.id).gte('created_at', monthStartStr).neq('status', 'cancelled')),
                // Today's expenses
                branchEq(supabase.from('expenses').select('amount').eq('company_id', company.id).gte('date', todayStr).lte('date', todayStr)),
                // This month's expenses with category
                branchEq(supabase.from('expenses').select('amount, expense_categories(name)').eq('company_id', company.id).gte('date', monthStartStr)),
                // Low stock items
                supabase.from('branch_products').select('stock, min_stock_level, branch_id, products!inner(id, name, primary_sku, min_stock, cost_price, company_id)').eq('products.company_id', company.id).lt('stock', 1).limit(15),
                // All customers (for receivables aggregates — lightweight)
                supabase.from('customers').select('id, name, phone, current_balance, created_at').eq('company_id', company.id),
                // Recent 5 sales
                branchEq(supabase.from('sales').select('id, total_amount, type, status, created_at, customers(name)').eq('company_id', company.id)).order('created_at', { ascending: false }).limit(5),
                // Credit customers (top 3)
                supabase.from('customers').select('id, name, phone, current_balance').eq('company_id', company.id).gt('current_balance', 0).order('current_balance', { ascending: false }).limit(3),
                // Count total customers
                supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
                // New customers this month
                supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', company.id).gte('created_at', monthStartStr),
                // 30-day sales for trend (date + total only)
                branchEq(supabase.from('sales').select('created_at, total_amount').eq('company_id', company.id).gte('created_at', thirtyDaysAgoStr).neq('status', 'cancelled')),
            ]);

            const todaySales = todaySalesRes.data || [];
            const monthSalesList = monthSalesRes.data || [];
            const monthExpList = monthExpRes.data || [];
            const allCustomers = customersRes.data || [];
            const trend30dList = trend30dRes.data || [];

            // Branch filter for low stock (API already filters by branch if set)
            const lowStockBp = (lowStockRes.data || []).filter((bp: any) =>
                !branch?.id || bp.branch_id === branch.id
            );

            const todayExpTotal = (todayExpRes.data || []).reduce((s: number, e: any) => s + Number(e.amount), 0);
            const monthExpTotal = monthExpList.reduce((s: number, e: any) => s + Number(e.amount), 0);
            const creditDue = allCustomers.reduce((s: number, c: any) => s + Number(c.current_balance || 0), 0);

            const categorySums: Record<string, number> = {};
            monthExpList.forEach((e: any) => {
                const name = (e.expense_categories as any)?.name || 'Uncategorized';
                categorySums[name] = (categorySums[name] || 0) + Number(e.amount);
            });

            // Build trend maps
            const trendMap7d: Record<string, number> = {};
            const trendMap30d: Record<string, number> = {};
            trend30dList.forEach((s: any) => {
                const d = s.created_at?.split('T')[0] || '';
                trendMap30d[d] = (trendMap30d[d] || 0) + Number(s.total_amount);
                if (d >= sevenDaysAgoStr) trendMap7d[d] = (trendMap7d[d] || 0) + Number(s.total_amount);
            });

            // Inventory value (from low stock query is limited; do separate aggregation)
            const invRes = await branchEq(
                supabase.from('branch_products').select('stock, products!inner(cost_price, company_id)').eq('products.company_id', company.id)
            );
            const inventoryValue = (invRes.data || []).reduce((s: number, bp: any) =>
                s + Number(bp.stock) * Number((bp.products as any)?.cost_price || 0), 0);

            return {
                stats: {
                    todaySales: todaySales.reduce((s: number, r: any) => s + Number(r.total_amount), 0),
                    todayProfit: todaySales.reduce((s: number, r: any) => s + Number(r.total_amount), 0) - todayExpTotal,
                    todayExpenses: todayExpTotal,
                    monthSales: monthSalesList.reduce((s: number, r: any) => s + Number(r.total_amount), 0),
                    monthExpenses: monthExpTotal,
                    topExpenseCategory: Object.entries(categorySums).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None',
                    lowStockCount: lowStockBp.length,
                    outOfStockCount: lowStockBp.filter((bp: any) => Number(bp.stock) <= 0).length,
                    creditDue,
                    totalPayables: 0,
                    inventoryValue,
                    salesChange: 0, profitChange: 0,
                    totalCustomers: totalCustomersRes.count || allCustomers.length,
                    customersWithBalanceCount: (creditCustRes.data || []).length,
                    newCustomersMonth: newCustRes.count || 0,
                },
                lowStockItems: lowStockBp.slice(0, 10).map((bp: any) => ({
                    id: (bp.products as any)?.id,
                    name: (bp.products as any)?.name,
                    primary_sku: (bp.products as any)?.primary_sku,
                    min_stock: (bp.products as any)?.min_stock || 10,
                    stock: bp.stock,
                })),
                recentSales: (recentSalesRes.data || []).map((s: any) => ({ ...s })),
                salesTrend7d: Object.entries(trendMap7d).sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => ({ label: new Date(d).toLocaleDateString('en', { weekday: 'short' }), value: v, profit: 0 })),
                salesTrend30d: Object.entries(trendMap30d).sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => ({ label: new Date(d).toLocaleDateString('en', { day: 'numeric' }), value: v, profit: 0 })),
                creditCustomers: creditCustRes.data || [],
                topSellingProducts: [],
            };
        },
        enabled: !!company?.id,
    });
};
