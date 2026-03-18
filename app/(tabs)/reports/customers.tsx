import { DateRange, ReportLayout } from '@/components/reports/ReportLayout';
import { ReportTable } from '@/components/reports/ReportTable';
import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function CustomerReportScreen() {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date()
    });
    const { data, isLoading } = useAdvancedReports(range);

    const fmt = (val: number | null | undefined) => `$${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    const topColumns = [
        { key: 'name', title: 'Customer', width: 140 },
        { key: 'count', title: 'Orders', align: 'right' as const, width: 60 },
        { key: 'revenue', title: 'Purchases', align: 'right' as const, width: 100, isCurrency: true },
        { key: 'profit', title: 'Profit', align: 'right' as const, width: 100, isCurrency: true },
        { key: 'balance', title: 'Balance', align: 'right' as const, width: 100, isCurrency: true },
    ];

    const receivableColumns = [
        { key: 'name', title: 'Customer', width: 160 },
        { key: 'balance', title: 'Balance Due', align: 'right' as const, width: 110, isCurrency: true },
        { key: 'overdue_days', title: 'Overdue', align: 'right' as const, width: 80, render: (v: number) => `${v}d` },
        { key: 'branch', title: 'Branch', width: 100 },
    ];

    const c = data?.customers;

    return (
        <ReportLayout
            title="Customer Analysis"
            subtitle="Top clients & outstanding balances"
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={c?.receivables}
            exportFilename="customer_receivables"
        >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* Summary Box */}
                <View style={styles.summaryBox}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>TOTAL RECEIVABLES</Text>
                        <Text style={[styles.statValue, { color: colors.danger }]}>{fmt(data?.summary?.totalReceivables || 0)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>ACTIVE CLIENTS</Text>
                        <Text style={styles.statValue}>{c?.top?.length || 0}</Text>
                    </View>
                </View>

                {/* Top Customers Table */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>Top Customers by Revenue</Text>
                        <Text style={styles.sectionSubtitle}>For the selected period</Text>
                    </View>
                    <ReportTable
                        columns={topColumns}
                        data={c?.top || []}
                    />
                </View>

                {/* Receivables Table */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>Outstanding Balances</Text>
                        <Text style={styles.sectionSubtitle}>Customers with unpaid balances</Text>
                    </View>
                    <ReportTable
                        columns={receivableColumns}
                        data={c?.receivables || []}
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
        flexDirection: 'row',
        backgroundColor: colors.card + 'F0',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        alignItems: 'center',
    },
    stat: { flex: 1, alignItems: 'center' },
    statLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1 },
    statValue: { fontSize: 24, fontWeight: '900', color: colors.text, marginTop: 4 },
    divider: { width: 1, height: 40, backgroundColor: colors.border },
    section: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        overflow: 'hidden',
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    sectionSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
