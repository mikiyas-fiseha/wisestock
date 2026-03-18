import { ReportChart } from '@/components/reports/ReportChart';
import { DateRange, ReportLayout } from '@/components/reports/ReportLayout';
import { ReportTable } from '@/components/reports/ReportTable';
import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import { ExportSection } from '@/hooks/useDataExport';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SalesReportScreen() {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date()
    });

    const { data, isLoading } = useAdvancedReports(range);

    const fmt = (val: number | null | undefined) => `$${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    // Prepare table data for Top Products
    const productColumns = [
        { key: 'name', title: 'Product', width: 180 },
        { key: 'category', title: 'Category', width: 120 },
        { key: 'qty', title: 'Sold', align: 'right' as const, width: 80 },
        { key: 'revenue', title: 'Revenue', align: 'right' as const, width: 100, isCurrency: true },
    ];

    const categoryData = useMemo(() => data?.sales?.byCategory?.map((c: any) => ({
        label: c.name,
        value: c.revenue,
    })) || [], [data?.sales?.byCategory]);

    const detailedColumns = [
        {
            key: 'date',
            title: 'Date',
            width: 90,
            render: (v: string) => <Text style={{ color: colors.text }}>{new Date(v).toLocaleDateString()}</Text>
        },
        { key: 'invoice', title: 'Invoice', width: 100 },
        { key: 'customer', title: 'Customer', width: 140 },
        { key: 'product', title: 'Product', width: 180 },
        { key: 'quantity', title: 'Qty', align: 'right' as const, width: 60 },
        { key: 'unitPrice', title: 'Unit Price', align: 'right' as const, width: 90, isCurrency: true },
        { key: 'total', title: 'Total', align: 'right' as const, width: 110, isCurrency: true },
        {
            key: 'status', title: 'Status', width: 90, render: (v: string) => (
                <Text style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: v?.toLowerCase().includes('paid') ? colors.success : colors.warning,
                    textTransform: 'uppercase'
                }}>{v}</Text>
            )
        },
    ];

    const detailedTotals = useMemo(() => {
        const items = data?.sales?.detailed || [];
        return {
            quantity: items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
            total: items.reduce((sum: number, item: any) => sum + (item.total || 0), 0),
        };
    }, [data?.sales?.detailed]);

    const reportSections: ExportSection[] = useMemo(() => [
        {
            title: 'Detailed Sales Log',
            type: 'table',
            data: data?.sales?.detailed,
            columns: [
                { key: 'date', title: 'Date' },
                { key: 'invoice', title: 'Invoice' },
                { key: 'customer', title: 'Customer' },
                { key: 'product', title: 'Product' },
                { key: 'quantity', title: 'Qty' },
                { key: 'unitPrice', title: 'Unit Price', isCurrency: true },
                { key: 'total', title: 'Total', isCurrency: true },
                { key: 'status', title: 'Status' },
            ],
            totals: detailedTotals,
            accentColor: colors.primary
        },
        {
            title: 'Revenue by Category',
            type: 'chart',
            chartData: categoryData,
            accentColor: colors.primary
        },
        {
            title: 'Top Selling Products',
            type: 'table',
            data: data?.sales?.byProduct,
            columns: [
                { key: 'name', title: 'Product' },
                { key: 'category', title: 'Category' },
                { key: 'qty', title: 'Sold' },
                { key: 'revenue', title: 'Revenue', isCurrency: true },
            ],
            accentColor: '#10B981'
        }
    ], [data, detailedTotals, categoryData, colors]);

    return (
        <ReportLayout
            title="Sales Analysis"
            subtitle="Deep dive into sales performance"
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={data?.sales?.detailed}
            reportSections={reportSections}
            exportFilename="sales_analysis_report"
        >
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* Detailed Sales Log */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>Detailed Sales Log</Text>
                        <Text style={styles.sectionSubtitle}>Transaction items for selected period</Text>
                    </View>
                    <ReportTable
                        columns={detailedColumns}
                        data={data?.sales?.detailed || []}
                        totals={detailedTotals}
                    />
                </View>

                {/* Sales Breakdown Charts */}
                <View style={styles.chartRow}>
                    <View style={styles.chartCard}>
                        <Text style={styles.chartTitle}>Revenue by Category</Text>
                        <ReportChart type="bar" data={categoryData} height={180} />
                    </View>
                </View>

                {/* Top Products Table */}
                <View style={[styles.section, { padding: 0 }]}>
                    <View style={{ padding: 16 }}>
                        <Text style={styles.sectionTitle}>Top Selling Products</Text>
                        <Text style={styles.sectionSubtitle}>Ranked by total revenue</Text>
                    </View>
                    <ReportTable
                        columns={productColumns}
                        data={data?.sales?.byProduct || []}
                    />
                </View>

                {/* Payment Methods */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment Methods</Text>
                    <View style={styles.paymentGrid}>
                        {data?.sales?.paymentMethods?.map((p: any, i: number) => (
                            <View key={i} style={styles.paymentItem}>
                                <Text style={styles.paymentMethod}>{p.label}</Text>
                                <Text style={styles.paymentValue}>{fmt(p.value)}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </ReportLayout>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: Layout.spacing.lg, paddingBottom: 40 },
    chartRow: { marginBottom: 20 },
    chartCard: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 16,
        padding: 16,
    },
    chartTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
    section: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        overflow: 'hidden',
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    sectionSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    paymentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 16,
    },
    paymentItem: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: 'transparent',
        borderRadius: 12,
        padding: 12,

    },
    paymentMethod: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase' },
    paymentValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 },
    paymentCount: { fontSize: 11, color: colors.textSecondary },
});
