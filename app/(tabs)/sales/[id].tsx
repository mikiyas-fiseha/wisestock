import { AppButton } from '@/components/ui/AppButton';
import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { useReceiptGenerator } from '@/hooks/useReceiptGenerator';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SaleDetailsScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { company, user, isAdmin, isManager, isSales } = useAuth();

    const { showFeedback, confirmAction } = useFeedback();

    const [sale, setSale] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const { generateAndShareReceipt } = useReceiptGenerator();
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchSaleDetails();
    }, [id]);

    const fetchSaleDetails = async () => {
        try {
            setLoading(true);
            const { data: saleData, error: saleError } = await supabase
                .from('sales')
                .select('*, customers(name)')
                .eq('id', id)
                .single();

            if (saleError) throw saleError;
            setSale(saleData);

            const { data: itemData } = await supabase.from('sale_items').select('*').eq('sale_id', id);
            setItems(itemData || []);

            const { data: payData } = await supabase.from('payments').select('*').eq('sale_id', id);
            setPayments(payData || []);

        } catch (e) {
            console.error(e);
            showFeedback('error', 'Error', 'Failed to load sale details');
        } finally {
            setLoading(false);
        }
    };

    const handleReverseSale = async () => {
        if (!sale || sale.status === 'cancelled') return;

        confirmAction(
            'error',
            'Confirm Reversal',
            'Are you sure you want to reverse this sale? Stock will be restored and balances updated.',
            performReversal,
            'Reverse Sale'
        );
    };

    const performReversal = async () => {
        setActionLoading(true);
        try {
            // 1. Update Sale Status
            const { error: updateError } = await supabase
                .from('sales')
                .update({ status: 'cancelled', balance_due: 0 }) // Reset balance due? Or keep it? Cancelled usually means void.
                .eq('id', id);

            if (updateError) throw updateError;

            // 2. Restore Stock
            const movements = items.map(item => ({
                product_id: item.product_id,
                variant_id: item.variant_id,
                qty_change: item.quantity, // Positive to restore
                type: 'return',
                reason: `Reversal Sale #${id.toString().split('-')[0]}`,
                user_id: user?.id
            }));
            await supabase.from('stock_movements').insert(movements);

            // 3. Reverse Customer Balance (if Credit or Partial)
            if (sale.customer_id && sale.payment_status !== 'paid') { // Logic depends on if they owe us
                // If they owed us money (balance_due > 0), we reduce their debt.
                // Wait, if sale is cancelled, the 'Charge' is removed.
                // If they MADE a payment, that payment still exists unless we refund it explicitly.
                // Simple Reversal: Assume we void the 'Charge'.
                // If they paid 0 (Credit), we reduce balance by Total.
                // If they paid partial, we reduce balance by Balance Due?
                // Let's simplify: Cancel means the SALE never happened effectively.
                // We reverse the CREDIT impact.

                // Calculate what was added to their balance:
                // It was (Total - Paid).
                const creditAmount = (sale.total_amount - sale.paid_amount);
                if (creditAmount > 0) {
                    // They currently owe this amount from this sale.
                    // We need to SUBTRACT this from their balance.

                    // Fetch current balance to be safe
                    const { data: cust } = await supabase.from('customers').select('current_balance').eq('id', sale.customer_id).single();
                    if (cust) {
                        const newBalance = cust.current_balance - creditAmount;
                        await supabase.from('customers').update({ current_balance: newBalance }).eq('id', sale.customer_id);

                        // Log
                        await supabase.from('customer_transactions').insert([{
                            company_id: company?.id,
                            customer_id: sale.customer_id,
                            type: 'adjustment',
                            amount: -creditAmount,
                            reference_id: sale.id,
                            description: `Reversal Sale #${id.toString().split('-')[0]}`
                        }]);
                    }
                }
            }

            showFeedback('success', "Success", "Sale reversed");
            // router.back(); // Wait for feedback close?

        } catch (e: any) {
            showFeedback('error', "Error", e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDownloadReceipt = async () => {
        if (!sale || !items) return;
        setGenerating(true);
        try {
            const receiptItems = items.map((item: any) => ({
                name: item.product_name || 'Unknown Item',
                quantity: item.quantity,
                price: item.unit_price || (item.total_price / item.quantity),
                total: item.total_price
            }));

            const subtotal = sale.subtotal || sale.total_amount || 0;
            const totalDiscount = sale.discount || 0;
            const totalTax = sale.tax || 0;

            await generateAndShareReceipt({
                companyName: company?.name || 'My Shop',
                saleId: sale.id.split('-')[0].toUpperCase(),
                date: new Date(sale.created_at).toLocaleString(),
                customerName: sale.customers?.name,
                items: receiptItems,
                subtotal: subtotal,
                taxAmount: totalTax,
                discountAmount: totalDiscount,
                total: sale.total_amount || sale.total,
                amountPaid: sale.paid_amount || sale.total_amount || sale.total,
                change: sale.type === 'cash' ? ((sale.paid_amount || 0) - (sale.total_amount || sale.total || 0)) : undefined,
                paymentMethod: sale.payment_method || sale.type || 'cash',
                status: sale.status
            });
        } catch (e) {
            showFeedback('error', 'Error', 'Failed to generate receipt');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
    if (!sale) return <View style={styles.center}><Text style={{ color: colors.text }}>Sale not found</Text></View>;

    return (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>Sale #{sale.id.split('-')[0]}</Text>
                        <Text style={styles.date}>{new Date(sale.created_at).toLocaleString()}</Text>
                        <Text style={[styles.statusItem, sale.status === 'completed' ? { color: colors.success } : { color: colors.danger }]}>
                            {sale.status.toUpperCase()}
                        </Text>
                    </View>
                    {(isAdmin || isManager || (isSales && sale.status !== 'completed')) && sale.status !== 'cancelled' && (
                        <AppButton
                            title="Reverse / Void Sale"
                            onPress={handleReverseSale}
                            variant="outline"
                            loading={actionLoading}
                            style={{ borderColor: colors.danger }}
                            textStyle={{ color: colors.danger }}
                        />
                    )}
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                    <View style={styles.section}>
                        <Text style={styles.label}>Customer</Text>
                        <Text style={styles.value}>{sale.customers?.name || 'Guest'}</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Items</Text>
                        {items.map((item, i) => (
                            <View key={i} style={styles.itemRow}>
                                <Text style={styles.itemName}>{item.product_name} x {item.quantity}</Text>
                                <Text style={styles.itemPrice}>${item.total_price.toFixed(2)}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.footer}>
                        <View style={styles.row}>
                            <Text style={styles.label}>Subtotal</Text>
                            <Text style={styles.value}>${(sale.subtotal || (sale.total_amount - (sale.tax || 0) + (sale.discount || 0))).toFixed(2)}</Text>
                        </View>
                        {(sale.discount > 0) && (
                            <View style={styles.row}>
                                <Text style={styles.label}>Discount</Text>
                                <Text style={[styles.value, { color: colors.success }]}>
                                    -${(sale.discount || 0).toFixed(2)}
                                </Text>
                            </View>
                        )}
                        {(sale.tax > 0) && (
                            <View style={styles.row}>
                                <Text style={styles.label}>Tax</Text>
                                <Text style={styles.value}>
                                    +${(sale.tax || 0).toFixed(2)}
                                </Text>
                            </View>
                        )}
                        <View style={styles.row}>
                            <Text style={styles.label}>Total Amount</Text>
                            <Text style={[styles.value, { fontWeight: 'bold' }]}>${(sale.total_amount || sale.total).toFixed(2)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Paid Amount</Text>
                            <Text style={styles.value}>${(sale.paid_amount || 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Balance Due</Text>
                            <Text style={[styles.value, { color: colors.danger, fontWeight: 'bold' }]}>
                                ${((sale.total_amount || sale.total) - (sale.paid_amount || 0)).toFixed(2)}
                            </Text>
                        </View>

                        <AppButton
                            title="Print Professional Invoice"
                            onPress={handleDownloadReceipt}
                            loading={generating}
                            style={{ marginTop: 24 }}
                            icon={<Ionicons name="document-text-outline" size={20} color="#fff" style={{ marginRight: 8 }} />}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 16, backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    date: { color: colors.textSecondary, marginTop: 4 },
    statusItem: { fontWeight: 'bold', marginTop: 4 },
    section: { padding: 16, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 12, marginTop: 8, marginHorizontal: 16 },
    label: { color: colors.textSecondary, marginBottom: 4 },
    value: { fontSize: 16, fontWeight: '500', color: colors.text },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: colors.text },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border },
    itemName: { fontSize: 15, color: colors.text },
    itemPrice: { fontWeight: 'bold', color: colors.text },
    footer: { padding: 16, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 12, marginTop: 8, marginBottom: 32, marginHorizontal: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
});


