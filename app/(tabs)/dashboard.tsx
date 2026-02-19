
import { SummaryCard } from '@/components/SummaryCard';
import { Colors, Gradients, Layout } from '@/constants/Colors';
import { useDashboardData } from '@/hooks/useSupabaseQuery';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';

export default function DashboardScreen() {
    const router = useRouter();
    const { data, isLoading, refetch } = useDashboardData();

    const stats = data?.stats || { todaySales: 0, todayProfit: 0, lowStockCount: 0, creditDue: 0 };
    const lowStockItems = data?.lowStockItems || [];

    if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.primary} /></View>;

    return (
        <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
            <ResponsiveContainer>
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.content}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.headerContainer}>
                        <LinearGradient
                            colors={Gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.headerGradient}
                        >
                            <Text style={styles.greeting}>Welcome back,</Text>
                            <Text style={styles.title}>Dashboard Overview</Text>
                            <View style={styles.statsRow}>
                                <View accessible accessibilityLabel={`Today's Sales ${stats.todaySales}`}>
                                    <Text style={styles.statLabel}>Today's Volume</Text>
                                    <Text style={styles.statValue}>${stats.todaySales.toFixed(2)}</Text>
                                </View>
                                <View style={styles.dividerVertical} />
                                <View accessible accessibilityLabel={`Today's Profit ${stats.todayProfit}`}>
                                    <Text style={styles.statLabel}>Net Profit</Text>
                                    <Text style={styles.statValue}>${stats.todayProfit.toFixed(2)}</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Business Health</Text>
                        <View style={styles.grid}>
                            <SummaryCard title="Low Stock" value={stats.lowStockCount.toString()} type={stats.lowStockCount > 0 ? 'warning' : 'neutral'} />
                            <SummaryCard title="Credit Due" value={`$${stats.creditDue.toFixed(2)}`} type="danger" />
                        </View>
                    </View>

                    {/* Low Stock Alerts */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitleHeader}>Low Stock Alerts</Text>
                        {lowStockItems.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{lowStockItems.length}</Text></View>}
                    </View>

                    {lowStockItems.length > 0 ? (
                        <View style={styles.alertSection}>
                            {lowStockItems.map(item => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.alertItem}
                                    onPress={() => router.push({ pathname: '/(tabs)/products/[id]', params: { id: item.id } })}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.alertContent}>
                                        <Text style={styles.alertName}>{item.name}</Text>
                                        <Text style={styles.alertSku}>{item.primary_sku}</Text>
                                    </View>
                                    <View style={styles.alertRight}>
                                        <Text style={styles.alertStock}>{item.stock} left</Text>
                                        <View style={styles.restockBtn}>
                                            <Text style={styles.restockText}>Restock</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Stock levels are healthy! ✅</Text>
                        </View>
                    )}


                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.grid}>
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push('/expenses')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
                                <Text style={{ fontSize: 24 }}>💸</Text>
                            </View>
                            <Text style={styles.actionTitle}>Expenses</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push('/(tabs)/products')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]}>
                                <Text style={{ fontSize: 24 }}>📦</Text>
                            </View>
                            <Text style={styles.actionTitle}>Inventory</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </ResponsiveContainer>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    content: {
        paddingBottom: Layout.spacing.xl,
    },
    headerContainer: {
        marginBottom: Layout.spacing.lg,
        borderBottomLeftRadius: Layout.borderRadius.xl,
        borderBottomRightRadius: Layout.borderRadius.xl,
        overflow: 'hidden',
        ...Layout.shadows.medium,
    },
    headerGradient: {
        paddingTop: 60, // Space for status bar
        paddingBottom: Layout.spacing.xl,
        paddingHorizontal: Layout.spacing.lg,
    },
    greeting: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        marginBottom: 4,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -1,
        marginBottom: Layout.spacing.lg,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: Layout.borderRadius.lg,
        padding: Layout.spacing.md,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginBottom: 2,
    },
    statValue: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
    },
    dividerVertical: {
        width: 1,
        height: '80%',
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    section: {
        paddingHorizontal: Layout.spacing.lg,
        marginBottom: Layout.spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Layout.spacing.md,
        marginTop: Layout.spacing.sm,
        paddingHorizontal: Layout.spacing.lg,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: Layout.spacing.md,
    },
    sectionTitleHeader: { // For use in sectionHeader which already has padding
        fontSize: 18,
        fontWeight: '700',
        color: Colors.light.text,
        marginRight: Layout.spacing.sm,
    },
    badge: {
        backgroundColor: Colors.light.danger,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -Layout.spacing.xs,
    },
    alertSection: {
        marginBottom: Layout.spacing.xl,
        paddingHorizontal: Layout.spacing.lg,
    },
    alertItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Layout.spacing.md,
        backgroundColor: Colors.light.card,
        borderRadius: Layout.borderRadius.lg,
        marginBottom: Layout.spacing.sm,
        ...Layout.shadows.small,
        borderLeftWidth: 4,
        borderLeftColor: Colors.light.warning,
    },
    alertContent: {
        flex: 1,
    },
    alertRight: {
        alignItems: 'flex-end',
    },
    alertName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: 2,
    },
    alertSku: {
        fontSize: 12,
        color: Colors.light.textSecondary,
    },
    alertStock: {
        color: Colors.light.danger,
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 4,
    },
    restockBtn: {
        backgroundColor: '#FFE6E6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    restockText: {
        fontSize: 10,
        color: Colors.light.danger,
        fontWeight: '600',
    },
    emptyState: {
        padding: Layout.spacing.lg,
        alignItems: 'center',
        backgroundColor: Colors.light.card,
        borderRadius: Layout.borderRadius.lg,
        ...Layout.shadows.small,
        marginBottom: Layout.spacing.xl,
        marginHorizontal: Layout.spacing.lg,
    },
    emptyText: {
        fontSize: 16,
        color: Colors.light.textSecondary,
        fontWeight: '500',
    },
    actionCard: {
        width: '45%',
        backgroundColor: Colors.light.card,
        padding: Layout.spacing.lg,
        borderRadius: Layout.borderRadius.lg,
        alignItems: 'center',
        margin: Layout.spacing.xs,
        ...Layout.shadows.small,
    },
    actionIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Layout.spacing.sm,
    },
    actionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
    },
});
