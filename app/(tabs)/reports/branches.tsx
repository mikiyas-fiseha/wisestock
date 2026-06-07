import { ReportChart } from '@/components/reports/ReportChart';
import { DateRange, ReportLayout } from '@/components/reports/ReportLayout';
import { ReportTable } from '@/components/reports/ReportTable';
import { Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import { formatCurrency } from '@/lib/formatters';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function BranchPerformanceReportScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { company } = useAuth();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().setDate(new Date().getDate() - 7)),
        end: new Date()
    });

    const { data, isLoading } = useAdvancedReports(range);
    const fmt = (val: number | null | undefined) => formatCurrency(val || 0);

    const branches = data?.branches || [];
    const dateLabel = `${range.start.toISOString().split('T')[0]}_to_${range.end.toISOString().split('T')[0]}`;

    // Chart: revenue by branch
    const revenueChartData = branches.slice(0, 8).map((b: any) => ({
        label: b.name,
        value: b.revenue,
    }));

    // Chart: profit by branch
    const profitChartData = branches.slice(0, 8).map((b: any) => ({
        label: b.name,
        value: Math.max(0, b.netProfit), // Chart doesn't handle negatives well
    }));

    const tableColumns = [
        { key: 'name', title: t('branch'), width: 150 },
        { key: 'orders', title: t('reports.orders'), align: 'right' as const, width: 70 },
        { key: 'revenue', title: t('reports.revenue'), align: 'right' as const, width: 120, isCurrency: true },
        { key: 'grossProfit', title: t('reports.gross_profit'), align: 'right' as const, width: 120, isCurrency: true },
        { key: 'expenses', title: t('common.expenses'), align: 'right' as const, width: 110, isCurrency: true },
        {
            key: 'netProfit', title: t('reports.net_income'), align: 'right' as const, width: 120,
            render: (v: number) => (
                <Text style={{ fontWeight: '800', color: v >= 0 ? colors.success : colors.danger }}>
                    {fmt(v)}
                </Text>
            )
        },
        {
            key: 'profitMargin', title: t('reports.profit_margin'), align: 'right' as const, width: 80,
            render: (v: number) => (
                <Text style={{ textAlign: 'right', fontWeight: '700', color: v >= 20 ? colors.success : v >= 0 ? colors.warning : colors.danger }}>
                    {v?.toFixed(1)}%
                </Text>
            )
        },
        { key: 'avgOrderValue', title: t('reports.avg_order'), align: 'right' as const, width: 110, isCurrency: true },
    ];

    // Totals row
    const totals = React.useMemo(() => ({
        orders: branches.reduce((s: number, b: any) => s + b.orders, 0),
        revenue: branches.reduce((s: number, b: any) => s + b.revenue, 0),
        grossProfit: branches.reduce((s: number, b: any) => s + b.grossProfit, 0),
        expenses: branches.reduce((s: number, b: any) => s + b.expenses, 0),
        netProfit: branches.reduce((s: number, b: any) => s + b.netProfit, 0),
    }), [branches]);

    const topBranch = branches[0];

    return (
        <ReportLayout
            title={t('reports.branch_performance')}
            subtitle={t('reports.branch_performance_subtitle')}
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={branches}
            exportFilename={`branch_performance_${dateLabel}`}
        >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* Summary KPIs */}
                <View style={styles.kpiRow}>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>{t('reports.active_branches').toUpperCase()}</Text>
                        <Text style={styles.kpiValue}>{branches.filter((b: any) => b.revenue > 0).length}</Text>
                        <Text style={styles.kpiSub}>{t('of')} {branches.length} {t('common.total')}</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>{t('reports.top_branch').toUpperCase()}</Text>
                        <Text style={[styles.kpiValue, { fontSize: 14, color: colors.primary }]} numberOfLines={1}>
                            {topBranch?.name || '—'}
                        </Text>
                        <Text style={styles.kpiSub}>{fmt(topBranch?.revenue)} {t('reports.revenue')}</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>{t('reports.combined_revenue').toUpperCase()}</Text>
                        <Text style={styles.kpiValue}>{fmt(totals.revenue)}</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>{t('reports.combined_profit').toUpperCase()}</Text>
                        <Text style={[styles.kpiValue, { color: totals.netProfit >= 0 ? colors.success : colors.danger }]}>
                            {fmt(totals.netProfit)}
                        </Text>
                    </View>
                </View>

                {/* Revenue Comparison Chart */}
                {revenueChartData.length > 0 && (
                    <View style={styles.chartCard}>
                        <Text style={styles.chartTitle}>{t('reports.revenue_by_branch')}</Text>
                        <ReportChart type="bar" data={revenueChartData} height={200} />
                    </View>
                )}

                {/* Net Profit Chart */}
                {profitChartData.length > 0 && (
                    <View style={styles.chartCard}>
                        <Text style={styles.chartTitle}>{t('reports.profit_by_branch')}</Text>
                        <ReportChart type="bar" data={profitChartData} height={180} color="#10B981" />
                    </View>
                )}

                {/* Comparison Table */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>{t('reports.branch_comparison')}</Text>
                        <Text style={styles.sectionSubtitle}>{t('reports.branch_performance_subtitle')}</Text>
                    </View>
                    <ReportTable
                        columns={tableColumns}
                        data={branches}
                        totals={totals}
                        emptyMessage={t('reports.no_branch_data')}
                    />
                </View>
            </ScrollView>
        </ReportLayout>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: Layout.spacing.lg, paddingBottom: 40 },
    kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
    kpiCard: {
        flex: 1, minWidth: 130,
        backgroundColor: colors.card + 'E0',
        borderRadius: 16, padding: 14,
        borderLeftWidth: 4, borderLeftColor: colors.primary,
    },
    kpiLabel: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
    kpiValue: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 4 },
    kpiSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    chartCard: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 16, padding: 16, marginBottom: 20,
    },
    chartTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
    section: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 16, padding: 16, marginBottom: 20, overflow: 'hidden',
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    sectionSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
