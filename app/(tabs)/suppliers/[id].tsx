
import { RecordPaymentModal } from '@/components/suppliers/RecordPaymentModal';
import { AppButton } from '@/components/ui/AppButton';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';

import { useTheme } from '@/context/ThemeContext';
import { usePurchases } from '@/hooks/usePurchases';
import { useSuppliers } from '@/hooks/useSuppliers';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Gradients } from '@/constants/Colors';

import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SupplierDetailsScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { getSupplier, recordPayment, isRecordingPayment, getPayments } = useSuppliers();
    const { purchases } = usePurchases();

    // UI State
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [feedback, setFeedback] = useState({ visible: false, type: 'success' as 'success' | 'error', message: '' });

    // Fetch supplier details
    const { data: supplier, isLoading: loadingSupplier } = getSupplier(id!);
    // Fetch payments history
    const { data: payments } = getPayments(id!);

    // Filter purchases for this supplier (Client-side for now)
    const supplierPurchases = purchases?.filter(p => p.supplier_id === id) || [];

    const handleRecordPayment = async (data: { amount: number; method: string; date: Date; notes: string }) => {
        try {
            await recordPayment({
                supplier_id: id!,
                amount: data.amount,
                payment_date: data.date,
                method: data.method,
                notes: data.notes
            });
            setPaymentModalVisible(false);
            setFeedback({ visible: true, type: 'success', message: 'Payment recorded successfully' });
        } catch (error: any) {
            setFeedback({ visible: true, type: 'error', message: error.message || 'Failed to record payment' });
        }
    };

    if (loadingSupplier) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!supplier) {
        return (
            <View style={styles.center}>
                <Text>Supplier not found</Text>
            </View>
        );
    }


    return (
        <View style={styles.container}>

            <ResponsiveContainer>
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>{supplier.name}</Text>
                            <Text style={styles.subtitle}>{supplier.contact_person || 'No contact person'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <View style={[
                                styles.balanceBadge,
                                { backgroundColor: (supplier.current_balance || 0) > 0 ? `${colors.danger}15` : `${colors.success}15` }
                            ]}>
                                <Text style={[
                                    styles.balanceText,
                                    { color: (supplier.current_balance || 0) > 0 ? colors.danger : colors.success }
                                ]}>
                                    Balance: ${(supplier.current_balance || 0).toFixed(2)}
                                </Text>
                            </View>
                            {(supplier.current_balance || 0) > 0 && (
                                <AppButton
                                    title="Record Payment"
                                    onPress={() => setPaymentModalVisible(true)}
                                    variant="outline"
                                    style={{ marginTop: 8, paddingVertical: 6, paddingHorizontal: 12 }}
                                    textStyle={{ fontSize: 12 }}
                                />
                            )}
                        </View>
                    </View>

                    {/* Contact Info Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Contact Information</Text>
                        <View style={styles.infoRow}>
                            <FontAwesome name="envelope" size={16} color={colors.textSecondary} style={styles.icon} />
                            <Text style={styles.infoText}>{supplier.email || 'N/A'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <FontAwesome name="phone" size={16} color={colors.textSecondary} style={styles.icon} />
                            <Text style={styles.infoText}>{supplier.phone || 'N/A'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <FontAwesome name="map-marker" size={16} color={colors.textSecondary} style={styles.icon} />
                            <Text style={styles.infoText}>{supplier.address || 'N/A'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <FontAwesome name="building" size={16} color={colors.textSecondary} style={styles.icon} />
                            <Text style={styles.infoText}>Tax ID: {supplier.tax_id || 'N/A'}</Text>
                        </View>
                    </View>

                    {/* Transaction History Tabs (Simple View for now) */}
                    <Text style={styles.sectionTitle}>Recent Logic</Text>
                    {/* TODO: Implement real Tabs for Purchases vs Payments. For now showing Purchases */}

                    <Text style={styles.subSectionTitle}>Purchases</Text>
                    {supplierPurchases.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No purchases recorded yet.</Text>
                            <AppButton
                                title="Restock Items"
                                onPress={() => router.push({ pathname: '/(tabs)/purchases/add', params: { supplierId: supplier.id } })}
                                style={{ marginTop: 16 }}
                            />
                        </View>
                    ) : (
                        <View>
                            {supplierPurchases.slice(0, 5).map(purchase => (
                                <View key={purchase.id} style={styles.historyCard}>
                                    <View style={styles.historyHeader}>
                                        <Text style={styles.historyDate}>{new Date(purchase.purchase_date!).toLocaleDateString()}</Text>
                                        <Text style={[
                                            styles.statusBadge,
                                            { color: purchase.payment_status === 'paid' ? colors.success : (purchase.payment_status === 'partial' ? colors.warning : colors.danger) }
                                        ]}>
                                            {purchase.payment_status?.toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.historyDetails}>
                                        <Text style={styles.historyInv}>Inv: {purchase.invoice_number || 'N/A'}</Text>
                                        <Text style={styles.historyAmount}>${purchase.total_amount.toFixed(2)}</Text>
                                    </View>
                                </View>
                            ))}
                            {supplierPurchases.length > 5 && (
                                <AppButton title="View All Purchases" onPress={() => { }} variant="outline" />
                            )}
                        </View>
                    )}

                    {/* Payments List */}
                    <Text style={[styles.subSectionTitle, { marginTop: 20 }]}>Payments Made</Text>
                    {payments && payments.length > 0 ? (
                        payments.slice(0, 5).map(payment => (
                            <View key={payment.id} style={styles.paymentCard}>
                                <View style={styles.historyHeader}>
                                    <Text style={styles.historyDate}>{new Date(payment.payment_date!).toLocaleDateString()}</Text>
                                    <Text style={styles.paymentMethod}>{payment.method?.toUpperCase()}</Text>
                                </View>
                                <View style={styles.historyDetails}>
                                    <Text style={styles.paymentNote}>{payment.notes || 'Payment'}</Text>
                                    <Text style={styles.paymentAmount}>-${payment.amount.toFixed(2)}</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No payments recorded.</Text>
                    )}

                </ScrollView>
            </ResponsiveContainer>

            <RecordPaymentModal
                visible={paymentModalVisible}
                onClose={() => setPaymentModalVisible(false)}
                onSubmit={handleRecordPayment}
                supplierName={supplier.name}
                currentBalance={supplier.current_balance || 0}
                isLoading={isRecordingPayment}
            />

            <FeedbackModal
                visible={feedback.visible}
                type={feedback.type}
                title={feedback.type === 'success' ? 'Success' : 'Error'}
                message={feedback.message}
                onClose={() => setFeedback({ ...feedback, visible: false })}
            />
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
        paddingBottom: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        maxWidth: '60%',
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    balanceBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    balanceText: {
        fontWeight: '700',
        fontSize: 14,
    },
    card: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,

    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        color: colors.text,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    icon: {
        width: 24,
        marginRight: 8,
    },
    infoText: {
        fontSize: 16,
        color: colors.text,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
        color: colors.text,
    },
    subSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: colors.text,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        backgroundColor: colors.card + 'E0',
        borderRadius: 16,

    },
    emptyText: {
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginBottom: 12,
    },
    historyCard: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 1,
    },
    paymentCard: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: colors.secondary, // Different color for payments
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 1,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    historyDate: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    statusBadge: {
        fontWeight: '700',
        fontSize: 12,
    },
    historyDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    historyInv: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    historyAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    historyFooter: {
        alignItems: 'flex-end',
    },
    historyPaid: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    paymentMethod: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    paymentNote: {
        fontSize: 14,
        color: colors.text,
        fontStyle: 'italic',
    },
    paymentAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.success, // Green for payments made (good thing)
    }
});
