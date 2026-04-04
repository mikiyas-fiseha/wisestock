
import { RecordPaymentModal } from '@/components/suppliers/RecordPaymentModal';
import { ReturnModal } from '@/components/ReturnModal';
import { AppButton } from '@/components/ui/AppButton';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Gradients } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { usePurchases } from '@/hooks/usePurchases';
import { usePurchaseReturns } from '@/hooks/useReturns';
import { useSuppliers } from '@/hooks/useSuppliers';
import { supabase } from '@/lib/supabase';
import { downloadFile } from '@/lib/fileUtils';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
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
    const [refreshing, setRefreshing] = React.useState(false);

    const { data: purchase, isLoading, refetch } = usePurchases().getPurchase(id as string);
    const { recordPayment } = useSuppliers();
    const { data: purchaseReturns = [] } = usePurchaseReturns(id as string);

    // UI State
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [feedback, setFeedback] = useState({ visible: false, type: 'success' as 'success' | 'error', message: '' });
    const [returnModalVisible, setReturnModalVisible] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleRecordPayment = async (data: { amount: number; method: string; date: Date; notes: string; receiptUri: string | null }) => {
        try {
            setIsUploading(true);
            let receiptUrl = null;
            if (data.receiptUri) {
                receiptUrl = await uploadImageToCloudinary(data.receiptUri);
            }
            const paymentId = await recordPayment({
                supplier_id: purchase!.supplier_id!,
                amount: data.amount,
                payment_date: data.date,
                method: data.method,
                notes: data.notes,
                purchase_id: id as string
            });
            if (receiptUrl && paymentId) {
                await supabase.from('supplier_payments').update({ receipt_url: receiptUrl }).eq('id', paymentId);
            }
            setPaymentModalVisible(false);
            setFeedback({ visible: true, type: 'success', message: 'Payment recorded successfully' });
        } catch (error: any) {
            setFeedback({ visible: true, type: 'error', message: error.message || 'Failed to record payment' });
        } finally {
            setIsUploading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const formatCurrency = (amount: number) => `$${(amount || 0).toFixed(2)}`;

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!purchase) {
        return (
            <View style={styles.centered}>
                <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Purchase not found</Text>
            </View>
        );
    }

    const purchasePayments = [...(purchase.payments || [])].reverse();
    const totalPaid = purchasePayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const balance = (purchase.total_amount || 0) - totalPaid;
    const isPaid = balance <= 0;

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            {/* Header */}
            <View style={[styles.header, isWeb && styles.headerWeb]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={18} color={colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Purchase Details</Text>
                <View style={{ width: 36 }} />
            </View>

            <ResponsiveContainer>
                <ScrollView
                    contentContainerStyle={[styles.content, isWeb && styles.contentWeb]}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                >
                    {/* Summary Card */}
                    <View style={styles.card}>
                        <View style={styles.summaryRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.supplierName}>{purchase.supplier?.name || 'Unknown Supplier'}</Text>
                                <Text style={styles.dateText}>{formatDate(purchase.purchase_date || purchase.created_at)}</Text>
                            </View>
                            <View style={[styles.statusBadge, isPaid ? styles.badgePaid : styles.badgeUnpaid]}>
                                <Text style={[styles.statusText, isPaid ? styles.textPaid : styles.textUnpaid]}>
                                    {isPaid ? 'PAID' : 'PARTIAL'}
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
                            <View style={[styles.infoRow, { flexDirection: 'column', alignItems: 'flex-start', borderTopWidth: 1, borderColor: colors.border + '20', marginTop: 8, paddingTop: 12 }]}>
                                <Text style={[styles.infoLabel, { marginBottom: 6 }]}>Notes</Text>
                                <Text style={[styles.infoValue, { textAlign: 'left', width: '100%' }]}>{purchase.notes}</Text>
                            </View>
                        )}

                        {purchase.receipt_url && (
                            <View style={{ marginTop: 16, borderTopWidth: 1, borderColor: colors.border + '20', paddingTop: 16 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <Text style={[styles.infoLabel, { marginBottom: 0 }]}>Attachment</Text>
                                    <TouchableOpacity 
                                        onPress={() => downloadFile(purchase.receipt_url, `purchase_receipt_${purchase.id.split('-')[0]}.jpg`)}
                                        style={styles.downloadHeaderBtn}
                                    >
                                        <FontAwesome name="download" size={14} color={colors.primary} />
                                        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', marginLeft: 6 }}>Download</Text>
                                    </TouchableOpacity>
                                </View>
                                <Pressable 
                                    style={styles.receiptContainer}
                                    onPress={() => Platform.OS === 'web' ? window.open(purchase.receipt_url, '_blank') : null}
                                >
                                    <Image 
                                        source={{ uri: purchase.receipt_url }} 
                                        style={styles.receiptImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.receiptOverlay}>
                                        <FontAwesome name="search-plus" size={20} color="white" />
                                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', marginLeft: 8 }}>View Attachment</Text>
                                    </View>
                                </Pressable>
                            </View>
                        )}

                        {!isPaid && (
                            <AppButton
                                title="Record Payment"
                                onPress={() => setPaymentModalVisible(true)}
                                style={{ marginTop: 16 }}
                                icon={<FontAwesome name="money" size={16} color="white" style={{ marginRight: 8 }} />}
                            />
                        )}
                    </View>

                    {/* Items */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Purchased Items</Text>
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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={styles.sectionTitle}>Payment Summary</Text>
                            <View style={[
                                styles.balanceBadge,
                                { backgroundColor: balance > 0 ? `${colors.danger}15` : `${colors.success}15` }
                            ]}>
                                <Text style={[
                                    styles.balanceBadgeText,
                                    { color: balance > 0 ? colors.danger : colors.success }
                                ]}>
                                    {balance > 0 ? `Due: ${formatCurrency(balance)}` : 'Fully Paid'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Total Amount</Text>
                            <Text style={styles.paymentValue}>{formatCurrency(purchase.total_amount)}</Text>
                        </View>
                        <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Amount Paid</Text>
                            <Text style={[styles.paymentValue, { color: colors.success }]}>{formatCurrency(totalPaid)}</Text>
                        </View>
                        {balance > 0 && (
                            <View style={[styles.paymentRow, styles.balanceRow]}>
                                <Text style={styles.balanceLabel}>Remaining Balance</Text>
                                <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
                            </View>
                        )}
                    </View>

                    {/* Payments History */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Payment History</Text>
                        {purchasePayments.length > 0 ? (
                            purchasePayments.map((p: any, i: number) => (
                                <View key={i} style={styles.paymentHistoryRow}>
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                        <View>
                                            <Text style={styles.paymentHistoryDate}>{formatDate(p.payment_date || p.created_at)}</Text>
                                            <Text style={styles.paymentHistoryMethod}>{p.method?.toUpperCase()}</Text>
                                        </View>
                                        {p.receipt_url && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <TouchableOpacity 
                                                    onPress={() => Platform.OS === 'web' ? window.open(p.receipt_url, '_blank') : null}
                                                    style={styles.paymentThumbnailContainer}
                                                >
                                                    <Image source={{ uri: p.receipt_url }} style={styles.paymentThumbnail} />
                                                    <View style={styles.thumbnailIconOverlay}>
                                                        <FontAwesome name="eye" size={8} color="white" />
                                                    </View>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    onPress={() => downloadFile(p.receipt_url, `receipt_${p.id.split('-')[0]}.jpg`)}
                                                    style={styles.paymentDownloadBtn}
                                                >
                                                    <FontAwesome name="download" size={12} color={colors.primary} />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.paymentHistoryAmount}>{formatCurrency(p.amount)}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No payments recorded for this purchase.</Text>
                        )}
                    </View>

                    {/* Returns History */}
                    {purchaseReturns.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Returns History</Text>
                            {purchaseReturns.map((ret: any, i: number) => (
                                <View key={ret.id} style={{ marginBottom: i < purchaseReturns.length - 1 ? 14 : 0 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={{ backgroundColor: '#F9731620', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                                                <Text style={{ fontSize: 11, color: '#F97316', fontWeight: '700' }}>
                                                    {ret.refund_method === 'cash' ? 'CASH BACK' : 'AP ADJ'}
                                                </Text>
                                            </View>
                                            <Text style={styles.infoLabel}>
                                                {new Date(ret.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#F97316' }}>
                                            −${(ret.total_amount || 0).toFixed(2)}
                                        </Text>
                                    </View>
                                    {ret.reason && (
                                        <Text style={[styles.infoLabel, { marginTop: 4, fontStyle: 'italic' }]}>{ret.reason}</Text>
                                    )}
                                    {ret.return_items?.map((ri: any, j: number) => (
                                        <View key={j} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingLeft: 8 }}>
                                            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                                {ri.product_name} × {ri.quantity}
                                            </Text>
                                            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                                ${(ri.cost_amount || 0).toFixed(2)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Supplier Return Button */}
                    <TouchableOpacity
                        style={styles.returnBtn}
                        onPress={() => setReturnModalVisible(true)}
                    >
                        <FontAwesome name="reply" size={14} color="#F97316" />
                        <Text style={styles.returnBtnText}>Record Supplier Return</Text>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </ResponsiveContainer>

            <RecordPaymentModal
                visible={paymentModalVisible}
                onClose={() => setPaymentModalVisible(false)}
                onSubmit={handleRecordPayment}
                supplierName={purchase.supplier?.name || ''}
                currentBalance={balance}
                isLoading={isUploading}
            />

            <FeedbackModal
                visible={feedback.visible}
                type={feedback.type}
                title={feedback.type === 'success' ? 'Success' : 'Error'}
                message={feedback.message}
                onClose={() => setFeedback({ ...feedback, visible: false })}
            />

            {/* Supplier Return Modal — pre-linked to this purchase */}
            <ReturnModal
                visible={returnModalVisible}
                type="supplier_return"
                referenceId={purchase?.id}
                referenceLabel={purchase ? `Purchase #${purchase.id.split('-')[0].toUpperCase()} — ${purchase.supplier?.name || 'Unknown'} — $${(purchase.total_amount || 0).toFixed(2)}` : ''}
                onClose={() => setReturnModalVisible(false)}
                onSuccess={() => refetch()}
            />
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, backgroundColor: colors.card + 'E0' },
    headerWeb: { paddingTop: 20 },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

    // Content
    content: { padding: 16 },
    contentWeb: { maxWidth: 700, alignSelf: 'center', width: '100%' },

    // Card
    card: { backgroundColor: colors.card + 'E0', borderRadius: 20, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },

    // Summary
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    supplierName: { fontSize: 22, fontWeight: '800', color: colors.text },
    dateText: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    badgePaid: { backgroundColor: colors.success + '20' },
    badgeUnpaid: { backgroundColor: colors.warning + '20' },
    statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    textPaid: { color: colors.success },
    textUnpaid: { color: colors.warning },

    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
    infoLabel: { fontSize: 14, color: colors.textSecondary },
    infoValue: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1, textAlign: 'right' },

    // Items
    itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border + '20' },
    itemName: { fontSize: 15, fontWeight: '600', color: colors.text },
    itemSku: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    itemQty: { paddingHorizontal: 12 },
    itemQtyText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
    itemCost: { alignItems: 'flex-end', minWidth: 90 },
    itemCostLabel: { fontSize: 11, color: colors.textSecondary },
    itemTotal: { fontSize: 15, fontWeight: '700', color: colors.text },

    // Payment
    paymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
    paymentLabel: { fontSize: 15, color: colors.textSecondary },
    paymentValue: { fontSize: 15, fontWeight: '700', color: colors.text },
    balanceRow: { borderTopWidth: 1, borderColor: colors.border + '40', marginTop: 8, paddingTop: 12 },
    balanceLabel: { fontSize: 16, fontWeight: '700', color: colors.danger },
    balanceValue: { fontSize: 18, fontWeight: '800', color: colors.danger },

    // Payment History
    paymentHistoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border + '20' },
    paymentHistoryDate: { fontSize: 14, color: colors.text, fontWeight: '600' },
    paymentHistoryMethod: { fontSize: 11, color: colors.textSecondary, fontWeight: '700', marginTop: 2 },
    paymentHistoryAmount: { fontSize: 16, fontWeight: '700', color: colors.success },

    balanceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    balanceBadgeText: { fontSize: 12, fontWeight: '700' },
    emptyText: { textAlign: 'center', color: colors.textSecondary, fontStyle: 'italic', paddingVertical: 10 },
    
    // Receipt UI
    receiptContainer: {
        width: '100%',
        height: 180,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.05)',
        position: 'relative',
    },
    receiptImage: {
        width: '100%',
        height: '100%',
    },
    receiptOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    paymentThumbnailContainer: {
        width: 32,
        height: 32,
        borderRadius: 6,
        overflow: 'hidden',
        marginLeft: 12,
        borderWidth: 1,
        borderColor: colors.border,
        position: 'relative',
    },
    paymentThumbnail: {
        width: '100%',
        height: '100%',
    },
    downloadHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    paymentDownloadBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbnailIconOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 2,
        borderTopLeftRadius: 4,
    },
    returnBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#F9731630',
        backgroundColor: '#F9731610',
    },
    returnBtnText: { fontSize: 14, fontWeight: '600', color: '#F97316' },
});
