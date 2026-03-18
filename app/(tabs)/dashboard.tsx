import { ReportChart } from '@/components/reports/ReportChart';
import { SummaryCard } from '@/components/SummaryCard';
import { Gradients } from '@/constants/Colors';
import { useDashboardData } from '@/hooks/useSupabaseQuery';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';

import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';

export default function DashboardScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { data, isLoading, refetch } = useDashboardData();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width >= 768;
    const [trendPeriod, setTrendPeriod] = useState<'7d' | '30d'>('7d');

    const stats = data?.stats || {
        todaySales: 0, todayProfit: 0, todayExpenses: 0, monthSales: 0, monthExpenses: 0,
        lowStockCount: 0, outOfStockCount: 0, creditDue: 0, totalPayables: 0,
        inventoryValue: 0, salesChange: 0, profitChange: 0,
        creditCustomerCount: 0,
        totalCustomers: 0,
        customersWithBalanceCount: 0,
        newCustomersMonth: 0,
    };
    const lowStockItems = data?.lowStockItems || [];
    const salesTrend = trendPeriod === '7d' ? (data?.salesTrend7d || []) : (data?.salesTrend30d || []);
    const creditCustomers = data?.creditCustomers || [];
    const recentSales = data?.recentSales || [];
    const topSellingProducts = data?.topSellingProducts || [];

    if (isLoading) {
        return (
            <View style={styles.center}>
                <LinearGradient colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;
    const fmtFull = (n: number) => `$${n.toFixed(2)}`;

    // ─── Stock urgency helper ───
    const getStockUrgency = (stock: number, min: number) => {
        const ratio = min > 0 ? stock / min : stock / 5;
        if (stock === 0) return { color: colors.danger, pct: 100, label: 'OUT' };
        if (ratio <= 0.3) return { color: colors.warning, pct: 80, label: 'CRITICAL' };
        if (ratio <= 0.6) return { color: colors.warning, pct: 50, label: 'LOW' };
        return { color: colors.warning, pct: 30, label: 'LOW' };
    };

    // ─────────── WEB LAYOUT ───────────
    if (isWeb) {
        return (
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                <LinearGradient colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <ResponsiveContainer>
                    <ScrollView
                        style={styles.container}
                        contentContainerStyle={styles.webContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
                    >
                        {/* ─── Section 1: Summary Cards ─── */}
                        <View style={styles.sectionWeb}>
                            <Text style={styles.pageTitle}>Dashboard</Text>
                            <View style={styles.cardRow}>
                                <SummaryCard
                                    title="Today Sales"
                                    value={fmtFull(stats.todaySales)}
                                    type="primary"
                                    icon="shopping-cart"
                                    change={stats.salesChange}
                                />
                                <SummaryCard
                                    title="Today Profit"
                                    value={fmtFull(stats.todayProfit)}
                                    type={stats.todayProfit >= 0 ? 'success' : 'danger'}
                                    icon="line-chart"
                                    change={stats.profitChange}
                                />
                                <SummaryCard
                                    title="This Month"
                                    value={fmt(stats.monthSales)}
                                    type="neutral"
                                    icon="calendar"
                                />
                                <SummaryCard
                                    title="Credit Due"
                                    value={fmtFull(stats.creditDue)}
                                    type={stats.creditDue > 0 ? 'danger' : 'neutral'}
                                    icon="credit-card"
                                />
                                <SummaryCard
                                    title="Total Customers"
                                    value={stats.totalCustomers?.toString() || '0'}
                                    type="neutral"
                                    icon="users"
                                />
                                <SummaryCard
                                    title="Today Expenses"
                                    value={fmtFull(data?.stats.todayExpenses || 0)}
                                    type="danger"
                                    icon="money"
                                />
                                <SummaryCard
                                    title="Month Expenses"
                                    value={fmt(data?.stats.monthExpenses || 0)}
                                    type="danger"
                                    icon="minus-circle"
                                />
                            </View>
                        </View>

                        {/* ─── Two-Column Layout ─── */}
                        <View style={styles.twoCol}>
                            {/* Left Column */}
                            <View style={styles.colLeft}>
                                {/* Section 2: Sales Trend */}
                                <BlurView tint={theme === 'dark' ? 'dark' : 'light'} intensity={80} style={[styles.cardWeb, theme === 'dark' ? styles.cardDark : styles.cardLight]}>
                                    <View style={styles.cardHeaderRow}>
                                        <Text style={styles.cardTitle}>Sales Trend</Text>
                                        <View style={styles.toggleRow}>
                                            <Pressable
                                                style={[styles.toggleBtn, trendPeriod === '7d' && styles.toggleActive]}
                                                onPress={() => setTrendPeriod('7d')}
                                            >
                                                <Text style={[styles.toggleText, trendPeriod === '7d' && styles.toggleTextActive]}>7D</Text>
                                            </Pressable>
                                            <Pressable
                                                style={[styles.toggleBtn, trendPeriod === '30d' && styles.toggleActive]}
                                                onPress={() => setTrendPeriod('30d')}
                                            >
                                                <Text style={[styles.toggleText, trendPeriod === '30d' && styles.toggleTextActive]}>30D</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                    {salesTrend.length > 0 ? (
                                        <ReportChart
                                            type="line"
                                            data={salesTrend}
                                            height={200}
                                            yAxisLabelPrefix="$"
                                            color={colors.primary}
                                        />
                                    ) : (
                                        <View style={styles.chartEmpty}>
                                            <FontAwesome name="bar-chart" size={24} color="#CBD5E1" />
                                            <Text style={styles.emptyLabel}>No sales data for this period</Text>
                                        </View>
                                    )}
                                </BlurView>

                                {/* Section 4: Low Stock List */}
                                <BlurView tint={theme === 'dark' ? 'dark' : 'light'} intensity={80} style={[styles.cardWeb, theme === 'dark' ? styles.cardDark : styles.cardLight]}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={styles.titleWithBadge}>
                                            <FontAwesome name="exclamation-triangle" size={14} color="#D97706" style={{ marginRight: 6 }} />
                                            <Text style={styles.cardTitle}>Low Stock Alerts</Text>
                                            {lowStockItems.length > 0 && (
                                                <View style={styles.countBadge}>
                                                    <Text style={styles.countBadgeText}>{lowStockItems.length}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    {lowStockItems.length > 0 ? (
                                        <>
                                            {lowStockItems.slice(0, 5).map((item: any) => {
                                                const urgency = getStockUrgency(item.stock, item.min_stock);
                                                return (
                                                    <TouchableOpacity
                                                        key={item.id}
                                                        style={[styles.stockRow, item.stock === 0 && styles.stockRowOut]}
                                                        onPress={() => router.push({ pathname: '/(tabs)/products/[id]', params: { id: item.id } })}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.stockName}>{item.name}</Text>
                                                            <View style={styles.stockBarRow}>
                                                                <View style={styles.stockBarTrack}>
                                                                    <View style={[styles.stockBarFill, { width: `${urgency.pct}%`, backgroundColor: urgency.color }]} />
                                                                </View>
                                                                <Text style={[styles.stockLabel, { color: urgency.color }]}>{urgency.label}</Text>
                                                            </View>
                                                        </View>
                                                        <View style={styles.stockRight}>
                                                            <Text style={[styles.stockQty, { color: urgency.color }]}>
                                                                {item.stock === 0 ? 'OUT' : `${item.stock}`}
                                                            </Text>
                                                            <Text style={styles.stockMinLabel}>min: {item.min_stock}</Text>
                                                        </View>
                                                        <TouchableOpacity
                                                            style={[styles.restockBtn, item.stock === 0 && styles.restockBtnUrgent]}
                                                            onPress={() => router.push({ pathname: '/(tabs)/products/[id]', params: { id: item.id } })}
                                                        >
                                                            <Text style={[styles.restockText, item.stock === 0 && { color: '#FFF' }]}>Restock</Text>
                                                        </TouchableOpacity>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                            <TouchableOpacity
                                                style={styles.viewAllBtn}
                                                onPress={() => router.push('/(tabs)/products')}
                                            >
                                                <Text style={styles.viewAllText}>View All Inventory →</Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <View style={styles.emptyGreen}>
                                            <FontAwesome name="check-circle" size={20} color="#10B981" />
                                            <Text style={styles.emptyGreenText}>All stock levels healthy</Text>
                                        </View>
                                    )}
                                </BlurView>
                            </View>

                            {/* Right Column */}
                            <View style={styles.colRight}>
                                {/* Section 3: Inventory Health */}
                                <BlurView tint={theme === 'dark' ? 'dark' : 'light'} intensity={80} style={[styles.cardWeb, theme === 'dark' ? styles.cardDark : styles.cardLight]}>
                                    <Text style={styles.cardTitle}>Inventory Health</Text>
                                    <View style={styles.healthGrid}>
                                        <View style={[styles.healthCard, stats.lowStockCount > 0 && styles.healthCardWarn]}>
                                            <FontAwesome name="exclamation-triangle" size={16} color="#D97706" />
                                            <Text style={styles.healthValue}>{stats.lowStockCount}</Text>
                                            <Text style={styles.healthLabel}>Low Stock</Text>
                                        </View>
                                        <View style={[styles.healthCard, stats.outOfStockCount > 0 && styles.healthCardDanger]}>
                                            <FontAwesome name="times-circle" size={16} color="#DC2626" />
                                            <Text style={[styles.healthValue, stats.outOfStockCount > 0 && { color: '#DC2626' }]}>{stats.outOfStockCount}</Text>
                                            <Text style={styles.healthLabel}>Out of Stock</Text>
                                        </View>
                                        <View style={styles.healthCard}>
                                            <FontAwesome name="archive" size={16} color="#2563EB" />
                                            <Text style={styles.healthValue}>{fmt(stats.inventoryValue)}</Text>
                                            <Text style={styles.healthLabel}>Value</Text>
                                        </View>
                                    </View>
                                </BlurView>

                                {/* Section 5: Credit Overview */}
                                <BlurView tint={theme === 'dark' ? 'dark' : 'light'} intensity={80} style={[styles.cardWeb, theme === 'dark' ? styles.cardDark : styles.cardLight]}>
                                    <View style={styles.cardHeaderRow}>
                                        <Text style={styles.cardTitle}>Credit Overview</Text>
                                    </View>
                                    <View style={styles.creditSummary}>
                                        <View style={styles.creditStat}>
                                            <Text style={styles.creditStatValue}>{fmtFull(stats.creditDue)}</Text>
                                            <Text style={styles.creditStatLabel}>Unpaid</Text>
                                        </View>
                                        <View style={styles.creditDivider} />
                                        <View style={styles.creditStat}>
                                            <Text style={styles.creditStatValue}>{stats.customersWithBalanceCount}</Text>
                                            <Text style={styles.creditStatLabel}>In Debt</Text>
                                        </View>
                                        <View style={styles.creditDivider} />
                                        <View style={styles.creditStat}>
                                            <Text style={styles.creditStatValue}>{stats.totalCustomers}</Text>
                                            <Text style={styles.creditStatLabel}>Total</Text>
                                        </View>
                                    </View>
                                    {creditCustomers.length > 0 && (
                                        <View style={styles.creditList}>
                                            <Text style={styles.creditListTitle}>Top Outstanding</Text>
                                            {creditCustomers.map((c: any) => (
                                                <View key={c.id} style={styles.creditRow}>
                                                    <View style={styles.creditAvatar}>
                                                        <Text style={styles.creditAvatarText}>{(c.name || 'C').charAt(0).toUpperCase()}</Text>
                                                    </View>
                                                    <Text style={styles.creditName} numberOfLines={1}>{c.name}</Text>
                                                    <Text style={styles.creditAmount}>{fmtFull(c.current_balance)}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={styles.viewAllBtn}
                                        onPress={() => router.push('/(tabs)/customers')}
                                    >
                                        <Text style={styles.viewAllText}>View All Credit →</Text>
                                    </TouchableOpacity>
                                </BlurView>

                                {/* Section 6: Top Selling Products Today */}
                                <BlurView tint={theme === 'dark' ? 'dark' : 'light'} intensity={80} style={[styles.cardWeb, theme === 'dark' ? styles.cardDark : styles.cardLight]}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={styles.titleWithBadge}>
                                            <FontAwesome name="trophy" size={14} color="#D97706" style={{ marginRight: 6 }} />
                                            <Text style={styles.cardTitle}>Top Selling Today</Text>
                                        </View>
                                    </View>
                                    {topSellingProducts.length > 0 ? (
                                        topSellingProducts.map((product: any, index: number) => {
                                            const medals = ['🥇', '🥈', '🥉'];
                                            return (
                                                <View key={product.id} style={styles.topProductRow}>
                                                    <Text style={styles.topProductRank}>{medals[index] || `${index + 1}`}</Text>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.topProductName} numberOfLines={1}>{product.name}</Text>
                                                        <Text style={styles.topProductQty}>{product.quantity} sold</Text>
                                                    </View>
                                                    <Text style={styles.topProductRevenue}>{fmtFull(product.revenue)}</Text>
                                                </View>
                                            );
                                        })
                                    ) : (
                                        <View style={styles.chartEmpty}>
                                            <FontAwesome name="shopping-bag" size={20} color="#CBD5E1" />
                                            <Text style={styles.emptyLabel}>No sales yet today</Text>
                                        </View>
                                    )}
                                </BlurView>

                                {/* Section 7: Recent Transactions */}
                                <BlurView tint={theme === 'dark' ? 'dark' : 'light'} intensity={80} style={[styles.cardWeb, theme === 'dark' ? styles.cardDark : styles.cardLight]}>
                                    <Text style={styles.cardTitle}>Recent Transactions</Text>
                                    {recentSales.length > 0 ? (
                                        recentSales.map((sale: any) => (
                                            <View key={sale.id} style={styles.txRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.txCustomer, { color: theme === 'dark' ? '#fff' : colors.text }]} numberOfLines={1}>{sale.customerName}</Text>
                                                    <Text style={styles.txInvoice}>#{sale.id?.slice(0, 8)}</Text>
                                                </View>
                                                <View style={styles.txRight}>
                                                    <Text style={styles.txAmount}>{fmtFull(sale.total_amount)}</Text>
                                                    <View style={[styles.txBadge, getPaymentBadgeStyle(sale.payment_method, colors)]}>
                                                        <Text style={[styles.txBadgeText, getPaymentTextStyle(sale.payment_method, colors)]}>
                                                            {(sale.payment_method || 'cash').toUpperCase()}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.emptyLabel}>No recent transactions</Text>
                                    )}
                                </BlurView>
                            </View>
                        </View>
                    </ScrollView>
                </ResponsiveContainer>
            </View>
        );
    }

    // ─────────── MOBILE LAYOUT ───────────
    return (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <LinearGradient colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <ResponsiveContainer>
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.mobileContent}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.mobileHeader}>
                        <View>
                            <Text style={styles.mobileGreeting}>Welcome back</Text>
                            <Text style={styles.mobileTitle}>Dashboard</Text>
                        </View>
                    </View>

                    {/* Compact Summary Cards - 2x2 + Single row */}
                    <View style={styles.cardRow}>
                        <SummaryCard
                            title="Today Sales"
                            value={fmt(stats.todaySales)}
                            type="primary"
                            icon="shopping-cart"
                            compact
                        />
                        <SummaryCard
                            title="Today Profit"
                            value={fmt(stats.todayProfit)}
                            type={stats.todayProfit >= 0 ? 'success' : 'danger'}
                            icon="line-chart"
                            compact
                        />
                    </View>
                    <View style={styles.cardRow}>
                        <SummaryCard
                            title="This Month"
                            value={fmt(stats.monthSales)}
                            type="neutral"
                            icon="calendar"
                            compact
                        />
                        <SummaryCard
                            title="Credit Due"
                            value={fmt(stats.creditDue)}
                            type={stats.creditDue > 0 ? 'danger' : 'neutral'}
                            icon="credit-card"
                            compact
                        />
                    </View>
                    <View style={styles.cardRow}>
                        <SummaryCard
                            title="Today Exp"
                            value={fmt(data?.stats.todayExpenses || 0)}
                            type="danger"
                            icon="money"
                            compact
                        />
                    </View>

                    {/* Mini Sales Chart */}
                    <BlurView tint={theme === 'dark' ? 'dark' : 'light'} intensity={80} style={[styles.mobileSectionCard, theme === 'dark' ? styles.cardDark : styles.cardLight]}>
                        <Text style={styles.mobileSectionTitle}>Sales — Last 7 Days</Text>
                        {(data?.salesTrend7d || []).length > 0 ? (
                            <ReportChart
                                type="line"
                                data={data?.salesTrend7d || []}
                                height={150}
                                yAxisLabelPrefix="$"
                                color={colors.primary}
                            />
                        ) : (
                            <View style={[styles.chartEmpty, { minHeight: 100 }]}>
                                <Text style={styles.emptyLabel}>No sales data yet</Text>
                            </View>
                        )}
                    </BlurView>

                    {/* Quick Actions */}
                    <BlurView tint={theme === 'dark' ? 'dark' : 'light'} intensity={80} style={[styles.mobileSectionCard, theme === 'dark' ? styles.cardDark : styles.cardLight]}>
                        <Text style={styles.mobileSectionTitle}>Quick Actions</Text>
                        <View style={styles.cardRow}>
                            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/expenses')} activeOpacity={0.7}>
                                <Text style={{ fontSize: 22 }}>💸</Text>
                                <Text style={styles.actionTitle}>Expenses</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/expenses/add')} activeOpacity={0.7}>
                                <Text style={{ fontSize: 22 }}>✍️</Text>
                                <Text style={styles.actionTitle}>Add Expense</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/products')} activeOpacity={0.7}>
                                <Text style={{ fontSize: 22 }}>📦</Text>
                                <Text style={styles.actionTitle}>Inventory</Text>
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </ScrollView>
            </ResponsiveContainer>
        </View>
    );
}

// ─── Payment badge helpers ───
const getPaymentBadgeStyle = (method: string, colors: any) => {
    switch (method?.toLowerCase()) {
        case 'cash': return { backgroundColor: `${colors.success}15` };
        case 'transfer': return { backgroundColor: `${colors.primary}15` };
        case 'credit': return { backgroundColor: `${colors.danger}15` };
        default: return { backgroundColor: colors.border };
    }
};
const getPaymentTextStyle = (method: string, colors: any) => {
    switch (method?.toLowerCase()) {
        case 'cash': return { color: colors.success };
        case 'transfer': return { color: colors.primary };
        case 'credit': return { color: colors.danger };
        default: return { color: colors.textSecondary };
    }
};

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // ─── Web Layout ───
    webContent: { padding: 24, paddingBottom: 48 },
    pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 16, letterSpacing: -0.5 },
    sectionWeb: { marginBottom: 20 },
    cardRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },

    twoCol: { flexDirection: 'row', gap: 20 },
    colLeft: { flex: 3, gap: 20 },
    colRight: { flex: 2, gap: 20 },

    cardWeb: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 14,
        padding: 20,

        overflow: 'hidden',
    },
    cardLight: {
        backgroundColor: 'rgba(255,255,255,0.6)',
    },
    cardDark: {
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    titleWithBadge: { flexDirection: 'row', alignItems: 'center' },
    countBadge: { backgroundColor: colors.danger, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10, marginLeft: 8 },
    countBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

    // Toggle
    toggleRow: { flexDirection: 'row', backgroundColor: colors.border + '40', borderRadius: 8, padding: 2 },
    toggleBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
    toggleActive: { backgroundColor: colors.card + 'E0' },
    toggleText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    toggleTextActive: { color: colors.primary },

    // Chart
    chartEmpty: { minHeight: 180, justifyContent: 'center', alignItems: 'center', gap: 8 },
    emptyLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },

    // Stock Rows
    stockRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
        paddingHorizontal: 12, borderRadius: 10, marginBottom: 6,
        backgroundColor: colors.warning + '15',
    },
    stockRowOut: { backgroundColor: colors.danger + '15' },
    stockName: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4 },
    stockBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stockBarTrack: { width: 60, height: 4, backgroundColor: colors.border + '40', borderRadius: 2, overflow: 'hidden' },
    stockBarFill: { height: '100%', borderRadius: 2 },
    stockLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    stockRight: { alignItems: 'center', marginHorizontal: 12 },
    stockQty: { fontSize: 18, fontWeight: '900' },
    stockMinLabel: { fontSize: 9, color: colors.textSecondary, marginTop: 1 },
    restockBtn: {
        backgroundColor: colors.danger + '15', paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 6,
    },
    restockBtnUrgent: { backgroundColor: colors.danger, borderColor: colors.danger },
    restockText: { fontSize: 11, fontWeight: '700', color: colors.danger },

    // Health Grid
    healthGrid: { flexDirection: 'row', gap: 8, marginTop: 8 },
    healthCard: {
        flex: 1, alignItems: 'center', paddingVertical: 14,
        borderRadius: 10, backgroundColor: 'transparent', gap: 4,
    },
    healthCardWarn: { backgroundColor: colors.warning + '15' },
    healthCardDanger: { backgroundColor: colors.danger + '15' },
    healthValue: { fontSize: 22, fontWeight: '900', color: colors.text },
    healthLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },

    // Credit
    creditSummary: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingVertical: 12, backgroundColor: colors.card + 'E0', borderRadius: 10 },
    creditStat: { flex: 1, alignItems: 'center' },
    creditDivider: { width: 1, height: 32, backgroundColor: colors.border + '40' },
    creditStatValue: { fontSize: 20, fontWeight: '900', color: colors.text },
    creditStatLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, marginTop: 2, textTransform: 'uppercase' },
    creditList: { marginBottom: 12 },
    creditListTitle: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    creditRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
    creditAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    creditAvatarText: { fontSize: 11, fontWeight: '700', color: colors.primary },
    creditName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
    creditAmount: { fontSize: 14, fontWeight: '800', color: colors.danger },

    // Top Selling Products
    topProductRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + '40', gap: 10 },
    topProductRank: { fontSize: 18, width: 28, textAlign: 'center' },
    topProductName: { fontSize: 13, fontWeight: '700', color: colors.text },
    topProductQty: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
    topProductRevenue: { fontSize: 14, fontWeight: '800', color: colors.success },

    // Transactions
    txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
    txCustomer: { fontSize: 13, fontWeight: '600', color: colors.text },
    txInvoice: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
    txRight: { alignItems: 'flex-end' },
    txAmount: { fontSize: 14, fontWeight: '800', color: colors.text },
    txBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginTop: 3 },
    txBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

    // View All
    viewAllBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border + '40' },
    viewAllBtnMobile: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
    viewAllText: { fontSize: 13, fontWeight: '600', color: colors.primary },

    // Empty
    emptyGreen: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, justifyContent: 'center', backgroundColor: colors.success + '15', borderRadius: 10 },
    emptyGreenText: { fontSize: 13, fontWeight: '600', color: colors.success },

    // ─── Mobile Layout ───
    mobileContent: { paddingBottom: 32, paddingHorizontal: 16 },
    mobileHeader: { paddingHorizontal: 16, paddingBottom: 12 },
    mobileGreeting: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    mobileTitle: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    mobileSectionCard: { marginHorizontal: 12, marginTop: 12, padding: 16, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.card + 'E0' },
    mobileSectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },

    // Quick actions
    actionCard: {
        flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', padding: 14,
        borderRadius: 12, alignItems: 'center', margin: 4,
        gap: 6,
    },
    actionTitle: { fontSize: 12, fontWeight: '600', color: colors.text },
});
