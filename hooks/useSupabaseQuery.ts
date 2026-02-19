
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// --- Sales Hooks ---

export const useSales = (search?: string, filters?: Record<string, string>) => {
    const { company, branch } = useAuth();
    return useQuery({
        queryKey: ['sales', company?.id, branch?.id, search, filters],
        queryFn: async () => {
            if (!company?.id) return [];
            let query = supabase
                .from('sales')
                .select('*, customers(name)')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false });

            if (branch?.id) {
                query = query.eq('branch_id', branch.id);
            }

            // Search by Invoice ID (uuid) or Customer Name
            if (search) {
                // Determine if search looks like UUID or Name
                // Supabase join search is tricky. "customers.name" filtering requires !inner join usually.
                // For simplicity, we might only search ID or do client side filter if list is small, 
                // OR try the text search if configured. 
                // Let's try to search ID if it matches UUID format, else ignore or rely on client side?
                // Actually, let's try a simple approach: Fetch all (default limit maybe?) and filter client side?
                // Or better: filter by ID if possible. OR on `id` text cast? 
                // `id::text` ilike ...

                // Let's assume we search match on ID (invoice number usually)
                query = query.ilike('id', `%${search}%`);
            }

            if (filters?.status) {
                query = query.eq('status', filters.status);
            }

            // Date filtering?
            // if (filters?.dateRange) ...

            const { data, error } = await query;
            if (error) throw error;

            // Client side filter for customer name if needed, as join filter is harder
            // if (search && !isUUID(search)) { return data.filter(...) }

            return data;
        },
        enabled: !!company?.id,
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

export const useCustomers = (search?: string, filters?: Record<string, string>) => {
    const { company } = useAuth();
    return useQuery({
        queryKey: ['customers', company?.id, search, filters],
        queryFn: async () => {
            if (!company?.id) return [];
            let query = supabase
                .from('customers')
                .select('*')
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

            // Check if schema has status, if not we skip for now or inferred
            // Assuming no status column on customers yet based on earlier files, so skipping explicit status filter unless added

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

// --- Dashboard Hooks ---

export const useDashboardData = () => {
    const { company, branch } = useAuth();
    return useQuery({
        queryKey: ['dashboard', company?.id, branch?.id],

        queryFn: async () => {
            if (!company?.id) throw new Error('No company ID');

            const today = new Date().toISOString().split('T')[0];

            const [salesReq, finReq, expensesReq] = await Promise.all([
                supabase.rpc('get_daily_sales', { start_date: today, end_date: today, p_branch_id: branch?.id }),
                supabase.rpc('get_financial_summary', { p_branch_id: branch?.id }),
                supabase
                    .from('expenses')
                    .select('amount')
                    .eq('company_id', company.id)
                    // Filter expenses by branch if selected
                    .eq('branch_id', branch?.id) // Assuming branch_id column exists now
                    .gte('date', `${today}T00:00:00.000Z`)
                    .lte('date', `${today}T23:59:59.999Z`)
            ]);

            // Fetch Low Stock separately to handle join mapping
            const { data: lowStockData, error: lowStockError } = await supabase
                .from('products')
                .select('id, name, primary_sku, branch_products!inner(stock)')
                .eq('company_id', company.id)
                .eq('branch_products.branch_id', branch?.id)
                .lt('branch_products.stock', 10)
                .limit(5);

            if (lowStockError) throw lowStockError;

            const lowStockItems = lowStockData?.map((p: any) => ({
                ...p,
                stock: p.branch_products?.[0]?.stock ?? 0
            })) || [];

            if (salesReq.error) throw salesReq.error;
            if (finReq.error) throw finReq.error;

            const todayStats = salesReq.data && salesReq.data.length > 0 ? salesReq.data[0] : { total_sales: 0, total_profit: 0 };
            const financials = finReq.data && finReq.data.length > 0 ? finReq.data[0] : { total_receivables: 0 };

            // Calculate today's expenses
            const todayExpenses = expensesReq.data?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;

            return {
                stats: {
                    todaySales: todayStats.total_sales,
                    todayProfit: todayStats.total_profit - todayExpenses, // Net Profit = Gross Profit - Expenses
                    lowStockCount: lowStockItems.length,
                    creditDue: financials.total_receivables
                },
                lowStockItems: lowStockItems
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
                supabase.rpc('get_financial_summary', { p_branch_id: branch?.id }),
                supabase.rpc('get_stock_valuation', { p_branch_id: branch?.id }),
                supabase.rpc('get_daily_sales', {
                    start_date: start.toISOString().split('T')[0],
                    end_date: end.toISOString().split('T')[0],
                    p_branch_id: branch?.id
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
        mutationFn: async ({ productData, variants, isVariable }: any) => {
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

            return product;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Critical for Low Stock
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
