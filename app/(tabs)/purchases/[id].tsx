
import { useTheme } from '@/context/ThemeContext';
import { usePurchases } from '@/hooks/usePurchases';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients } from '@/constants/Colors';
import React from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

export default function PurchaseDetailScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width >= 768;

    const { data: purchase, isLoading } = usePurchases().getPurchase(id as string);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const formatCurrency = (amount: number) => `$${(amount || 0).toFixed(2)}`;

    if (isLoading) {
        return (
            <View style={styles.centered}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!purchase) {
        return (
            <View style={styles.centered}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Purchase not found</Text>
            </View>
        );
    }

    const isPaid = (purchase.amount_paid || 0) >= (purchase.total_amount || 0);
    const balance = (purchase.total_amount || 0) - (purchase.amount_paid || 0);

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />
            {/* Header */}
            <View style={[styles.header, isWeb && styles.headerWeb]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={18} color={colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Purchase Details</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.content, isWeb && styles.contentWeb]}>
                {/* Summary Card */}
                <View style={styles.card}>
                    <View style={styles.summaryRow}>
                        <View>
                            <Text style={styles.supplierName}>{purchase.supplier?.name || 'Unknown Supplier'}</Text>
                            <Text style={styles.dateText}>{formatDate(purchase.purchase_date || purchase.created_at)}</Text>
                        </View>
                        <View style={[styles.statusBadge, isPaid ? styles.badgePaid : styles.badgeUnpaid]}>
                            <Text style={[styles.statusText, isPaid ? styles.textPaid : styles.textUnpaid]}>
                                {isPaid ? 'Paid' : 'Partial'}
                            </Text>
                        </View>
                    </View>

                    {purchase.invoice_number && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Invoice</Text>
                            <Text style={styles.infoValue}>#{purchase.invoice_number}</Text>
                        </View>
                    )}
                    {purchase.notes && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Notes</Text>
                            <Text style={styles.infoValue}>{purchase.notes}</Text>
                        </View>
                    )}
                </View>

                {/* Items */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    {purchase.items?.map((item: any, index: number) => (
                        <View key={index} style={styles.itemRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemName}>{item.product?.name || 'Unknown Product'}</Text>
                                <Text style={styles.itemSku}>{item.product?.primary_sku}</Text>
                            </View>
                            <View style={styles.itemQty}>
                                <Text style={styles.itemQtyText}>{item.quantity}x</Text>
                            </View>
                            <View style={styles.itemCost}>
                                <Text style={styles.itemCostLabel}>{formatCurrency(item.unit_cost)} ea</Text>
                                <Text style={styles.itemTotal}>{formatCurrency(item.quantity * item.unit_cost)}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Payment Summary */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Payment Summary</Text>
                    <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Total Amount</Text>
                        <Text style={styles.paymentValue}>{formatCurrency(purchase.total_amount)}</Text>
                    </View>
                    <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Amount Paid</Text>
                        <Text style={[styles.paymentValue, { color: colors.success }]}>{formatCurrency(purchase.amount_paid)}</Text>
                    </View>
                    {!isPaid && (
                        <View style={[styles.paymentRow, styles.balanceRow]}>
                            <Text style={styles.balanceLabel}>Balance Due</Text>
                            <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
                        </View>
                    )}
                </View>

                {/* Payments History */}
                {purchase.payments?.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Payment History</Text>
                        {purchase.payments.map((p: any, i: number) => (
                            <View key={i} style={styles.paymentHistoryRow}>
                                <Text style={styles.paymentHistoryDate}>{formatDate(p.payment_date || p.created_at)}</Text>
                                <Text style={styles.paymentHistoryAmount}>{formatCurrency(p.amount)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, backgroundColor: colors.card + 'E0', borderBottomWidth: 1, borderColor: colors.border },
    headerWeb: { paddingTop: 20 },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

    // Content
    content: { padding: 16 },
    contentWeb: { maxWidth: 700, alignSelf: 'center', width: '100%' },

    // Card
    card: { backgroundColor: colors.card + 'E0', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 12 },

    // Summary
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    supplierName: { fontSize: 18, fontWeight: '700', color: colors.text },
    dateText: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
    badgePaid: { backgroundColor: colors.success + '20' },
    badgeUnpaid: { backgroundColor: colors.warning + '20' },
    statusText: { fontSize: 12, fontWeight: '600' },
    textPaid: { color: colors.success },
    textUnpaid: { color: colors.warning },

    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderColor: colors.border },
    infoLabel: { fontSize: 13, color: colors.textSecondary },
    infoValue: { fontSize: 13, fontWeight: '500', color: colors.text, flex: 1, textAlign: 'right' },

    // Items
    itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border },
    itemName: { fontSize: 14, fontWeight: '600', color: colors.text },
    itemSku: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    itemQty: { paddingHorizontal: 12 },
    itemQtyText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    itemCost: { alignItems: 'flex-end', minWidth: 80 },
    itemCostLabel: { fontSize: 11, color: colors.textSecondary },
    itemTotal: { fontSize: 14, fontWeight: '700', color: colors.text },

    // Payment
    paymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
    paymentLabel: { fontSize: 14, color: colors.textSecondary },
    paymentValue: { fontSize: 14, fontWeight: '600', color: colors.text },
    balanceRow: { borderTopWidth: 1, borderColor: colors.border, marginTop: 4, paddingTop: 10 },
    balanceLabel: { fontSize: 15, fontWeight: '600', color: colors.danger },
    balanceValue: { fontSize: 16, fontWeight: '700', color: colors.danger },

    // Payment History
    paymentHistoryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border },
    paymentHistoryDate: { fontSize: 13, color: colors.textSecondary },
    paymentHistoryAmount: { fontSize: 14, fontWeight: '600', color: colors.success },
});
