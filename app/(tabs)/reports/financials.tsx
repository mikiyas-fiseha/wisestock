import { ListItem } from '@/components/ListItem';
import { DateFilter, DatePeriod, getRangeForPeriod } from '@/components/reports/DateFilter';
import { SummaryCard } from '@/components/SummaryCard';
import { Colors, Layout } from '@/constants/Colors';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function FinancialReportScreen() {
    const router = useRouter();
    const [period, setPeriod] = useState<DatePeriod>('month');
    const [customRange, setCustomRange] = useState({ start: new Date(), end: new Date() });
    const range = React.useMemo(() => getRangeForPeriod(period, customRange), [period, customRange]);

    const { data, isLoading, refetch } = useAdvancedReports(range);
    const financials = data?.financials;

    if (isLoading && !financials) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.primary} /></View>;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>

            <DateFilter
                period={period}
                onPeriodChange={setPeriod}
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
            />


            {/* Summary Grid */}
            <View style={styles.grid}>
                {/* Row 1: Profitability */}
                <View style={[styles.row, { marginBottom: 12 }]}>
                    <SummaryCard
                        title="Net Profit"
                        value={`$${(financials?.netProfit || 0).toFixed(2)}`}
                        type={(financials?.netProfit || 0) >= 0 ? "success" : "danger"}
                        style={{ flex: 1 }}
                    />
                    <SummaryCard
                        title="Expenses"
                        value={`$${(financials?.totalExpenses || 0).toFixed(2)}`}
                        type="danger"
                        style={{ flex: 1 }}
                    />
                </View>

                {/* Row 2: Cash Flow */}
                <View style={[styles.row, { marginBottom: 12 }]}>
                    <SummaryCard title="Receivables" value={`$${(financials?.totalReceivables || 0).toFixed(2)}`} type="warning" style={{ flex: 1 }} />
                    <SummaryCard title="Gross Profit" value={`$${(data?.sales?.grossProfit || 0).toFixed(2)}`} type="neutral" style={{ flex: 1 }} />
                </View>
            </View>

            {/* Payment Methods */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payments (This Month)</Text>
                {financials?.paymentMethods.length === 0 ? (
                    <Text style={styles.emptyText}>No payments recorded.</Text>
                ) : (
                    financials?.paymentMethods.map((m, i) => (
                        <ListItem
                            key={i}
                            title={m.method.toUpperCase()}
                            subtitle={`${m.count} transactions`}
                            rightText={`$${m.total.toFixed(2)}`}
                        />
                    ))
                )}
            </View>

            {/* Accounts Receivable List */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Accounts Receivable</Text>
                {financials?.receivables.length === 0 ? (
                    <Text style={[styles.emptyText, { color: Colors.light.success }]}>No outstanding debts.</Text>
                ) : (
                    financials?.receivables.map((c: any) => (
                        <ListItem
                            key={c.id}
                            title={c.name}
                            subtitle={`Phone: ${c.phone || 'N/A'}`}
                            rightText={`$${c.current_balance.toFixed(2)}`}
                            rightTextStyle={{ color: Colors.light.danger, fontWeight: '700' }}
                            onPress={() => {
                                console.log('Navigating to', c.id);
                                router.push(`/(tabs)/customers/${c.id}`);
                            }}
                        />
                    ))
                )}
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    content: { padding: Layout.spacing.lg, paddingBottom: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    grid: { flexDirection: 'column', marginBottom: Layout.spacing.xl },
    row: { flexDirection: 'row', gap: Layout.spacing.md },
    section: { marginBottom: Layout.spacing.xl },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: Layout.spacing.md, color: Colors.light.text },
    emptyText: { color: Colors.light.textSecondary, fontStyle: 'italic' },
});
