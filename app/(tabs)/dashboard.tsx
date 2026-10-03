import { ReportChart } from '@/components/reports/ReportChart';
import { SummaryCard } from '@/components/SummaryCard';
import { Gradients, withOpacity } from '@/constants/Colors';
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
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { formatCompactCurrency, formatCurrency } from '@/lib/formatters';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';

export default function DashboardScreen() {
    const { colors, theme } = useTheme();
    const { company } = useAuth();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { data, isLoading, refetch } = useDashboardData();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width >= 768;
    const [trendPeriod, setTrendPeriod] = useState<'7d' | '30d'>('7d');
    const { t, i18n } = useTranslation();

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
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                <LinearGradient colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <ResponsiveContainer>
                    <ScrollView style={styles.container} contentContainerStyle={isWeb ? styles.webContent : styles.mobileContent} showsVerticalScrollIndicator={false}>
                        <View style={{ marginBottom: 20 }}>
                            <Skeleton width={180} height={28} borderRadius={8} style={{ marginBottom: 16 }} />
                            <View style={styles.cardRow}>
                                <SkeletonCard />
                                <SkeletonCard />
                                <SkeletonCard />
                                <SkeletonCard />
                            </View>
                        </View>
                        <View style={{ flexDirection: isWeb ? 'row' : 'column', gap: 20 }}>
                            <View style={{ flex: 3, gap: 16 }}>
                                <Skeleton width="100%" height={240} borderRadius={16} />
                                <Skeleton width="100%" height={160} borderRadius={16} />
                            </View>
                            <View style={{ flex: 2, gap: 16 }}>
                                <Skeleton width="100%" height={180} borderRadius={16} />
                                <Skeleton width="100%" height={220} borderRadius={16} />
                            </View>
                        </View>
                    </ScrollView>
                </ResponsiveContainer>
            </View>
        );
    }

    // Use centralized formatters instead of local fmt functions
    const fmt = (n: number) => formatCompactCurrency(n);
    const fmtFull = (n: number) => formatCurrency(n);

    // ─── Stock urgency helper ───
    const getStockUrgency = (stock: number, min: number) => {
        const ratio = min > 0 ? stock / min : stock / 5;
        if (stock === 0) return { color: colors.danger, pct: 100, label: t('dashboard.out') };
        if (ratio <= 0.3) return { color: colors.warning, pct: 80, label: t('dashboard.critical') };
        if (ratio <= 0.6) return { color: colors.warning, pct: 50, label: t('dashboard.low') };
        return { color: colors.warning, pct: 30, label: t('dashboard.low') };
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
                            <Text style={styles.pageTitle}>{t('common.dashboard')}</Text>
                            <View style={styles.cardRow}>
                                <SummaryCard
                                    title={t('dashboard.today_sales')}
                                    value={fmtFull(stats.todaySales)}
                                    type="primary"
                                    icon="shopping-cart"
                                    change={stats.salesChange}
                                />
                                <SummaryCard
                                    title={t('dashboard.today_profit')}
                                    value={fmtFull(stats.todayProfit)}
                                    type={stats.todayProfit >= 0 ? 'success' : 'danger'}
                                    icon="line-chart"
                                    change={stats.profitChange}
                                />
                                <SummaryCard
                                    title={t('dashboard.month_sales')}
                                    value={fmt(stats.monthSales)}
                                    type="neutral"
                                    icon="calendar"
                                />
                                <SummaryCard
                                    title={t('dashboard.credit_due')}
                                    value={fmtFull(stats.creditDue)}
                                    type={stats.creditDue > 0 ? 'danger' : 'neutral'}
                                    icon="credit-card"
                                />
                                <SummaryCard
                                    title={t('dashboard.loan_on_store')}
                                    value={fmtFull(stats.totalPayables)}
                                    type="warning"
                                    icon="bank"
                                />
                                <SummaryCard
                                    title={t('dashboard.today_expenses')}
                                    value={fmtFull(data?.stats.todayExpenses || 0)}
                                    type="danger"
                                    icon="money"
                                />
                                <SummaryCard
                                    title={t('dashboard.month_expenses')}
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
                                        <Text style={styles.cardTitle}>{t('dashboard.sales_trend')}</Text>
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
                                            yAxisLabelPrefix={i18n.language !== 'am' ? '$' : ''}
                                            yAxisLabelSuffix={i18n.language === 'am' ? ' ብር' : ''}
                                            color={colors.primary}
                                        />
                                    ) : (
                                        <View style={styles.chartEmpty}>
                                            <FontAwesome name="bar-chart" size={24} color={colors.textSecondary} />
                                            <Text style={styles.emptyLabel}>{t('dashboard.no_sales_data')}</Text>
                                        </View>
                                    )}
                                </BlurView>

                                {/* Section 4: Low Stock List */}
                                <BlurView tint={theme === 'dark' ? 'dark' : 'light'} intensity={80} style={[styles.cardWeb, theme === 'dark' ? styles.cardDark : styles.cardLight]}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={styles.titleWithBadge}>
                                            <FontAwesome name="exclamation-triangle" size={14} color={colors.warning} style={{ marginRight: 6 }} />
                                            <Text style={styles.cardTitle}>{t('dashboard.low_stock_alerts')}</Text>
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
                                                                {item.stock === 0 ? t('dashboard.out') : `${item.stock}`}
                                                            </Text>
                                                            <Text style={styles.stockMinLabel}>{t('inventory.min_stock')}: {item.min_stock}</Text>
                                                        </View>
                                                        <TouchableOpacity
                                                            style={[styles.restockBtn, item.stock === 0 && styles.restockBtnUrgent]}
                                                            onPress={() => router.push({ pathname: '/(tabs)/products/[id]', params: { id: item.id } })}
                                                        >
                                                            <Text style={[styles.restockText, item.stock === 0 && { color: colors.card }]}>{t('suppliers.restock')}</Text>
                                                        </TouchableOpacity>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                            <TouchableOpacity
                                                style={styles.viewAllBtn}
                                                onPress={() => router.push('/(tabs)/products')}
                                            >
                                                <Text style={styles.viewAllText}>{t('dashboard.view_all_inventory')}</Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <View style={styles.emptyGreen}>
                                            <FontAwesome name="check-circle" size={20} color={colors.success} />
                                            <Text style={styles.emptyGreenText}>{t('dashboard.all_healthy')}</Text>
                                        </View>
                                    )}
                                </BlurView>
                            </View>

                            {/* Right Column */}
                            <View style={styles.colRight}>
                                {/* Section 3: Inventory Health */}
                                <BlurView tint={theme === 'dark' ? 'dark' : 'light'} intensity={80} style={[styles.cardWeb, theme === 'dark' ? styles.cardDark : styles.cardLight]}>
                                    <Text style={styles.cardTitle}>{t('dashboard.inventory_health')}</Text>
                                    <View style={styles.healthGrid}>
                                        <TouchableOpacity
                                            style={[styles.healthCard, stats.lowStockCount > 0 && styles.healthCardWarn]}
                                            onPress={() => router.push({ pathname: '/(tabs)/products', params: { stockStatus: 'low_stock' } })}
                                            activeOpacity={0.7}
                                        >
                                            <FontAwesome name="exclamation-triangle" size={16} color={colors.warning} />
                                            <Text style={styles.healthValue}>{stats.lowStockCount}</Text>
                                            <Text style={styles.healthLabel}>{t('inventory.low_stock')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.healthCard, stats.outOfStockCount > 0 && styles.healthCardDanger]}
                                            onPress={() => router.push({ pathname: '/(tabs)/products', params: { stockStatus: 'out_of_stock' } })}
                                            activeOpacity={0.7}
                                        >
                                            <FontAwesome name="times-circle" size={16} color={colors.danger} />
                                            <Text style={[styles.healthValue, stats.outOfStockCount > 0 && { color: colors.danger }]}>{stats.outOfStockCount}</Text>
                                            <Text style={styles.healthLabel}>{t('inventory.out_of_stock')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.healthCard}
                                            onPress={() => router.push('/(tabs)/inventory')}
                                            activeOpacity={0.7}
                                        >
                                            <FontAwesome name="archive" size={16} color={colors.primary} />
                                            <Text style={styles.healthValue}>{fmt(stats.inventoryValue)}</Text>
                                            <Text style={styles.healthLabel}>{t('inventory.stock_value')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </BlurView>

                                {/* Section 5: Credit Overview */}
                                <BlurView tint={theme === 'dark' ? 'dark' : 'light'} intensity={80} style={[styles.cardWeb, theme === 'dark' ? styles.cardDark : styles.cardLight]}>
                                    <View style={styles.cardHeaderRow}>
                                        <Text style={styles.cardTitle}>{t('dashboard.credit_due')}</Text>
                                    </View>
                                    <View style={styles.creditSummary}>
                                        <View style={styles.creditStat}>
                                            <Text style={styles.creditStatValue}>{fmtFull(stats.creditDue)}</Text>
                                            <Text style={styles.creditStatLabel}>{t('common.unpaid')}</Text>
                                        </View>
                                        <View style={styles.creditDivider} />
                                        <View style={styles.creditStat}>
                                            <Text style={styles.creditStatValue}>{stats.customersWithBalanceCount}</Text>
                                            <Text style={styles.creditStatLabel}>{t('dashboard.in_debt')}</Text>
                                        </View>
                                        <View style={styles.creditDivider} />
                                        <View style={styles.creditStat}>
                                            <Text style={styles.creditStatValue}>{stats.totalCustomers}</Text>
                                            <Text style={styles.creditStatLabel}>{t('common.total')}</Text>
                                        </View>
                                    </View>
                                    {creditCustomers.length > 0 && (
                                        <View style={styles.creditList}>
                                            <Text style={styles.creditListTitle}>{t('dashboard.top_outstanding')}</Text>
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
                                            <FontAwesome name="trophy" size={14} color={colors.warning} style={{ marginRight: 6 }} />
                                            <Text style={styles.cardTitle}>Top Selling Today</Text>
                                        </View>
                                    </View>
                                    {topSellingProducts.length > 0 ? (
                                        topSellingProducts.map((product: any, index: number) => {
                                            const rankColors = [
                                                { bg: colors.warningBg || 'rgba(245, 158, 11, 0.15)', text: colors.warningText || '#B45309' },
                                                { bg: colors.infoBg || 'rgba(59, 130, 246, 0.15)', text: colors.infoText || '#1D4ED8' },
                                                { bg: colors.dangerBg || 'rgba(239, 68, 68, 0.15)', text: colors.dangerText || '#B91C1C' },
                                            ];
                                            const rColor = rankColors[index] || { bg: withOpacity(colors.border, 0.3), text: colors.textSecondary };
                                            return (
                                                <View key={product.id} style={styles.topProductRow}>
                                                    <View style={[styles.rankBadge, { backgroundColor: rColor.bg }]}>
                                                        <Text style={[styles.rankBadgeText, { color: rColor.text }]}>{index + 1}</Text>
                                                    </View>
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
                                            <FontAwesome name="shopping-bag" size={20} color={colors.textSecondary} />
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
                                                    <Text style={[styles.txCustomer, { color: colors.text }]} numberOfLines={1}>{sale.customerName}</Text>
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
                            <Text style={styles.mobileTitle}>{t('common.dashboard')}</Text>
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
                        <SummaryCard
                            title="Loan Store"
                            value={fmt(stats.totalPayables)}
                            type="warning"
                            icon="bank"
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
                                yAxisLabelPrefix={i18n.language !== 'am' ? '$' : ''}
                                yAxisLabelSuffix={i18n.language === 'am' ? ' ብር' : ''}
                                color={colors.primary}
                            />
                        ) : (
                            <View style={[styles.chartEmpty, { minHeight: 100 }]}>
                                <Text style={styles.emptyLabel}>No sales data yet</Text>
                            </View>
                        )}
                    </BlurView>

                    {/* Inventory Health */}
                    <BlurView tint={theme === 'dark' ? 'dark' : 'light'} intensity={80} style={[styles.mobileSectionCard, theme === 'dark' ? styles.cardDark : styles.cardLight]}>
                        <Text style={styles.mobileSectionTitle}>{t('dashboard.inventory_health')}</Text>
                        <View style={styles.healthGrid}>
                            <TouchableOpacity
                                style={[styles.healthCard, stats.lowStockCount > 0 && styles.healthCardWarn]}
                                onPress={() => router.push({ pathname: '/(tabs)/products', params: { stockStatus: 'low_stock' } })}
                                activeOpacity={0.7}
                            >
                                <FontAwesome name="exclamation-triangle" size={16} color={colors.warningText || colors.warning} />
                                <Text style={styles.healthValue}>{stats.lowStockCount}</Text>
                                <Text style={styles.healthLabel}>{t('inventory.low_stock')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.healthCard, stats.outOfStockCount > 0 && styles.healthCardDanger]}
                                onPress={() => router.push({ pathname: '/(tabs)/products', params: { stockStatus: 'out_of_stock' } })}
                                activeOpacity={0.7}
                            >
                                <FontAwesome name="times-circle" size={16} color={colors.dangerText || colors.danger} />
                                <Text style={[styles.healthValue, stats.outOfStockCount > 0 && { color: colors.dangerText || colors.danger }]}>{stats.outOfStockCount}</Text>
                                <Text style={styles.healthLabel}>{t('inventory.out_of_stock')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.healthCard}
                                onPress={() => router.push('/(tabs)/inventory')}
                                activeOpacity={0.7}
                            >
                                <FontAwesome name="archive" size={16} color={colors.primary} />
                                <Text style={styles.healthValue}>{fmt(stats.inventoryValue)}</Text>
                                <Text style={styles.healthLabel}>{t('inventory.stock_value')}</Text>
                            </TouchableOpacity>
                        </View>
                    </BlurView>

                    {/* Quick Actions */}
                    <BlurView tint={theme === 'dark' ? 'dark' : 'light'} intensity={80} style={[styles.mobileSectionCard, theme === 'dark' ? styles.cardDark : styles.cardLight]}>
                        <Text style={styles.mobileSectionTitle}>Quick Actions</Text>
                        <View style={styles.cardRow}>
                            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/sales/new')} activeOpacity={0.7}>
                                <View style={[styles.actionIconBadge, { backgroundColor: colors.primary + '15' }]}>
                                    <FontAwesome name="shopping-cart" size={18} color={colors.primary} />
                                </View>
                                <Text style={styles.actionTitle}>Add Sale</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/purchases/add')} activeOpacity={0.7}>
                                <View style={[styles.actionIconBadge, { backgroundColor: colors.successBg || colors.primary + '15' }]}>
                                    <FontAwesome name="shopping-bag" size={18} color={colors.successText || colors.primary} />
                                </View>
                                <Text style={styles.actionTitle}>Add Purchase</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/expenses')} activeOpacity={0.7}>
                                <View style={[styles.actionIconBadge, { backgroundColor: colors.dangerBg || colors.danger + '15' }]}>
                                    <FontAwesome name="credit-card" size={18} color={colors.dangerText || colors.danger} />
                                </View>
                                <Text style={styles.actionTitle}>Expenses</Text>
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
        case 'cash': return { backgroundColor: colors.successBg || withOpacity(colors.success, 0.15) };
        case 'transfer': return { backgroundColor: colors.infoBg || withOpacity(colors.primary, 0.15) };
        case 'credit': return { backgroundColor: colors.dangerBg || withOpacity(colors.danger, 0.15) };
        default: return { backgroundColor: colors.border };
    }
};
const getPaymentTextStyle = (method: string, colors: any) => {
    switch (method?.toLowerCase()) {
        case 'cash': return { color: colors.successText || colors.success };
        case 'transfer': return { color: colors.infoText || colors.primary };
        case 'credit': return { color: colors.dangerText || colors.danger };
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
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 22,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    cardLight: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: colors.border,
    },
    cardDark: {
        backgroundColor: 'rgba(17, 24, 39, 0.75)',
        borderColor: 'rgba(255,255,255,0.08)',
    },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    titleWithBadge: { flexDirection: 'row', alignItems: 'center' },
    countBadge: { backgroundColor: colors.danger, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10, marginLeft: 8 },
    countBadgeText: { color: colors.card, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },

    // Toggle
    toggleRow: { flexDirection: 'row', backgroundColor: withOpacity(colors.border, 0.25), borderRadius: 8, padding: 2 },
    toggleBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
    toggleActive: { backgroundColor: withOpacity(colors.card, 0.88) },
    toggleText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    toggleTextActive: { color: colors.primary },

    // Chart
    chartEmpty: { minHeight: 180, justifyContent: 'center', alignItems: 'center', gap: 8 },
    emptyLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },

    // Stock Rows
    stockRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
        paddingHorizontal: 12, borderRadius: 10, marginBottom: 6,
        backgroundColor: withOpacity(colors.warning, 0.15),
    },
    stockRowOut: { backgroundColor: withOpacity(colors.danger, 0.15) },
    stockName: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4 },
    stockBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stockBarTrack: { width: 60, height: 4, backgroundColor: withOpacity(colors.border, 0.25), borderRadius: 2, overflow: 'hidden' },
    stockBarFill: { height: '100%', borderRadius: 2 },
    stockLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    stockRight: { alignItems: 'center', marginHorizontal: 12 },
    stockQty: { fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
    stockMinLabel: { fontSize: 9, color: colors.textSecondary, marginTop: 1, fontVariant: ['tabular-nums'] },
    restockBtn: {
        backgroundColor: withOpacity(colors.danger, 0.15), paddingHorizontal: 10, paddingVertical: 5,
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
    healthCardWarn: { backgroundColor: colors.warningBg || withOpacity(colors.warning, 0.15) },
    healthCardDanger: { backgroundColor: colors.dangerBg || withOpacity(colors.danger, 0.15) },
    healthValue: { fontSize: 22, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
    healthLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },

    // Credit
    creditSummary: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingVertical: 12, backgroundColor: withOpacity(colors.card, 0.88), borderRadius: 10 },
    creditStat: { flex: 1, alignItems: 'center' },
    creditDivider: { width: 1, height: 32, backgroundColor: withOpacity(colors.border, 0.25) },
    creditStatValue: { fontSize: 20, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
    creditStatLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, marginTop: 2, textTransform: 'uppercase' },
    creditList: { marginBottom: 12 },
    creditListTitle: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    creditRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: withOpacity(colors.border, 0.25) },
    creditAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: withOpacity(colors.primary, 0.15), justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    creditAvatarText: { fontSize: 11, fontWeight: '700', color: colors.primary },
    creditName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
    creditAmount: { fontSize: 14, fontWeight: '800', color: colors.dangerText || colors.danger, fontVariant: ['tabular-nums'] },

    // Top Selling Products
    topProductRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: withOpacity(colors.border, 0.25), gap: 10 },
    rankBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    rankBadgeText: { fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
    topProductName: { fontSize: 13, fontWeight: '700', color: colors.text },
    topProductQty: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 2, fontVariant: ['tabular-nums'] },
    topProductRevenue: { fontSize: 14, fontWeight: '800', color: colors.successText || colors.success, fontVariant: ['tabular-nums'] },

    // Transactions
    txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: withOpacity(colors.border, 0.25) },
    txCustomer: { fontSize: 13, fontWeight: '600', color: colors.text },
    txInvoice: { fontSize: 11, color: colors.textSecondary, marginTop: 1, fontVariant: ['tabular-nums'] },
    txRight: { alignItems: 'flex-end' },
    txAmount: { fontSize: 14, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
    txBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginTop: 3 },
    txBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

    // View All
    viewAllBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 8, borderTopWidth: 1, borderTopColor: withOpacity(colors.border, 0.25) },
    viewAllBtnMobile: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
    viewAllText: { fontSize: 13, fontWeight: '600', color: colors.primary },

    // Empty
    emptyGreen: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, justifyContent: 'center', backgroundColor: colors.successBg || withOpacity(colors.success, 0.15), borderRadius: 10 },
    emptyGreenText: { fontSize: 13, fontWeight: '600', color: colors.successText || colors.success },

    // ─── Mobile Layout ───
    mobileContent: { paddingBottom: 32, paddingHorizontal: 16 },
    mobileHeader: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: Platform.OS === 'ios' ? 20 : 10,
    },
    mobileGreeting: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    mobileTitle: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    mobileSectionCard: {
        marginHorizontal: 0,
        marginTop: 14,
        padding: 18,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    mobileSectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },

    // Quick actions
    actionCard: {
        flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', padding: 14,
        borderRadius: 12, alignItems: 'center', margin: 4,
        gap: 8, borderWidth: 1, borderColor: colors.border,
    },
    actionIconBadge: {
        width: 38, height: 38, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center',
    },
    actionTitle: { fontSize: 12, fontWeight: '600', color: colors.text },
});
