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

export default function InventoryReportScreen() {
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

    const columns = [
        { key: 'name', title: t('inventory.products'), width: 150 },
        { key: 'opening', title: t('reports.opening'), align: 'right' as const, width: 60 },
        { key: 'purchased', title: t('reports.in'), align: 'right' as const, width: 60 },
        { key: 'sold', title: t('reports.out'), align: 'right' as const, width: 60 },
        { key: 'adjusted', title: t('reports.adj'), align: 'right' as const, width: 60 },
        { key: 'closing', title: t('reports.closing'), align: 'right' as const, width: 70 },
        { key: 'unitPrice', title: t('inventory.cost'), align: 'right' as const, width: 80, isCurrency: true },
        { key: 'value', title: t('reports.value'), align: 'right' as const, width: 100, isCurrency: true },
        {
            key: 'turnoverRate', title: t('reports.turnover'), align: 'right' as const, width: 80,
            render: (v: string) => <Text style={{ color: Number(v) > 1 ? colors.success : colors.warning, fontWeight: '700' }}>{v}×</Text>
        },
    ];

    const lowStockColumns = [
        { key: 'name', title: t('inventory.products'), width: 180 },
        { key: 'stock', title: t('reports.closing'), align: 'right' as const, width: 70 },
        { key: 'min_stock_level', title: t('inventory.min_level'), align: 'right' as const, width: 90 },
        {
            key: 'stock', title: t('reports.status'), width: 90,
            render: (v: number, row: any) => (
                <Text style={{ color: v === 0 ? colors.danger : colors.warning, fontWeight: '700', fontSize: 11 }}>
                    {v === 0 ? t('inventory.out_of_stock').toUpperCase() : t('inventory.low_stock').toUpperCase()}
                </Text>
            )
        },
    ];

    const inv = data?.inventory;

    const totals = React.useMemo(() => {
        if (!inv?.movements) return undefined;
        return inv.movements.reduce((acc: any, curr: any) => ({
            opening: (acc.opening || 0) + (curr.opening || 0),
            purchased: (acc.purchased || 0) + (curr.purchased || 0),
            sold: (acc.sold || 0) + (curr.sold || 0),
            adjusted: (acc.adjusted || 0) + (curr.adjusted || 0),
            closing: (acc.closing || 0) + (curr.closing || 0),
            value: (acc.value || 0) + (curr.value || 0),
        }), {});
    }, [inv?.movements]);

    const dateLabel = `${range.start.toISOString().split('T')[0]}_to_${range.end.toISOString().split('T')[0]}`;

    const reportSections = React.useMemo(() => {
        if (!inv?.movements) return [];
        return [{
            title: t('reports.movements_turnover'),
            type: 'table' as const,
            data: inv.movements,
            columns: columns.map(c => ({ key: c.key, title: c.title, isCurrency: c.isCurrency })),
            totals: totals,
            accentColor: colors.primary
        }];
    }, [inv?.movements, totals, colors.primary]);

    const potentialProfit = (inv?.valuation?.retail || 0) - (inv?.valuation?.cost || 0);

    return (
        <ReportLayout
            title={t('reports.inventory_analysis')}
            subtitle={t('reports.inventory_subtitle')}
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={inv?.movements}
            exportFilename={`inventory_ledger_${dateLabel}`}
            reportSections={reportSections}
        >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* Valuation Cards */}
                <View style={styles.row}>
                    <View style={styles.valCard}>
                        <Text style={styles.valLabel}>{t('reports.total_asset_value')} ({t('inventory.cost').toUpperCase()})</Text>
                        <Text style={styles.valValue}>{fmt(inv?.valuation?.cost || 0)}</Text>
                    </View>
                    <View style={styles.valCard}>
                        <Text style={styles.valLabel}>{t('reports.retail_value')} (EST.)</Text>
                        <Text style={[styles.valValue, { color: colors.primary }]}>{fmt(inv?.valuation?.retail || 0)}</Text>
                    </View>
                    <View style={styles.valCard}>
                        <Text style={styles.valLabel}>{t('reports.potential_profit')}</Text>
                        <Text style={[styles.valValue, { color: colors.success }]}>{fmt(potentialProfit)}</Text>
                    </View>
                </View>

                {/* Low Stock Alert */}
                {(inv?.lowStock?.length || 0) > 0 && (
                    <View style={[styles.section, { padding: 0, borderLeftWidth: 4, borderLeftColor: colors.danger }]}>
                        <View style={{ padding: 16 }}>
                            <Text style={[styles.sectionTitle, { color: colors.danger }]}>
                                ⚠ {t('reports.low_stock_alert')} ({inv?.lowStock?.length} {t('inventory.products')})
                            </Text>
                            <Text style={styles.sectionSubtitle}>{t('reports.low_stock_below_min')}</Text>
                        </View>
                        <ReportTable
                            columns={lowStockColumns}
                            data={inv?.lowStock || []}
                            emptyMessage={t('reports.well_stocked')}
                        />
                    </View>
                )}

                {/* Movement Table with Turnover Rate */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>{t('reports.movements_turnover')}</Text>
                        <Text style={styles.sectionSubtitle}>{t('reports.movements_subtitle')}</Text>
                    </View>
                    <ReportTable
                        columns={columns}
                        data={inv?.movements || []}
                        totals={totals}
                        emptyMessage={t('reports.no_inventory_period')}
                    />
                </View>
            </ScrollView>
        </ReportLayout>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: Layout.spacing.lg, paddingBottom: 40 },
    row: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
    valCard: {
        flex: 1, minWidth: 120,
        backgroundColor: colors.card + 'F0',
        borderRadius: 20, padding: 16,
        borderLeftWidth: 4, borderLeftColor: colors.primary,
    },
    valLabel: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
    valValue: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 4 },
    section: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 20, padding: 16, marginBottom: 20, overflow: 'hidden',
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    sectionSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
