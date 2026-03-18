import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface DateRange {
    start: Date;
    end: Date;
}

export const useAdvancedReports = (range: DateRange, branchIdOverride?: string | null) => {
    const { company, branch: contextBranch, isAdmin, isSuperAdmin } = useAuth();

    // Determine which branch to filter by (Override > Context)
    // If Admin/SuperAdmin and branch is null, it's consolidated
    const effectiveBranchId = (branchIdOverride !== undefined) ? branchIdOverride : contextBranch?.id;

    const startDate = range.start.toISOString();
    const endDate = range.end.toISOString();

    return useQuery({
        queryKey: ['advanced-reports', company?.id, effectiveBranchId, startDate, endDate],
        queryFn: async () => {
            if (!company?.id) throw new Error('No company ID');

            // 1. Fetch Current Period Data
            const { data: sales, error: salesError } = await fetchSales(company.id, effectiveBranchId, range.start, range.end);
            if (salesError) throw salesError;

            // 2. Fetch Previous Period Data (for comparison)
            const prevRange = getPreviousPeriod(range.start, range.end);
            const { data: prevSales, error: prevSalesError } = await fetchSales(company.id, effectiveBranchId, prevRange.start, prevRange.end);

            // 3. Fetch Expenses
            const { data: expenses, error: expError } = await fetchExpenses(company.id, effectiveBranchId, range.start, range.end);
            const { data: prevExpenses } = await fetchExpenses(company.id, effectiveBranchId, prevRange.start, prevRange.end);

            // 4. Fetch Products with Branch Stock (for Inventory Valuation)
            let bpQuery = supabase
                .from('branch_products')
                .select(`
                    stock,
                    branch_id,
                    product_id,
                    products!inner(id, name, cost_price, sale_price, category_id, company_id)
                `)
                .eq('products.company_id', company.id);

            if (effectiveBranchId) {
                bpQuery = bpQuery.eq('branch_id', effectiveBranchId);
            }

            const { data: branchProducts, error: bpError } = await bpQuery;
            if (bpError) throw bpError;

            // Group by Product ID for the metrics calculation
            const productStockMap = new Map<string, any>();
            (branchProducts || []).forEach((bp: any) => {
                const p = bp.products;
                if (!p) return;

                if (!productStockMap.has(p.id)) {
                    productStockMap.set(p.id, {
                        id: p.id,
                        name: p.name,
                        cost_price: Number(p.cost_price || 0),
                        sale_price: Number(p.sale_price || 0),
                        stock: 0
                    });
                }
                productStockMap.get(p.id).stock += Number(bp.stock || 0);
            });

            const products = Array.from(productStockMap.values());

            const { data: inventoryLogs, error: logError } = await supabase.from('stock_movements')
                .select('*')
                .eq('company_id', company.id)
                .gte('created_at', formatStartOfDay(range.start))
                .lte('created_at', formatEndOfDay(range.end));
            if (logError) throw logError;

            // 5. Fetch Unpaid Invoices (for Receivables Aging)
            const { data: unpaidInvoices, error: unpaidError } = await supabase.from('sales')
                .select('*, customers(name), branches(name)')
                .eq('company_id', company.id)
                .gt('balance_due', 0)
                .order('created_at', { ascending: true });
            if (unpaidError) throw unpaidError;

            // 6. Fetch Customers
            const { data: customers, error: custError } = await supabase.from('customers').select('*').eq('company_id', company.id);
            if (custError) throw custError;

            // 7. Fetch Total Payables (from financial summary)
            const { data: finSummaryData } = await supabase.rpc('get_financial_summary', {
                p_company_id: company.id,
                p_branch_id: effectiveBranchId || null,
            });
            const totalPayables = Number(finSummaryData?.[0]?.total_payables || 0);

            // --- Aggregations ---

            // A. SALES SUMMARY & P&L
            const currentMetrics = calculateMetrics(sales, expenses);
            const prevMetrics = calculateMetrics(prevSales, prevExpenses);

            // Sales Trend
            const trend = calculateTrend(sales, range.start, range.end);

            // Sales by Product & Category
            const { byProduct, byCategory } = calculateSalesBreakdown(sales);

            // Sales by Payment Method
            const paymentMethods = calculatePaymentMethods(sales);

            // C. EXPENSE REPORTS
            const expenseBreakdown = calculateExpensesBreakdown(expenses);

            // D. INVENTORY REPORTS
            const inventory = calculateInventoryMetrics(products, inventoryLogs);

            // E. CUSTOMER REPORTS
            const topCustomers = calculateTopCustomers(sales, customers);
            const receivables = calculateReceivables(unpaidInvoices);

            // F. FINANCIAL SUMMARY (Executive Dashboard)
            const financials = {
                revenue: currentMetrics.revenue,
                expenses: currentMetrics.expenses,
                cogs: currentMetrics.cogs,
                netProfit: currentMetrics.netProfit,
                grossProfit: currentMetrics.grossProfit,
                profitMargin: currentMetrics.profitMargin,
                expenseRatio: currentMetrics.revenue > 0 ? (currentMetrics.expenses / currentMetrics.revenue) * 100 : 0,
                revenueChange: calculateGrowth(currentMetrics.revenue, prevMetrics.revenue),
                profitChange: calculateGrowth(currentMetrics.netProfit, prevMetrics.netProfit),
                stockValue: inventory.valuation.cost,
                totalReceivables: (customers || []).reduce((sum, c) => sum + Number(c.current_balance || 0), 0),
                totalPayables,
            };

            return {
                summary: financials,
                sales: {
                    metrics: currentMetrics,
                    trend,
                    byProduct,
                    byCategory,
                    paymentMethods,
                    detailed: (sales || []).flatMap(s =>
                        (s.sale_items || []).map((si: any) => ({
                            id: si.id,
                            date: s.created_at,
                            invoice: s.invoice_number || s.id.substring(0, 8),
                            customer: s.customers?.name || 'Walk-in',
                            product: si.product?.name || si.product_name,
                            quantity: si.quantity,
                            unitPrice: si.unit_price,
                            total: si.total_price,
                            status: s.payment_status || s.status || 'Paid'
                        }))
                    ),
                    count: sales?.length || 0
                },
                inventory,
                expenses: expenseBreakdown,
                financials: {
                    ...currentMetrics,
                    receivables,
                    stockValue: inventory.valuation.cost
                },
                customers: {
                    top: topCustomers,
                    receivables
                }
            };
        },
        enabled: !!company?.id,
    });
};

// --- Helper Logic ---

async function fetchSales(companyId: string, branchId: string | null | undefined, start: Date, end: Date) {
    let q = supabase.from('sales').select(`*, sale_items(*, product:products(name, category_id, categories(name))), customers(name)`)
        .eq('company_id', companyId)
        .gte('created_at', formatStartOfDay(start))
        .lte('created_at', formatEndOfDay(end));

    if (branchId) q = q.eq('branch_id', branchId);
    return await q;
}

async function fetchExpenses(companyId: string, branchId: string | null | undefined, start: Date, end: Date) {
    let q = supabase.from('expenses').select('*, expense_categories(name)')
        .eq('company_id', companyId)
        .gte('date', formatStartOfDay(start))
        .lte('date', formatEndOfDay(end));

    if (branchId) q = q.eq('branch_id', branchId);
    return await q;
}

function calculateMetrics(sales: any[] | null, expenses: any[] | null) {
    const revenue = (sales || []).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const paid = (sales || []).reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);
    const unpaid = (sales || []).reduce((sum, s) => sum + Number(s.balance_due || 0), 0);

    let cogs = 0;
    sales?.forEach(s => {
        s.sale_items?.forEach((si: any) => {
            cogs += Number(si.cost_price || 0) * Number(si.quantity || 1);
        });
    });

    const expTotal = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expTotal;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return { revenue, paid, unpaid, cogs, expenses: expTotal, grossProfit, netProfit, profitMargin };
}

function calculateTrend(sales: any[] | null, start: Date, end: Date) {
    const trendMap = new Map<string, { date: string; revenue: number; profit: number }>();

    // Fill buckets based on range size
    const days = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
    const step = days > 60 ? 'month' : (days > 14 ? 'week' : 'day');

    (sales || []).forEach(s => {
        const d = new Date(s.created_at);
        let key = d.toISOString().split('T')[0];
        if (step === 'month') key = key.substring(0, 7);

        let cogs = 0;
        s.sale_items?.forEach((si: any) => cogs += Number(si.cost_price || 0) * Number(si.quantity || 1));

        const cur = trendMap.get(key) || { date: key, revenue: 0, profit: 0 };
        cur.revenue += Number(s.total_amount || 0);
        cur.profit += (Number(s.total_amount || 0) - cogs);
        trendMap.set(key, cur);
    });

    return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateSalesBreakdown(sales: any[] | null) {
    const productMap = new Map<string, any>();
    const categoryMap = new Map<string, any>();

    sales?.forEach(s => {
        s.sale_items?.forEach((item: any) => {
            const pid = item.product_id;
            const catName = item.product?.categories?.name || 'Uncategorized';

            const p = productMap.get(pid) || { name: item.product_name, category: item.product?.categories?.name || 'Uncategorized', qty: 0, revenue: 0, profit: 0 };
            p.qty += item.quantity;
            p.revenue += Number(item.total_price);
            p.profit += Number(item.total_price) - (Number(item.cost_price) * item.quantity);
            productMap.set(pid, p);

            const c = categoryMap.get(catName) || { name: catName, revenue: 0, profit: 0 };
            c.revenue += Number(item.total_price);
            c.profit += Number(item.total_price) - (Number(item.cost_price) * item.quantity);
            categoryMap.set(catName, c);
        });
    });

    return {
        byProduct: Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue),
        byCategory: Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue)
    };
}

function calculatePaymentMethods(sales: any[] | null) {
    const map = new Map<string, { label: string; value: number }>();
    sales?.forEach(s => {
        const method = s.type || 'Cash';
        const cur = map.get(method) || { label: method, value: 0 };
        cur.value += Number(s.total_amount);
        map.set(method, cur);
    });
    return Array.from(map.values());
}

function calculateExpensesBreakdown(expenses: any[] | null) {
    const map = new Map<string, { category: string; amount: number; count: number }>();
    expenses?.forEach(e => {
        const cat = e.expense_categories?.name || 'Uncategorized';
        const cur = map.get(cat) || { category: cat, amount: 0, count: 0 };
        cur.amount += Number(e.amount);
        cur.count++;
        map.set(cat, cur);
    });
    return {
        byCategory: Array.from(map.values()).sort((a, b) => b.amount - a.amount),
        total: (expenses || []).length
    };
}

function calculateInventoryMetrics(products: any[] | null, logs: any[] | null) {
    let cost = 0, retail = 0;
    const movements: any[] = [];

    (products || []).forEach(p => {
        const s = Number(p.stock || 0);
        const c = Number(p.cost_price || 0);
        const r = Number(p.sale_price || 0);

        cost += (s * c);
        retail += (s * r);

        const pLogs = logs?.filter(l => l.product_id === p.id) || [];
        movements.push({
            name: p.name,
            opening: s - pLogs.reduce((acc, l) => acc + Number(l.qty_change || 0), 0),
            sold: Math.abs(pLogs.filter(l => l.type === 'sale').reduce((acc, l) => acc + Number(l.qty_change || 0), 0)),
            purchased: pLogs.filter(l => l.type === 'purchase').reduce((acc, l) => acc + Number(l.qty_change || 0), 0),
            adjusted: pLogs.filter(l => l.type === 'adjustment').reduce((acc, l) => acc + Number(l.qty_change || 0), 0),
            closing: s,
            unitPrice: c,
            value: s * c
        });
    });

    return { valuation: { cost, retail }, movements, lowStock: (products || []).filter(p => Number(p.stock || 0) <= 10) };
}

function calculateTopCustomers(sales: any[] | null, customers: any[] | null) {
    const map = new Map<string, any>();
    sales?.forEach(s => {
        if (!s.customer_id) return;
        const cur = map.get(s.customer_id) || { name: s.customers?.name, revenue: 0, profit: 0, count: 0, balance: 0 };

        let profit = 0;
        s.sale_items?.forEach((si: any) => {
            profit += (Number(si.total_price || 0) - (Number(si.cost_price || 0) * Number(si.quantity || 1)));
        });

        cur.revenue += Number(s.total_amount || 0);
        cur.profit += profit;
        cur.count++;
        map.set(s.customer_id, cur);
    });

    // Add current balance from customers table
    customers?.forEach(c => {
        if (map.has(c.id)) {
            map.get(c.id).balance = Number(c.current_balance || 0);
        }
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
}

function calculateReceivables(unpaidInvoices: any[] | null) {
    const map = new Map<string, { name: string; balance: number; oldest_date: string; branch: string; overdue_days: number }>();

    unpaidInvoices?.forEach(s => {
        const cid = s.customer_id;
        if (!cid) return;

        const cur = map.get(cid) || {
            name: s.customers?.name || 'Unknown',
            balance: 0,
            oldest_date: s.created_at,
            branch: s.branches?.name || 'Main',
            overdue_days: 0
        };

        cur.balance += Number(s.balance_due || 0);
        // oldest_date is already set by the first (oldest) invoice because of the ASC sort in query
        map.set(cid, cur);
    });

    const now = new Date();
    return Array.from(map.values()).map(r => {
        const oldest = new Date(r.oldest_date);
        const diffTime = Math.abs(now.getTime() - oldest.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...r, overdue_days: diffDays };
    }).sort((a, b) => b.balance - a.balance);
}

function getPreviousPeriod(start: Date, end: Date) {
    const diff = end.getTime() - start.getTime();
    return {
        start: new Date(start.getTime() - diff),
        end: new Date(end.getTime() - diff)
    };
}

function calculateGrowth(cur: number, prev: number) {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / prev) * 100;
}

// Helpers
function formatStartOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}

function formatEndOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
}
