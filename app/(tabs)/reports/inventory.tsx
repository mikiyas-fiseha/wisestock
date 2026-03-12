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
        { key: 'name', title: 'Product', width: 160 },
        { key: 'opening', title: 'Opening', align: 'right' as const, width: 70 },
        { key: 'in', title: 'Purchased', align: 'right' as const, width: 80 },
        { key: 'out', title: 'Sold', align: 'right' as const, width: 70 },
        { key: 'adj', title: 'Adj', align: 'right' as const, width: 60 },
        { key: 'closing', title: 'Balance', align: 'right' as const, width: 80 },
    ];

    const inv = data?.inventory;

    return (
        <ReportLayout
            title="Inventory Ledger"
            subtitle="Stock valuation & movement analysis"
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={inv?.movements}
            exportFilename="inventory_ledger"
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

                {/* Alerts Section */}
                {(inv?.lowStock?.length || 0) > 0 && (
                    <View style={styles.alertBox}>
                        <Text style={styles.alertTitle}>Low Stock Alerts ({inv?.lowStock?.length})</Text>
                        <Text style={styles.alertText}>The following items are below reorder levels.</Text>
                    </View>
                )}

                {/* Movement Table */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>Stock Movements</Text>
                        <Text style={styles.sectionSubtitle}>Opening vs Closing for period</Text>
                    </View>
                    <ReportTable
                        columns={columns}
                        data={inv?.movements || []}
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
        backgroundColor: colors.card + 'E0',
        borderRadius: 16,
        padding: 16,
        ...Layout.shadows.small,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,

    },
    valLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
    valValue: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 4 },
    alertBox: {
        backgroundColor: colors.danger + '15',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.danger + '30',
    },
    alertTitle: { fontSize: 14, fontWeight: '700', color: colors.danger },
    alertText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    section: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        ...Layout.shadows.small,
        overflow: 'hidden',

    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    sectionSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
