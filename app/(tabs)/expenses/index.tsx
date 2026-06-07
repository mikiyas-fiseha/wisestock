
import { SummaryCard } from '@/components/SummaryCard';
import { DateFilter, DatePeriod, DateRange, getRangeForPeriod } from '@/components/reports/DateFilter';
import { ReportChart } from '@/components/reports/ReportChart';

import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useExpenseReports, useExpenses, useExpenseStats, useProcessRecurringExpenses } from '@/hooks/useExpenses';
import { formatCurrency } from '@/lib/formatters';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ExpensesScreen() {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const { company, isAdmin, isSuperAdmin, branch, allBranches } = useAuth();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();

    // Auto-process recurring expenses on load
    const processRecurring = useProcessRecurringExpenses();
    useEffect(() => {
        processRecurring.mutate();
    }, []);

    const [activeTab, setActiveTab] = useState<'list' | 'reports'>('list');
    const [period, setPeriod] = useState<DatePeriod>('month');
    const [customRange, setCustomRange] = useState<DateRange>({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date()
    });
    const [branchId, setBranchId] = useState<string | undefined>(branch?.id);

    // Sync branch state when it loads in AuthContext
    React.useEffect(() => {
        if (branch?.id) {
            setBranchId(branch.id);
        }
    }, [branch?.id]);

    // Get actual date range for the current period
    const currentRange = getRangeForPeriod(period, customRange);

    const { data: expenses, isLoading: listLoading, refetch } = useExpenses({
        start: currentRange.start,
        end: currentRange.end,
        branch_id: branchId,
    });

    const { data: reports, isLoading: reportsLoading } = useExpenseReports({
        start: currentRange.start,
        end: currentRange.end,
        branch_id: branchId,
    });

    const { data: statsData } = useExpenseStats({
        branch_id: branchId,
    });

    const stats = statsData || { today: 0, totalMonth: 0, totalYear: 0, topCategory: 'None' };

    const renderHeader = () => (
        <View style={styles.headerSection}>
            <View style={styles.statsRow}>
                <SummaryCard
                    title={t('expenses.this_month')}
                    value={formatCurrency(stats.totalMonth)}
                    type="danger"
                    icon="money"
                    compact
                />
                <SummaryCard
                    title={t('expenses.top_category')}
                    value={stats.topCategory === 'None' ? t('common.none') || 'None' : stats.topCategory}
                    type="neutral"
                    icon="tag"
                    compact
                />
            </View>

            <View style={styles.filterRow}>
                <DateFilter
                    period={period}
                    onPeriodChange={setPeriod}
                    customRange={customRange}
                    onCustomRangeChange={setCustomRange}
                />
                {(isAdmin || isSuperAdmin) && (
                    <TouchableOpacity style={styles.branchBtn} onPress={() => {/* Branch Picker Modal */ }}>
                        <Ionicons name="location-outline" size={18} color={colors.primary} />
                        <Text style={styles.branchBtnText}>
                            {branchId ? allBranches.find(b => b.id === branchId)?.name || t('branch') : t('common.all_branches')}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderReports = () => {
        if (!reports) return null;
        return (
            <ScrollView style={styles.reportsContent} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>{t('expenses.spending_by_category')}</Text>
                    <ReportChart
                        type="bar"
                        data={reports.byCategory}
                        height={220}
                        color={colors.danger}
                    />
                </View>

                {(isAdmin || isSuperAdmin) && (
                    <View style={styles.chartCard}>
                        <Text style={styles.chartTitle}>{t('expenses.branch_comparison')}</Text>
                        <ReportChart
                            type="bar"
                            data={reports.byBranch}
                            height={220}
                            color={colors.primary}
                        />
                    </View>
                )}

                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>{t('expenses.monthly_trend')}</Text>
                    <ReportChart
                        type="line"
                        data={reports.monthlyTrend}
                        height={200}
                        color={colors.primary}
                    />
                </View>
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'list' && styles.activeTab]}
                    onPress={() => setActiveTab('list')}
                >
                    <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>{t('expenses.all_expenses')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
                    onPress={() => setActiveTab('reports')}
                >
                    <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>{t('common.reports')}</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'list' ? (
                <FlatList
                    data={expenses || []}
                    ListHeaderComponent={renderHeader}
                    renderItem={({ item }) => (
                        <View style={styles.expenseCard}>
                            <View style={styles.expenseMain}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.description}>{item.description || t('expenses.no_description')}</Text>
                                    <Text style={styles.category}>{item.expense_categories?.name || t('expenses.uncategorized')}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.amount}>-{formatCurrency(item.amount)}</Text>
                                    <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={<RefreshControl refreshing={listLoading} onRefresh={refetch} />}
                    ListEmptyComponent={
                        !listLoading ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
                                <Text style={styles.emptyText}>{t('expenses.empty_expenses')}</Text>
                            </View>
                        ) : null
                    }
                />
            ) : (
                reportsLoading ? (
                    <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
                ) : renderReports()
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/expenses/add')}
            >
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.card + 'E0',
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8
    },
    activeTab: {
        backgroundColor: colors.primary + '10',
    },
    tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    activeTabText: { color: colors.primary },
    headerSection: { marginBottom: 16 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    branchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.card + 'E0',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    branchBtnText: { fontSize: 13, color: colors.text, fontWeight: '500' },
    expenseCard: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
    },
    expenseMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center'
    },
    description: { fontSize: 14, fontWeight: '600', color: colors.text },
    category: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    amount: { fontSize: 15, fontWeight: '700', color: colors.danger },
    date: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reportsContent: { padding: 16 },
    chartCard: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    chartTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 50, gap: 10 },
    emptyText: { color: colors.textSecondary, fontSize: 14 }
});
