import { DateRange, ReportLayout } from '@/components/reports/ReportLayout';
import { ReportTable } from '@/components/reports/ReportTable';
import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function InventoryReportScreen() {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date()
    });
    const { data, isLoading } = useAdvancedReports(range);

    const fmt = (val: number | null | undefined) => `$${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    const columns = [
        { key: 'name', title: 'Product', width: 150 },
        { key: 'opening', title: 'Open', align: 'right' as const, width: 60 },
        { key: 'purchased', title: 'In', align: 'right' as const, width: 60 },
        { key: 'sold', title: 'Out', align: 'right' as const, width: 60 },
        { key: 'adjusted', title: 'Adj', align: 'right' as const, width: 60 },
        { key: 'closing', title: 'Stock', align: 'right' as const, width: 70 },
        { key: 'unitPrice', title: 'Cost', align: 'right' as const, width: 80, isCurrency: true },
        { key: 'value', title: 'Value', align: 'right' as const, width: 100, isCurrency: true },
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

    const reportSections = React.useMemo(() => {
        if (!inv?.movements) return [];
        return [{
            title: 'Stock Movements & Valuation',
            type: 'table' as const,
            data: inv.movements,
            columns: columns.map(c => ({ key: c.key, title: c.title, isCurrency: c.isCurrency })),
            totals: totals,
            accentColor: colors.primary
        }];
    }, [inv?.movements, totals, colors.primary]);

    return (
        <ReportLayout
            title="Inventory Ledger"
            subtitle="Stock valuation & movement analysis"
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={inv?.movements}
            exportFilename="inventory_ledger"
            reportSections={reportSections}
        >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* Valuation Cards */}
                <View style={styles.row}>
                    <View style={styles.valCard}>
                        <Text style={styles.valLabel}>TOTAL ASSET VALUE (COST)</Text>
                        <Text style={styles.valValue}>{fmt(inv?.valuation?.cost || 0)}</Text>
                    </View>
                    <View style={styles.valCard}>
                        <Text style={styles.valLabel}>RETAIL VALUE (EST.)</Text>
                        <Text style={[styles.valValue, { color: colors.primary }]}>{fmt(inv?.valuation?.retail || 0)}</Text>
                    </View>
                </View>

                {/* Movement Table */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>Stock Movements</Text>
                        <Text style={styles.sectionSubtitle}>Opening vs Closing for period</Text>
                    </View>
                    <ReportTable
                        columns={columns}
                        data={inv?.movements || []}
                        totals={totals}
                    />
                </View>
            </ScrollView>
        </ReportLayout>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: Layout.spacing.lg, paddingBottom: 40 },
    row: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    valCard: {
        flex: 1,
        backgroundColor: colors.card + 'F0',
        borderRadius: 20,
        padding: 20,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    valLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
    valValue: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 4 },
    section: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        overflow: 'hidden',
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    sectionSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
