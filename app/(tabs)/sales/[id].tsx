import { AppButton } from '@/components/ui/AppButton';
import { ReturnModal } from '@/components/ReturnModal';
import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { useReceiptGenerator } from '@/hooks/useReceiptGenerator';
import { useSaleReturns } from '@/hooks/useReturns';
import { supabase } from '@/lib/supabase';
import { downloadFile } from '@/lib/fileUtils';
import { FontAwesome } from '@expo/vector-icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    const [returnModalVisible, setReturnModalVisible] = useState(false);

    const { generateAndShareReceipt } = useReceiptGenerator();
    const [generating, setGenerating] = useState(false);

    const saleId = id as string;
    const { data: saleReturns = [] } = useSaleReturns(saleId);

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

            if (saleData.created_by) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', saleData.created_by)
                    .single();
                saleData.profiles = profile;
            }

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

                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                    <View style={styles.section}>
                        <View style={styles.detailRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Customer</Text>
                                <Text style={styles.value}>{sale.customers?.name || 'Walk-in Guest'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Cashier / Rep</Text>
                                <Text style={styles.value}>{sale.profiles?.full_name || 'System'}</Text>
                            </View>
                        </View>

                        <View style={[styles.detailRow, { marginTop: 12 }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Payment Method</Text>
                                <Text style={styles.value}>{(sale.payment_method || sale.type || 'Cash').toUpperCase()}</Text>
                            </View>
                            {sale.due_date && (
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Due Date</Text>
                                    <Text style={styles.value}>{new Date(sale.due_date).toLocaleDateString()}</Text>
                                </View>
                            )}
                        </View>

                        {(sale.note || sale.notes) && (
                            <View style={{ marginTop: 12 }}>
                                <Text style={styles.label}>Notes / Remarks</Text>
                                <Text style={[styles.value, { fontSize: 14, fontStyle: 'italic', fontWeight: '400', color: colors.textSecondary }]}>
                                    {sale.note || sale.notes}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Items</Text>
                        {items.map((item, i) => (
                            <View key={i} style={styles.itemRow}>
                                <Text style={styles.itemName}>{item.product_name} x {item.quantity}</Text>
                                <Text style={styles.itemPrice}>${(item.total_price || 0).toFixed(2)}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.footer}>
                        <View style={styles.row}>
                            <Text style={styles.label}>Subtotal</Text>
                            <Text style={styles.value}>${(sale.subtotal || (sale.total_amount - (sale.tax || 0) + (sale.discount || 0)) || 0).toFixed(2)}</Text>
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
                            <Text style={[styles.value, { fontWeight: 'bold' }]}>${(sale.total_amount || sale.total || 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Paid Amount</Text>
                            <Text style={styles.value}>${(sale.paid_amount || 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Balance Due</Text>
                            <Text style={[styles.value, { color: colors.danger, fontWeight: 'bold' }]}>
                                ${((sale.total_amount || sale.total || 0) - (sale.paid_amount || 0)).toFixed(2)}
                            </Text>
                        </View>

                        <AppButton
                            title="Print Professional Invoice"
                            onPress={handleDownloadReceipt}
                            loading={generating}
                            style={{ marginTop: 24 }}
                            icon={<Ionicons name="document-text-outline" size={20} color="#fff" style={{ marginRight: 8 }} />}
                        />

                        {/* Customer Return Button */}
                        {(sale.status === 'completed' || sale.status === 'partial_return') && (
                            <TouchableOpacity
                                style={[styles.returnBtn]}
                                onPress={() => setReturnModalVisible(true)}
                            >
                                <FontAwesome name="undo" size={14} color="#06B6D4" />
                                <Text style={styles.returnBtnText}>Record Customer Return</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Payment History */}
                    {payments.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Payment History</Text>
                            {payments.map((p: any, i: number) => (
                                <View key={i} style={{ marginBottom: i < payments.length - 1 ? 12 : 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View>
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                                            {new Date(p.payment_date || p.created_at).toLocaleDateString()}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, textTransform: 'uppercase' }}>
                                            {p.method || 'CASH'}
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.success }}>
                                        +${(p.amount || 0).toFixed(2)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Returns History */}
                    {saleReturns.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Returns History</Text>
                            {saleReturns.map((ret: any, i: number) => (
                                <View key={ret.id} style={{ marginBottom: i < saleReturns.length - 1 ? 12 : 0 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <View style={{ backgroundColor: '#06B6D420', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                                                <Text style={{ fontSize: 11, color: '#06B6D4', fontWeight: '700' }}>
                                                    {ret.refund_method === 'cash' ? 'CASH' :
                                                     ret.refund_method === 'ar_adjustment' ? 'AR ADJ' : 'CREDIT'}
                                                </Text>
                                            </View>
                                            <Text style={[styles.label, { marginBottom: 0 }]}>
                                                {new Date(ret.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#06B6D4' }}>
                                            −${(ret.total_amount || 0).toFixed(2)}
                                        </Text>
                                    </View>
                                    {ret.reason && (
                                        <Text style={[styles.label, { marginTop: 4, fontStyle: 'italic' }]}>{ret.reason}</Text>
                                    )}
                                    {ret.return_items?.map((ri: any, j: number) => (
                                        <View key={j} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingLeft: 8 }}>
                                            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                                {ri.product_name} × {ri.quantity}
                                            </Text>
                                            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                                ${(ri.total_amount || 0).toFixed(2)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </View>
                    )}

                    {sale.receipt_url && (
                        <View style={styles.section}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Receipt / Payment Proof</Text>
                                <TouchableOpacity 
                                    onPress={() => downloadFile(sale.receipt_url, `sale_receipt_${sale.id.split('-')[0]}.jpg`)}
                                    style={{ flexDirection: 'row', alignItems: 'center' }}
                                >
                                    <FontAwesome name="download" size={16} color={colors.primary} />
                                    <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 8 }}>Download</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.imageContainer}>
                                <Image
                                    source={{ uri: sale.receipt_url }}
                                    style={styles.proofImage}
                                    resizeMode="contain"
                                />
                            </View>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>

            {/* Customer Return Modal — pre-linked to this sale */}
            <ReturnModal
                visible={returnModalVisible}
                type="customer_return"
                referenceId={sale?.id}
                referenceLabel={sale ? `Sale #${sale.id.split('-')[0].toUpperCase()} — ${sale.customers?.name || 'Walk-in'} — $${(sale.total_amount || 0).toFixed(2)}` : ''}
                onClose={() => setReturnModalVisible(false)}
                onSuccess={() => fetchSaleDetails()}
            />
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
    label: { color: colors.textSecondary, marginBottom: 4, fontSize: 13 },
    value: { fontSize: 16, fontWeight: '500', color: colors.text },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: colors.text },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border },
    itemName: { fontSize: 15, color: colors.text },
    itemPrice: { fontWeight: 'bold', color: colors.text },
    footer: { padding: 16, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 12, marginTop: 8, marginBottom: 32, marginHorizontal: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    returnBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#06B6D430',
        backgroundColor: '#06B6D410',
    },
    returnBtnText: { fontSize: 14, fontWeight: '600', color: '#06B6D4' },
    imageContainer: {
        width: '100%',
        height: 500,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 8,
    },
    proofImage: {
        width: '100%',
        height: '100%',
    },
});


