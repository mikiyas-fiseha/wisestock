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

export default function ReturnsReportScreen() {
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

    const r = data?.returns;
    const dateLabel = `${range.start.toISOString().split('T')[0]}_to_${range.end.toISOString().split('T')[0]}`;

    const PIE_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

    const typeChartData = (r?.byType || []).map((t: any, i: number) => ({
        label: t.type, value: t.total,
        color: PIE_COLORS[i % PIE_COLORS.length],
        frontColor: PIE_COLORS[i % PIE_COLORS.length],
    }));

    const detailedColumns = [
        {
            key: 'date', title: t('common.date'), width: 90,
            render: (v: string) => <Text style={{ color: colors.text }}>{new Date(v).toLocaleDateString()}</Text>
        },
        {
            key: 'type', title: t('common.status'), width: 90,
            render: (v: string) => (
                <Text style={{ fontWeight: '700', color: v === 'Customer' ? colors.danger : colors.warning, fontSize: 12 }}>
                    {v === 'Customer' ? t('common.customers') : t('common.suppliers')}
                </Text>
            )
        },
        { key: 'reason', title: t('reports.reason'), width: 160 },
        { key: 'refundMethod', title: t('reports.payment_methods'), width: 120 },
        { key: 'total', title: t('common.total'), align: 'right' as const, width: 110, isCurrency: true },
        {
            key: 'status', title: t('reports.status'), width: 90,
            render: (v: string) => (
                <Text style={{ fontSize: 11, fontWeight: '700', color: v === 'completed' ? colors.success : colors.danger, textTransform: 'uppercase' }}>
                    {t(`common.${v}`)}
                </Text>
            )
        },
    ];

    const reasonColumns = [
        { key: 'reason', title: t('reports.reason'), width: 220 },
        { key: 'count', title: t('reports.qty'), align: 'right' as const, width: 70 },
        { key: 'total', title: t('reports.total'), align: 'right' as const, width: 130, isCurrency: true },
    ];

    const productColumns = [
        { key: 'name', title: t('inventory.products'), width: 200 },
        { key: 'qty', title: t('reports.qty'), align: 'right' as const, width: 110 },
        { key: 'total', title: t('reports.total'), align: 'right' as const, width: 130, isCurrency: true },
    ];

    return (
        <ReportLayout
            title={t('reports.returns_refunds')}
            subtitle={t('reports.returns_subtitle')}
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={r?.detailed}
            exportFilename={`returns_report_${dateLabel}`}
        >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* KPI Summary */}
                <View style={styles.kpiRow}>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>{t('reports.total_returns')}</Text>
                        <Text style={styles.kpiValue}>{r?.totalReturns || 0}</Text>
                    </View>
                    <View style={[styles.kpiCard, { borderLeftColor: colors.danger }]}>
                        <Text style={styles.kpiLabel}>{t('reports.customer_refunds')}</Text>
                        <Text style={[styles.kpiValue, { color: colors.danger }]}>{fmt(r?.customerTotal)}</Text>
                    </View>
                    <View style={[styles.kpiCard, { borderLeftColor: colors.warning }]}>
                        <Text style={styles.kpiLabel}>{t('reports.supplier_returns')}</Text>
                        <Text style={[styles.kpiValue, { color: colors.warning }]}>{fmt(r?.supplierTotal)}</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>{t('reports.total_refunded')}</Text>
                        <Text style={styles.kpiValue}>{fmt(r?.totalAmount)}</Text>
                    </View>
                </View>

                {/* Return Type Chart */}
                {typeChartData.length > 0 && (
                    <View style={styles.chartCard}>
                        <Text style={styles.chartTitle}>Returns by Type</Text>
                        <ReportChart type="pie" data={typeChartData} height={180} />
                    </View>
                )}

                {/* By Reason Table */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>Return Reasons</Text>
                        <Text style={styles.sectionSubtitle}>Most common reasons for returns</Text>
                    </View>
                    <ReportTable
                        columns={reasonColumns}
                        data={r?.byReason || []}
                        emptyMessage="No returns recorded this period"
                    />
                </View>

                {/* Most Returned Products */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>Most Returned Products</Text>
                        <Text style={styles.sectionSubtitle}>Products with highest return volume</Text>
                    </View>
                    <ReportTable
                        columns={productColumns}
                        data={r?.byProduct || []}
                        emptyMessage="No product-level return data available"
                    />
                </View>

                {/* Detailed Returns Log */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>{t('reports.detailed_log')}</Text>
                        <Text style={styles.sectionSubtitle}>{t('reports.detailed_log_subtitle')}</Text>
                    </View>
                    <ReportTable
                        columns={detailedColumns}
                        data={r?.detailed || []}
                        emptyMessage={t('reports.no_returns_celebration')}
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
