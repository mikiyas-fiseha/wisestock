import { ReportChart } from '@/components/reports/ReportChart';
import { DateRange, ReportLayout } from '@/components/reports/ReportLayout';
import { ReportTable } from '@/components/reports/ReportTable';
import { Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import { ExportSection } from '@/hooks/useDataExport';
import { formatCurrency } from '@/lib/formatters';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SalesReportScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { company } = useAuth();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().setDate(new Date().getDate() - 7)),
        end: new Date()
    });
    const [search, setSearch] = useState('');

    const { data, isLoading } = useAdvancedReports(range);

    // Use currency from company context if available, fallback to ETB or $
    const fmt = (val: number | null | undefined) => formatCurrency(val || 0);
    const pct = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;

    // Filtered detailed sales log
    const filteredDetailed = useMemo(() => {
        const items = data?.sales?.detailed || [];
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter((r: any) =>
            r.customer?.toLowerCase().includes(q) ||
            r.product?.toLowerCase().includes(q) ||
            r.invoice?.toLowerCase().includes(q) ||
            r.status?.toLowerCase().includes(q)
        );
    }, [data?.sales?.detailed, search]);

    const productColumns = [
        { key: 'name', title: t('inventory.products'), width: 180 },
        { key: 'category', title: t('inventory.category'), width: 120 },
        { key: 'qty', title: t('reports.sold'), align: 'right' as const, width: 70 },
        { key: 'revenue', title: t('reports.revenue'), align: 'right' as const, width: 110, isCurrency: true },
        { key: 'profit', title: t('reports.net_profit'), align: 'right' as const, width: 100, isCurrency: true },
        {
            key: 'margin', title: t('reports.margin'), align: 'right' as const, width: 80,
            render: (v: number) => <Text style={{ textAlign: 'right', color: v >= 20 ? colors.success : colors.warning, fontWeight: '700' }}>{v?.toFixed(1)}%</Text>
        },
    ];


    const detailedColumns = [
        {
            key: 'date', title: t('common.date'), width: 90,
            render: (v: string) => <Text style={{ color: colors.text }}>{new Date(v).toLocaleDateString()}</Text>
        },
        { key: 'invoice', title: t('reports.invoice'), width: 100 },
        { key: 'customer', title: t('reports.customer'), width: 140 },
        { key: 'product', title: t('inventory.products'), width: 180 },
        { key: 'quantity', title: t('reports.qty'), align: 'right' as const, width: 60 },
        { key: 'unitPrice', title: t('reports.unit_price'), align: 'right' as const, width: 90, isCurrency: true },
        { key: 'total', title: t('reports.total'), align: 'right' as const, width: 110, isCurrency: true },
        {
            key: 'status', title: t('reports.status'), width: 90, render: (v: string) => (
                <Text style={{
                    fontSize: 11, fontWeight: '700',
                    color: v?.toLowerCase().includes('paid') ? colors.success : colors.warning,
                    textTransform: 'uppercase'
                }}>{v}</Text>
            )
        },
    ];

    const detailedTotals = useMemo(() => {
        return {
            quantity: filteredDetailed.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
            total: filteredDetailed.reduce((sum: number, item: any) => sum + (item.total || 0), 0),
        };
    }, [filteredDetailed]);

    const m = data?.sales?.metrics;
    const pm = data?.sales?.prevMetrics;
    const revenueChange = m && pm ? (pm.revenue > 0 ? ((m.revenue - pm.revenue) / pm.revenue) * 100 : 0) : 0;
    const profitChange = m && pm ? (pm.netProfit !== 0 ? ((m.netProfit - pm.netProfit) / Math.abs(pm.netProfit)) * 100 : 0) : 0;

    // Date range label for export filename
    const dateLabel = `${range.start.toISOString().split('T')[0]}_to_${range.end.toISOString().split('T')[0]}`;

    const reportSections: ExportSection[] = useMemo(() => [
        {
            title: t('reports.detailed_log'),
            type: 'table',
            data: data?.sales?.detailed,
            columns: [
                { key: 'date', title: t('common.date') },
                { key: 'invoice', title: t('reports.invoice') },
                { key: 'customer', title: t('reports.customer') },
                { key: 'product', title: t('inventory.products') },
                { key: 'quantity', title: t('reports.qty') },
                { key: 'unitPrice', title: t('reports.unit_price'), isCurrency: true },
                { key: 'total', title: t('reports.total'), isCurrency: true },
                { key: 'status', title: t('reports.status') },
            ],
            totals: detailedTotals,
            accentColor: colors.primary
        },
        {
            title: t('reports.top_products'),
            type: 'table',
            data: data?.sales?.byProduct,
            columns: [
                { key: 'name', title: t('inventory.products') },
                { key: 'category', title: t('inventory.category') },
                { key: 'qty', title: t('reports.sold') },
                { key: 'revenue', title: t('reports.revenue'), isCurrency: true },
                { key: 'profit', title: t('reports.net_profit'), isCurrency: true },
            ],
            accentColor: '#10B981'
        }
    ], [data, detailedTotals, colors, t]);

    return (
        <ReportLayout
            title={t('reports.sales_analysis')}
            subtitle={t('reports.sales_analysis_subtitle')}
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={data?.sales?.detailed}
            reportSections={reportSections}
            exportFilename={`sales_report_${dateLabel}`}
        >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* Period Comparison Summary */}
                <View style={styles.compRow}>
                    <View style={styles.compCard}>
                        <Text style={styles.compLabel}>{t('reports.revenue')}</Text>
                        <Text style={styles.compValue}>{fmt(m?.revenue)}</Text>
                        <Text style={[styles.compChange, { color: revenueChange >= 0 ? colors.success : colors.danger }]}>
                            {pct(revenueChange)} {t('reports.vs_prev_period')}
                        </Text>
                    </View>
                    <View style={styles.compCard}>
                        <Text style={styles.compLabel}>{t('reports.net_profit')}</Text>
                        <Text style={[styles.compValue, { color: (m?.netProfit || 0) >= 0 ? colors.success : colors.danger }]}>{fmt(m?.netProfit)}</Text>
                        <Text style={[styles.compChange, { color: profitChange >= 0 ? colors.success : colors.danger }]}>
                            {pct(profitChange)} {t('reports.vs_prev_period')}
                        </Text>
                    </View>
                    <View style={styles.compCard}>
                        <Text style={styles.compLabel}>{t('reports.avg_daily_sales')}</Text>
                        <Text style={styles.compValue}>{fmt(data?.sales?.avgDailySales)}</Text>
                        <Text style={styles.compChange}>{data?.sales?.daysInRange} {t('reports.days')}</Text>
                    </View>
                </View>

                {/* Sales Trend Chart */}
                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>{t('reports.revenue_profit_trend')}</Text>
                    <ReportChart type="line" data={(data?.sales?.trend || []).map(t => ({
                        value: t.revenue,
                        label: t.date.split('-').pop(),
                    }))} height={180} />
                </View>


                {/* Top Products by Revenue & Profit */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>{t('reports.top_products')}</Text>
                        <Text style={styles.sectionSubtitle}>{t('reports.top_products_subtitle')}</Text>
                    </View>
                    <ReportTable
                        columns={productColumns}
                        data={data?.sales?.byProduct || []}
                        emptyMessage={t('reports.no_products_sold')}
                    />
                </View>

                {/* Payment Methods */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('reports.payment_methods')}</Text>
                    <View style={styles.paymentGrid}>
                        {(data?.sales?.paymentMethods || []).length === 0 ? (
                            <Text style={{ color: colors.textSecondary, padding: 8 }}>{t('common.no_data')}</Text>
                        ) : (
                            data?.sales?.paymentMethods?.map((p: any, i: number) => (
                                <View key={i} style={styles.paymentItem}>
                                    <Text style={styles.paymentMethod}>{p.label}</Text>
                                    <Text style={styles.paymentValue}>{fmt(p.value)}</Text>
                                    <Text style={styles.paymentCount}>{p.count} {t('common.transactions')}</Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                {/* Detailed Sales Log with Search */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>{t('reports.detailed_log')}</Text>
                        <Text style={styles.sectionSubtitle}>{t('reports.detailed_log_subtitle')}</Text>
                        {/* Search Filter */}
                        <View style={styles.searchBox}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder={t('reports.search_placeholder')}
                                placeholderTextColor={colors.textSecondary}
                                value={search}
                                onChangeText={setSearch}
                            />
                            {search.length > 0 && (
                                <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
                                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                    <ReportTable
                        columns={detailedColumns}
                        data={filteredDetailed}
                        totals={detailedTotals}
                        emptyMessage={search ? t('common.no_results_found') : t('reports.no_sales_period')}
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
        flex: 1, minWidth: 120,
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
    sectionSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2, marginBottom: 4 },
    paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
    paymentItem: { flex: 1, minWidth: '45%', borderRadius: 12, padding: 12, backgroundColor: colors.background + '60' },
    paymentMethod: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase' },
    paymentValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 },
    paymentCount: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.background + '80',
        borderRadius: 10, borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: 12, marginTop: 8,
    },
    searchInput: { flex: 1, color: colors.text, fontSize: 14, height: 40 },
    clearBtn: { padding: 4 },
});
