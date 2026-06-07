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
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

export default function ExpensesReportScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { company } = useAuth();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().setDate(new Date().getDate() - 7)),
        end: new Date()
    });
    const { data, isLoading } = useAdvancedReports(range);

    const fmt = (val: number | null | undefined) => formatCurrency(val || 0);

    const expensesChange = data?.summary?.expensesChange ?? 0;
    const dateLabel = `${range.start.toISOString().split('T')[0]}_to_${range.end.toISOString().split('T')[0]}`;

    const PIE_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

    const chartData = data?.expenses?.byCategory?.map((c: any, i: number) => ({
        label: c.category,
        value: c.amount,
        color: PIE_COLORS[i % PIE_COLORS.length],
        frontColor: PIE_COLORS[i % PIE_COLORS.length],
    })) || [];

    const columns = [
        { key: 'category', title: t('common.category'), width: 200 },
        { key: 'count', title: t('reports.qty'), align: 'right' as const, width: 80 },
        { key: 'amount', title: t('common.total'), align: 'right' as const, width: 150, isCurrency: true },
    ];

    return (
        <ReportLayout
            title={t('reports.expense_analysis')}
            subtitle={t('reports.expense_analysis_subtitle')}
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={data?.expenses?.byCategory}
            exportFilename={`expense_report_${dateLabel}`}
        >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* Summary Row with period comparison */}
                <View style={styles.summaryBox}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>{t('reports.total_expenses')}</Text>
                        <Text style={styles.statValue}>{fmt(data?.summary?.expenses || 0)}</Text>
                        <Text style={[styles.statChange, { color: expensesChange > 0 ? colors.danger : colors.success }]}>
                            {expensesChange > 0 ? '+' : ''}{expensesChange.toFixed(1)}% {t('reports.vs_prev_period')}
                        </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>{t('reports.expense_ratio')}</Text>
                        <Text style={[styles.statValue, { color: colors.danger }]}>{(data?.summary?.expenseRatio || 0).toFixed(1)}%</Text>
                        <Text style={styles.statChange}>{t('reports.of_total_revenue')}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>{t('reports.categories').toUpperCase()}</Text>
                        <Text style={styles.statValue}>{data?.expenses?.byCategory?.length || 0}</Text>
                        <Text style={styles.statChange}>{t('reports.expense_types')}</Text>
                    </View>
                </View>

                {/* Charts Section */}
                <View style={[styles.chartRow, isMobile && { flexDirection: 'column' }]}>
                    <View style={[styles.section, { flex: 1 }]}>
                        <Text style={styles.sectionTitle}>{t('reports.expense_share')}</Text>
                        {chartData.length === 0
                            ? <Text style={styles.emptyText}>{t('reports.no_expenses')}</Text>
                            : <ReportChart type="pie" data={chartData} height={200} />
                        }
                    </View>
                    <View style={[styles.section, { flex: 1 }]}>
                        <Text style={styles.sectionTitle}>{t('reports.by_category')}</Text>
                        {chartData.length === 0
                            ? <Text style={styles.emptyText}>{t('reports.no_expenses')}</Text>
                            : <ReportChart type="bar" data={chartData} height={200} color={colors.danger} />
                        }
                    </View>
                </View>

                {/* Category Table */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>{t('reports.detailed_breakdown')}</Text>
                    </View>
                    <ReportTable
                        columns={columns}
                        data={data?.expenses?.byCategory || []}
                        emptyMessage={t('reports.no_expenses')}
                    />
                </View>
            </ScrollView>
        </ReportLayout>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: Layout.spacing.lg, paddingBottom: 40 },
    summaryBox: {
        flexDirection: 'row', backgroundColor: colors.card + 'F0',
        borderRadius: 20, padding: 20, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap',
    },
    stat: { flex: 1, alignItems: 'center', minWidth: 80 },
    statLabel: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1 },
    statValue: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 4 },
    statChange: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
    divider: { width: 1, height: 40, backgroundColor: colors.border + '40' },
    section: {
        backgroundColor: colors.card + 'E0', borderRadius: 20,
        padding: 16, marginBottom: 20, overflow: 'hidden',
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
    chartRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
    emptyText: { color: colors.textSecondary, textAlign: 'center', paddingVertical: 24, fontSize: 13 },
});
