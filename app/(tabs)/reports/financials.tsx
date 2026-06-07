import { DateRange, ReportLayout } from '@/components/reports/ReportLayout';
import { Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import { formatCurrency } from '@/lib/formatters';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function FinancialsReportScreen() {
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
                title: t('reports.revenue') + ' & ' + t('reports.gross_profit'),
                type: 'summary' as const,
                data: [
                    { label: t('reports.operating_revenue'), value: s.revenue },
                    { label: t('reports.cogs'), value: -s.cogs },
                    { label: t('reports.gross_profit'), value: s.grossProfit }
                ],
                accentColor: colors.primary
            },
            {
                title: t('reports.operating_expenses'),
                type: 'summary' as const,
                data: [
                    ...expenseItems,
                    { label: t('reports.total_operating_expenses'), value: -s.expenses }
                ],
                accentColor: colors.danger
            },
            {
                title: t('reports.net_performance') || "Net Performance",
                type: 'summary' as const,
                data: [
                    { label: t('reports.net_income'), value: s.netProfit },
                    { label: t('reports.profit_margin'), value: Number(s.profitMargin.toFixed(2)), isPercentage: true }
                ],
                accentColor: colors.success || '#10b981'
            },
            {
                title: t('reports.balance_sheet_highlights'),
                type: 'summary' as const,
                data: [
                    { label: t('reports.inventory_value'), value: s.stockValue },
                    { label: t('reports.accounts_receivable'), value: s.totalReceivables }
                ],
                accentColor: colors.secondary || '#6366f1'
            }
        ];
    }, [s, data?.expenses?.byCategory, colors]);

    const exportData = React.useMemo(() => {
        if (!s) return [];
        return [
            { Category: t('reports.operating_revenue'), Amount: s.revenue },
            { Category: t('reports.cogs'), Amount: -s.cogs },
            { Category: t('reports.gross_profit'), Amount: s.grossProfit },
            ...(data?.expenses?.byCategory?.map((c: any) => ({
                Category: `${t('common.expense')}: ${c.category}`,
                Amount: -c.amount
            })) || []),
            { Category: t('reports.total_operating_expenses'), Amount: -s.expenses },
            { Category: t('reports.net_income'), Amount: s.netProfit },
            { Category: t('reports.profit_margin') + ' (%)', Amount: s.profitMargin.toFixed(2) },
            { Category: t('reports.inventory_value'), Amount: s.stockValue },
            { Category: t('reports.accounts_receivable'), Amount: s.totalReceivables }
        ];
    }, [s, data?.expenses?.byCategory]);

    return (
        <ReportLayout
            title={t('reports.profit_loss')}
            subtitle={t('reports.statement_subtitle') || "Income statement for selected period"}
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={exportData}
            exportFilename={`profit_loss_${range.start.toISOString().split('T')[0]}`}
            reportSections={reportSections}
        >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                <View style={styles.plContainer}>
                    <Text style={styles.plTitle}>{t('reports.income_statement')}</Text>
                    <Text style={styles.plSubtitle}>{range.start.toLocaleDateString()} - {range.end.toLocaleDateString()}</Text>

                    <View style={styles.plSection}>
                        {renderRow(t('reports.operating_revenue'), s?.revenue || 0, true)}
                        {renderRow(t('reports.sales_revenue'), s?.revenue || 0)}
                        {renderRow(t('reports.cogs'), -(s?.cogs || 0))}
                        {renderRow(t('reports.gross_profit'), s?.grossProfit || 0, false, true)}
                    </View>

                    <View style={styles.plSection}>
                        {renderRow(t('reports.operating_expenses'), -(s?.expenses || 0), true)}
                        {data?.expenses?.byCategory?.map((c: any) =>
                            renderRow(c.category, -c.amount)
                        )}
                        {renderRow(t('reports.total_operating_expenses'), -(s?.expenses || 0), false, true)}
                    </View>

                    <View style={styles.finalSection}>
                        {renderRow(t('reports.net_income'), s?.netProfit || 0, false, false, true)}
                        <View style={styles.marginInfo}>
                            <Text style={styles.marginLabel}>{t('reports.profit_margin')}:</Text>
                            <Text style={styles.marginValue}>{(s?.profitMargin || 0).toFixed(2)}%</Text>
                        </View>
                    </View>
                </View>

                {/* Assets Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('reports.balance_sheet_highlights')} {t('reports.current_assets')}</Text>
                    <View style={styles.miniGrid}>
                        <View style={styles.miniItem}>
                            <Text style={styles.miniLabel}>{t('reports.inventory_value')}</Text>
                            <Text style={styles.miniValue}>{fmt(s?.stockValue || 0)}</Text>
                        </View>
                        <View style={styles.miniItem}>
                            <Text style={styles.miniLabel}>{t('reports.accounts_receivable')}</Text>
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
