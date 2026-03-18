import { DateRange, ReportLayout } from '@/components/reports/ReportLayout';
import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function FinancialsReportScreen() {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date()
    });
    const { data, isLoading } = useAdvancedReports(range);

    const fmt = (val: number | null | undefined) => `$${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    const renderRow = (label: string, value: number, isHeader = false, isSubtotal = false, isFinal = false) => (
        <View style={[
            styles.plRow,
            isHeader && styles.headerRow,
            isSubtotal && styles.subtotalRow,
            isFinal && styles.finalRow
        ]}>
            <Text style={[
                styles.plLabel,
                isHeader && styles.headerText,
                isSubtotal && styles.subtotalText,
                isFinal && styles.finalText
            ]}>{label}</Text>
            <Text style={[
                styles.plValue,
                isHeader && styles.headerText,
                isSubtotal && styles.subtotalText,
                isFinal && styles.finalText,
                value < 0 && { color: colors.danger }
            ]}>{fmt(value)}</Text>
        </View>
    );

    const s = data?.summary;

    const reportSections = React.useMemo(() => {
        if (!s) return [];

        const expenseItems = data?.expenses?.byCategory?.map((c: any) => ({
            label: c.category,
            value: -c.amount
        })) || [];

        return [
            {
                title: 'Revenue & Gross Profit',
                type: 'summary' as const,
                data: [
                    { label: 'Operating Revenue', value: s.revenue },
                    { label: 'Cost of Goods Sold (COGS)', value: -s.cogs },
                    { label: 'Gross Profit', value: s.grossProfit }
                ],
                accentColor: colors.primary
            },
            {
                title: 'Operating Expenses',
                type: 'summary' as const,
                data: [
                    ...expenseItems,
                    { label: 'Total Operating Expenses', value: -s.expenses }
                ],
                accentColor: colors.danger
            },
            {
                title: 'Net Performance',
                type: 'summary' as const,
                data: [
                    { label: 'Net Income / Profit', value: s.netProfit },
                    { label: 'Profit Margin', value: Number(s.profitMargin.toFixed(2)), isPercentage: true }
                ],
                accentColor: colors.success || '#10b981'
            },
            {
                title: 'Balance Sheet Highlights',
                type: 'summary' as const,
                data: [
                    { label: 'Inventory Value', value: s.stockValue },
                    { label: 'Accounts Receivable', value: s.totalReceivables }
                ],
                accentColor: colors.secondary || '#6366f1'
            }
        ];
    }, [s, data?.expenses?.byCategory, colors]);

    const exportData = React.useMemo(() => {
        if (!s) return [];
        return [
            { Category: 'Operating Revenue', Amount: s.revenue },
            { Category: 'Cost of Goods Sold (COGS)', Amount: -s.cogs },
            { Category: 'Gross Profit', Amount: s.grossProfit },
            ...(data?.expenses?.byCategory?.map((c: any) => ({
                Category: `Expense: ${c.category}`,
                Amount: -c.amount
            })) || []),
            { Category: 'Total Expenses', Amount: -s.expenses },
            { Category: 'Net Profit', Amount: s.netProfit },
            { Category: 'Profit Margin (%)', Amount: s.profitMargin.toFixed(2) },
            { Category: 'Inventory Value', Amount: s.stockValue },
            { Category: 'Accounts Receivable', Amount: s.totalReceivables }
        ];
    }, [s, data?.expenses?.byCategory]);

    return (
        <ReportLayout
            title="Profit & Loss"
            subtitle="Income statement for selected period"
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={exportData}
            exportFilename={`profit_loss_${range.start.toISOString().split('T')[0]}`}
            reportSections={reportSections}
        >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                <View style={styles.plContainer}>
                    <Text style={styles.plTitle}>Income Statement</Text>
                    <Text style={styles.plSubtitle}>{range.start.toLocaleDateString()} - {range.end.toLocaleDateString()}</Text>

                    <View style={styles.plSection}>
                        {renderRow("Operating Revenue", s?.revenue || 0, true)}
                        {renderRow("Sales Revenue", s?.revenue || 0)}
                        {renderRow("Cost of Goods Sold (COGS)", -(s?.cogs || 0))}
                        {renderRow("Gross Profit", s?.grossProfit || 0, false, true)}
                    </View>

                    <View style={styles.plSection}>
                        {renderRow("Operating Expenses", -(s?.expenses || 0), true)}
                        {data?.expenses?.byCategory?.map((c: any) =>
                            renderRow(c.category, -c.amount)
                        )}
                        {renderRow("Total Operating Expenses", -(s?.expenses || 0), false, true)}
                    </View>

                    <View style={styles.finalSection}>
                        {renderRow("Net Income / Profit", s?.netProfit || 0, false, false, true)}
                        <View style={styles.marginInfo}>
                            <Text style={styles.marginLabel}>Profit Margin:</Text>
                            <Text style={styles.marginValue}>{(s?.profitMargin || 0).toFixed(2)}%</Text>
                        </View>
                    </View>
                </View>

                {/* Assets Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Balance Sheet Highlights (Current Assets)</Text>
                    <View style={styles.miniGrid}>
                        <View style={styles.miniItem}>
                            <Text style={styles.miniLabel}>Inventory Value</Text>
                            <Text style={styles.miniValue}>{fmt(s?.stockValue || 0)}</Text>
                        </View>
                        <View style={styles.miniItem}>
                            <Text style={styles.miniLabel}>Accounts Receivable</Text>
                            <Text style={styles.miniValue}>{fmt(s?.totalReceivables || 0)}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </ReportLayout>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: Layout.spacing.lg, paddingBottom: 40 },
    plContainer: {
        backgroundColor: colors.card + 'F0',
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
    },
    plTitle: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
    plSubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 30 },
    plSection: { marginBottom: 24 },
    plRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border + '30',
    },
    headerRow: { borderBottomWidth: 2, borderBottomColor: colors.border + '60', marginTop: 12 },
    subtotalRow: { backgroundColor: colors.primary + '10', paddingHorizontal: 12, borderRadius: 8, marginTop: 4 },
    finalRow: { borderBottomWidth: 0, paddingVertical: 16 },
    plLabel: { fontSize: 14, color: colors.text },
    plValue: { fontSize: 14, fontWeight: '600', color: colors.text },
    headerText: { fontWeight: '800', color: colors.text, fontSize: 15 },
    subtotalText: { fontWeight: '700', color: colors.primary },
    finalText: { fontSize: 20, fontWeight: '900', color: colors.text },
    finalSection: {
        marginTop: 10,
        paddingTop: 20,
        borderTopWidth: 2,
        borderTopColor: colors.border + '60',
    },
    marginInfo: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12, gap: 8 },
    marginLabel: { fontSize: 13, color: colors.textSecondary },
    marginValue: { fontSize: 16, fontWeight: '800', color: colors.primary },
    section: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 16 },
    miniGrid: { flexDirection: 'row', gap: 16 },
    miniItem: { flex: 1, backgroundColor: 'transparent', padding: 12, borderRadius: 10 },
    miniLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
    miniValue: { fontSize: 16, fontWeight: '700', color: colors.text },
});
