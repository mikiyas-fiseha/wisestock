import { CollectPaymentModal } from '@/components/customers/CollectPaymentModal';
import { AppButton } from '@/components/ui/AppButton';
import { Gradients, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { useBranches } from '@/hooks/useBranches';
import { useCollectPayment, useCustomerDetail, useCustomerHistory } from '@/hooks/useSupabaseQuery';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CustomerDetailsScreen() {
    const { colors, theme } = useTheme();
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

    const handlePaymentSubmit = async (data: { amount: number; method: string; date: Date; notes: string }) => {
        collectPayment({
            customerId: id,
            amount: data.amount.toString(),
            notes: data.notes
        }, {
            onSuccess: () => {
                setPaymentModalVisible(false);
                showFeedback('success', 'Success', "Payment recorded");
                refetchCustomer();
            },
            onError: (err) => {
                showFeedback('error', 'Error', err.message);
            }
        });
    };

    if (isLoadingCustomer) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
    if (!customer) return <View style={styles.center}><Text style={{ color: colors.text }}>Customer not found</Text></View>;

    const renderHeader = () => (
        <View>
            <View style={styles.card}>
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Current Balance</Text>
                        <Text style={[styles.statValue, { fontSize: 20, color: customer.current_balance > 0 ? colors.danger : colors.success }]}>
                            ${customer.current_balance.toFixed(2)}
                        </Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Credit Limit</Text>
                        <Text style={styles.statValue}>${customer.credit_limit?.toFixed(2) || '0.00'}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total Purchases</Text>
                        <Text style={styles.statValue}>${customer.totalPurchases?.toFixed(2) || '0.00'}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Orders Count</Text>
                        <Text style={styles.statValue}>{customer.ordersCount || 0}</Text>
                    </View>
                </View>

                <AppButton
                    title="Edit Customer Details"
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
                        <Text style={[styles.tabText, activeTab === 'sales' && styles.activeTabText]}>Sales History</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'payments' && styles.activeTab]}
                        onPress={() => setActiveTab('payments')}
                    >
                        <Text style={[styles.tabText, activeTab === 'payments' && styles.activeTabText]}>Payments</Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'sales' && (
                    <View style={styles.filterBar}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <TouchableOpacity
                                style={[styles.filterChip, selectedBranch === 'all' && styles.activeFilterChip]}
                                onPress={() => setSelectedBranch('all')}
                            >
                                <Text style={[styles.filterText, selectedBranch === 'all' && styles.activeFilterText]}>All Branches</Text>
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
                                        <Text style={styles.wholesaleText}>WHOLESALE</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.info} numberOfLines={1}>
                                {customer.phone || 'No Phone'} • {customer.email || 'No Email'}
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
                                ${(customer.current_balance || 0).toFixed(2)}
                            </Text>
                        </View>
                        {(customer.current_balance || 0) > 0 && (
                            <TouchableOpacity
                                onPress={() => setPaymentModalVisible(true)}
                                style={styles.collectBtnSmall}
                            >
                                <FontAwesome name="money" size={10} color="#fff" />
                                <Text style={styles.collectBtnTextSmall}>Collect</Text>
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
                                            <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()} • {item.branches?.name || 'Local'}</Text>
                                        </View>
                                        <View style={[
                                            styles.statusBadge,
                                            { backgroundColor: item.status === 'completed' ? colors.success + '20' : (item.status === 'credit' ? colors.warning + '20' : colors.danger + '20') }
                                        ]}>
                                            <Text style={[
                                                styles.statusBadgeText,
                                                { color: item.status === 'completed' ? colors.success : (item.status === 'credit' ? colors.warning : colors.danger) }
                                            ]}>
                                                {(item.status || 'completed').toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.historyDetails}>
                                        <Text style={styles.historyTotal}>${Number(item.total_amount || item.total || 0).toFixed(2)}</Text>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.historyPaid}>Paid: ${Number(item.paid_amount || 0).toFixed(2)}</Text>
                                            {Number(item.balance_due || 0) > 0 && (
                                                <Text style={[styles.historyMeta, { color: colors.danger, fontWeight: 'bold' }]}>
                                                    Due: ${Number(item.balance_due).toFixed(2)}
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
                                            <Text style={styles.paymentMethod}>{item.method?.toUpperCase() || 'CASH'}</Text>
                                        </View>
                                        <Text style={[styles.historyTotal, { color: colors.success }]}>+${Number(item.amount).toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.historyDetails}>
                                        <Text style={styles.paymentNote}>{item.notes || 'No description'}</Text>
                                        <Text style={styles.historyMeta}>By {item.profiles?.full_name || 'System'}</Text>
                                    </View>
                                </View>
                            )
                        )}
                        ListEmptyComponent={<Text style={{ padding: 32, color: colors.textSecondary, textAlign: 'center' }}>No records found.</Text>}
                    />
                )}

                <CollectPaymentModal
                    visible={paymentModalVisible}
                    onClose={() => setPaymentModalVisible(false)}
                    onSubmit={handlePaymentSubmit as any}
                    customerName={customer.name}
                    currentBalance={customer.current_balance || 0}
                    isLoading={isCollecting}
                />
            </SafeAreaView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 16, backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    info: { color: colors.textSecondary, marginTop: 2, fontSize: 13 },
    card: { margin: 16, padding: 16, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 16, ...Layout.shadows.small },
    balanceBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    balanceText: { fontWeight: '700', fontSize: 16 },
    collectBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
    collectBtnTextSmall: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    statItem: { flex: 1 },
    statLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
    statValue: { fontSize: 17, fontWeight: '700', color: colors.text },
    tabsContainer: { backgroundColor: 'rgba(255,255,255,0.10)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 8, marginTop: 8 },
    tabsHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 12 },
    tab: { paddingVertical: 10, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: colors.primary },
    tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    activeTabText: { color: colors.primary },
    filterBar: { marginBottom: 12 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'transparent', marginRight: 8, borderWidth: 1, borderColor: colors.border },
    activeFilterChip: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { fontSize: 12, color: colors.textSecondary },
    activeFilterText: { color: '#fff', fontWeight: 'bold' },
    historyCard: { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 14, padding: 16, marginBottom: 12, marginHorizontal: 16, borderWidth: 1, borderTopColor: colors.border, borderRightColor: colors.border, borderBottomColor: colors.border, borderLeftWidth: 4, borderLeftColor: colors.primary, ...Layout.shadows.small },
    paymentCard: { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 14, padding: 16, marginBottom: 12, marginHorizontal: 16, borderWidth: 1, borderTopColor: colors.border, borderRightColor: colors.border, borderBottomColor: colors.border, borderLeftWidth: 4, borderLeftColor: colors.success, ...Layout.shadows.small },
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
