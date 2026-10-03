import { ReturnModal } from '@/components/ReturnModal';
import { RecordPaymentModal } from '@/components/suppliers/RecordPaymentModal';
import { AppButton } from '@/components/ui/AppButton';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Gradients, Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { usePurchases } from '@/hooks/usePurchases';
import { usePurchaseReturns } from '@/hooks/useReturns';
import { useSuppliers } from '@/hooks/useSuppliers';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { downloadFile } from '@/lib/fileUtils';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
    const { width } = useWindowDimensions();
    const isDesktop = width >= 960;
    const styles = React.useMemo(() => createStyles(colors, theme, isDesktop), [colors, theme, isDesktop]);
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [refreshing, setRefreshing] = React.useState(false);

    const { data: purchase, isLoading, refetch } = usePurchases().getPurchase(id as string);
    const { recordPayment } = useSuppliers();
    const { data: purchaseReturns = [] } = usePurchaseReturns(id as string);
    const { t, i18n } = useTranslation();

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
                purchase_id: id as string,
            });
            if (receiptUrl && paymentId) {
                await supabase.from('supplier_payments').update({ receipt_url: receiptUrl }).eq('id', paymentId);
            }
            setPaymentModalVisible(false);
            setFeedback({ visible: true, type: 'success', message: t('suppliers.payment_success', 'Payment recorded successfully!') });
            refetch();
        } catch (error: any) {
            setFeedback({ visible: true, type: 'error', message: error.message || t('suppliers.payment_error', 'Failed to record payment') });
        } finally {
            setIsUploading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString(i18n.language === 'am' ? 'am-ET' : 'en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const handleViewAttachment = async (url: string | null) => {
        if (!url) return;
        if (Platform.OS === 'web') {
            window.open(url, '_blank');
        } else {
            await WebBrowser.openBrowserAsync(url);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <ResponsiveContainer>
                    <View style={{ padding: 20, gap: 16 }}>
                        <Skeleton height={42} width={220} borderRadius={10} />
                        <Skeleton height={140} borderRadius={16} />
                        <Skeleton height={260} borderRadius={16} />
                        <Skeleton height={180} borderRadius={16} />
                    </View>
                </ResponsiveContainer>
            </View>
        );
    }

    if (!purchase) {
        return (
            <View style={styles.centered}>
                <LinearGradient colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={styles.emptyIconCircle}>
                    <Ionicons name="alert-circle-outline" size={42} color={colors.textSecondary} />
                </View>
                <Text style={styles.emptyTitle}>{t('common.no_data', 'Purchase Order Not Found')}</Text>
                <Text style={styles.emptySubtitle}>The record you requested may have been deleted or moved.</Text>
                <AppButton title={t('common.back', 'Return to Purchases')} onPress={() => router.back()} style={{ marginTop: 20 }} size="md" />
            </View>
        );
    }

    const purchasePayments = [...(purchase.payments || [])].reverse();
    const additionalPaid = purchasePayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const totalPaid = Math.max(Number(purchase.amount_paid || 0), additionalPaid);
    const totalAmount = Number(purchase.total_amount || 0);
    const balance = Math.max(0, totalAmount - totalPaid);
    const isPaid = balance <= 0;
    const paidPct = totalAmount > 0 ? Math.min(100, Math.round((totalPaid / totalAmount) * 100)) : 100;
    const supplierInitial = (purchase.supplier?.name || 'S').charAt(0).toUpperCase();
    const totalPieces = (purchase.items || []).reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <ResponsiveContainer>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                            <Ionicons name="arrow-back" size={20} color={colors.text} />
                        </TouchableOpacity>
                        <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Text style={styles.headerTitle}>{t('purchases.purchase_details', 'Purchase Details')}</Text>
                                <View style={[styles.statusPill, isPaid ? styles.statusPillPaid : styles.statusPillDue]}>
                                    <View style={[styles.statusDot, { backgroundColor: isPaid ? colors.success : colors.danger }]} />
                                    <Text style={[styles.statusPillText, { color: isPaid ? colors.success : colors.danger }]}>
                                        {isPaid ? t('purchases.paid', 'Fully Paid') : t('purchases.partial', 'Balance Due')}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.headerSub}>
                                {purchase.invoice_number ? `INV #${purchase.invoice_number}` : `ORDER #${String(id).split('-')[0].toUpperCase()}`} • {formatDate(purchase.purchase_date || purchase.created_at)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} activeOpacity={0.7}>
                            <Ionicons name="reload" size={17} color={colors.textSecondary} />
                        </TouchableOpacity>
                        {!isPaid && (
                            <AppButton
                                title={t('suppliers.record_payment', 'Pay Balance')}
                                onPress={() => setPaymentModalVisible(true)}
                                size="sm"
                                icon={<Ionicons name="card-outline" size={15} color="#FFFFFF" />}
                            />
                        )}
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                >
                    {/* Top KPI Ribbon (Summary of financial posture) */}
                    <View style={styles.kpiGrid}>
                        <View style={styles.kpiCard}>
                            <Text style={styles.kpiLabel}>{t('common.grand_total', 'Total Amount')}</Text>
                            <Text style={styles.kpiValue}>{formatCurrency(totalAmount)}</Text>
                            <Text style={styles.kpiSub}>{(purchase.items?.length || 0)} item lines • {totalPieces} pcs</Text>
                        </View>

                        <View style={styles.kpiCard}>
                            <Text style={styles.kpiLabel}>{t('purchases.amount_paid', 'Amount Paid')}</Text>
                            <Text style={[styles.kpiValue, { color: colors.success }]}>{formatCurrency(totalPaid)}</Text>
                            <View style={styles.progressBarTrack}>
                                <View style={[styles.progressBarFill, { width: `${paidPct}%`, backgroundColor: colors.success }]} />
                            </View>
                        </View>

                        <View style={styles.kpiCard}>
                            <Text style={styles.kpiLabel}>{t('purchases.remaining_balance', 'Balance Due')}</Text>
                            <Text style={[styles.kpiValue, { color: balance > 0 ? colors.danger : colors.success }]}>
                                {balance > 0 ? formatCurrency(balance) : t('purchases.fully_paid', 'Fully Settled')}
                            </Text>
                            <Text style={styles.kpiSub}>{balance > 0 ? `${100 - paidPct}% outstanding` : 'Zero balance remaining'}</Text>
                        </View>
                    </View>

                    {/* Dual Column or Stacked Content Area */}
                    <View style={isDesktop ? styles.columnsContainer : styles.singleColumnContainer}>
                        {/* LEFT COLUMN: Supplier Info & Line Items Ledger */}
                        <View style={isDesktop ? styles.leftColumn : styles.fullWidthColumn}>
                            {/* Supplier Profile Card */}
                            <View style={styles.card}>
                                <View style={styles.supplierHero}>
                                    <View style={[styles.supplierAvatar, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}30` }]}>
                                        <Text style={[styles.supplierAvatarText, { color: colors.primary }]}>{supplierInitial}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.supplierName}>{purchase.supplier?.name || t('purchases.supplier', 'Supplier')}</Text>
                                        <View style={styles.supplierMetaRow}>
                                            {purchase.supplier?.phone ? (
                                                <View style={styles.metaBadge}>
                                                    <Ionicons name="call-outline" size={12} color={colors.textSecondary} />
                                                    <Text style={styles.metaBadgeText}>{purchase.supplier.phone}</Text>
                                                </View>
                                            ) : null}
                                            {purchase.supplier?.email ? (
                                                <View style={styles.metaBadge}>
                                                    <Ionicons name="mail-outline" size={12} color={colors.textSecondary} />
                                                    <Text style={styles.metaBadgeText}>{purchase.supplier.email}</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    </View>
                                </View>

                                {/* Meta details grid */}
                                <View style={styles.detailGrid}>
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailKey}>{t('purchases.invoice', 'Invoice Number')}</Text>
                                        <Text style={styles.detailVal}>{purchase.invoice_number ? `#${purchase.invoice_number}` : '—'}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailKey}>{t('purchases.purchaser', 'Recorded By')}</Text>
                                        <Text style={styles.detailVal}>{purchase.profiles?.full_name || t('common.system', 'System Admin')}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailKey}>{t('purchases.purchase_date', 'Order Date')}</Text>
                                        <Text style={styles.detailVal}>{formatDate(purchase.purchase_date || purchase.created_at)}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailKey}>{t('common.status', 'Settlement Status')}</Text>
                                        <Text style={[styles.detailVal, { color: isPaid ? colors.success : colors.danger }]}>
                                            {isPaid ? t('purchases.paid', 'Fully Paid') : t('purchases.partial', 'Balance Due')}
                                        </Text>
                                    </View>
                                </View>

                                {purchase.notes ? (
                                    <View style={styles.notesContainer}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <Ionicons name="document-text-outline" size={13} color={colors.textSecondary} />
                                            <Text style={styles.notesLabel}>{t('common.notes', 'Notes & Memo')}</Text>
                                        </View>
                                        <Text style={styles.notesBody}>{purchase.notes}</Text>
                                    </View>
                                ) : null}
                            </View>

                            {/* Section: Purchased Items Ledger Table */}
                            <View style={styles.card}>
                                <View style={styles.cardTitleRow}>
                                    <View style={styles.cardTitleLeft}>
                                        <View style={[styles.sectionIconBox, { backgroundColor: `${colors.primary}15` }]}>
                                            <Ionicons name="cube" size={16} color={colors.primary} />
                                        </View>
                                        <Text style={styles.sectionTitle}>{t('purchases.purchased_items', 'Purchased Items')}</Text>
                                    </View>
                                    <View style={styles.countPill}>
                                        <Text style={styles.countPillText}>{purchase.items?.length || 0} items</Text>
                                    </View>
                                </View>

                                <View style={styles.ledgerTable}>
                                    <View style={styles.tableHeader}>
                                        <Text style={[styles.thText, { flex: 2.5 }]}>{t('common.product', 'PRODUCT / SKU')}</Text>
                                        <Text style={[styles.thText, { width: 70, textAlign: 'center' }]}>{t('common.qty', 'QTY')}</Text>
                                        <Text style={[styles.thText, { width: 100, textAlign: 'right' }]}>{t('common.price', 'UNIT COST')}</Text>
                                        <Text style={[styles.thText, { width: 110, textAlign: 'right' }]}>{t('common.total', 'LINE TOTAL')}</Text>
                                    </View>

                                    {purchase.items?.map((item: any, index: number) => {
                                        const isLast = index === (purchase.items?.length || 0) - 1;
                                        const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);

                                        return (
                                            <View key={item.id || index} style={[styles.tableRow, !isLast && styles.tableRowBorder]}>
                                                <View style={{ flex: 2.5, paddingRight: 8 }}>
                                                    <Text style={styles.itemName} numberOfLines={2}>
                                                        {item.product?.name || t('inventory.products', 'Product Item')}
                                                    </Text>
                                                    {item.product?.primary_sku ? (
                                                        <Text style={styles.itemSku}>SKU: {item.product.primary_sku}</Text>
                                                    ) : null}
                                                </View>

                                                <View style={{ width: 70, alignItems: 'center' }}>
                                                    <View style={styles.qtyPill}>
                                                        <Text style={styles.qtyPillText}>{item.quantity}×</Text>
                                                    </View>
                                                </View>

                                                <View style={{ width: 100, alignItems: 'flex-end' }}>
                                                    <Text style={styles.unitCostText}>{formatCurrency(item.unit_cost)}</Text>
                                                </View>

                                                <View style={{ width: 110, alignItems: 'flex-end' }}>
                                                    <Text style={styles.lineTotalText}>{formatCurrency(lineTotal)}</Text>
                                                </View>
                                            </View>
                                        );
                                    })}

                                    {/* Table Total Summary Row */}
                                    <View style={styles.tableSummaryRow}>
                                        <Text style={styles.tableSummaryLabel}>{t('common.total', 'Total')}:</Text>
                                        <Text style={styles.tableSummaryQty}>{totalPieces} pcs</Text>
                                        <Text style={styles.tableSummaryAmount}>{formatCurrency(totalAmount)}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Section: Returns & Refunds (if any) */}
                            {purchaseReturns.length > 0 && (
                                <View style={styles.card}>
                                    <View style={styles.cardTitleRow}>
                                        <View style={styles.cardTitleLeft}>
                                            <View style={[styles.sectionIconBox, { backgroundColor: '#F9731618' }]}>
                                                <Ionicons name="arrow-undo" size={16} color="#F97316" />
                                            </View>
                                            <Text style={styles.sectionTitle}>Returned Items & Refunds</Text>
                                        </View>
                                        <View style={[styles.countPill, { backgroundColor: '#F9731615' }]}>
                                            <Text style={[styles.countPillText, { color: '#F97316' }]}>{purchaseReturns.length} returned</Text>
                                        </View>
                                    </View>

                                    <View style={styles.returnsList}>
                                        {purchaseReturns.map((ret: any, i: number) => {
                                            const isLast = i === purchaseReturns.length - 1;
                                            return (
                                                <View key={ret.id} style={[styles.returnRow, !isLast && styles.returnRowBorder]}>
                                                    <View style={{ flex: 1 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                            <View style={styles.refundTag}>
                                                                <Text style={styles.refundTagText}>
                                                                    {ret.refund_method === 'cash' ? t('common.cash', 'Cash').toUpperCase() : t('common.credit', 'Credit').toUpperCase()}
                                                                </Text>
                                                            </View>
                                                            <Text style={styles.returnDate}>{formatDate(ret.created_at)}</Text>
                                                        </View>
                                                        {ret.reason ? (
                                                            <Text style={styles.returnReason}>{ret.reason}</Text>
                                                        ) : null}
                                                    </View>
                                                    <Text style={styles.returnAmount}>−{formatCurrency(ret.total_amount)}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            {/* Record Return Trigger */}
                            <TouchableOpacity
                                style={styles.returnActionBtn}
                                onPress={() => setReturnModalVisible(true)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="return-up-back" size={16} color="#F97316" />
                                <Text style={styles.returnActionText}>{t('purchases.record_return', 'Record Supplier Return / Defect')}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* RIGHT COLUMN: Settlement Summary, Payment History & Receipt */}
                        <View style={isDesktop ? styles.rightColumn : styles.fullWidthColumn}>
                            {/* Settlement Ledger Card */}
                            <View style={styles.card}>
                                <View style={styles.cardTitleRow}>
                                    <View style={styles.cardTitleLeft}>
                                        <View style={[styles.sectionIconBox, { backgroundColor: `${colors.primary}15` }]}>
                                            <Ionicons name="wallet" size={16} color={colors.primary} />
                                        </View>
                                        <Text style={styles.sectionTitle}>{t('purchases.payment_summary', 'Settlement Summary')}</Text>
                                    </View>
                                </View>

                                <View style={styles.financialList}>
                                    <View style={styles.financialRow}>
                                        <Text style={styles.financialLabel}>{t('common.total', 'Subtotal / Total')}</Text>
                                        <Text style={styles.financialValue}>{formatCurrency(totalAmount)}</Text>
                                    </View>

                                    <View style={styles.financialRow}>
                                        <Text style={styles.financialLabel}>{t('purchases.amount_paid', 'Total Paid to Date')}</Text>
                                        <Text style={[styles.financialValue, { color: colors.success }]}>{formatCurrency(totalPaid)}</Text>
                                    </View>

                                    <View style={[styles.financialRow, styles.financialRowTotal]}>
                                        <View>
                                            <Text style={styles.balanceLabel}>{t('purchases.remaining_balance', 'Balance Due')}</Text>
                                            <Text style={styles.balanceSub}>{isPaid ? 'Settlement complete' : 'Awaiting payment'}</Text>
                                        </View>
                                        <Text style={[styles.balanceValue, { color: balance > 0 ? colors.danger : colors.success }]}>
                                            {balance > 0 ? formatCurrency(balance) : t('purchases.fully_paid', 'Fully Paid')}
                                        </Text>
                                    </View>
                                </View>

                                {!isPaid && (
                                    <AppButton
                                        title={t('suppliers.record_payment', 'Record Payment to Supplier')}
                                        onPress={() => setPaymentModalVisible(true)}
                                        style={{ marginTop: 18 }}
                                        icon={<Ionicons name="card" size={16} color="#FFFFFF" />}
                                    />
                                )}
                            </View>

                            {/* Section: Payment Records */}
                            <View style={styles.card}>
                                <View style={styles.cardTitleRow}>
                                    <View style={styles.cardTitleLeft}>
                                        <View style={[styles.sectionIconBox, { backgroundColor: `${colors.primary}15` }]}>
                                            <Ionicons name="time" size={16} color={colors.primary} />
                                        </View>
                                        <Text style={styles.sectionTitle}>{t('purchases.payment_history', 'Payment Records')}</Text>
                                    </View>
                                    <View style={styles.countPill}>
                                        <Text style={styles.countPillText}>{purchasePayments.length}</Text>
                                    </View>
                                </View>

                                {purchasePayments.length > 0 ? (
                                    <View style={styles.historyList}>
                                        {purchasePayments.map((p: any, i: number) => {
                                            const isLast = i === purchasePayments.length - 1;
                                            return (
                                                <View key={p.id || i} style={[styles.historyRow, !isLast && styles.historyRowBorder]}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.historyDate}>{formatDate(p.payment_date || p.created_at)}</Text>
                                                        <View style={styles.methodPill}>
                                                            <Text style={styles.methodPillText}>{(p.method || 'cash').toUpperCase()}</Text>
                                                        </View>
                                                    </View>

                                                    {p.receipt_url && (
                                                        <TouchableOpacity
                                                            onPress={() => handleViewAttachment(p.receipt_url)}
                                                            style={styles.paymentProofThumb}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Image source={{ uri: p.receipt_url }} style={styles.proofImg} />
                                                            <Ionicons name="eye" size={12} color={colors.primary} />
                                                        </TouchableOpacity>
                                                    )}

                                                    <Text style={styles.historyAmount}>+{formatCurrency(p.amount)}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : (
                                    <View style={styles.emptyHistoryBox}>
                                        <Ionicons name="cash-outline" size={24} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 4 }} />
                                        <Text style={styles.emptyHistoryText}>{t('purchases.no_payments', 'No payment records yet')}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Section: Receipt Attachment */}
                            {purchase.receipt_url && (
                                <View style={styles.card}>
                                    <View style={styles.cardTitleRow}>
                                        <View style={styles.cardTitleLeft}>
                                            <View style={[styles.sectionIconBox, { backgroundColor: `${colors.primary}15` }]}>
                                                <Ionicons name="receipt" size={16} color={colors.primary} />
                                            </View>
                                            <Text style={styles.sectionTitle}>{t('purchases.attachment', 'Invoice / Receipt Proof')}</Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => downloadFile(purchase.receipt_url, `purchase_receipt_${purchase.id.split('-')[0]}.jpg`)}
                                            style={styles.downloadBtn}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="download-outline" size={14} color={colors.primary} />
                                            <Text style={styles.downloadBtnText}>{t('purchases.download', 'Download')}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <Pressable
                                        style={styles.receiptContainer}
                                        onPress={() => handleViewAttachment(purchase.receipt_url)}
                                    >
                                        <Image source={{ uri: purchase.receipt_url }} style={styles.receiptImage} resizeMode="cover" />
                                        <View style={styles.receiptOverlay}>
                                            <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
                                            <Text style={styles.receiptOverlayText}>{t('purchases.view_attachment', 'Click to view full image')}</Text>
                                        </View>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={{ height: 60 }} />
                </ScrollView>
            </ResponsiveContainer>

            {/* Modals */}
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
                title={feedback.type === 'success' ? t('common.success', 'Success') : t('common.error', 'Error')}
                message={feedback.message}
                onClose={() => setFeedback({ ...feedback, visible: false })}
            />

            <ReturnModal
                visible={returnModalVisible}
                type="supplier_return"
                referenceId={purchase?.id}
                referenceLabel={purchase ? `${t('common.purchase', 'Purchase')} #${purchase.id.split('-')[0].toUpperCase()} — ${purchase.supplier?.name || t('purchases.supplier', 'Supplier')} — ${formatCurrency(purchase.total_amount)}` : ''}
                onClose={() => setReturnModalVisible(false)}
                onSuccess={() => refetch()}
            />
        </View>
    );
}

const createStyles = (colors: any, theme: 'light' | 'dark', isDesktop: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', padding: 24 },
    emptyIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    emptySubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: 'center', maxWidth: 320 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 56 : 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: Layout.borderRadius.md,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
    headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontVariant: ['tabular-nums'] },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    refreshBtn: {
        width: 38,
        height: 38,
        borderRadius: Layout.borderRadius.sm,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },

    scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 },

    // KPI Ribbon
    kpiGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    kpiCard: {
        flex: 1,
        minWidth: 200,
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.7)' : '#FFFFFF',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
        borderWidth: 1,
        borderRadius: Layout.borderRadius.lg,
        padding: 16,
        ...Layout.shadows.small,
    },
    kpiLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    kpiValue: {
        fontSize: 22,
        fontWeight: '900',
        color: colors.text,
        marginTop: 6,
        letterSpacing: -0.5,
        fontVariant: ['tabular-nums'],
    },
    kpiSub: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 6,
        fontVariant: ['tabular-nums'],
    },
    progressBarTrack: {
        height: 4,
        borderRadius: 2,
        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        marginTop: 10,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 2,
    },

    // Desktop 2-column or stacked layout
    columnsContainer: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'flex-start',
    },
    singleColumnContainer: {
        flexDirection: 'column',
        gap: 16,
    },
    leftColumn: {
        flex: 1.35,
        gap: 16,
    },
    rightColumn: {
        flex: 1,
        gap: 16,
    },
    fullWidthColumn: {
        width: '100%',
        gap: 16,
    },

    // Card Primitives
    card: {
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.75)' : '#FFFFFF',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
        borderWidth: 1,
        borderRadius: Layout.borderRadius.lg,
        padding: 18,
        ...Layout.shadows.small,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    cardTitleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sectionIconBox: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.2,
    },
    countPill: {
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    countPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
    },

    // Supplier Hero inside Card
    supplierHero: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : colors.border,
        marginBottom: 16,
    },
    supplierAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    supplierAvatarText: { fontSize: 20, fontWeight: '800' },
    supplierName: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    supplierMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    metaBadgeText: { fontSize: 11, color: colors.textSecondary },

    // Status Pill
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    statusPillPaid: { backgroundColor: `${colors.success}18` },
    statusPillDue: { backgroundColor: `${colors.danger}18` },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusPillText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },

    // Metadata Grid
    detailGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    detailItem: {
        flex: 1,
        minWidth: 120,
    },
    detailKey: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    detailVal: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
        marginTop: 3,
    },

    // Notes
    notesContainer: {
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    notesLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' },
    notesBody: {
        fontSize: 13,
        color: colors.text,
        lineHeight: 18,
        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
        padding: 10,
        borderRadius: Layout.borderRadius.sm,
        marginTop: 4,
    },

    // Items Ledger Table (Unified Single Container)
    ledgerTable: {
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : colors.border,
        borderRadius: Layout.borderRadius.md,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        paddingHorizontal: 12,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
        borderBottomWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    thText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textSecondary,
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    tableRowBorder: {
        borderBottomWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#F1F5F9',
    },
    itemName: { fontSize: 13, fontWeight: '700', color: colors.text },
    itemSku: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    qtyPill: {
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    qtyPillText: { fontSize: 12, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
    unitCostText: { fontSize: 13, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
    lineTotalText: { fontSize: 13, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
    tableSummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFAFA',
        borderTopWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : colors.border,
        gap: 16,
    },
    tableSummaryLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' },
    tableSummaryQty: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, fontVariant: ['tabular-nums'] },
    tableSummaryAmount: { fontSize: 14, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },

    // Financial Breakdown
    financialList: { gap: 10 },
    financialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    financialLabel: { fontSize: 13, color: colors.textSecondary },
    financialValue: { fontSize: 14, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
    financialRowTotal: {
        borderTopWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : colors.border,
        paddingTop: 12,
        marginTop: 4,
    },
    balanceLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
    balanceSub: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
    balanceValue: { fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },

    // Payment History List
    historyList: {
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : colors.border,
        borderRadius: Layout.borderRadius.md,
        overflow: 'hidden',
    },
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    historyRowBorder: {
        borderBottomWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#F1F5F9',
    },
    historyDate: { fontSize: 12, fontWeight: '600', color: colors.text },
    methodPill: {
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 3,
    },
    methodPillText: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.3 },
    paymentProofThumb: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 3,
        borderRadius: 6,
        backgroundColor: `${colors.primary}12`,
        marginRight: 8,
    },
    proofImg: { width: 26, height: 26, borderRadius: 4 },
    historyAmount: { fontSize: 13, fontWeight: '800', color: colors.success, fontVariant: ['tabular-nums'] },
    emptyHistoryBox: { paddingVertical: 16, alignItems: 'center' },
    emptyHistoryText: { fontSize: 12, color: colors.textSecondary },

    // Attachment
    downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
    downloadBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    receiptContainer: {
        width: '100%',
        height: 180,
        borderRadius: Layout.borderRadius.md,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: colors.border,
    },
    receiptImage: { width: '100%', height: '100%' },
    receiptOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 6,
    },
    receiptOverlayText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

    // Returns
    returnsList: {
        borderWidth: 1,
        borderColor: '#F9731630',
        borderRadius: Layout.borderRadius.md,
        overflow: 'hidden',
    },
    returnRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: theme === 'dark' ? 'rgba(249, 115, 22, 0.05)' : '#FFF7ED',
    },
    returnRowBorder: {
        borderBottomWidth: 1,
        borderColor: '#F9731620',
    },
    refundTag: {
        backgroundColor: '#F9731620',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    refundTagText: { fontSize: 9, fontWeight: '800', color: '#F97316' },
    returnDate: { fontSize: 12, color: colors.textSecondary },
    returnAmount: { fontSize: 13, fontWeight: '800', color: '#F97316', fontVariant: ['tabular-nums'] },
    returnReason: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
    returnActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: Layout.borderRadius.md,
        borderWidth: 1,
        borderColor: '#F9731640',
        backgroundColor: theme === 'dark' ? 'rgba(249, 115, 22, 0.08)' : '#FFF7ED',
    },
    returnActionText: { fontSize: 13, fontWeight: '700', color: '#F97316' },
});
