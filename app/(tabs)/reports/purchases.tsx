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

export default function PurchasesReportScreen() {
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
    const pct = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;

    const purchData = data?.purchases;
    const purchaseChange = purchData?.change ?? 0;
    const dateLabel = `${range.start.toISOString().split('T')[0]}_to_${range.end.toISOString().split('T')[0]}`;

    const supplierChartData = (purchData?.bySupplier || []).slice(0, 7).map((s: any) => ({
        label: s.name,
        value: s.total,
    }));

    const supplierColumns = [
        { key: 'name', title: t('common.suppliers'), width: 180 },
        { key: 'count', title: t('reports.orders'), align: 'right' as const, width: 70 },
        { key: 'total', title: t('reports.total_purchased'), align: 'right' as const, width: 140, isCurrency: true },
    ];

    const detailedColumns = [
        {
            key: 'date', title: t('common.date'), width: 90,
            render: (v: string) => <Text style={{ color: colors.text }}>{new Date(v).toLocaleDateString()}</Text>
        },
        { key: 'supplier', title: t('common.suppliers'), width: 140 },
        { key: 'product', title: t('inventory.products'), width: 180 },
        { key: 'quantity', title: t('reports.qty'), align: 'right' as const, width: 60 },
        { key: 'unitCost', title: t('reports.unit_cost'), align: 'right' as const, width: 100, isCurrency: true },
        { key: 'total', title: t('reports.total'), align: 'right' as const, width: 110, isCurrency: true },
        {
            key: 'status', title: t('reports.status'), width: 90,
            render: (v: string) => (
                <Text style={{
                    fontSize: 11, fontWeight: '700',
                    color: v?.toLowerCase().includes('paid') ? colors.success : colors.warning,
                    textTransform: 'uppercase'
                }}>{v}</Text>
            )
        },
    ];

    const detailedTotals = React.useMemo(() => ({
        quantity: (purchData?.detailed || []).reduce((s: number, r: any) => s + (r.quantity || 0), 0),
        total: (purchData?.detailed || []).reduce((s: number, r: any) => s + (r.total || 0), 0),
    }), [purchData?.detailed]);

    return (
        <ReportLayout
            title={t('reports.purchases_analysis')}
            subtitle={t('reports.purchases_subtitle') || "Supplier orders & procurement analysis"}
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={purchData?.detailed}
            exportFilename={`purchases_report_${dateLabel}`}
        >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* Period Comparison KPIs */}
                <View style={styles.compRow}>
                    <View style={styles.compCard}>
                        <Text style={styles.compLabel}>{t('reports.total_purchased')}</Text>
                        <Text style={styles.compValue}>{fmt(purchData?.metrics?.total)}</Text>
                        <Text style={[styles.compChange, { color: purchaseChange > 0 ? colors.warning : colors.success }]}>
                            {pct(purchaseChange)} {t('reports.vs_prev_period')}
                        </Text>
                    </View>
                    <View style={styles.compCard}>
                        <Text style={styles.compLabel}>{t('reports.amount_paid')}</Text>
                        <Text style={[styles.compValue, { color: colors.success }]}>{fmt(purchData?.metrics?.paid)}</Text>
                        <Text style={styles.compChange}>{purchData?.metrics?.count} {t('reports.orders')}</Text>
                    </View>
                    <View style={styles.compCard}>
                        <Text style={styles.compLabel}>{t('reports.amount_outstanding')}</Text>
                        <Text style={[styles.compValue, { color: (purchData?.metrics?.unpaid || 0) > 0 ? colors.danger : colors.text }]}>
                            {fmt(purchData?.metrics?.unpaid)}
                        </Text>
                        <Text style={styles.compChange}>{t('reports.payables_due')}</Text>
                    </View>
                </View>

                {/* Top Suppliers Chart */}
                {supplierChartData.length > 0 && (
                    <View style={styles.chartCard}>
                        <Text style={styles.chartTitle}>{t('reports.purchases_by_supplier')}</Text>
                        <ReportChart type="bar" data={supplierChartData} height={180} color="#F59E0B" />
                    </View>
                )}

                {/* By Supplier Table */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>{t('reports.top_suppliers')}</Text>
                        <Text style={styles.sectionSubtitle}>{t('reports.top_suppliers_subtitle')}</Text>
                    </View>
                    <ReportTable
                        columns={supplierColumns}
                        data={purchData?.bySupplier || []}
                        emptyMessage={t('common.no_data')}
                    />
                </View>

                {/* Detailed Purchase Log */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>{t('reports.detailed_log')}</Text>
                        <Text style={styles.sectionSubtitle}>{t('reports.detailed_log_subtitle')}</Text>
                    </View>
                    <ReportTable
                        columns={detailedColumns}
                        data={purchData?.detailed || []}
                        totals={detailedTotals}
                        emptyMessage={t('common.no_data')}
                    />
                </View>
            </ScrollView>
        </ReportLayout>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: Layout.spacing.lg, paddingBottom: 40 },
    compRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
    compCard: {
        flex: 1, minWidth: 110,
        backgroundColor: colors.card + 'E0',
        borderRadius: 16, padding: 14,
    },
    compLabel: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
    compValue: { fontSize: 16, fontWeight: '900', color: colors.text, marginTop: 4 },
    compChange: { fontSize: 11, fontWeight: '600', marginTop: 4, color: colors.textSecondary },
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
