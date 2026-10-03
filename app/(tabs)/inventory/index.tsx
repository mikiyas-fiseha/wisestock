import { AdjustStockModal } from '@/components/AdjustStockModal';
import { StockTransferModal } from '@/components/StockTransferModal';
import { AppButton } from '@/components/ui/AppButton';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Gradients, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { InventoryProduct, useInventoryStock } from '@/hooks/useInventory';
import { formatCurrency } from '@/lib/formatters';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';

const SUB_TABS = [
    { key: 'stock', label: 'inventory.stock_list', icon: 'layers-outline', activeIcon: 'layers' },
    { key: 'movements', label: 'inventory.movements', icon: 'swap-horizontal-outline', activeIcon: 'swap-horizontal' },
    { key: 'summary', label: 'inventory.summary', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
] as const;

type SubTab = typeof SUB_TABS[number]['key'];
type FilterStatus = 'all' | 'ok' | 'low' | 'out';

function getStatusConfig(colors: any, t: any) {
    return {
        ok: { label: t('inventory.in_stock', 'In Stock'), text: colors.success, bg: `${colors.success}18` },
        low: { label: t('inventory.low_stock', 'Low Stock'), text: colors.warning, bg: `${colors.warning}18` },
        out: { label: t('inventory.out_of_stock', 'Out of Stock'), text: colors.danger, bg: `${colors.danger}18` },
    };
}

export default function InventoryIndex() {
    const { colors, theme } = useTheme();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;
    const styles = React.useMemo(() => createStyles(colors, theme, isDesktop), [colors, theme, isDesktop]);
    const { t } = useTranslation();
    const router = useRouter();
    const { branch } = useAuth();

    const [activeTab, setActiveTab] = useState<SubTab>('stock');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
    const [adjustProduct, setAdjustProduct] = useState<InventoryProduct | null>(null);
    const [transferProduct, setTransferProduct] = useState<InventoryProduct | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const [page, setPage] = useState(0);
    const pageSize = 12;

    const { data = [], isLoading, refetch } = useInventoryStock(search, false);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    // Filter by status on client
    const filteredData = useMemo(() => {
        if (statusFilter === 'all') return data;
        return data.filter(p => p.status === statusFilter);
    }, [data, statusFilter]);

    useEffect(() => {
        setPage(0);
    }, [search, statusFilter]);

    const paginatedData = useMemo(() => {
        return filteredData.slice(page * pageSize, (page + 1) * pageSize);
    }, [filteredData, page, pageSize]);

    const stats = useMemo(() => ({
        total: data.length,
        ok: data.filter(p => p.status === 'ok').length,
        low: data.filter(p => p.status === 'low').length,
        out: data.filter(p => p.status === 'out').length,
        value: data.reduce((s, p) => s + (p.value || 0), 0),
    }), [data]);

    const handleSubTab = (tab: SubTab) => {
        if (tab === 'movements') router.push('/(tabs)/inventory/movements' as any);
        else if (tab === 'summary') router.push('/(tabs)/inventory/summary' as any);
        else setActiveTab('stock');
    };

    const statusConfig = getStatusConfig(colors, t);
    const totalPages = Math.ceil(filteredData.length / pageSize);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <ResponsiveContainer>
                {/* Header & Sub-tabs */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.screenTitle}>{t('inventory.stock_list', 'Inventory Stock')}</Text>
                            <View style={styles.branchRow}>
                                <Ionicons name="business-outline" size={13} color={colors.primary} />
                                <Text style={styles.branchName}>
                                    {branch ? branch.name : t('inventory.all_branches', 'All Branches')}
                                </Text>
                                <Text style={styles.headerMetaCount}>
                                    • {stats.total} {t('inventory.products', 'Products')}
                                </Text>
                            </View>
                        </View>

                        <AppButton
                            title={t('inventory.add_product', '+ New Product')}
                            onPress={() => router.push('/(tabs)/products/add' as any)}
                            size="sm"
                            icon={<Ionicons name="add" size={17} color="#FFFFFF" />}
                        />
                    </View>

                    {/* Modern Sub-tabs Bar */}
                    <View style={styles.subTabBar}>
                        {SUB_TABS.map(tab => {
                            const isActive = activeTab === tab.key;
                            return (
                                <Pressable
                                    key={tab.key}
                                    style={[styles.subTab, isActive && styles.subTabActive]}
                                    onPress={() => handleSubTab(tab.key)}
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
                    {/* KPI Stats Ribbon */}
                    <View style={styles.kpiGrid}>
                        <View style={styles.kpiCard}>
                            <View style={styles.kpiHeaderRow}>
                                <Text style={styles.kpiLabel}>{t('inventory.total_products', 'Total Products')}</Text>
                                <View style={[styles.kpiIconBox, { backgroundColor: `${colors.primary}15` }]}>
                                    <Ionicons name="cube-outline" size={15} color={colors.primary} />
                                </View>
                            </View>
                            <Text style={styles.kpiValue}>{stats.total}</Text>
                            <Text style={styles.kpiSub}>{stats.ok} {t('inventory.in_stock', 'in stock')}</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.kpiCard, statusFilter === 'low' && styles.kpiCardSelected]}
                            onPress={() => setStatusFilter(statusFilter === 'low' ? 'all' : 'low')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.kpiHeaderRow}>
                                <Text style={styles.kpiLabel}>{t('inventory.low_stock', 'Low Stock')}</Text>
                                <View style={[styles.kpiIconBox, { backgroundColor: `${colors.warning}18` }]}>
                                    <Ionicons name="warning-outline" size={15} color={colors.warning} />
                                </View>
                            </View>
                            <Text style={[styles.kpiValue, { color: colors.warning }]}>{stats.low}</Text>
                            <Text style={styles.kpiSub}>{stats.low > 0 ? 'Requires restock' : 'All levels healthy'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.kpiCard, statusFilter === 'out' && styles.kpiCardSelected]}
                            onPress={() => setStatusFilter(statusFilter === 'out' ? 'all' : 'out')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.kpiHeaderRow}>
                                <Text style={styles.kpiLabel}>{t('inventory.out_of_stock', 'Out of Stock')}</Text>
                                <View style={[styles.kpiIconBox, { backgroundColor: `${colors.danger}18` }]}>
                                    <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
                                </View>
                            </View>
                            <Text style={[styles.kpiValue, { color: colors.danger }]}>{stats.out}</Text>
                            <Text style={styles.kpiSub}>{stats.out > 0 ? 'Urgent reorder' : 'No items depleted'}</Text>
                        </TouchableOpacity>

                        <View style={styles.kpiCard}>
                            <View style={styles.kpiHeaderRow}>
                                <Text style={styles.kpiLabel}>{t('inventory.stock_value', 'Inventory Value')}</Text>
                                <View style={[styles.kpiIconBox, { backgroundColor: `${colors.success}18` }]}>
                                    <Ionicons name="cash-outline" size={15} color={colors.success} />
                                </View>
                            </View>
                            <Text style={[styles.kpiValue, { color: colors.text }]} numberOfLines={1}>
                                {formatCurrency(stats.value)}
                            </Text>
                            <Text style={styles.kpiSub}>{t('inventory.current_valuation', 'Current holding value')}</Text>
                        </View>
                    </View>

                    {/* Search & Filter Controls */}
                    <View style={styles.controlsRow}>
                        <View style={styles.searchBox}>
                            <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={t('common.search', 'Search products, SKU...') + '...'}
                                value={search}
                                onChangeText={setSearch}
                                placeholderTextColor={colors.textSecondary}
                            />
                            {search.length > 0 && (
                                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                                    <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                                </Pressable>
                            )}
                        </View>

                        {/* Status Filter Pills */}
                        <View style={styles.filterPills}>
                            {(['all', 'ok', 'low', 'out'] as FilterStatus[]).map(key => {
                                const isSelected = statusFilter === key;
                                const label =
                                    key === 'all' ? t('common.all', 'All') :
                                    key === 'ok' ? t('inventory.in_stock', 'In Stock') :
                                    key === 'low' ? t('inventory.low_stock', 'Low Stock') :
                                    t('inventory.out_of_stock', 'Depleted');

                                const count =
                                    key === 'all' ? stats.total :
                                    key === 'ok' ? stats.ok :
                                    key === 'low' ? stats.low :
                                    stats.out;

                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[styles.filterPill, isSelected && styles.filterPillActive]}
                                        onPress={() => setStatusFilter(key)}
                                        activeOpacity={0.7}
                                    >
                                        {key !== 'all' && (
                                            <View
                                                style={[
                                                    styles.filterDot,
                                                    {
                                                        backgroundColor:
                                                            key === 'ok' ? colors.success :
                                                            key === 'low' ? colors.warning :
                                                            colors.danger,
                                                    },
                                                ]}
                                            />
                                        )}
                                        <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                                            {label}
                                        </Text>
                                        <View style={[styles.filterCountBadge, isSelected && styles.filterCountBadgeActive]}>
                                            <Text style={[styles.filterCountText, isSelected && styles.filterCountTextActive]}>
                                                {count}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* UNIFIED LEDGER TABLE CONTAINER (No individual cards) */}
                    <View style={styles.ledgerContainer}>
                        {isLoading ? (
                            <View style={{ padding: 16, gap: 14 }}>
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <Skeleton key={i} height={48} borderRadius={10} />
                                ))}
                            </View>
                        ) : filteredData.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconCircle}>
                                    <Ionicons name="cube-outline" size={36} color={colors.textSecondary} />
                                </View>
                                <Text style={styles.emptyTitle}>{t('inventory.empty_inventory', 'No products found')}</Text>
                                <Text style={styles.emptySubtitle}>
                                    {search ? t('common.no_results_found', 'No items matched your search query') : t('inventory.add_to_see', 'Add products to start tracking stock')}
                                </Text>
                                {search || statusFilter !== 'all' ? (
                                    <AppButton
                                        title={t('common.clear_filters', 'Reset Filters')}
                                        onPress={() => { setSearch(''); setStatusFilter('all'); }}
                                        style={{ marginTop: 16 }}
                                        size="sm"
                                    />
                                ) : null}
                            </View>
                        ) : isDesktop ? (
                            /* Desktop High-Density Table */
                            <View>
                                <View style={styles.desktopTableHeader}>
                                    <Text style={[styles.th, { flex: 3.2 }]}>{t('common.product', 'PRODUCT / SKU')}</Text>
                                    <Text style={[styles.th, { width: 70, textAlign: 'center' }]}>{t('inventory.unit', 'UNIT')}</Text>
                                    <Text style={[styles.th, { width: 100, textAlign: 'center' }]}>{t('inventory.stock', 'STOCK')}</Text>
                                    <Text style={[styles.th, { width: 80, textAlign: 'center' }]}>{t('common.min', 'MIN')}</Text>
                                    <Text style={[styles.th, { width: 120, textAlign: 'right' }]}>{t('inventory.stock_value', 'VALUATION')}</Text>
                                    <Text style={[styles.th, { width: 110, textAlign: 'center' }]}>{t('common.status', 'STATUS')}</Text>
                                    <Text style={[styles.th, { width: 150, textAlign: 'right' }]}>{t('common.actions', 'ACTIONS')}</Text>
                                </View>

                                {paginatedData.map((item, index) => {
                                    const isLast = index === paginatedData.length - 1;
                                    const cfg = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.ok;

                                    return (
                                        <DesktopTableRow
                                            key={`${item.id}-${item.branch_id}`}
                                            item={item}
                                            cfg={cfg}
                                            isLast={isLast}
                                            onPress={() => router.push(`/(tabs)/products/${item.id}` as any)}
                                            onAdjust={() => setAdjustProduct(item)}
                                            onTransfer={() => setTransferProduct(item)}
                                            colors={colors}
                                            theme={theme}
                                            t={t}
                                        />
                                    );
                                })}
                            </View>
                        ) : (
                            /* Mobile Unified Ledger Rows (No separate floating cards!) */
                            <View>
                                {paginatedData.map((item, index) => {
                                    const isLast = index === paginatedData.length - 1;
                                    const cfg = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.ok;

                                    return (
                                        <MobileLedgerRow
                                            key={`${item.id}-${item.branch_id}`}
                                            item={item}
                                            cfg={cfg}
                                            isLast={isLast}
                                            onPress={() => router.push(`/(tabs)/products/${item.id}` as any)}
                                            onAdjust={() => setAdjustProduct(item)}
                                            onTransfer={() => setTransferProduct(item)}
                                            colors={colors}
                                            theme={theme}
                                            t={t}
                                        />
                                    );
                                })}
                            </View>
                        )}

                        {/* Table Summary Footer */}
                        {filteredData.length > 0 && (
                            <View style={styles.tableFooterRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.tableFooterLabel}>
                                        {t('common.total', 'Total')}: {filteredData.length} {t('inventory.products', 'products').toLowerCase()}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={styles.tableFooterValLabel}>{t('inventory.total_value', 'Total Value')}:</Text>
                                    <Text style={styles.tableFooterValue}>
                                        {formatCurrency(filteredData.reduce((acc, curr) => acc + (curr.value || 0), 0))}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                            <View style={styles.paginationBar}>
                                <Text style={styles.paginationInfo}>
                                    {t('common.showing', 'Showing')} {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredData.length)} {t('common.of', 'of')} {filteredData.length}
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

            {/* Modals */}
            {adjustProduct && (
                <AdjustStockModal
                    visible={!!adjustProduct}
                    productId={adjustProduct.id}
                    productName={adjustProduct.name}
                    currentStock={adjustProduct.stock}
                    unit={adjustProduct.unit || t('common.units', 'pcs')}
                    onClose={() => setAdjustProduct(null)}
                />
            )}
            {transferProduct && (
                <StockTransferModal
                    visible={!!transferProduct}
                    productId={transferProduct.id}
                    productName={transferProduct.name}
                    onClose={() => setTransferProduct(null)}
                />
            )}
        </View>
    );
}

// ─── Desktop Table Row ────────────────────────────────────────────────────────
function DesktopTableRow({ item, cfg, isLast, onPress, onAdjust, onTransfer, colors, theme, t }: any) {
    const [hovered, setHovered] = useState(false);

    return (
        <Pressable
            style={[
                desktopRowStyles.tr,
                !isLast && desktopRowStyles.trBorder,
                hovered && { backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)' },
            ]}
            // @ts-ignore Web hover
            onMouseEnter={() => setHovered(true)}
            // @ts-ignore Web hover
            onMouseLeave={() => setHovered(false)}
            onPress={onPress}
        >
            {/* Product & SKU */}
            <View style={{ flex: 3.2, paddingRight: 10 }}>
                <Text style={desktopRowStyles.productName} numberOfLines={1}>{item.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Text style={desktopRowStyles.skuText}>
                        {item.primary_sku ? `SKU: ${item.primary_sku}` : t('inventory.no_sku', 'No SKU')}
                    </Text>
                </View>
            </View>

            {/* Unit */}
            <View style={{ width: 70, alignItems: 'center' }}>
                <Text style={desktopRowStyles.unitText}>{item.unit || 'pcs'}</Text>
            </View>

            {/* Stock Level Badge */}
            <View style={{ width: 100, alignItems: 'center' }}>
                <View style={[desktopRowStyles.stockBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[desktopRowStyles.stockBadgeText, { color: cfg.text }]}>{item.stock}</Text>
                </View>
            </View>

            {/* Min Stock */}
            <View style={{ width: 80, alignItems: 'center' }}>
                <Text style={desktopRowStyles.minStockText}>{item.min_stock_level ?? 0}</Text>
            </View>

            {/* Valuation */}
            <View style={{ width: 120, alignItems: 'flex-end' }}>
                <Text style={desktopRowStyles.valueText}>{formatCurrency(item.value)}</Text>
            </View>

            {/* Status Pill */}
            <View style={{ width: 110, alignItems: 'center' }}>
                <View style={[desktopRowStyles.statusPill, { backgroundColor: cfg.bg }]}>
                    <View style={[desktopRowStyles.statusDot, { backgroundColor: cfg.text }]} />
                    <Text style={[desktopRowStyles.statusPillText, { color: cfg.text }]}>{cfg.label}</Text>
                </View>
            </View>

            {/* Actions */}
            <View style={{ width: 150, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                <TouchableOpacity
                    style={[desktopRowStyles.actionBtn, { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}10` }]}
                    onPress={(e) => { e.stopPropagation?.(); onAdjust(); }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="pencil" size={13} color={colors.primary} />
                    <Text style={[desktopRowStyles.actionBtnText, { color: colors.primary }]}>{t('inventory.adjust', 'Adjust')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[desktopRowStyles.actionBtn, { borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : colors.border }]}
                    onPress={(e) => { e.stopPropagation?.(); onTransfer(); }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="swap-horizontal" size={13} color={colors.textSecondary} />
                    <Text style={[desktopRowStyles.actionBtnText, { color: colors.textSecondary }]}>{t('inventory.transfer', 'Transfer')}</Text>
                </TouchableOpacity>
            </View>
        </Pressable>
    );
}

const desktopRowStyles = StyleSheet.create({
    tr: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        cursor: 'pointer' as any,
    },
    trBorder: {
        borderBottomWidth: 1,
        borderColor: 'rgba(150, 150, 150, 0.08)',
    },
    productName: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
    skuText: { fontSize: 11, color: '#94A3B8', fontVariant: ['tabular-nums'] },
    unitText: { fontSize: 12, color: '#94A3B8', textTransform: 'lowercase' },
    stockBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
        minWidth: 42,
        alignItems: 'center',
    },
    stockBadgeText: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
    minStockText: { fontSize: 12, color: '#94A3B8', fontVariant: ['tabular-nums'] },
    valueText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusDot: { width: 5, height: 5, borderRadius: 2.5 },
    statusPillText: { fontSize: 11, fontWeight: '700' },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
    },
    actionBtnText: { fontSize: 11, fontWeight: '700' },
});

// ─── Mobile Ledger Row (Inside Unified Container) ─────────────────────────────
function MobileLedgerRow({ item, cfg, isLast, onPress, onAdjust, onTransfer, colors, theme, t }: any) {
    return (
        <Pressable
            style={[
                mobileRowStyles.row,
                !isLast && mobileRowStyles.rowBorder,
            ]}
            onPress={onPress}
        >
            <View style={{ flex: 1, paddingRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[mobileRowStyles.statusDot, { backgroundColor: cfg.text }]} />
                    <Text style={[mobileRowStyles.productName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={[mobileRowStyles.skuText, { color: colors.textSecondary }]}>
                        {item.primary_sku ? `SKU: ${item.primary_sku}` : 'No SKU'}
                    </Text>
                    <Text style={[mobileRowStyles.skuText, { color: colors.textSecondary }]}>•</Text>
                    <Text style={[mobileRowStyles.skuText, { color: colors.textSecondary }]}>
                        {formatCurrency(item.value)}
                    </Text>
                </View>
            </View>

            <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[mobileRowStyles.stockBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[mobileRowStyles.stockBadgeText, { color: cfg.text }]}>
                            {item.stock} {item.unit || 'pcs'}
                        </Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity
                        style={[mobileRowStyles.iconBtn, { backgroundColor: `${colors.primary}12` }]}
                        onPress={(e) => { e.stopPropagation?.(); onAdjust(); }}
                    >
                        <Ionicons name="pencil" size={13} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[mobileRowStyles.iconBtn, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                        onPress={(e) => { e.stopPropagation?.(); onTransfer(); }}
                    >
                        <Ionicons name="swap-horizontal" size={13} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>
        </Pressable>
    );
}

const mobileRowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderColor: 'rgba(150, 150, 150, 0.08)',
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    productName: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
    skuText: { fontSize: 11, fontVariant: ['tabular-nums'] },
    stockBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    stockBadgeText: { fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
    iconBtn: {
        width: 28,
        height: 28,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

// ─── Main Stylesheet ─────────────────────────────────────────────────────────
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
        gap: 14,
        marginBottom: 16,
    },
    screenTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
    branchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    branchName: { fontSize: 12, fontWeight: '600', color: colors.primary },
    headerMetaCount: { fontSize: 12, color: colors.textSecondary },

    // Sub-tab Pill bar
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

    // KPI Ribbon
    kpiGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    kpiCard: {
        flex: 1,
        minWidth: isDesktop ? 180 : 150,
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.7)' : '#FFFFFF',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
        borderWidth: 1,
        borderRadius: Layout.borderRadius.lg,
        padding: 16,
        ...Layout.shadows.small,
    },
    kpiCardSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}08`,
    },
    kpiHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    kpiIconBox: {
        width: 28,
        height: 28,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
    },
    kpiLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    kpiValue: {
        fontSize: 22,
        fontWeight: '900',
        color: colors.text,
        marginTop: 8,
        letterSpacing: -0.5,
        fontVariant: ['tabular-nums'],
    },
    kpiSub: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 4,
    },

    // Controls Row (Search & Filter Pills)
    controlsRow: {
        flexDirection: isDesktop ? 'row' : 'column',
        alignItems: isDesktop ? 'center' : 'stretch',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.7)' : '#FFFFFF',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
        borderWidth: 1,
        borderRadius: Layout.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'web' ? 8 : 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: colors.text,
        // @ts-ignore
        outlineWidth: 0,
    },
    filterPills: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: Layout.borderRadius.sm,
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.6)' : '#FFFFFF',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
    },
    filterPillActive: {
        backgroundColor: `${colors.primary}15`,
        borderColor: `${colors.primary}60`,
    },
    filterDot: { width: 6, height: 6, borderRadius: 3 },
    filterPillText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    filterPillTextActive: { color: colors.primary, fontWeight: '700' },
    filterCountBadge: {
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
        marginLeft: 2,
    },
    filterCountBadgeActive: {
        backgroundColor: `${colors.primary}25`,
    },
    filterCountText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, fontVariant: ['tabular-nums'] },
    filterCountTextActive: { color: colors.primary },

    // Unified Ledger Container (Single border, no separate cards)
    ledgerContainer: {
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.75)' : '#FFFFFF',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
        borderWidth: 1,
        borderRadius: Layout.borderRadius.lg,
        overflow: 'hidden',
        ...Layout.shadows.small,
    },

    // Desktop Table Header
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

    // Table Summary Footer
    tableFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC',
        borderTopWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : colors.border,
    },
    tableFooterLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    tableFooterValLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    tableFooterValue: { fontSize: 14, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },

    // Pagination Bar
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
    pageNumberBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    pageNumberText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, fontVariant: ['tabular-nums'] },

    // Empty State
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
