import { ReportChart } from '@/components/reports/ReportChart';
import { DateRange, ReportLayout } from '@/components/reports/ReportLayout';
import { ReportTable } from '@/components/reports/ReportTable';
import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

export default function ExpensesReportScreen() {
    const { colors } = useTheme();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date()
    });
    const { data, isLoading } = useAdvancedReports(range);

    const fmt = (val: number | null | undefined) => `$${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    const PIE_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

    const chartData = data?.expenses?.byCategory?.map((c: any, i: number) => ({
        label: c.category,
        value: c.amount,
        color: PIE_COLORS[i % PIE_COLORS.length],
        frontColor: PIE_COLORS[i % PIE_COLORS.length],
    })) || [];

    const columns = [
        { key: 'category', title: 'Category', width: 200 },
        { key: 'count', title: 'Count', align: 'right' as const, width: 80 },
        { key: 'amount', title: 'Total Amount', align: 'right' as const, width: 150, isCurrency: true },
    ];

    return (
        <ReportLayout
            title="Expense Analysis"
            subtitle="Breakdown of operational costs"
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={data?.expenses?.byCategory}
            exportFilename="expense_report"
        >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* Summary Row */}
                <View style={styles.summaryBox}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>TOTAL EXPENSES</Text>
                        <Text style={styles.statValue}>{fmt(data?.summary?.expenses || 0)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>EXPENSE RATIO</Text>
                        <Text style={[styles.statValue, { color: colors.danger }]}>{(data?.summary?.expenseRatio || 0).toFixed(1)}%</Text>
                    </View>
                </View>

                {/* Charts Section */}
                <View style={[styles.chartRow, isMobile && { flexDirection: 'column' }]}>
                    <View style={[styles.section, { flex: 1 }]}>
                        <Text style={styles.sectionTitle}>Expense Share</Text>
                        <ReportChart type="pie" data={chartData} height={200} />
                    </View>
                    <View style={[styles.section, { flex: 1 }]}>
                        <Text style={styles.sectionTitle}>By Category</Text>
                        <ReportChart type="bar" data={chartData} height={200} color={colors.danger} />
                    </View>
                </View>

                {/* Category Table */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
                    </View>
                    <ReportTable
                        columns={columns}
                        data={data?.expenses?.byCategory || []}
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
    divider: { width: 1, height: 40, backgroundColor: colors.border + '40' },
    section: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        overflow: 'hidden',
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
    chartRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
});
