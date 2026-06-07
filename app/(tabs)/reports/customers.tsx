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

export default function CustomerReportScreen() {
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

    const topColumns = [
        { key: 'name', title: t('common.customer'), width: 140 },
        { key: 'count', title: t('reports.orders'), align: 'right' as const, width: 60 },
        { key: 'revenue', title: t('reports.purchased'), align: 'right' as const, width: 110, isCurrency: true },
        { key: 'profit', title: t('reports.net_profit'), align: 'right' as const, width: 100, isCurrency: true },
        {
            key: 'balance', title: t('customers.outstanding_balance'), align: 'right' as const, width: 110,
            render: (v: number) => (
                <Text style={{ textAlign: 'right', color: v > 0 ? colors.danger : colors.text, fontWeight: v > 0 ? '700' : '400' }}>
                    {fmt(v)}
                </Text>
            )
        },
    ];

    const receivableColumns = [
        { key: 'name', title: t('common.customer'), width: 160 },
        { key: 'balance', title: t('customers.outstanding_balance'), align: 'right' as const, width: 120, isCurrency: true },
        {
            key: 'overdue_days', title: t('reports.overdue'), align: 'right' as const, width: 90,
            render: (v: number) => (
                <Text style={{ textAlign: 'right', color: v > 60 ? colors.danger : v > 30 ? colors.warning : colors.text, fontWeight: '700' }}>
                    {v}{t('reports.days')[0]}
                </Text>
            )
        },
        { key: 'branch', title: t('branch'), width: 100 },
    ];

    const c = data?.customers;
    const dateLabel = `${range.start.toISOString().split('T')[0]}_to_${range.end.toISOString().split('T')[0]}`;

    const totalOverdue60 = (c?.receivables || []).filter((r: any) => r.overdue_days > 60).length;

    return (
        <ReportLayout
            title={t('reports.customer_analysis')}
            subtitle={t('reports.customer_analysis_subtitle')}
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={c?.receivables}
            exportFilename={`customer_receivables_${dateLabel}`}
        >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* Summary Box */}
                <View style={styles.summaryBox}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>{t('reports.receivables').toUpperCase()}</Text>
                        <Text style={[styles.statValue, { color: colors.danger }]}>{fmt(data?.summary?.totalReceivables || 0)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>{t('reports.active_this_period').toUpperCase()}</Text>
                        <Text style={styles.statValue}>{c?.top?.length || 0}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>{t('reports.overdue_60_days').toUpperCase()}</Text>
                        <Text style={[styles.statValue, { color: totalOverdue60 > 0 ? colors.danger : colors.text }]}>{totalOverdue60}</Text>
                    </View>
                </View>

                {/* Top Customers Table */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>{t('reports.top_customers')}</Text>
                        <Text style={styles.sectionSubtitle}>{t('reports.top_products_subtitle')}</Text>
                    </View>
                    <ReportTable
                        columns={topColumns}
                        data={c?.top || []}
                        emptyMessage={t('reports.no_sales_period')}
                    />
                </View>

                {/* Receivables Table */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>{t('reports.receivables')}</Text>
                        <Text style={styles.sectionSubtitle}>{t('reports.outstanding_balances_subtitle')}</Text>
                    </View>
                    <ReportTable
                        columns={receivableColumns}
                        data={c?.receivables || []}
                        emptyMessage={t('reports.all_settled')}
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
        borderRadius: 20, padding: 24, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap',
    },
    stat: { flex: 1, alignItems: 'center', minWidth: 80 },
    statLabel: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1 },
    statValue: { fontSize: 22, fontWeight: '900', color: colors.text, marginTop: 4 },
    divider: { width: 1, height: 40, backgroundColor: colors.border },
    section: {
        backgroundColor: colors.card + 'E0', borderRadius: 20,
        padding: 16, marginBottom: 20, overflow: 'hidden',
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    sectionSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
