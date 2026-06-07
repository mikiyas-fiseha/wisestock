import { CollectPaymentModal } from '@/components/customers/CollectPaymentModal';
import { AppButton } from '@/components/ui/AppButton';
import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { useBranches } from '@/hooks/useBranches';
import { useCollectPayment, useCustomerDetail, useCustomerHistory } from '@/hooks/useSupabaseQuery';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { formatCurrency } from '@/lib/formatters';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CustomerDetailsScreen() {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { company } = useAuth();
    const { showFeedback } = useFeedback();

    const [activeTab, setActiveTab] = useState<'sales' | 'payments'>('sales');
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);

    const { data: customer, isLoading: isLoadingCustomer, refetch: refetchCustomer } = useCustomerDetail(id as string);
    const { data: history, isLoading: isLoadingHistory } = useCustomerHistory(id as string, selectedBranch);
    const { branches } = useBranches();
    const { mutate: collectPayment, isPending: isCollecting } = useCollectPayment();
    const [isUploading, setIsUploading] = useState(false);

    const handlePaymentSubmit = async (data: { amount: number; method: string; date: Date; notes: string; receiptUri: string | null; saleId?: string }) => {
        setIsUploading(true);
        let receiptUrl = null;
        if (data.receiptUri) {
            try {
                receiptUrl = await uploadImageToCloudinary(data.receiptUri);
            } catch (e: any) {
                showFeedback('error', t('common.error'), e.message);
                setIsUploading(false);
                return;
            }
        }

        collectPayment({
            customerId: id,
            amount: data.amount.toString(),
            method: data.method,
            notes: data.notes,
            receiptUrl: receiptUrl,
            saleId: data.saleId
        }, {
            onSuccess: async () => {
                setPaymentModalVisible(false);
                showFeedback('success', t('common.success'), t('common.saved'));
                refetchCustomer();
                setIsUploading(false);
            },
            onError: (err) => {
                showFeedback('error', t('common.error'), err.message);
                setIsUploading(false);
            }
        });
    };

    if (isLoadingCustomer) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
    if (!customer) return <View style={styles.center}><Text style={{ color: colors.text }}>{t('inventory.product_not_found')}</Text></View>;

    const renderHeader = () => (
        <View>
            <View style={styles.card}>
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{t('customers.current_balance')}</Text>
                        <Text style={[styles.statValue, { fontSize: 20, color: customer.current_balance > 0 ? colors.danger : colors.success }]}>
                            {formatCurrency(customer.current_balance)}
                        </Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{t('customers.credit_limit')}</Text>
                        <Text style={styles.statValue}>{formatCurrency(customer.credit_limit || 0)}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{t('customers.total_purchases')}</Text>
                        <Text style={styles.statValue}>{formatCurrency(customer.totalPurchases || 0)}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{t('customers.orders_count')}</Text>
                        <Text style={styles.statValue}>{customer.ordersCount || 0}</Text>
                    </View>
                </View>

                <AppButton
                    title={t('customers.edit_details')}
                    variant="outline"
                    onPress={() => router.push({ pathname: '/(tabs)/customers/add', params: { id: customer.id } })}
                    style={{ marginTop: 16, height: 40 }}
                    textStyle={{ fontSize: 13 }}
                />
            </View>

            <View style={styles.tabsContainer}>
                <View style={styles.tabsHeader}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'sales' && styles.activeTab]}
                        onPress={() => setActiveTab('sales')}
                    >
                        <Text style={[styles.tabText, activeTab === 'sales' && styles.activeTabText]}>{t('customers.sales_history')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'payments' && styles.activeTab]}
                        onPress={() => setActiveTab('payments')}
                    >
                        <Text style={[styles.tabText, activeTab === 'payments' && styles.activeTabText]}>{t('customers.payments')}</Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'sales' && (
                    <View style={styles.filterBar}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <TouchableOpacity
                                style={[styles.filterChip, selectedBranch === 'all' && styles.activeFilterChip]}
                                onPress={() => setSelectedBranch('all')}
                            >
                                <Text style={[styles.filterText, selectedBranch === 'all' && styles.activeFilterText]}>{t('customers.all_branches')}</Text>
                            </TouchableOpacity>
                            {branches?.map(b => (
                                <TouchableOpacity
                                    key={b.id}
                                    style={[styles.filterChip, selectedBranch === b.id && styles.activeFilterChip]}
                                    onPress={() => setSelectedBranch(b.id)}
                                >
                                    <Text style={[styles.filterText, selectedBranch === b.id && styles.activeFilterText]}>{b.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <LinearGradient
                colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={styles.name} numberOfLines={1}>{customer.name}</Text>
                                {customer.customer_type === 'wholesale' && (
                                    <View style={styles.wholesaleBadge}>
                                        <Text style={styles.wholesaleText}>{t('customers.wholesale_badge')}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.info} numberOfLines={1}>
                                {customer.phone || t('customers.no_phone')} • {customer.email || t('customers.no_email')}
                            </Text>
                        </View>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <View style={[
                            styles.balanceBadge,
                            { backgroundColor: (customer.current_balance || 0) > 0 ? colors.danger + '20' : colors.success + '20' }
                        ]}>
                            <Text style={[
                                styles.balanceText,
                                { color: (customer.current_balance || 0) > 0 ? colors.danger : colors.success }
                            ]}>
                                {formatCurrency(customer.current_balance || 0)}
                            </Text>
                        </View>
                        {(customer.current_balance || 0) > 0 && (
                            <TouchableOpacity
                                onPress={() => setPaymentModalVisible(true)}
                                style={styles.collectBtnSmall}
                            >
                                <FontAwesome name="money" size={10} color="#fff" />
                                <Text style={styles.collectBtnTextSmall}>{t('customers.collect')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {isLoadingHistory ? (
                    <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
                ) : (
                    <FlatList
                        data={activeTab === 'sales' ? history?.sales : history?.payments}
                        keyExtractor={item => item.id}
                        ListHeaderComponent={renderHeader}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        renderItem={({ item }) => (
                            activeTab === 'sales' ? (
                                <View style={styles.historyCard}>
                                    <View style={styles.historyHeader}>
                                        <View>
                                            <Text style={styles.historyInv}>INV-{item.id.split('-')[0].toUpperCase()}</Text>
                                            <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()} • {item.branches?.name || t('common.local')}</Text>
                                        </View>
                                        <View style={[
                                            styles.statusBadge,
                                            { backgroundColor: item.status === 'completed' ? colors.success + '20' : (item.status === 'credit' ? colors.warning + '20' : colors.danger + '20') }
                                        ]}>
                                            <Text style={[
                                                styles.statusBadgeText,
                                                { color: item.status === 'completed' ? colors.success : (item.status === 'credit' ? colors.warning : colors.danger) }
                                            ]}>
                                                {t(`common.${item.status || 'completed'}`).toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.historyDetails}>
                                        <Text style={styles.historyTotal}>{formatCurrency(Number(item.total_amount || item.total || 0))}</Text>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.historyPaid}>{t('customers.paid')}: {formatCurrency(Number(item.paid_amount || 0))}</Text>
                                            {Number(item.balance_due || 0) > 0 && (
                                                <Text style={[styles.historyMeta, { color: colors.danger, fontWeight: 'bold' }]}>
                                                    {t('customers.due')}: {formatCurrency(Number(item.balance_due))}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.paymentCard}>
                                    <View style={styles.historyHeader}>
                                        <View>
                                            <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                            <Text style={styles.paymentMethod}>{t(`common.${item.method || 'cash'}`).toUpperCase()}</Text>
                                        </View>
                                        <Text style={[styles.historyTotal, { color: colors.success }]}>+{formatCurrency(Number(item.amount))}</Text>
                                    </View>
                                    <View style={styles.historyDetails}>
                                        <Text style={styles.paymentNote}>{item.notes || t('common.not_available')}</Text>
                                        <Text style={styles.historyMeta}>{t('customers.by')} {item.profiles?.full_name || t('common.system')}</Text>
                                    </View>
                                </View>
                            )
                        )}
                        ListEmptyComponent={<Text style={{ padding: 32, color: colors.textSecondary, textAlign: 'center' }}>{t('customers.no_records')}</Text>}
                    />
                )}

                <CollectPaymentModal
                    visible={paymentModalVisible}
                    onClose={() => setPaymentModalVisible(false)}
                    onSubmit={handlePaymentSubmit as any}
                    customerName={customer.name}
                    currentBalance={customer.current_balance || 0}
                    isLoading={isCollecting || isUploading}
                    sales={history?.sales?.filter((s: any) => (s.balance_due || ((s.total_amount || 0) - (s.paid_amount || 0))) > 0)}
                />
            </SafeAreaView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    info: { color: colors.textSecondary, marginTop: 2, fontSize: 13 },
    card: { margin: 16, padding: 16, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 16 },
    balanceBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    balanceText: { fontWeight: '700', fontSize: 16 },
    collectBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
    collectBtnTextSmall: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    divider: { height: 1, backgroundColor: colors.border + '40', marginVertical: 12 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    statItem: { flex: 1 },
    statLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
    statValue: { fontSize: 17, fontWeight: '700', color: colors.text },
    tabsContainer: { backgroundColor: 'rgba(255,255,255,0.10)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 8, marginTop: 8 },
    tabsHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border + '40', marginBottom: 12 },
    tab: { paddingVertical: 10, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: colors.primary },
    tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    activeTabText: { color: colors.primary },
    filterBar: { marginBottom: 12 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'transparent', marginRight: 8, borderWidth: 1, borderColor: colors.border + '40' },
    activeFilterChip: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { fontSize: 12, color: colors.textSecondary },
    activeFilterText: { color: '#fff', fontWeight: 'bold' },
    historyCard: { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 16, padding: 16, marginBottom: 12, marginHorizontal: 16, borderLeftWidth: 4, borderLeftColor: colors.primary },
    paymentCard: { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 16, padding: 16, marginBottom: 12, marginHorizontal: 16, borderLeftWidth: 4, borderLeftColor: colors.success },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    historyDate: { fontSize: 12, color: colors.textSecondary },
    historyInv: { fontSize: 16, fontWeight: '700', color: colors.text },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    statusBadgeText: { fontWeight: '800', fontSize: 10 },
    historyDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    historyTotal: { fontSize: 18, fontWeight: '800', color: colors.text },
    historyPaid: { fontSize: 12, color: colors.textSecondary },
    historyMeta: { fontSize: 11, color: colors.textSecondary },
    paymentMethod: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    paymentNote: { fontSize: 14, color: colors.text, fontStyle: 'italic', flex: 1, marginRight: 8 },
    wholesaleBadge: { backgroundColor: colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    wholesaleText: { fontSize: 9, fontWeight: '800', color: colors.primary },
});
