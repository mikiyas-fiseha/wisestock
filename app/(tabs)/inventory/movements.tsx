import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Gradients, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { MovementFilters, useInventoryMovements } from '@/hooks/useInventory';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FlatList,
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

type MovementType = 'all' | 'purchase' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'customer_return' | 'supplier_return';

function getMovementTypes(colors: any, t: any) {
    return [
        { key: 'all', label: t('common.all', 'All'), icon: 'list', color: colors.textSecondary, bg: `${colors.textSecondary}15` },
        { key: 'purchase', label: t('common.purchase', 'Purchase'), icon: 'bag-handle', color: colors.success, bg: `${colors.success}18` },
        { key: 'sale', label: t('common.sale', 'Sale'), icon: 'cart', color: colors.primary, bg: `${colors.primary}18` },
        { key: 'adjustment', label: t('common.adjustment', 'Adjustment'), icon: 'pencil', color: colors.warning, bg: `${colors.warning}18` },
        { key: 'transfer_in', label: t('common.transfer_in', 'Transfer In'), icon: 'arrow-down', color: colors.primary, bg: `${colors.primary}18` },
        { key: 'transfer_out', label: t('common.transfer_out', 'Transfer Out'), icon: 'arrow-up', color: '#EC4899', bg: '#EC489918' },
        { key: 'customer_return', label: t('common.return', 'Customer Return'), icon: 'return-up-back', color: '#06B6D4', bg: '#06B6D418' },
        { key: 'supplier_return', label: t('common.return', 'Supplier Return'), icon: 'return-up-forward', color: '#F97316', bg: '#F9731618' },
    ] as const;
}

const getTypeConfig = (types: any, type: string) =>
    types.find((t: any) => t.key === type) ?? types[0];

function formatDate(iso: string, i18n: any) {
    try {
        return new Date(iso).toLocaleDateString(i18n.language === 'am' ? 'am-ET' : 'en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
}

export default function MovementsScreen() {
    const { colors, theme } = useTheme();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;
    const { t, i18n } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors, theme, isDesktop), [colors, theme, isDesktop]);
    const router = useRouter();
    const { branch } = useAuth();
    const params = useLocalSearchParams<{ productId?: string }>();
    const types = getMovementTypes(colors, t);
    const [activeType, setActiveType] = useState<MovementType>('all');
    const [page, setPage] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const PAGE_SIZE = 50;

    const filters: MovementFilters = {
        type: activeType === 'all' ? undefined : activeType,
        branchId: branch?.id || null,
        productId: params.productId,
        page,
        pageSize: PAGE_SIZE,
    };

    const { data: result, isLoading, refetch } = useInventoryMovements(filters);
    const movements = result?.data || [];
    const totalCount = result?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
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
                            <Text style={styles.screenTitle}>{t('inventory.movements', 'Stock Movements')}</Text>
                            <View style={styles.branchRow}>
                                <Ionicons name="business-outline" size={13} color={colors.primary} />
                                <Text style={styles.branchName}>
                                    {branch ? branch.name : t('inventory.all_branches', 'All Branches')}
                                </Text>
                                <Text style={styles.headerMetaCount}>
                                    • {totalCount} {t('inventory.records', 'records')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Sub-tabs bar */}
                    <View style={styles.subTabBar}>
                        {SUB_TABS.map(tab => {
                            const isActive = tab.key === 'movements';
                            return (
                                <Pressable
                                    key={tab.key}
                                    style={[styles.subTab, isActive && styles.subTabActive]}
                                    onPress={() => {
                                        if (tab.key === 'stock') router.push('/(tabs)/inventory' as any);
                                        if (tab.key === 'summary') router.push('/(tabs)/inventory/summary' as any);
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
                    {/* Movement Type Filter Chips */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterPillsContainer}
                    >
                        {types.map(item => {
                            const isSelected = activeType === item.key;
                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[
                                        styles.filterChip,
                                        isSelected && {
                                            backgroundColor: item.bg,
                                            borderColor: item.color,
                                        },
                                    ]}
                                    onPress={() => { setActiveType(item.key as MovementType); setPage(0); }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={item.icon as any}
                                        size={13}
                                        color={isSelected ? item.color : colors.textSecondary}
                                    />
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            isSelected && { color: item.color, fontWeight: '700' },
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Unified Movements Ledger Container (No separate floating cards) */}
                    <View style={styles.ledgerContainer}>
                        {isLoading ? (
                            <View style={{ padding: 16, gap: 14 }}>
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <Skeleton key={i} height={46} borderRadius={8} />
                                ))}
                            </View>
                        ) : movements.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconCircle}>
                                    <Ionicons name="swap-horizontal-outline" size={36} color={colors.textSecondary} />
                                </View>
                                <Text style={styles.emptyTitle}>{t('inventory.no_movements', 'No movements recorded')}</Text>
                                <Text style={styles.emptySubtitle}>
                                    {t('inventory.no_stock_changes', 'Stock changes from sales, restocks, and transfers appear here.')}
                                </Text>
                            </View>
                        ) : isDesktop ? (
                            /* Desktop Table View */
                            <View>
                                <View style={styles.desktopTableHeader}>
                                    <Text style={[styles.th, { flex: 1.8 }]}>{t('inventory.type', 'TYPE')}</Text>
                                    <Text style={[styles.th, { flex: 3 }]}>{t('common.product', 'PRODUCT')}</Text>
                                    <Text style={[styles.th, { flex: 1.8 }]}>{t('inventory.branch', 'BRANCH')}</Text>
                                    <Text style={[styles.th, { width: 80, textAlign: 'center' }]}>{t('common.qty', 'QTY')}</Text>
                                    <Text style={[styles.th, { width: 120, textAlign: 'center' }]}>{t('inventory.stock', 'PREV → NEW')}</Text>
                                    <Text style={[styles.th, { flex: 2 }]}>{t('inventory.notes', 'NOTE')}</Text>
                                    <Text style={[styles.th, { width: 110, textAlign: 'right' }]}>{t('inventory.date', 'DATE')}</Text>
                                </View>

                                {movements.map((m, index) => {
                                    const isLast = index === movements.length - 1;
                                    const cfg = getTypeConfig(types, m.type);
                                    const isPositive = (m.quantity || 0) > 0;

                                    return (
                                        <View key={m.id} style={[styles.tableRow, !isLast && styles.tableRowBorder]}>
                                            <View style={{ flex: 1.8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                                                    <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                                                    <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                                                </View>
                                            </View>

                                            <Text style={[styles.productText, { flex: 3 }]} numberOfLines={1}>
                                                {m.product_name}
                                            </Text>

                                            <Text style={[styles.secondaryText, { flex: 1.8 }]} numberOfLines={1}>
                                                {m.branch_name || '—'}
                                            </Text>

                                            <View style={{ width: 80, alignItems: 'center' }}>
                                                <Text style={[styles.qtyText, { color: isPositive ? colors.success : colors.danger }]}>
                                                    {isPositive ? '+' : ''}{m.quantity}
                                                </Text>
                                            </View>

                                            <View style={{ width: 120, alignItems: 'center' }}>
                                                <Text style={styles.stockShiftText}>
                                                    {m.previous_stock} → <Text style={{ fontWeight: '800', color: colors.text }}>{m.new_stock}</Text>
                                                </Text>
                                            </View>

                                            <Text style={[styles.notesText, { flex: 2 }]} numberOfLines={1}>
                                                {m.notes || '—'}
                                            </Text>

                                            <Text style={[styles.dateText, { width: 110, textAlign: 'right' }]}>
                                                {formatDate(m.created_at, i18n)}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        ) : (
                            /* Mobile Unified Rows */
                            <View>
                                {movements.map((m, index) => {
                                    const isLast = index === movements.length - 1;
                                    const cfg = getTypeConfig(types, m.type);
                                    const isPositive = (m.quantity || 0) > 0;

                                    return (
                                        <View key={m.id} style={[styles.mobileRow, !isLast && styles.tableRowBorder]}>
                                            <View style={{ flex: 1, paddingRight: 10 }}>
                                                <Text style={styles.productText} numberOfLines={1}>{m.product_name}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                    <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                                                        <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                                                    </View>
                                                    <Text style={styles.dateText}>{formatDate(m.created_at, i18n)}</Text>
                                                </View>
                                                {m.notes ? (
                                                    <Text style={styles.notesText} numberOfLines={1}>{m.notes}</Text>
                                                ) : null}
                                            </View>

                                            <View style={{ alignItems: 'flex-end', gap: 3 }}>
                                                <Text style={[styles.qtyText, { color: isPositive ? colors.success : colors.danger }]}>
                                                    {isPositive ? '+' : ''}{m.quantity}
                                                </Text>
                                                <Text style={styles.stockShiftText}>
                                                    {m.previous_stock} → {m.new_stock}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <View style={styles.paginationBar}>
                                <Text style={styles.paginationInfo}>
                                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} {t('common.of', 'of')} {totalCount}
                                </Text>
                                <View style={styles.paginationActions}>
                                    <TouchableOpacity
                                        style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
                                        onPress={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="chevron-back" size={14} color={page === 0 ? colors.textSecondary : colors.text} />
                                        <Text style={[styles.pageBtnText, page === 0 && { color: colors.textSecondary }]}>
                                            {t('common.prev', 'Prev')}
                                        </Text>
                                    </TouchableOpacity>

                                    <View style={styles.pageNumberBadge}>
                                        <Text style={styles.pageNumberText}>{page + 1} / {totalPages}</Text>
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.pageBtn, page >= totalPages - 1 && styles.pageBtnDisabled]}
                                        onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={page >= totalPages - 1}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.pageBtnText, page >= totalPages - 1 && { color: colors.textSecondary }]}>
                                            {t('common.next', 'Next')}
                                        </Text>
                                        <Ionicons name="chevron-forward" size={14} color={page >= totalPages - 1 ? colors.textSecondary : colors.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 60 }} />
                </ScrollView>
            </ResponsiveContainer>
        </View>
    );
}

const createStyles = (colors: any, theme: 'light' | 'dark', isDesktop: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },

    header: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 56 : 24,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    screenTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
    branchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    branchName: { fontSize: 12, fontWeight: '600', color: colors.primary },
    headerMetaCount: { fontSize: 12, color: colors.textSecondary },

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
        backgroundColor: 'transparent',
    },
    subTabActive: {
        backgroundColor: `${colors.primary}15`,
    },
    subTabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    subTabTextActive: { color: colors.primary, fontWeight: '700' },

    scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 },

    filterPillsContainer: {
        gap: 8,
        paddingBottom: 14,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.6)' : '#FFFFFF',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
    },
    filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },

    ledgerContainer: {
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.75)' : '#FFFFFF',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
        borderWidth: 1,
        borderRadius: Layout.borderRadius.lg,
        overflow: 'hidden',
        ...Layout.shadows.small,
    },
    desktopTableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC',
        borderBottomWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : colors.border,
    },
    th: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textSecondary,
        letterSpacing: 0.5,
    },
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
    mobileRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    productText: { fontSize: 13, fontWeight: '700', color: colors.text },
    secondaryText: { fontSize: 12, color: colors.textSecondary },
    qtyText: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
    stockShiftText: { fontSize: 11, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
    notesText: { fontSize: 11, color: colors.textSecondary, fontStyle: 'italic', marginTop: 2 },
    dateText: { fontSize: 11, color: colors.textSecondary },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
    },
    typeBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

    paginationBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : colors.border,
    },
    paginationInfo: { fontSize: 12, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
    paginationActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
    },
    pageBtnDisabled: { opacity: 0.4 },
    pageBtnText: { fontSize: 12, fontWeight: '700', color: colors.text },
    pageNumberBadge: { paddingHorizontal: 8, paddingVertical: 4 },
    pageNumberText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, fontVariant: ['tabular-nums'] },

    emptyState: {
        paddingVertical: 48,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    emptySubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: 'center', maxWidth: 300 },
});
