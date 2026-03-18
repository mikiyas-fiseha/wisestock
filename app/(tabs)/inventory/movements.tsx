
import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { MovementFilters, useInventoryMovements } from '@/hooks/useInventory';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const isWeb = Platform.OS === 'web';

// ─── Movement type config ─────────────────────────────────────────────────────
type MovementType = 'all' | 'purchase' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'customer_return' | 'supplier_return';

function getMovementTypes(colors: any) {
    return [
        { key: 'all', label: 'All', icon: 'list', color: colors.textSecondary, bg: colors.border },
        { key: 'purchase', label: 'Purchase', icon: 'shopping-bag', color: colors.success, bg: colors.success + '15' },
        { key: 'sale', label: 'Sale', icon: 'shopping-cart', color: colors.primary, bg: colors.primary + '15' },
        { key: 'adjustment', label: 'Adjust', icon: 'pencil', color: colors.warning, bg: colors.warning + '15' },
        { key: 'transfer_in', label: 'Transfer In', icon: 'arrow-down', color: colors.secondary || '#8B5CF6', bg: (colors.secondary || '#8B5CF6') + '15' },
        { key: 'transfer_out', label: 'Transfer Out', icon: 'arrow-up', color: '#EC4899', bg: '#EC489915' },
        { key: 'customer_return', label: 'Cust Return', icon: 'undo', color: '#06B6D4', bg: '#06B6D415' },
        { key: 'supplier_return', label: 'Sup Return', icon: 'reply', color: '#F97316', bg: '#F9731615' },
    ] as const;
}

const getTypeConfig = (types: any, type: string) =>
    types.find((t: any) => t.key === type) ?? types[0];

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

function MovementCard({ item }: { item: any }) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const types = getMovementTypes(colors);
    const cfg = getTypeConfig(types, item.type);
    const isPositive = item.quantity > 0;

    return (
        <View style={styles.card}>
            <View style={[styles.typeIcon, { backgroundColor: cfg.bg }]}>
                <FontAwesome name={cfg.icon as any} size={16} color={cfg.color} />
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={styles.productName} numberOfLines={1}>{item.product_name}</Text>
                    <Text style={[styles.qtyBadge, { color: isPositive ? colors.success : colors.danger }]}>
                        {isPositive ? '+' : ''}{item.quantity}
                    </Text>
                </View>
                <View style={styles.metaRow}>
                    <View style={[styles.typePill, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.typePillText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.metaText}>{item.branch_name || 'All Branches'}</Text>
                </View>
                {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
                <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
            </View>
        </View>
    );
}

function WebMovementRow({ item, index }: { item: any, index: number }) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const types = getMovementTypes(colors);
    const cfg = getTypeConfig(types, item.type);
    const isPositive = item.quantity > 0;

    return (
        <View style={[styles.tr, index % 2 === 0 && styles.trEven]}>
            <View style={[styles.td, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <View style={[styles.typeIconSm, { backgroundColor: cfg.bg }]}>
                    <FontAwesome name={cfg.icon as any} size={11} color={cfg.color} />
                </View>
                <View style={[styles.typePill, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.typePillText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
            </View>
            <Text style={[styles.tdText, { flex: 3 }]} numberOfLines={1}>{item.product_name}</Text>
            <Text style={[styles.tdText, { flex: 2 }]} numberOfLines={1}>{item.branch_name || '—'}</Text>
            <Text style={[styles.tdText, {
                flex: 1, textAlign: 'center', fontWeight: '700',
                color: isPositive ? colors.success : colors.danger
            }]}>
                {isPositive ? '+' : ''}{item.quantity}
            </Text>
            <Text style={[styles.tdText, { flex: 1, textAlign: 'center', color: colors.textSecondary }]}>
                {item.previous_stock} → {item.new_stock}
            </Text>
            <Text style={[styles.tdText, { flex: 2 }]} numberOfLines={1}>{item.notes || '—'}</Text>
            <Text style={[styles.tdText, { flex: 2, color: colors.textSecondary }]}>{formatDate(item.created_at)}</Text>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MovementsScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { branch } = useAuth();
    const params = useLocalSearchParams<{ productId?: string }>();
    const types = getMovementTypes(colors);
    const MOVEMENT_TYPES = types;
    const [activeType, setActiveType] = useState<MovementType>('all');
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 50;

    const filters: MovementFilters = {
        type: activeType === 'all' ? undefined : activeType,
        branchId: branch?.id || null,
        productId: params.productId,
        page,
        pageSize: PAGE_SIZE,
    };

    const { data: result, isLoading } = useInventoryMovements(filters);
    const movements = result?.data || [];
    const totalCount = result?.count || 0;

    const SUB_TABS = [
        { key: 'stock', label: 'Stock', icon: 'archive' },
        { key: 'movements', label: 'Movements', icon: 'exchange' },
        { key: 'summary', label: 'Summary', icon: 'bar-chart' },
    ] as const;

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Pressable style={styles.backBtn} onPress={() => router.push('/(tabs)/inventory' as any)}>
                        <FontAwesome name="chevron-left" size={14} color={colors.primary} />
                    </Pressable>
                    <View>
                        <Text style={styles.screenTitle}>Movements</Text>
                        <Text style={styles.screenSubtitle}>
                            {totalCount} records
                            {branch ? ` · ${branch.name}` : ' · All Branches'}
                        </Text>
                    </View>
                </View>

                {/* Sub-tabs */}
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
                                <FontAwesome
                                    name={tab.icon as any}
                                    size={13}
                                    color={isActive ? colors.primary : '#94A3B8'}
                                />
                                <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                                    {tab.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            {/* Type Filter Chips */}
            <View style={styles.filterContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterBar}
                    contentContainerStyle={styles.filterContent}
                >
                    {MOVEMENT_TYPES.map(t => (
                        <Pressable
                            key={t.key}
                            style={[
                                styles.chip,
                                activeType === t.key && { backgroundColor: t.bg, borderColor: t.color },
                            ]}
                            onPress={() => { setActiveType(t.key); setPage(0); }}
                        >
                            <FontAwesome name={t.icon as any} size={11} color={activeType === t.key ? t.color : colors.textSecondary} />
                            <Text style={[styles.chipText, activeType === t.key && { color: t.color, fontWeight: '700' }]}>
                                {t.label}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            {/* Content */}
            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : movements.length === 0 ? (
                <View style={styles.center}>
                    <FontAwesome name="exchange" size={48} color={colors.border} />
                    <Text style={styles.emptyTitle}>No movements</Text>
                    <Text style={styles.emptySubtitle}>No stock changes recorded yet</Text>
                </View>
            ) : isWeb ? (
                <ScrollView style={{ flex: 1 }}>
                    <View style={styles.thead}>
                        <Text style={[styles.th, { flex: 2 }]}>Type</Text>
                        <Text style={[styles.th, { flex: 3 }]}>Product</Text>
                        <Text style={[styles.th, { flex: 2 }]}>Branch</Text>
                        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Stock</Text>
                        <Text style={[styles.th, { flex: 2 }]}>Note</Text>
                        <Text style={[styles.th, { flex: 2 }]}>Date</Text>
                    </View>
                    {movements.map((m, i) => <WebMovementRow key={m.id} item={m} index={i} />)}

                    {/* Pagination */}
                    <View style={styles.pagination}>
                        <Pressable
                            style={[styles.pageBtn, page === 0 && styles.pageBtnDis]}
                            onPress={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            <Text style={styles.pageBtnText}>← Prev</Text>
                        </Pressable>
                        <Text style={styles.pageInfo}>
                            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                        </Text>
                        <Pressable
                            style={[styles.pageBtn, (page + 1) * PAGE_SIZE >= totalCount && styles.pageBtnDis]}
                            onPress={() => setPage(p => p + 1)}
                            disabled={(page + 1) * PAGE_SIZE >= totalCount}
                        >
                            <Text style={styles.pageBtnText}>Next →</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            ) : (
                <FlatList
                    data={movements}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <MovementCard item={item} />}
                    contentContainerStyle={{ padding: 12, paddingBottom: 100, gap: 8 }}
                    onEndReached={() => {
                        if ((page + 1) * PAGE_SIZE < totalCount) setPage(p => p + 1);
                    }}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={
                        isLoading ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} /> : null
                    }
                />
            )}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: {
        backgroundColor: colors.card + 'E0',
        paddingTop: 16,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 12,
        gap: 12,
    },
    backBtn: { padding: 8 },
    screenTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
    screenSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    subTabBar: { flexDirection: 'row', paddingHorizontal: 20 },
    subTab: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 10, paddingHorizontal: 16, marginRight: 4,
        borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    subTabActive: { borderBottomColor: colors.primary },
    subTabText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
    subTabTextActive: { color: colors.primary, fontWeight: '700' },
    filterContainer: {
        backgroundColor: colors.card + 'E0',
    },
    filterBar: {
        flexGrow: 0,
    },
    filterContent: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
        alignItems: 'center',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,

        backgroundColor: 'transparent',
    },
    chipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
    emptySubtitle: { fontSize: 14, color: colors.textSecondary },
    // Mobile card
    card: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 16,
        padding: 14,
        flexDirection: 'row',
        gap: 12,
    },
    typeIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    typeIconSm: { width: 22, height: 22, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    productName: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
    qtyBadge: { fontSize: 18, fontWeight: '700' },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
    typePill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
    typePillText: { fontSize: 10, fontWeight: '700' },
    metaText: { fontSize: 12, color: colors.textSecondary },
    notes: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
    dateText: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
    // Web table
    thead: {
        flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12,
        backgroundColor: 'transparent',
    },
    th: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 },
    tr: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 12,
    },
    trEven: { backgroundColor: colors.card + 'E0' },
    td: { justifyContent: 'center' },
    tdText: { fontSize: 13, color: colors.text },
    cell: {}, // Empty view style for table cells
    pagination: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: 16,
    },
    pageBtn: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
        backgroundColor: colors.primary + '15',
    },
    pageBtnDis: { borderColor: colors.border, opacity: 0.5 },
    pageBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
    pageInfo: { fontSize: 13, color: colors.textSecondary },
});
