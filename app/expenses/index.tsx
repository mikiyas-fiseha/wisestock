
import { AppHeader } from '@/components/AppHeader';
import { ListItem } from '@/components/ListItem';
import { DateFilter, DatePeriod, getRangeForPeriod } from '@/components/reports/DateFilter';
import { Colors } from '@/constants/Colors';
import { useDeleteExpense, useExpenses } from '@/hooks/useExpenses';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ExpensesScreen() {
    const router = useRouter();
    const [period, setPeriod] = useState<DatePeriod>('month');
    const [customRange, setCustomRange] = useState({ start: new Date(), end: new Date() });

    // Memoize range calculation to avoid infinite loops if it were a dependency
    const range = useMemo(() => getRangeForPeriod(period, customRange), [period, customRange]);

    const { data: expenses, isLoading, refetch } = useExpenses(range);
    const deleteExpense = useDeleteExpense();

    const handleDelete = (id: string) => {
        Alert.alert(
            "Delete Expense",
            "Are you sure you want to delete this expense?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteExpense.mutate(id)
                }
            ]
        );
    };

    const totalAmount = useMemo(() => {
        return expenses?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
    }, [expenses]);

    const renderItem = ({ item }: { item: any }) => (
        <ListItem
            title={item.category}
            subtitle={`${new Date(item.date).toLocaleDateString()} • ${item.payment_method}${item.reference ? ` • Ref: ${item.reference}` : ''}`}
            rightText={`-$${Number(item.amount).toFixed(2)}`}
            rightTextStyle={{ color: Colors.light.danger, fontWeight: '600' }}
            onPress={() => {
                // Maybe open edit or details? For now just confirm delete on long press
            }}
            onLongPress={() => handleDelete(item.id)}
            description={item.description}
        />
    );

    return (
        <View style={styles.container}>
            <AppHeader title="Expenses" showBack />

            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                <DateFilter
                    period={period}
                    onPeriodChange={setPeriod}
                    customRange={customRange}
                    onCustomRangeChange={setCustomRange}
                />
            </View>

            <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Expenses</Text>
                <Text style={styles.summaryValue}>${totalAmount.toFixed(2)}</Text>
            </View>

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.primary} /></View>
            ) : (
                <FlatList
                    data={expenses}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No expenses found for this period.</Text>
                        </View>
                    }
                    onRefresh={refetch}
                    refreshing={isLoading}
                />
            )}

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/expenses/add')}
                activeOpacity={0.8}
            >
                <FontAwesome name="plus" size={24} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    listContent: { padding: 16, paddingBottom: 100 },
    summaryCard: {
        backgroundColor: 'white',
        margin: 16,
        marginBottom: 8,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    summaryLabel: { fontSize: 14, color: '#666', marginBottom: 4 },
    summaryValue: { fontSize: 32, fontWeight: '700', color: Colors.light.danger },
    emptyText: { color: '#999', fontStyle: 'italic' },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.light.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    }
});
