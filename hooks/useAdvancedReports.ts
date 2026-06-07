import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface DateRange {
    start: Date;
    end: Date;
}

export const useAdvancedReports = (range: DateRange, branchIdOverride?: string | null) => {
    const { company, branch: contextBranch } = useAuth();

    const effectiveBranchId = (branchIdOverride !== undefined) ? branchIdOverride : contextBranch?.id;

    const startDate = range.start.toISOString();
    const endDate = range.end.toISOString();

    return useQuery({
        queryKey: ['advanced-reports', company?.id, effectiveBranchId, startDate, endDate],
        queryFn: async () => {
            if (!company?.id) throw new Error('No company ID');

            const prevRange = getPreviousPeriod(range.start, range.end);

            // --- Parallelize ALL data fetching ---
            const [
                salesRes,
                prevSalesRes,
                expensesRes,
                prevExpensesRes,
                bpRes,
                logsRes,
                unpaidRes,
                custRes,
                finRes,
                purchasesRes,
                prevPurchasesRes,
                returnsRes,
                branchesRes,
            ] = await Promise.all([
                fetchSales(company.id, effectiveBranchId, range.start, range.end),
                fetchSales(company.id, effectiveBranchId, prevRange.start, prevRange.end),
                fetchExpenses(company.id, effectiveBranchId, range.start, range.end),
                fetchExpenses(company.id, effectiveBranchId, prevRange.start, prevRange.end),
                // Fetch branch_products with min_stock_level for accurate low-stock calculation
                supabase.from('branch_products').select(`
                    stock, branch_id, product_id, min_stock_level,
                    products!inner(id, name, cost_price, sale_price, category_id, company_id)
                `).eq('products.company_id', company.id).filter('branch_id', effectiveBranchId ? 'eq' : 'neq', effectiveBranchId || '00000000-0000-0000-0000-000000000000'),
                // Limit stock_movements to avoid huge payloads
                supabase.from('stock_movements').select('*').eq('company_id', company.id)
                    .gte('created_at', formatStartOfDay(range.start))
                    .lte('created_at', formatEndOfDay(range.end))
                    .limit(5000),
                supabase.from('sales').select('*, customers(name), branches(name)').eq('company_id', company.id).gt('balance_due', 0).order('created_at', { ascending: true }),
                supabase.from('customers').select('*').eq('company_id', company.id),
                supabase.rpc('get_financial_summary', { p_company_id: company.id, p_branch_id: effectiveBranchId || null }),
                // Purchases data
                fetchPurchases(company.id, effectiveBranchId, range.start, range.end),
                fetchPurchases(company.id, effectiveBranchId, prevRange.start, prevRange.end),
                // Returns / Refunds
                supabase.from('returns').select('*, return_items(*, product:products(name))')
                    .eq('company_id', company.id)
                    .gte('created_at', formatStartOfDay(range.start))
                    .lte('created_at', formatEndOfDay(range.end)),
                // All branches for the company (for branch performance)
                supabase.from('branches').select('id, name').eq('company_id', company.id),
            ]);

            const sales = salesRes.data;
            const prevSales = prevSalesRes.data;
            const expenses = expensesRes.data;
            const prevExpenses = prevExpensesRes.data;
            const branchProducts = bpRes.data;
            const inventoryLogs = logsRes.data;
            const unpaidInvoices = unpaidRes.data;
            const customers = custRes.data;
            const finSummaryData = finRes.data;
            const purchases = purchasesRes.data;
            const prevPurchasesList = prevPurchasesRes.data;
            const returnsList = returnsRes.data || [];
            const branches = branchesRes.data || [];

            if (bpRes.error) throw bpRes.error;
            if (logsRes.error) throw logsRes.error;

            // Group by Product ID for stock aggregation
            const productStockMap = new Map<string, any>();
            (branchProducts || []).forEach((bp: any) => {
                const p = bp.products;
                if (!p) return;
                const pid = p.id;
                const cur = productStockMap.get(pid) || {
                    id: p.id,
                    name: p.name,
                    cost_price: Number(p.cost_price || 0),
                    sale_price: Number(p.sale_price || 0),
                    stock: 0,
                    min_stock_level: 0, // Use per-product threshold
                };
                cur.stock += Number(bp.stock || 0);
                // Use the highest min_stock_level across branches (conservative)
                cur.min_stock_level = Math.max(cur.min_stock_level, Number(bp.min_stock_level || 5));
                productStockMap.set(pid, cur);
            });

            const products = Array.from(productStockMap.values());
            const totalPayables = Number(finSummaryData?.[0]?.total_payables || 0);

            // --- Aggregations ---
            const currentMetrics = calculateMetrics(sales, expenses);
            const prevMetrics = calculateMetrics(prevSales, prevExpenses);
            const currentPurchaseMetrics = calculatePurchaseMetrics(purchases);
            const prevPurchaseMetrics = calculatePurchaseMetrics(prevPurchasesList);

            const trend = calculateTrend(sales, range.start, range.end);
            const { byProduct, byCategory, profitByProduct } = calculateSalesBreakdown(sales, products);
            const paymentMethods = calculatePaymentMethods(sales);
            const expenseBreakdown = calculateExpensesBreakdown(expenses);
            const inventory = calculateInventoryMetrics(products, inventoryLogs, sales);
            const topCustomers = calculateTopCustomers(sales, customers);
            const receivables = calculateReceivables(unpaidInvoices);
            const returnsData = calculateReturnsBreakdown(returnsList);
            const branchPerformance = calculateBranchPerformance(sales, expenses, branches);

            // Days in selected range for averages
            const daysInRange = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / (1000 * 3600 * 24)));

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
                expensesChange: calculateGrowth(currentMetrics.expenses, prevMetrics.expenses),
                stockValue: inventory.valuation.cost,
                totalReceivables: (customers || []).reduce((sum, c) => sum + Number(c.current_balance || 0), 0),
                totalPayables,
                avgDailySales: currentMetrics.revenue / daysInRange,
                salesCount: (sales || []).length,
                prevSalesCount: (prevSales || []).length,
            };

            return {
                summary: financials,
                sales: {
                    metrics: currentMetrics,
                    prevMetrics,
                    trend,
                    byProduct,
                    byCategory,
                    paymentMethods,
                    profitByProduct,
                    avgDailySales: currentMetrics.revenue / daysInRange,
                    daysInRange,
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
                purchases: {
                    metrics: currentPurchaseMetrics,
                    prevMetrics: prevPurchaseMetrics,
                    change: calculateGrowth(currentPurchaseMetrics.total, prevPurchaseMetrics.total),
                    list: purchases || [],
                    bySupplier: calculatePurchasesBySupplier(purchases),
                    detailed: (purchases || []).flatMap((p: any) =>
                        (p.purchase_items || []).map((pi: any) => ({
                            date: p.created_at,
                            supplier: p.suppliers?.name || 'Unknown',
                            product: pi.product?.name || pi.product_name || '—',
                            quantity: pi.quantity,
                            unitCost: pi.unit_cost,
                            total: pi.total_cost ?? (Number(pi.quantity || 0) * Number(pi.unit_cost || 0)),
                            status: p.payment_status || 'Paid',
                        }))
                    ),
                },
                financials: {
                    ...currentMetrics,
                    receivables,
                    stockValue: inventory.valuation.cost
                },
                customers: {
                    top: topCustomers,
                    receivables
                },
                returns: returnsData,
                branches: branchPerformance,
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

async function fetchPurchases(companyId: string, branchId: string | null | undefined, start: Date, end: Date) {
    let q = supabase.from('purchases').select(`
        *, 
        suppliers(name), 
        purchase_items(*, product:products(name))
    `)
        .eq('company_id', companyId)
        .gte('created_at', formatStartOfDay(start))
        .lte('created_at', formatEndOfDay(end));
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

function calculatePurchaseMetrics(purchases: any[] | null) {
    const total = (purchases || []).reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    const paid = (purchases || []).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
    const unpaid = (purchases || []).reduce((sum, p) => sum + Math.max(0, Number(p.total_amount || 0) - Number(p.amount_paid || 0)), 0);
    return { total, paid, unpaid, count: (purchases || []).length };
}

function calculatePurchasesBySupplier(purchases: any[] | null) {
    const map = new Map<string, { name: string; total: number; count: number }>();
    (purchases || []).forEach(p => {
        const name = p.suppliers?.name || 'Unknown';
        const cur = map.get(name) || { name, total: 0, count: 0 };
        cur.total += Number(p.total_amount || 0);
        cur.count++;
        map.set(name, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function calculateTrend(sales: any[] | null, start: Date, end: Date) {
    const trendMap = new Map<string, { date: string; revenue: number; profit: number }>();

    const days = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
    // Fixed: properly assign week/day/month steps
    const step = days > 60 ? 'month' : days > 14 ? 'week' : 'day';

    (sales || []).forEach(s => {
        const d = new Date(s.created_at);
        let key: string;
        if (step === 'month') {
            key = d.toISOString().substring(0, 7); // YYYY-MM
        } else if (step === 'week') {
            // Get ISO week start (Monday)
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay() + 1);
            key = weekStart.toISOString().split('T')[0];
        } else {
            key = d.toISOString().split('T')[0]; // YYYY-MM-DD
        }

        let cogs = 0;
        s.sale_items?.forEach((si: any) => cogs += Number(si.cost_price || 0) * Number(si.quantity || 1));

        const cur = trendMap.get(key) || { date: key, revenue: 0, profit: 0 };
        cur.revenue += Number(s.total_amount || 0);
        cur.profit += (Number(s.total_amount || 0) - cogs);
        trendMap.set(key, cur);
    });

    return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateSalesBreakdown(sales: any[] | null, products: any[]) {
    const productMap = new Map<string, any>();
    const categoryMap = new Map<string, any>();

    sales?.forEach(s => {
        s.sale_items?.forEach((item: any) => {
            const pid = item.product_id;
            const catName = item.product?.categories?.name || 'Uncategorized';

            const p = productMap.get(pid) || { name: item.product_name, category: catName, qty: 0, revenue: 0, profit: 0, cost: 0 };
            p.qty += item.quantity;
            p.revenue += Number(item.total_price);
            p.cost += Number(item.cost_price || 0) * item.quantity;
            p.profit += Number(item.total_price) - (Number(item.cost_price || 0) * item.quantity);
            productMap.set(pid, p);

            const c = categoryMap.get(catName) || { name: catName, revenue: 0, profit: 0 };
            c.revenue += Number(item.total_price);
            c.profit += Number(item.total_price) - (Number(item.cost_price || 0) * item.quantity);
            categoryMap.set(catName, c);
        });
    });

    const byProductSorted = Array.from(productMap.values())
        .map(p => ({ ...p, margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0 }))
        .sort((a, b) => b.revenue - a.revenue);

    // Profit per product (sorted by profit)
    const profitByProduct = [...byProductSorted].sort((a, b) => b.profit - a.profit);

    return {
        byProduct: byProductSorted,
        byCategory: Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue),
        profitByProduct,
    };
}

function calculatePaymentMethods(sales: any[] | null) {
    const map = new Map<string, { label: string; value: number; count: number }>();
    sales?.forEach(s => {
        const method = s.type || 'Cash';
        const cur = map.get(method) || { label: method, value: 0, count: 0 };
        cur.value += Number(s.total_amount);
        cur.count++;
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

function calculateInventoryMetrics(products: any[], logs: any[] | null, sales: any[] | null) {
    let cost = 0, retail = 0;
    const movements: any[] = [];

    // Total units sold per product (for turnover rate)
    const soldMap = new Map<string, number>();
    sales?.forEach(s => {
        s?.sale_items?.forEach((si: any) => {
            soldMap.set(si.product_id, (soldMap.get(si.product_id) || 0) + Number(si.quantity || 0));
        });
    });

    (products || []).forEach(p => {
        const s = Number(p.stock || 0);
        const c = Number(p.cost_price || 0);
        const r = Number(p.sale_price || 0);

        cost += (s * c);
        retail += (s * r);

        const pLogs = logs?.filter(l => l.product_id === p.id) || [];
        const unitsSold = soldMap.get(p.id) || 0;
        // Turnover rate: units sold / average stock (use current stock as proxy)
        const avgStock = s + unitsSold / 2;
        const turnoverRate = avgStock > 0 ? unitsSold / avgStock : 0;

        movements.push({
            name: p.name,
            opening: s - pLogs.reduce((acc, l) => acc + Number(l.qty_change || 0), 0),
            sold: Math.abs(pLogs.filter(l => l.type === 'sale').reduce((acc, l) => acc + Number(l.qty_change || 0), 0)),
            purchased: pLogs.filter(l => l.type === 'purchase').reduce((acc, l) => acc + Number(l.qty_change || 0), 0),
            adjusted: pLogs.filter(l => l.type === 'adjustment').reduce((acc, l) => acc + Number(l.qty_change || 0), 0),
            closing: s,
            unitPrice: c,
            value: s * c,
            turnoverRate: turnoverRate.toFixed(2),
        });
    });

    // Fix: use per-product min_stock_level instead of hardcoded 10
    const lowStock = (products || []).filter(p => Number(p.stock || 0) <= Number(p.min_stock_level || 5));

    return {
        valuation: { cost, retail },
        movements: movements.sort((a, b) => b.value - a.value),
        lowStock,
    };
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
        map.set(cid, cur);
    });

    const now = new Date();
    return Array.from(map.values()).map(r => {
        const oldest = new Date(r.oldest_date);
        const diffDays = Math.ceil(Math.abs(now.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24));
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

function calculateReturnsBreakdown(returns: any[]) {
    const byType = new Map<string, { type: string; count: number; total: number }>();
    const byReason = new Map<string, { reason: string; count: number; total: number }>();
    const byProduct = new Map<string, { name: string; qty: number; total: number }>();

    let customerTotal = 0;
    let supplierTotal = 0;

    returns.forEach(r => {
        const type = r.type === 'customer_return' ? 'Customer Return' : 'Supplier Return';
        const amount = Number(r.total_amount || 0);

        if (r.type === 'customer_return') customerTotal += amount;
        else supplierTotal += amount;

        const curType = byType.get(type) || { type, count: 0, total: 0 };
        curType.count++;
        curType.total += amount;
        byType.set(type, curType);

        const reason = r.reason || 'No reason given';
        const curReason = byReason.get(reason) || { reason, count: 0, total: 0 };
        curReason.count++;
        curReason.total += amount;
        byReason.set(reason, curReason);

        (r.return_items || []).forEach((item: any) => {
            const name = item.product?.name || item.product_name || 'Unknown';
            const cur = byProduct.get(name) || { name, qty: 0, total: 0 };
            cur.qty += Number(item.quantity || 0);
            cur.total += Number(item.total_amount || 0);
            byProduct.set(name, cur);
        });
    });

    return {
        totalReturns: returns.length,
        totalAmount: customerTotal + supplierTotal,
        customerTotal,
        supplierTotal,
        byType: Array.from(byType.values()),
        byReason: Array.from(byReason.values()).sort((a, b) => b.count - a.count),
        byProduct: Array.from(byProduct.values()).sort((a, b) => b.total - a.total),
        detailed: returns.map(r => ({
            date: r.created_at,
            type: r.type === 'customer_return' ? 'Customer' : 'Supplier',
            reason: r.reason || '—',
            refundMethod: r.refund_method?.replace(/_/g, ' ') || '—',
            total: Number(r.total_amount || 0),
            status: r.status,
        })),
    };
}

function calculateBranchPerformance(sales: any[] | null, expenses: any[] | null, branches: any[]) {
    const branchMap = new Map<string, {
        id: string; name: string;
        revenue: number; cogs: number; grossProfit: number;
        expenses: number; netProfit: number; orders: number;
    }>();

    // Seed all known branches
    branches.forEach(b => {
        branchMap.set(b.id, {
            id: b.id, name: b.name,
            revenue: 0, cogs: 0, grossProfit: 0,
            expenses: 0, netProfit: 0, orders: 0,
        });
    });

    (sales || []).forEach(s => {
        const bid = s.branch_id || 'unassigned';
        const cur = branchMap.get(bid) || {
            id: bid, name: s.branches?.name || 'Unassigned',
            revenue: 0, cogs: 0, grossProfit: 0,
            expenses: 0, netProfit: 0, orders: 0,
        };
        const revenue = Number(s.total_amount || 0);
        let cogs = 0;
        s.sale_items?.forEach((si: any) => {
            cogs += Number(si.cost_price || 0) * Number(si.quantity || 1);
        });
        cur.revenue += revenue;
        cur.cogs += cogs;
        cur.grossProfit += revenue - cogs;
        cur.orders++;
        branchMap.set(bid, cur);
    });

    (expenses || []).forEach(e => {
        const bid = e.branch_id || 'unassigned';
        if (branchMap.has(bid)) {
            const cur = branchMap.get(bid)!;
            cur.expenses += Number(e.amount || 0);
        }
    });

    return Array.from(branchMap.values()).map(b => ({
        ...b,
        netProfit: b.grossProfit - b.expenses,
        profitMargin: b.revenue > 0 ? ((b.grossProfit - b.expenses) / b.revenue) * 100 : 0,
        avgOrderValue: b.orders > 0 ? b.revenue / b.orders : 0,
    })).sort((a, b) => b.revenue - a.revenue);
}
