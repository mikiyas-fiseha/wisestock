import { ReportChart } from '@/components/reports/ReportChart';
import { DateRange, ReportLayout } from '@/components/reports/ReportLayout';
import { SummaryCard } from '@/components/SummaryCard';
import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ReportsHubScreen() {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date()
    });

    const { data, isLoading } = useAdvancedReports(range);

    const fmt = (val: number | null | undefined) => `$${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const pct = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;

    const chartData = data?.sales?.trend?.map(t => ({
        value: t.revenue,
        label: t.date.split('-').pop(), // Just show day or short month
    })) || [];

    const renderReportLink = (title: string, subtitle: string, icon: any, color: string, route: string) => (
        <TouchableOpacity style={styles.navCard} onPress={() => router.push(route as any)}>
            <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                <FontAwesome name={icon} size={18} color={color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.navTitle}>{title}</Text>
                <Text style={styles.navSubtitle}>{subtitle}</Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color={colors.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <ReportLayout
            title="Business Intelligence"
            subtitle="Executive Financial Summary"
            onDateRangeChange={setRange}
            isLoading={isLoading}
        >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* KPI Grid */}
                <View style={styles.kpiGrid}>
                    <SummaryCard
                        title="Net Revenue"
                        value={fmt(data?.summary?.revenue || 0)}
                        type="primary"
                        icon="money"
                        change={data?.summary?.revenueChange}
                    />
                    <SummaryCard
                        title="Net Profit"
                        value={fmt(data?.summary?.netProfit || 0)}
                        type="success"
                        icon="line-chart"
                        change={data?.summary?.profitChange}
                    />
                    <SummaryCard
                        title="Gross Margin"
                        value={`${(data?.summary?.profitMargin || 0).toFixed(1)}%`}
                        type="neutral"
                        icon="percent"
                    />
                    <SummaryCard
                        title="Expense Ratio"
                        value={`${(data?.summary?.expenseRatio || 0).toFixed(1)}%`}
                        type="warning"
                        icon="pie-chart"
                    />
                </View>

                {/* Main Trend Chart */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Revenue Trend</Text>
                        <Text style={styles.sectionSubtitle}>Daily performance for selected period</Text>
                    </View>
                    <ReportChart type="line" data={chartData} height={220} />
                </View>

                {/* Inventory & Credit Position */}
                <View style={styles.row}>
                    <View style={styles.halfCard}>
                        <Text style={styles.miniLabel}>STOCK VALUATION</Text>
                        <Text style={styles.miniValue}>{fmt(data?.summary?.stockValue || 0)}</Text>
                        <Text style={styles.miniSubtext}>Current asset value</Text>
                    </View>
                    <View style={[styles.halfCard, { borderColor: colors.primary + '30' }]}>
                        <Text style={styles.miniLabel}>RECEIVABLES</Text>
                        <Text style={[styles.miniValue, { color: colors.primary }]}>{fmt(data?.summary?.totalReceivables || 0)}</Text>
                        <Text style={styles.miniSubtext}>Customers owe you</Text>
                    </View>
                </View>
                <View style={[styles.row, { marginTop: -12 }]}>
                    <View style={[styles.halfCard, { borderColor: colors.danger + '30' }]}>
                        <Text style={styles.miniLabel}>PAYABLES</Text>
                        <Text style={[styles.miniValue, { color: colors.danger }]}>{fmt(data?.summary?.totalPayables || 0)}</Text>
                        <Text style={styles.miniSubtext}>You owe suppliers</Text>
                    </View>
                    <View style={styles.halfCard}>
                        <Text style={styles.miniLabel}>NET POSITION</Text>
                        <Text style={[styles.miniValue, { color: ((data?.summary?.totalReceivables || 0) - (data?.summary?.totalPayables || 0)) >= 0 ? colors.success : colors.danger }]}>
                            {fmt((data?.summary?.totalReceivables || 0) - (data?.summary?.totalPayables || 0))}
                        </Text>
                        <Text style={styles.miniSubtext}>AR minus AP</Text>
                    </View>
                </View>

                {/* Deep Dive Navigation */}
                <View style={styles.navSection}>
                    <Text style={styles.navSectionTitle}>Deep Dive Reports</Text>

                    <View style={styles.navGroup}>
                        {renderReportLink("Sales Analysis", "Deep dive into products, categories & staff", "bar-chart", colors.primary, "/reports/sales")}
                        <View style={styles.divider} />
                        {renderReportLink("Inventory Movement", "Stock levels, low stock & reorders", "cube", "#F59E0B", "/reports/inventory")}
                        <View style={styles.divider} />
                        {renderReportLink("Expense Analysis", "Category breakdown and ratios", "credit-card", colors.danger, "/reports/expenses")}
                        <View style={styles.divider} />
                        {renderReportLink("Financials (P&L)", "Gross/Net Profit & Balance Sheet", "bank", "#10B981", "/reports/financials")}
                        <View style={styles.divider} />
                        {renderReportLink("Customer Analysis", "Top clients & outstanding balances", "users", "#6366F1", "/reports/customers")}
                    </View>
                </View>

                {/* Credit Management */}
                <View style={styles.navSection}>
                    <Text style={styles.navSectionTitle}>Credit Management</Text>
                    <View style={styles.navGroup}>
                        {renderReportLink("Receivables (AR)", "Customer aging: 0-30 / 31-60 / 60+ days", "inbox", "#0EA5E9", "/reports/debts")}
                        <View style={styles.divider} />
                        {renderReportLink("Payables (AP)", "Supplier aging: 0-30 / 31-60 / 60+ days", "send", "#DC2626", "/reports/payables")}
                    </View>
                </View>
            </ScrollView>
        </ReportLayout>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: Layout.spacing.lg, paddingBottom: 40 },
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
        marginBottom: 20,
    },
    section: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        ...Layout.shadows.small,

    },
    sectionHeader: { marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    sectionSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    row: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    halfCard: {
        flex: 1,
        backgroundColor: colors.card + 'E0',
        borderRadius: 12,
        padding: 16,

    },
    miniLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1 },
    miniValue: { fontSize: 20, fontWeight: '800', color: colors.text, marginVertical: 4 },
    miniSubtext: { fontSize: 11, color: colors.textSecondary },
    navSection: { marginTop: 8 },
    navSectionTitle: { fontSize: 13, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
    navGroup: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 16,
        overflow: 'hidden',
        ...Layout.shadows.small,

    },
    navCard: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
    iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    navTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    navSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    divider: { height: 1, backgroundColor: colors.border, marginLeft: 64 },
});
