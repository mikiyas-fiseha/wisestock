
import { RecordPaymentModal } from '@/components/suppliers/RecordPaymentModal';
import { AppButton } from '@/components/ui/AppButton';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';

import { Gradients } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { usePurchases } from '@/hooks/usePurchases';
import { useSuppliers } from '@/hooks/useSuppliers';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
            <LinearGradient
                colors={theme === "dark" ? Gradients.authDark : Gradients.authLight}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={18} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Supplier Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ResponsiveContainer>
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Supplier Info */}
                    <View style={styles.heroSection}>
                        <View style={{ flex: 1 }}>
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
                        </View>
                    </View>

                    <View style={styles.actionsRow}>
                        {(supplier.current_balance || 0) > 0 && (
                            <AppButton
                                title="Record Payment"
                                onPress={() => setPaymentModalVisible(true)}
                                style={{ flex: 1, marginRight: 8 }}
                            />
                        )}
                        <AppButton
                            title="Restock Items"
                            onPress={() => router.push({ pathname: '/(tabs)/purchases/add', params: { supplierId: supplier.id } })}
                            variant="outline"
                            style={{ flex: 1 }}
                        />
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: colors.card + 'C0',
    },
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    content: {
        padding: 16,
        paddingBottom: 60,
    },
    heroSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 4,
    },
    actionsRow: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    balanceBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
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
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
        color: colors.text,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    icon: {
        width: 20,
        marginRight: 10,
    },
    infoText: {
        fontSize: 15,
        color: colors.text,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        color: colors.text,
        paddingHorizontal: 4,
    },
    subSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        paddingHorizontal: 4,
    },
    emptyState: {
        padding: 30,
        alignItems: 'center',
        backgroundColor: colors.card + 'A0',
        borderRadius: 16,
    },
    emptyText: {
        color: colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    historyCard: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    paymentCard: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    historyDate: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    statusBadge: {
        fontWeight: '700',
        fontSize: 11,
    },
    historyDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    paymentMethod: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    paymentNote: {
        fontSize: 14,
        color: colors.text,
        fontStyle: 'italic',
        flex: 1,
        marginRight: 8,
    },
    paymentAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.success,
    }
});
