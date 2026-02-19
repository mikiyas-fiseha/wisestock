import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface DateRange {
    start: Date;
    end: Date;
}

export const useAdvancedReports = (range: DateRange) => {
    const { company } = useAuth();
    const startDate = range.start.toISOString();
    const endDate = range.end.toISOString();

    return useQuery({
        queryKey: ['advanced-reports', company?.id, startDate, endDate],
        queryFn: async () => {
            if (!company?.id) throw new Error('No company ID');

            const startStr = range.start.toISOString().split('T')[0];
            const endStr = range.end.toISOString().split('T')[0];

            // 1. Fetch Sales & Sale Items for the Range
            // We need sale items to calculate profit (since cost is often on items)
            const { data: sales, error: salesError } = await supabase
                .from('sales')
                .select(`
                    *,
                    sale_items (
                        *,
                        product:products(name)
                    ),
                    customer:customers(name)
                `)
                .eq('company_id', company.id)
                .gte('created_at', formatStartOfDay(range.start))
                .lte('created_at', formatEndOfDay(range.end))
                .order('created_at', { ascending: false });

            if (salesError) throw salesError;

            // 2. Fetch All Products (For Inventory & Valuation)
            const { data: products, error: productsError } = await supabase
                .from('products')
                .select('*')
                .eq('company_id', company.id);

            if (productsError) throw productsError;

            // 3. Fetch Customers (For Financials / Receivables)
            const { data: customers, error: customersError } = await supabase
                .from('customers')
                .select('*')
                .eq('company_id', company.id)
                .gt('current_balance', 0) // Only those who owe money
                .order('current_balance', { ascending: false });

            if (customersError) throw customersError;

            // --- Aggregations ---

            // A. SALES REPORTS
            // 1. Sales Trend (Dynamic Aggregation)
            const daysDiff = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24);
            let granularity: 'day' | 'week' | 'month' = 'day';

            if (daysDiff > 60) granularity = 'month'; // Custom Range > 2 Months
            else if (daysDiff > 25) granularity = 'week'; // Monthly View (approx 30 days)

            const salesTrendMap = new Map<string, { date: string; label: string; revenue: number; profit: number; count: number }>();

            const getBucketKey = (date: Date): { key: string; label: string } => {
                const d = new Date(date);
                if (granularity === 'month') {
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    const label = d.toLocaleDateString('default', { month: 'short', year: '2-digit' });
                    return { key, label };
                } else if (granularity === 'week') {
                    const day = d.getDay();
                    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
                    d.setDate(diff);
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const label = `${d.getDate()}/${d.getMonth() + 1}`;
                    return { key, label };
                } else {
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    let label = `${d.getDate()}`;
                    if (d.getDate() === 1) label = `${d.getDate()}/${d.getMonth() + 1}`; // Show month on 1st
                    return { key, label };
                }
            };

            // Pre-fill buckets
            let currentDate = new Date(range.start);
            // Ensure strictly start of day for iteration
            currentDate.setHours(0, 0, 0, 0);

            if (granularity === 'week') {
                const day = currentDate.getDay();
                const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // Monday start
                currentDate.setDate(diff);
            }

            const endDateLoop = new Date(range.end);
            endDateLoop.setHours(23, 59, 59, 999);

            while (currentDate <= endDateLoop) {
                const { key, label } = getBucketKey(currentDate);
                if (!salesTrendMap.has(key)) {
                    salesTrendMap.set(key, { date: key, label, revenue: 0, profit: 0, count: 0 });
                }

                // Increment
                if (granularity === 'month') {
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    currentDate.setDate(1); // align to 1st
                } else if (granularity === 'week') {
                    if (currentDate.getDay() !== 1) { // Align to Next loop's Monday if checking
                        // Actually better to just add 7 days from current "Monday" aligned date
                        currentDate.setDate(currentDate.getDate() + 7);
                    } else {
                        currentDate.setDate(currentDate.getDate() + 7);
                    }
                } else {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }

            sales?.forEach(sale => {
                const saleDate = new Date(sale.created_at);
                const { key } = getBucketKey(saleDate);

                const current = salesTrendMap.get(key);
                if (current) {
                    const revenue = sale.total_amount || 0;
                    let cost = 0;
                    sale.sale_items?.forEach((item: any) => {
                        cost += (item.cost_price || 0) * (item.quantity || 1);
                    });
                    const profit = revenue - cost;

                    current.revenue += revenue;
                    current.profit += profit;
                    current.count += 1;
                }
            });

            const salesTrend = Array.from(salesTrendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

            // 1.1 Daily Sales (Strictly Daily for Table)
            const dailySalesMap = new Map<string, { date: string; revenue: number; profit: number; count: number }>();
            sales?.forEach(sale => {
                const dateKey = new Date(sale.created_at).toISOString().split('T')[0];
                const current = dailySalesMap.get(dateKey) || { date: dateKey, revenue: 0, profit: 0, count: 0 };

                const revenue = sale.total_amount || 0;
                let cost = 0;
                sale.sale_items?.forEach((item: any) => {
                    cost += (item.cost_price || 0) * (item.quantity || 1);
                });
                const profit = revenue - cost;

                dailySalesMap.set(dateKey, {
                    date: dateKey,
                    revenue: current.revenue + revenue,
                    profit: current.profit + profit,
                    count: current.count + 1
                });
            });
            const dailySales = Array.from(dailySalesMap.values()).sort((a, b) => a.date.localeCompare(b.date));

            // 2. Sales by Product
            const productSalesMap = new Map<string, { id: string; name: string; quantity: number; revenue: number; profit: number }>();
            sales?.forEach(sale => {
                sale.sale_items?.forEach((item: any) => {
                    const pid = item.product_id;
                    const name = item.product_name || 'Unknown';
                    const cost_price = item.cost_price || 0;
                    const revenue = item.total_price || 0;
                    const profit = revenue - (cost_price * (item.quantity || 1));

                    const current = productSalesMap.get(pid) || { id: pid, name, quantity: 0, revenue: 0, profit: 0 };

                    productSalesMap.set(pid, {
                        ...current,
                        quantity: current.quantity + (item.quantity || 0),
                        revenue: current.revenue + revenue,
                        profit: current.profit + profit
                    });
                });
            });
            const topProducts = Array.from(productSalesMap.values())
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 10);

            // 3. Sales by Staff (User)
            // Assuming 'created_by' is the user ID. We might need a users table fetch if names needed, 
            // but for now we'll group by ID.
            const staffSalesMap = new Map<string, { id: string; count: number; revenue: number }>();
            sales?.forEach(sale => {
                const uid = sale.created_by || 'Unknown';
                const current = staffSalesMap.get(uid) || { id: uid, count: 0, revenue: 0 };
                staffSalesMap.set(uid, {
                    id: uid,
                    count: current.count + 1,
                    revenue: current.revenue + (sale.total_amount || 0)
                });
            });
            const topStaff = Array.from(staffSalesMap.values()).sort((a, b) => b.revenue - a.revenue);

            // 4. Sales by Customer (NEW)
            const customerSalesMap = new Map<string, { id: string; name: string; count: number; revenue: number; profit: number }>();
            sales?.forEach(sale => {
                const cid = sale.customer_id || 'guest';
                const cname = sale.customers?.name || 'Guest';

                // Calculate sale profit
                let saleCost = 0;
                sale.sale_items?.forEach((item: any) => {
                    saleCost += (item.cost_price || 0) * (item.quantity || 1);
                });
                const saleRevenue = sale.total_amount || 0;
                const saleProfit = saleRevenue - saleCost;

                const current = customerSalesMap.get(cid) || { id: cid, name: cname, count: 0, revenue: 0, profit: 0 };
                customerSalesMap.set(cid, {
                    id: cid,
                    name: cname,
                    count: current.count + 1,
                    revenue: current.revenue + saleRevenue,
                    profit: current.profit + saleProfit
                });
            });
            const topCustomers = Array.from(customerSalesMap.values()).sort((a, b) => b.revenue - a.revenue);

            // B. INVENTORY REPORTS
            // 1. Helpers for Inventory
            const lastSaleDateMap = new Map<string, Date>();
            const soldQtyMap = new Map<string, number>();

            // Calculate Sold Qty & Last Sale Date from ALL sales
            sales?.forEach(sale => {
                const saleDate = new Date(sale.created_at);
                sale.sale_items?.forEach((item: any) => {
                    const pid = item.product_id;

                    const currentQty = soldQtyMap.get(pid) || 0;
                    soldQtyMap.set(pid, currentQty + (item.quantity || 0));

                    const lastDate = lastSaleDateMap.get(pid);
                    if (!lastDate || saleDate > lastDate) {
                        lastSaleDateMap.set(pid, saleDate);
                    }
                });
            });

            // 2. Iterate Products
            let totalCostValue = 0;
            let totalRetailValue = 0;
            const allStock: any[] = [];
            const lowStockItems: any[] = [];
            const slowMovingItems: any[] = [];
            const stockMovements: any[] = [];

            const NOW = new Date();
            const THRESHOLD_DAYS = 30;

            products?.forEach(p => {
                const stock = p.stock || 0;
                const cost = p.cost_price || 0;
                const price = p.sale_price || 0;
                const sold = soldQtyMap.get(p.id) || 0;

                // Valuation
                totalCostValue += stock * cost;
                totalRetailValue += stock * price;

                // Status
                const reorderLevel = 10;
                let status = 'OK';
                if (stock === 0) status = 'Out';
                else if (stock <= reorderLevel) status = 'Low';

                allStock.push({
                    ...p,
                    status,
                    valuation: stock * cost
                });

                if (status !== 'OK') {
                    lowStockItems.push({ ...p, status });
                }

                stockMovements.push({
                    id: p.id,
                    name: p.name,
                    sku: p.primary_sku,
                    opening: stock + sold,
                    sold: sold,
                    closing: stock,
                    added: 0 // Unknown
                });

                // Slow Moving
                const lastSale = lastSaleDateMap.get(p.id);
                let daysSinceLastSale = -1;

                if (lastSale) {
                    const diffTime = Math.abs(NOW.getTime() - lastSale.getTime());
                    daysSinceLastSale = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                } else {
                    daysSinceLastSale = 999;
                }

                if (daysSinceLastSale > THRESHOLD_DAYS && stock > 0) {
                    slowMovingItems.push({
                        ...p,
                        daysSinceLastSale: daysSinceLastSale === 999 ? 'Never' : daysSinceLastSale,
                        deadStockValue: stock * cost
                    });
                }
            });

            // Sort inventory lists
            lowStockItems.sort((a, b) => a.stock - b.stock);
            slowMovingItems.sort((a, b) => (typeof b.daysSinceLastSale === 'number' ? b.daysSinceLastSale : 999) - (typeof a.daysSinceLastSale === 'number' ? a.daysSinceLastSale : 999));

            // C. FINANCIAL REPORTS
            // 1. Receivables
            const receivables = customers || [];
            const totalReceivables = receivables.reduce((sum, c) => sum + (c.current_balance || 0), 0);

            // 2. Sales Aggregations
            const paymentMethodsMap = new Map<string, { method: string; count: number; total: number }>();
            let totalItemsSold = 0;
            let cashSalesTotal = 0;
            let creditSalesTotal = 0;

            sales?.forEach(sale => {
                const amount = sale.total_amount || 0;
                const methodRaw = sale.payment_method || sale.type || 'cash';
                const methodKey = methodRaw.toLowerCase();
                const currentPM = paymentMethodsMap.get(methodKey) || { method: methodRaw, count: 0, total: 0 };
                paymentMethodsMap.set(methodKey, {
                    method: methodRaw,
                    count: currentPM.count + 1,
                    total: currentPM.total + amount
                });

                if (methodKey === 'cash') cashSalesTotal += amount;
                else if (methodKey === 'credit') creditSalesTotal += amount;

                sale.sale_items?.forEach((item: any) => {
                    totalItemsSold += (item.quantity || 0);
                });
            });

            const paymentMethods = Array.from(paymentMethodsMap.values());
            const totalRevenue = dailySales.reduce((sum, d) => sum + d.revenue, 0);
            const totalCount = sales?.length || 0;
            const averageSaleValue = totalCount > 0 ? totalRevenue / totalCount : 0;


            // D. EXPENSES & NET PROFIT
            let expenses = [];
            try {
                // Fetch Expenses
                const { data: expData, error: expError } = await supabase
                    .from('expenses')
                    .select('*')
                    .eq('company_id', company.id)
                    .gte('date', formatStartOfDay(range.start))
                    .lte('date', formatEndOfDay(range.end));

                if (!expError && expData) {
                    expenses = expData;
                }
            } catch (e) {
                console.error("Failed to fetch expenses", e);
            }

            const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

            // Calculate Profit Logic
            // Gross Profit = Sales Revenue - Cost of Goods Sold (already calculated in daily/trend loops presumably, but let's sum it up)
            // We calculated `profit` in aggregation loops (Revenue - Item Cost).
            // Let's sum up total Gross Profit from Daily Sales
            const totalGrossProfit = dailySales.reduce((sum, d) => sum + d.profit, 0);

            // Net Profit = Gross Profit - Expenses
            const netProfit = totalGrossProfit - totalExpenses;

            return {
                sales: {
                    daily: dailySales,
                    trend: salesTrend,
                    topProducts,
                    topCustomers,
                    topStaff,
                    totalRevenue,
                    totalCount,
                    totalItemsSold,
                    averageSaleValue,
                    cashSalesTotal,
                    creditSalesTotal,
                    raw: sales,
                    grossProfit: totalGrossProfit // Explicitly returning Gross Profit
                },
                inventory: {
                    valuation: { cost: totalCostValue, retail: totalRetailValue },
                    lowStock: lowStockItems,
                    allStock,
                    stockMovements,
                    slowMoving: slowMovingItems,
                    totalProducts: products?.length || 0
                },
                financials: {
                    receivables,
                    totalReceivables,
                    paymentMethods,
                    expenses,
                    totalExpenses,
                    netProfit
                }
            };
        },
        enabled: !!company?.id,
    });
};

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
