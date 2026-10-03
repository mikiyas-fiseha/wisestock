import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Gradients, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useInventoryMovements, useInventorySummary } from '@/hooks/useInventory';
import { formatCurrency } from '@/lib/formatters';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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

const SUB_TABS = [
    { key: 'stock', label: 'inventory.stock_list', icon: 'layers-outline', activeIcon: 'layers' },
    { key: 'movements', label: 'inventory.movements', icon: 'swap-horizontal-outline', activeIcon: 'swap-horizontal' },
    { key: 'summary', label: 'inventory.summary', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
] as const;

function KpiCard({ label, value, sub, icon, color, bg, onPress, isWeb }: any) {
    return (
        <TouchableOpacity
            style={[styles.kpiCard, isWeb && styles.kpiCardWeb]}
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiLabel}>{label}</Text>
                <View style={[styles.kpiIconBox, { backgroundColor: bg }]}>
                    <Ionicons name={icon} size={16} color={color} />
                </View>
            </View>
            <Text style={[styles.kpiValue, { color }]}>{value}</Text>
            {sub && <Text style={styles.kpiSub}>{sub}</Text>}
        </TouchableOpacity>
    );
}

export default function SummaryScreen() {
    const { colors, theme } = useTheme();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;
    const router = useRouter();
    const { branch } = useAuth();
    const { data: summary, isLoading: loadingSum, refetch: refetchSum } = useInventorySummary();
    const { data: recentResult, refetch: refetchMov } = useInventoryMovements({ page: 0, pageSize: 8 });
    const recent = recentResult?.data || [];
    const { t, i18n } = useTranslation();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refetchSum(), refetchMov()]);
        setRefreshing(false);
    };

    const TYPE_KEYS: Record<string, { color: string; icon: any }> = {
        purchase: { color: colors.success, icon: 'bag-handle' },
        sale: { color: colors.primary, icon: 'cart' },
        adjustment: { color: colors.warning, icon: 'pencil' },
        transfer_in: { color: colors.primary, icon: 'arrow-down' },
        transfer_out: { color: '#EC4899', icon: 'arrow-up' },
        customer_return: { color: '#06B6D4', icon: 'return-up-back' },
        supplier_return: { color: '#F97316', icon: 'return-up-forward' },
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <ResponsiveContainer>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.screenTitle}>{t('inventory.summary', 'Inventory Overview')}</Text>
                            <View style={styles.branchRow}>
                                <Ionicons name="business-outline" size={13} color={colors.primary} />
                                <Text style={styles.branchName}>
                                    {branch ? branch.name : t('inventory.all_branches', 'All Branches')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Sub-tabs bar */}
                    <View style={styles.subTabBar}>
                        {SUB_TABS.map(tab => {
                            const isActive = tab.key === 'summary';
                            return (
                                <Pressable
                                    key={tab.key}
                                    style={[styles.subTab, isActive && styles.subTabActive]}
                                    onPress={() => {
                                        if (tab.key === 'stock') router.push('/(tabs)/inventory' as any);
                                        if (tab.key === 'movements') router.push('/(tabs)/inventory/movements' as any);
                                    }}
                                >
                                    <Ionicons
                                        name={(isActive ? tab.activeIcon : tab.icon) as any}
                                        size={15}
                                        color={isActive ? colors.primary : colors.textSecondary}
                                    />
                                    <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                                        {t(tab.label)}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                >
                    {loadingSum ? (
                        <View style={{ gap: 16 }}>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <Skeleton height={110} style={{ flex: 1 }} borderRadius={14} />
                                <Skeleton height={110} style={{ flex: 1 }} borderRadius={14} />
                            </View>
                            <Skeleton height={200} borderRadius={16} />
                        </View>
                    ) : (
                        <View style={{ gap: 18 }}>
                            {/* KPI Metrics Grid */}
                            <View style={styles.kpiGrid}>
                                <KpiCard
                                    label={t('inventory.total_value', 'Inventory Value')}
                                    value={formatCurrency(summary?.totalValue ?? 0)}
                                    icon="cash-outline"
                                    color={colors.text}
                                    bg={`${colors.success}18`}
                                    isWeb={isDesktop}
                                />
                                <KpiCard
                                    label={t('inventory.total_products', 'Total Products')}
                                    value={summary?.totalProducts ?? 0}
                                    icon="cube-outline"
                                    color={colors.primary}
                                    bg={`${colors.primary}18`}
                                    isWeb={isDesktop}
                                />
                                <KpiCard
                                    label={t('inventory.low_stock', 'Low Stock Items')}
                                    value={summary?.lowStockCount ?? 0}
                                    sub={t('inventory.needs_reorder', 'Needs restock')}
                                    icon="warning-outline"
                                    color={colors.warning}
                                    bg={`${colors.warning}18`}
                                    onPress={() => router.push('/(tabs)/inventory' as any)}
                                    isWeb={isDesktop}
                                />
                                <KpiCard
                                    label={t('inventory.out_of_stock', 'Depleted Stock')}
                                    value={summary?.outOfStockCount ?? 0}
                                    sub={t('inventory.zero_quantity', 'Zero quantity')}
                                    icon="alert-circle-outline"
                                    color={colors.danger}
                                    bg={`${colors.danger}18`}
                                    onPress={() => router.push('/(tabs)/inventory' as any)}
                                    isWeb={isDesktop}
                                />
                            </View>

                            {/* Branch Breakdown (if multiple branches) */}
                            {(summary?.branches?.length ?? 0) > 1 && (
                                <View style={styles.unifiedCard}>
                                    <View style={styles.cardHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Ionicons name="business" size={16} color={colors.primary} />
                                            <Text style={styles.cardTitle}>{t('inventory.branch_breakdown', 'Branch Breakdown')}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.tableHeaderRow}>
                                        <Text style={[styles.th, { flex: 2.2 }]}>{t('branch', 'BRANCH')}</Text>
                                        <Text style={[styles.th, { width: 90, textAlign: 'center' }]}>{t('inventory.products', 'ITEMS')}</Text>
                                        <Text style={[styles.th, { width: 90, textAlign: 'center' }]}>{t('inventory.stock', 'STOCK')}</Text>
                                        <Text style={[styles.th, { flex: 2, textAlign: 'right' }]}>{t('inventory.stock_value', 'HOLDING VALUE')}</Text>
                                    </View>

                                    {(summary?.branches ?? []).map((b, i) => {
                                        const isLast = i === (summary?.branches?.length ?? 0) - 1;
                                        return (
                                            <View key={b.branch_id} style={[styles.tableRow, !isLast && styles.tableRowBorder]}>
                                                <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <View style={[styles.branchDot, { backgroundColor: colors.primary }]} />
                                                    <Text style={{ fontSize: 13, color: colors.text, fontWeight: '700' }}>
                                                        {b.branch_name}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.td, { width: 90, textAlign: 'center' }]}>{b.totalItems}</Text>
                                                <Text style={[styles.td, { width: 90, textAlign: 'center' }]}>{b.totalStock}</Text>
                                                <Text style={[styles.td, { flex: 2, textAlign: 'right', fontWeight: '800', color: colors.text }]}>
                                                    {formatCurrency(b.totalValue)}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            {/* Recent Movements Unified Card */}
                            <View style={styles.unifiedCard}>
                                <View style={styles.cardHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                                        <Text style={styles.cardTitle}>{t('inventory.recent_movements', 'Recent Stock Movements')}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => router.push('/(tabs)/inventory/movements' as any)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.seeAllText}>{t('inventory.see_all', 'View All →')}</Text>
                                    </TouchableOpacity>
                                </View>

                                {recent.length === 0 ? (
                                    <View style={{ padding: 24, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                            {t('inventory.no_movements_yet', 'No recent movements recorded')}
                                        </Text>
                                    </View>
                                ) : (
                                    recent.map((m, i) => {
                                        const cfg = TYPE_KEYS[m.type] ?? { color: '#64748B', icon: 'ellipse' };
                                        const isPos = (m.quantity || 0) > 0;
                                        const isLast = i === recent.length - 1;

                                        return (
                                            <View key={m.id} style={[styles.movementRow, !isLast && styles.tableRowBorder]}>
                                                <View style={[styles.movIconBox, { backgroundColor: `${cfg.color}15` }]}>
                                                    <Ionicons name={cfg.icon} size={15} color={cfg.color} />
                                                </View>
                                                <View style={{ flex: 1, paddingRight: 8 }}>
                                                    <Text style={styles.movProduct} numberOfLines={1}>{m.product_name}</Text>
                                                    <Text style={styles.movMeta}>
                                                        {m.branch_name || t('inventory.all_branches', 'All Branches')} • {new Date(m.created_at).toLocaleDateString(i18n.language === 'am' ? 'am-ET' : 'en-US')}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.movQty, { color: isPos ? colors.success : colors.danger }]}>
                                                    {isPos ? '+' : ''}{m.quantity}
                                                </Text>
                                            </View>
                                        );
                                    })
                                )}
                            </View>
                        </View>
                    )}

                    <View style={{ height: 60 }} />
                </ScrollView>
            </ResponsiveContainer>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },

    header: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 56 : 24,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderColor: 'rgba(150, 150, 150, 0.08)',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    screenTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
    branchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    branchName: { fontSize: 12, fontWeight: '600' },

    subTabBar: {
        flexDirection: 'row',
        gap: 8,
        paddingBottom: 4,
    },
    subTab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
    },
    subTabActive: {
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
    },
    subTabText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
    subTabTextActive: { color: '#2563EB', fontWeight: '700' },

    scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 },

    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    kpiCard: {
        flex: 1,
        minWidth: 160,
        backgroundColor: 'rgba(17, 24, 39, 0.75)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: Layout.borderRadius.lg,
        padding: 16,
    },
    kpiCardWeb: {
        minWidth: 200,
    },
    kpiHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    kpiIconBox: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    kpiLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    kpiValue: {
        fontSize: 22,
        fontWeight: '900',
        marginTop: 8,
        letterSpacing: -0.4,
        fontVariant: ['tabular-nums'],
    },
    kpiSub: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 4,
    },

    unifiedCard: {
        backgroundColor: 'rgba(17, 24, 39, 0.75)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: Layout.borderRadius.lg,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: 'rgba(150, 150, 150, 0.08)',
    },
    cardTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
    seeAllText: { fontSize: 12, fontWeight: '700', color: '#3B82F6' },

    tableHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 9,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderBottomWidth: 1,
        borderColor: 'rgba(150, 150, 150, 0.06)',
    },
    th: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    tableRowBorder: {
        borderBottomWidth: 1,
        borderColor: 'rgba(150, 150, 150, 0.08)',
    },
    branchDot: { width: 7, height: 7, borderRadius: 3.5 },
    td: { fontSize: 13, color: '#94A3B8', fontVariant: ['tabular-nums'] },

    movementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    movIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    movProduct: { fontSize: 13, fontWeight: '700' },
    movMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    movQty: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
