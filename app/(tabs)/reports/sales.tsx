import { ListItem } from '@/components/ListItem';
import { DateFilter, DatePeriod, getRangeForPeriod } from '@/components/reports/DateFilter';
import { SummaryCard } from '@/components/SummaryCard';
import { Colors, Layout } from '@/constants/Colors';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SalesReportScreen() {
    const router = useRouter();
    // State for Filter
    const [period, setPeriod] = useState<DatePeriod>('week');
    const [customRange, setCustomRange] = useState({ start: new Date(), end: new Date() });

    // Effective Range (Memoized)
    const range = useMemo(() => getRangeForPeriod(period, customRange), [period, customRange]);

    const { data, isLoading, refetch } = useAdvancedReports(range);
    const sales = data?.sales;

    if (isLoading && !sales) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.primary} /></View>;

    // Simple Bar Chart Visualization (using Views)
    const maxRevenue = Math.max(...(sales?.daily.map(d => d.revenue) || [0]), 1);
    const chartHeight = 150;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>


            {/* Filter */}
            <DateFilter
                period={period}
                onPeriodChange={setPeriod}
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
            />

            {/* Header Summary */}
            <View style={styles.gridContainer}>
                <View style={styles.gridRow}>
                    <SummaryCard title="Total Sales" value={`$${(sales?.totalRevenue || 0).toFixed(0)}`} type="success" />
                    <SummaryCard title="Avg Sale" value={`$${(sales?.averageSaleValue || 0).toFixed(0)}`} type="neutral" />
                </View>
                <View style={styles.gridRow}>
                    <SummaryCard title="No. Sales" value={`${sales?.totalCount || 0}`} type="neutral" />
                    <SummaryCard title="Items Sold" value={`${sales?.totalItemsSold || 0}`} type="neutral" />
                </View>
                <View style={styles.gridRow}>
                    <SummaryCard title="Cash Total" value={`$${(sales?.cashSalesTotal || 0).toFixed(0)}`} type="success" />
                    <SummaryCard title="Credit Total" value={`$${(sales?.creditSalesTotal || 0).toFixed(0)}`} type="danger" />
                </View>
            </View>

            {/* Daily Trend Chart */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Daily Revenue (Last 30 Days)</Text>
                <View style={styles.chartContainer}>
                    {sales?.daily.length === 0 ? (
                        <Text style={styles.emptyText}>No sales data found for this period.</Text>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.chart}>
                                {sales?.daily.map((day, i) => {
                                    const height = (day.revenue / maxRevenue) * chartHeight;
                                    return (
                                        <View key={i} style={styles.barContainer}>
                                            <View style={[styles.bar, { height: Math.max(height, 4) }]} />
                                            <Text style={styles.barLabel}>{new Date(day.date).getDate()}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>

            {/* Top Products */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Selling Products</Text>
                {sales?.topProducts.length === 0 ? <Text style={styles.emptyText}>No products sold.</Text> : (
                    sales?.topProducts.map((p, i) => (
                        <ListItem
                            key={p.id}
                            title={`${i + 1}. ${p.name}`}
                            subtitle={`${p.quantity} units sold`}
                            rightText={`$${p.revenue.toFixed(2)}`}
                            rightSubtitle={`Profit: $${p.profit.toFixed(2)}`}
                            rightTextStyle={{ color: Colors.light.text }}
                        />
                    ))
                )}
            </View>

            {/* Top Staff */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Staff Performance</Text>
                {sales?.topStaff.length === 0 ? <Text style={styles.emptyText}>No staff data.</Text> : (
                    sales?.topStaff.map((s, i) => (
                        <ListItem
                            key={s.id}
                            title={`Staff #${s.id.slice(0, 8)}`} // Ideally fetch name
                            subtitle={`${s.count} orders processed`}
                            rightText={`$${s.revenue.toFixed(2)}`}
                        />
                    ))
                )}

            </View>

            {/* Recent Transactions List */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                {sales?.raw && sales.raw.length > 0 ? (
                    sales.raw.slice(0, 20).map((sale: any) => (
                        <ListItem
                            key={sale.id}
                            title={`Order #${sale.id.split('-')[0]}`}
                            subtitle={new Date(sale.created_at).toLocaleString()}
                            rightText={`$${sale.total_amount.toFixed(2)}`}
                            rightSubtitle={sale.company?.name || sale.status} // Or customer name if available
                            rightTextStyle={{ fontWeight: 'bold' }}
                            onPress={() => router.push(`/(tabs)/sales/${sale.id}`)}
                        />
                    ))
                ) : (
                    <Text style={styles.emptyText}>No transactions found.</Text>
                )}
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    content: { padding: Layout.spacing.lg, paddingBottom: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    gridContainer: { gap: Layout.spacing.md, marginBottom: Layout.spacing.xl },
    gridRow: { flexDirection: 'row', gap: Layout.spacing.md },
    section: { marginBottom: Layout.spacing.xl },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: Layout.spacing.md, color: Colors.light.text },
    emptyText: { color: Colors.light.textSecondary, fontStyle: 'italic' },

    // Chart
    chartContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16, height: 220, ...Layout.shadows.small },
    chart: { flexDirection: 'row', alignItems: 'flex-end', height: 180, gap: 8 },
    barContainer: { alignItems: 'center', width: 24 },
    bar: { width: 12, backgroundColor: Colors.light.primary, borderRadius: 4, minHeight: 4 },
    barLabel: { fontSize: 10, color: Colors.light.textSecondary, marginTop: 4 },
});
