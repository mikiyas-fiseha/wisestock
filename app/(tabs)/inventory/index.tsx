import { AdjustStockModal } from '@/components/AdjustStockModal';
import { StockTransferModal } from '@/components/StockTransferModal';

import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { InventoryProduct, useInventoryStock } from '@/hooks/useInventory';
import { formatCurrency } from '@/lib/formatters';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: {
        backgroundColor: colors.card + 'E0',
        paddingTop: 0,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    screenTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
    screenSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    subTabBar: {
        flexDirection: 'row',
        paddingHorizontal: 20,
    },
    subTab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginRight: 4,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    subTabActive: {
        borderBottomColor: colors.primary,
    },
    subTabText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
    subTabTextActive: { color: colors.primary, fontWeight: '700' },
    kpiStrip: {
        flexDirection: 'row',
        backgroundColor: colors.card + 'E0',
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    kpiItem: { flex: 1, alignItems: 'center' },
    kpiValue: { fontSize: 18, fontWeight: '700', color: colors.text },
    kpiLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    kpiDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.card + 'E0',
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,

    },
    searchInput: { flex: 1, fontSize: 14, color: colors.text, outlineWidth: 0 } as any,
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,

        backgroundColor: 'transparent',
    },
    filterBtnActive: {
        backgroundColor: colors.warning + '15',
        borderColor: colors.warning,
    },
    filterBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
    emptySubtitle: { fontSize: 14, color: colors.textSecondary },
    // Mobile card
    card: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 16,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
    productName: { fontSize: 15, fontWeight: '600', color: colors.text },
    productSku: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    productMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    metaChip: {
        fontSize: 11,
        color: colors.textSecondary,
        backgroundColor: 'transparent',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
    },
    cardRight: { alignItems: 'center', gap: 4, minWidth: 60 },
    stockBadge: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        minWidth: 42,
        alignItems: 'center',
    },
    stockBadgeText: { fontSize: 16, fontWeight: '700' },
    statusPill: {
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    statusPillText: { fontSize: 10, fontWeight: '700' },
    actionRow: { flexDirection: 'row', gap: 4 },
    miniBtn: {
        width: 26,
        height: 26,
        borderRadius: 6,

        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Web table
    thead: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'transparent',
    },
    th: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 },
    tr: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        // @ts-ignore
        cursor: isWeb ? 'pointer' : undefined,
    },
    trEven: { backgroundColor: colors.card + 'E0' },
    trHovered: { backgroundColor: colors.primary + '10' },
    td: { justifyContent: 'center' },
    tdText: { fontSize: 13, color: colors.text },
    totalRow: {
        flexDirection: 'row',
        paddingVertical: 14,
        paddingHorizontal: 20,
        backgroundColor: colors.card,
        borderTopWidth: 2,
        borderTopColor: colors.border,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
    },
    totalCell: {
        fontWeight: '700',
        color: colors.text,
        fontSize: 14,
    },

    // Pagination
    paginationRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 16,
    },
    paginationRowMobile: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 16,
    },
    pageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: colors.primary + '15',
    },
    pageBtnDisabled: {
        backgroundColor: colors.border + '50',
    },
    pageBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    pageInfoText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: colors.primary + '15',
    },
    actionBtnText: { fontSize: 11, fontWeight: '600', color: colors.primary },
});

const isWeb = Platform.OS === 'web';

// ─── Sub-tab header ──────────────────────────────────────────────────────────
const SUB_TABS = [
    { key: 'stock', label: 'inventory.stock_list', icon: 'archive' },
    { key: 'movements', label: 'inventory.movements', icon: 'exchange' },
    { key: 'summary', label: 'inventory.summary', icon: 'bar-chart' },
] as const;

type SubTab = typeof SUB_TABS[number]['key'];

function getStatusConfig(colors: any, t: any) {
    return {
        ok: { label: t('inventory.in_stock'), text: colors.success, bg: colors.success + '15' },
        low: { label: t('inventory.low_stock'), text: colors.warning, bg: colors.warning + '15' },
        out: { label: t('inventory.out_of_stock'), text: colors.danger, bg: colors.danger + '15' },
    };
}

function ProductCard({ item, onPress, onAdjust, onTransfer }: any) {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const statusConfig = getStatusConfig(colors, t);
    const cfg = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.ok;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.cardLeft}>
                <View style={[styles.statusDot, { backgroundColor: cfg.text }]} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.productSku}>{item.primary_sku || t('inventory.no_sku')}</Text>

                    <View style={styles.productMeta}>
                        <Text style={styles.metaChip}>{item.stock} {item.unit || t('common.units')}</Text>
                        <Text style={styles.metaChip}>{t('inventory.min_stock')}: {item.min_stock_level}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.cardRight}>
                <View style={[styles.stockBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.stockBadgeText, { color: cfg.text }]}>{item.stock}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusPillText, { color: cfg.text }]}>{cfg.label}</Text>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.miniBtn} onPress={onAdjust}>
                        <FontAwesome name="pencil" size={12} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.miniBtn} onPress={onTransfer}>
                        <FontAwesome name="exchange" size={12} color={colors.secondary || '#8B5CF6'} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}

function WebTableRow({ item, index, onPress, onAdjust, onTransfer }: any) {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [hovered, setHovered] = useState(false);
    const statusConfig = getStatusConfig(colors, t);
    const cfg = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.ok;

    return (
        <Pressable
            style={[
                styles.tr,
                index % 2 === 0 && styles.trEven,
                hovered && styles.trHovered,
            ]}
            // @ts-ignore
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onPress={onPress}
        >
            <Text style={[styles.tdText, { flex: 3 }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.tdText, { flex: 2 }]} numberOfLines={1}>{item.primary_sku || '—'}</Text>
            <Text style={[styles.tdText, { flex: 1, textAlign: 'center' }]}>{item.unit || '—'}</Text>
            <View style={[styles.td, { flex: 1, alignItems: 'center' }]}>
                <View style={[styles.stockBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.stockBadgeText, { color: cfg.text }]}>{item.stock}</Text>
                </View>
            </View>
            <Text style={[styles.tdText, { flex: 1, textAlign: 'center' }]}>{item.min_stock_level}</Text>
            <Text style={[styles.tdText, { flex: 2, textAlign: 'right' }]}>
                {formatCurrency(item.value)}
            </Text>
            <View style={[styles.td, { flex: 1, alignItems: 'center' }]}>
                <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusPillText, { color: cfg.text }]}>{cfg.label}</Text>
                </View>
            </View>
            <View style={[styles.td, { flex: 1.5, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }]}>
                <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation?.(); onAdjust(); }}>
                    <FontAwesome name="pencil" size={12} color={colors.primary} />
                    <Text style={styles.actionBtnText}>{t('inventory.adjust')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.secondary || '#8B5CF6' }]} onPress={(e) => { e.stopPropagation?.(); onTransfer(); }}>
                    <FontAwesome name="exchange" size={12} color={colors.secondary || '#8B5CF6'} />
                    <Text style={[styles.actionBtnText, { color: colors.secondary || '#8B5CF6' }]}>{t('inventory.transfer')}</Text>
                </TouchableOpacity>
            </View>
        </Pressable >
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function InventoryIndex() {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { branch } = useAuth();
    const [activeTab, setActiveTab] = useState<SubTab>('stock');
    const [search, setSearch] = useState('');
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [adjustProduct, setAdjustProduct] = useState<InventoryProduct | null>(null);
    const [transferProduct, setTransferProduct] = useState<InventoryProduct | null>(null);

    const [page, setPage] = useState(0);
    const pageSize = 10;

    const { data = [], isLoading, refetch } = useInventoryStock(search, lowStockOnly);

    useEffect(() => {
        setPage(0);
    }, [search, lowStockOnly]);

    const paginatedData = useMemo(() => {
        return data.slice(page * pageSize, (page + 1) * pageSize);
    }, [data, page]);

    const stats = useMemo(() => ({
        total: data.length,
        low: data.filter(p => p.status === 'low').length,
        out: data.filter(p => p.status === 'out').length,
        value: data.reduce((s, p) => s + p.value, 0),
    }), [data]);

    const handleSubTab = (tab: SubTab) => {
        if (tab === 'movements') router.push('/(tabs)/inventory/movements' as any);
        else if (tab === 'summary') router.push('/(tabs)/inventory/summary' as any);
        else setActiveTab('stock');
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            {/* ── Header ── */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.screenTitle}>{t('inventory.stock_list')}</Text>
                        <Text style={styles.screenSubtitle}>
                            {branch ? branch.name : t('inventory.all_branches')}
                        </Text>
                    </View>
                </View>

                {/* Sub-tabs */}
                <View style={styles.subTabBar}>
                    {SUB_TABS.map(tab => (
                        <Pressable
                            key={tab.key}
                            style={[styles.subTab, activeTab === tab.key && styles.subTabActive]}
                            onPress={() => handleSubTab(tab.key)}
                        >
                            <FontAwesome
                                name={tab.icon as any}
                                size={13}
                                color={activeTab === tab.key ? colors.primary : colors.textSecondary}
                            />
                            <Text style={[
                                styles.subTabText,
                                activeTab === tab.key && styles.subTabTextActive,
                            ]}>
                                {t(tab.label)}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* ── KPI Strip ── */}
            <View style={styles.kpiStrip}>
                <View style={styles.kpiItem}>
                    <Text style={styles.kpiValue}>{stats.total}</Text>
                    <Text style={styles.kpiLabel}>{t('inventory.products')}</Text>
                </View>
                <View style={styles.kpiDivider} />
                <View style={styles.kpiItem}>
                    <Text style={[styles.kpiValue, { color: colors.warning }]}>{stats.low}</Text>
                    <Text style={styles.kpiLabel}>{t('inventory.low_stock')}</Text>
                </View>
                <View style={styles.kpiDivider} />
                <View style={styles.kpiItem}>
                    <Text style={[styles.kpiValue, { color: colors.danger }]}>{stats.out}</Text>
                    <Text style={styles.kpiLabel}>{t('inventory.out_of_stock')}</Text>
                </View>
                <View style={styles.kpiDivider} />
                <View style={styles.kpiItem}>
                    <Text style={[styles.kpiValue, { color: colors.primary }]} numberOfLines={1}>
                        {formatCurrency(stats.value)}
                    </Text>
                    <Text style={styles.kpiLabel}>{t('inventory.total_value')}</Text>
                </View>
            </View>

            {/* ── Search + Filter Bar ── */}
            <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                    <FontAwesome name="search" size={14} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('common.search') + "..."}
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor={colors.textSecondary}
                    />
                    {search.length > 0 && (
                        <Pressable onPress={() => setSearch('')}>
                            <FontAwesome name="times-circle" size={14} color={colors.textSecondary} />
                        </Pressable>
                    )}
                </View>
                <Pressable
                    style={[styles.filterBtn, lowStockOnly && styles.filterBtnActive]}
                    onPress={() => setLowStockOnly(v => !v)}
                >
                    <FontAwesome
                        name="exclamation-triangle"
                        size={13}
                        color={lowStockOnly ? colors.warning : colors.textSecondary}
                    />
                    {!isWeb && (
                        <Text style={[styles.filterBtnText, lowStockOnly && { color: colors.warning }]}>
                            {t('common.stock_low')}
                        </Text>
                    )}
                </Pressable>
            </View>

            {/* ── Content ── */}
            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : data.length === 0 ? (
                <View style={styles.center}>
                    <FontAwesome name="archive" size={48} color={colors.border} />
                    <Text style={styles.emptyTitle}>{t('inventory.empty_inventory')}</Text>
                    <Text style={styles.emptySubtitle}>
                        {lowStockOnly ? t('inventory.no_low_stock') : t('inventory.add_to_see')}
                    </Text>
                </View>
            ) : isWeb ? (
                /* ── Web Table ── */
                <ScrollView style={{ flex: 1 }}>
                    {/* Table Header */}
                    <View style={styles.thead}>
                        <Text style={[styles.th, { flex: 3 }]}>{t('inventory.products')}</Text>
                        <Text style={[styles.th, { flex: 2 }]}>{t('inventory.sku')}</Text>
                        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>{t('inventory.unit')}</Text>
                        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>{t('common.total')}</Text>
                        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>{t('common.min')}</Text>
                        <Text style={[styles.th, { flex: 2, textAlign: 'right' }]}>{t('inventory.stock_value')}</Text>
                        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>{t('common.status')}</Text>
                        <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>{t('common.actions')}</Text>
                    </View>
                    {paginatedData.map((item, index) => (
                        <WebTableRow
                            key={`${item.id}-${item.branch_id}`}
                            item={item}
                            index={index}
                            onPress={() => router.push(`/(tabs)/products/${item.id}` as any)}
                            onAdjust={() => setAdjustProduct(item)}
                            onTransfer={() => setTransferProduct(item)}
                        />
                    ))}
                    {/* Pagination Controls */}
                    {data.length > pageSize && (
                        <View style={styles.paginationRow}>
                            <Pressable
                                style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
                                onPress={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                            >
                                <FontAwesome name="chevron-left" size={12} color={page === 0 ? colors.textSecondary : colors.primary} />
                                <Text style={[styles.pageBtnText, page === 0 && { color: colors.textSecondary }]}>{t('common.prev')}</Text>
                            </Pressable>
                            <Text style={styles.pageInfoText}>
                                {t('common.page_of', { current: page + 1, total: Math.ceil(data.length / pageSize) })}
                            </Text>
                            <Pressable
                                style={[styles.pageBtn, (page + 1) * pageSize >= data.length && styles.pageBtnDisabled]}
                                onPress={() => setPage(p => p + 1)}
                                disabled={(page + 1) * pageSize >= data.length}
                            >
                                <Text style={[styles.pageBtnText, (page + 1) * pageSize >= data.length && { color: colors.textSecondary }]}>{t('common.next')}</Text>
                                <FontAwesome name="chevron-right" size={12} color={(page + 1) * pageSize >= data.length ? colors.textSecondary : colors.primary} />
                            </Pressable>
                        </View>
                    )}
                    {/* Total row */}
                    <View style={styles.totalRow}>
                        <Text style={[styles.totalCell, { flex: 3 }]}>
                            {t('common.total')} ({data.length} {t('inventory.products').toLowerCase()})
                        </Text>
                        <View style={{ flex: 2 + 1 + 1 + 1 }} />
                        <Text style={[styles.totalCell, { flex: 2, textAlign: 'right' }]}>
                            {formatCurrency(stats.value)}
                        </Text>
                        <View style={{ flex: 2.5 }} />
                    </View>
                </ScrollView>
            ) : (
                /* ── Mobile List ── */
                <FlatList
                    data={paginatedData}
                    keyExtractor={item => `${item.id}-${item.branch_id}`}
                    renderItem={({ item }) => (
                        <ProductCard
                            item={item}
                            onPress={() => router.push(`/(tabs)/products/${item.id}` as any)}
                            onAdjust={() => setAdjustProduct(item)}
                            onTransfer={() => setTransferProduct(item)}
                        />
                    )}
                    contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
                    onRefresh={refetch}
                    refreshing={isLoading}
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                    ListFooterComponent={() => data.length > pageSize ? (
                        <View style={styles.paginationRowMobile}>
                            <Pressable
                                style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
                                onPress={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                            >
                                <FontAwesome name="chevron-left" size={12} color={page === 0 ? colors.textSecondary : colors.primary} />
                                <Text style={[styles.pageBtnText, page === 0 && { color: colors.textSecondary }]}>{t('common.prev')}</Text>
                            </Pressable>
                            <Text style={styles.pageInfoText}>
                                {page + 1} / {Math.ceil(data.length / pageSize)}
                            </Text>
                            <Pressable
                                style={[styles.pageBtn, (page + 1) * pageSize >= data.length && styles.pageBtnDisabled]}
                                onPress={() => setPage(p => p + 1)}
                                disabled={(page + 1) * pageSize >= data.length}
                            >
                                <Text style={[styles.pageBtnText, (page + 1) * pageSize >= data.length && { color: colors.textSecondary }]}>{t('common.next')}</Text>
                                <FontAwesome name="chevron-right" size={12} color={(page + 1) * pageSize >= data.length ? colors.textSecondary : colors.primary} />
                            </Pressable>
                        </View>
                    ) : null}
                />
            )}

            {/* ── Modals ── */}
            {adjustProduct && (
                <AdjustStockModal
                    visible={!!adjustProduct}
                    productId={adjustProduct.id}
                    productName={adjustProduct.name}
                    currentStock={adjustProduct.stock}
                    unit={adjustProduct.unit || t('common.units')}
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

// ─── Styles ──────────────────────────────────────────────────────────────────
