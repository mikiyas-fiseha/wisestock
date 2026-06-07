import { ReportChart } from '@/components/reports/ReportChart';
import { DateRange, ReportLayout } from '@/components/reports/ReportLayout';
import { SummaryCard } from '@/components/SummaryCard';
import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import { formatCurrency } from '@/lib/formatters';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

export default function ReportsHubScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().setDate(new Date().getDate() - 7)),
        end: new Date()
    });

    const { data, isLoading } = useAdvancedReports(range);

    const fmt = (val: number | null | undefined) => formatCurrency(val || 0);
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
            title={t('reports.business_intelligence')}
            subtitle={t('reports.executive_summary')}
            onDateRangeChange={setRange}
            isLoading={isLoading}
            showExport={false}
        >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* KPI Grid */}
                <View style={styles.kpiGrid}>
                    <SummaryCard
                        title={t('reports.net_revenue')}
                        value={fmt(data?.summary?.revenue || 0)}
                        type="primary"
                        icon="money"
                        change={data?.summary?.revenueChange}
                        compact={isMobile}
                    />
                    <SummaryCard
                        title={t('reports.net_profit')}
                        value={fmt(data?.summary?.netProfit || 0)}
                        type="success"
                        icon="line-chart"
                        change={data?.summary?.profitChange}
                        compact={isMobile}
                    />
                    <SummaryCard
                        title={t('reports.gross_margin')}
                        value={`${(data?.summary?.profitMargin || 0).toFixed(1)}%`}
                        type="neutral"
                        icon="percent"
                        compact={isMobile}
                    />
                    <SummaryCard
                        title={t('reports.expense_ratio')}
                        value={`${(data?.summary?.expenseRatio || 0).toFixed(1)}%`}
                        type="warning"
                        icon="pie-chart"
                        compact={isMobile}
                    />
                </View>

                {/* Main Trend Chart */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t('reports.revenue_trend')}</Text>
                        <Text style={styles.sectionSubtitle}>{t('reports.revenue_trend_subtitle')}</Text>
                    </View>
                    <ReportChart type="line" data={chartData} height={220} />
                </View>

                {/* Inventory & Credit Position */}
                <View style={styles.row}>
                    <View style={styles.halfCard}>
                        <Text style={styles.miniLabel}>{t('reports.stock_valuation').toUpperCase()}</Text>
                        <Text style={styles.miniValue}>{fmt(data?.summary?.stockValue || 0)}</Text>
                        <Text style={styles.miniSubtext}>{t('reports.current_asset_value')}</Text>
                    </View>
                    <View style={[styles.halfCard, { borderColor: colors.primary + '30' }]}>
                        <Text style={styles.miniLabel}>{t('reports.receivables').toUpperCase()}</Text>
                        <Text style={[styles.miniValue, { color: colors.primary }]}>{fmt(data?.summary?.totalReceivables || 0)}</Text>
                        <Text style={styles.miniSubtext}>{t('reports.customers_owe')}</Text>
                    </View>
                </View>
                <View style={[styles.row, { marginTop: -12 }]}>
                    <View style={[styles.halfCard, { borderColor: colors.danger + '30' }]}>
                        <Text style={styles.miniLabel}>{t('reports.payables').toUpperCase()}</Text>
                        <Text style={[styles.miniValue, { color: colors.danger }]}>{fmt(data?.summary?.totalPayables || 0)}</Text>
                        <Text style={styles.miniSubtext}>{t('reports.you_owe_suppliers')}</Text>
                    </View>
                    <View style={styles.halfCard}>
                        <Text style={styles.miniLabel}>{t('reports.net_position').toUpperCase()}</Text>
                        <Text style={[styles.miniValue, { color: ((data?.summary?.totalReceivables || 0) - (data?.summary?.totalPayables || 0)) >= 0 ? colors.success : colors.danger }]}>
                            {fmt((data?.summary?.totalReceivables || 0) - (data?.summary?.totalPayables || 0))}
                        </Text>
                        <Text style={styles.miniSubtext}>{t('reports.ar_minus_ap')}</Text>
                    </View>
                </View>

                {/* Deep Dive Navigation */}
                <View style={styles.navSection}>
                    <Text style={styles.navSectionTitle}>{t('reports.deep_dive')}</Text>

                    <View style={styles.navGroup}>
                        {renderReportLink(t('reports.sales_analysis'), t('reports.sales_analysis_subtitle'), "bar-chart", colors.primary, "/reports/sales")}
                        <View style={styles.divider} />
                        {renderReportLink(t('reports.purchases_report'), t('reports.purchases_report_subtitle'), "shopping-cart", "#F59E0B", "/reports/purchases")}
                        <View style={styles.divider} />
                        {renderReportLink(t('reports.returns_refunds'), t('reports.returns_subtitle'), "undo", "#EF4444", "/reports/returns")}
                        <View style={styles.divider} />
                        {renderReportLink(t('reports.inventory_movement'), t('reports.inventory_subtitle'), "cube", "#F59E0B", "/reports/inventory")}
                        <View style={styles.divider} />
                        {renderReportLink(t('reports.expense_analysis'), t('reports.expense_analysis_subtitle'), "credit-card", colors.danger, "/reports/expenses")}
                        <View style={styles.divider} />
                        {renderReportLink(t('reports.financial_analysis'), t('reports.financials_subtitle'), "bank", "#10B981", "/reports/financials")}
                        <View style={styles.divider} />
                        {renderReportLink(t('reports.customer_analysis'), t('reports.customer_analysis_subtitle'), "users", "#6366F1", "/reports/customers")}
                        <View style={styles.divider} />
                        {renderReportLink(t('reports.branch_performance'), t('reports.branch_performance_subtitle'), "map-marker", "#8B5CF6", "/reports/branches")}
                    </View>
                </View>

                {/* Credit Management */}
                <View style={styles.navSection}>
                    <Text style={styles.navSectionTitle}>{t('reports.credit_management')}</Text>
                    <View style={styles.navGroup}>
                        {renderReportLink(t('reports.receivables_ar'), t('reports.receivables_subtitle'), "inbox", "#0EA5E9", "/reports/debts")}
                        <View style={styles.divider} />
                        {renderReportLink(t('reports.payables_ap'), t('reports.payables_subtitle'), "send", "#DC2626", "/reports/payables")}
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
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,

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
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,

    },
    miniLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1 },
    miniValue: { fontSize: 20, fontWeight: '800', color: colors.text, marginVertical: 4 },
    miniSubtext: { fontSize: 11, color: colors.textSecondary },
    navSection: { marginTop: 8 },
    navSectionTitle: { fontSize: 13, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
    navGroup: {
        backgroundColor: colors.card,
        borderRadius: 16,
        overflow: 'hidden',

    },
    navCard: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
    iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    navTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    navSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    divider: { height: 1, backgroundColor: colors.border, marginLeft: 64 },
});
