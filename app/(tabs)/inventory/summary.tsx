
import { Gradients, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useInventoryMovements, useInventorySummary } from '@/hooks/useInventory';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

const isWeb = Platform.OS === 'web';

function KpiCard({ label, value, sub, icon, color, bg, onPress }: any) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    return (
        <Pressable
            style={({ pressed }) => [styles.kpiCard, pressed && { opacity: onPress ? 0.8 : 1 }, { borderTopColor: color }]}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={[styles.kpiIcon, { backgroundColor: bg }]}>
                <FontAwesome name={icon as any} size={18} color={color} />
            </View>
            <Text style={styles.kpiValue}>{value}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
            {sub && <Text style={styles.kpiSub}>{sub}</Text>}
        </Pressable>
    );
}

export default function SummaryScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { branch } = useAuth();
    const { data: summary, isLoading: loadingSum } = useInventorySummary();
    const { data: recentResult } = useInventoryMovements({ page: 0, pageSize: 10 });
    const recent = recentResult?.data || [];

    const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

    const TYPE_KEYS: Record<string, { color: string; icon: string }> = {
        purchase: { color: colors.success, icon: 'shopping-bag' },
        sale: { color: colors.primary, icon: 'shopping-cart' },
        adjustment: { color: colors.warning, icon: 'pencil' },
        transfer_in: { color: colors.secondary || '#8B5CF6', icon: 'arrow-down' },
        transfer_out: { color: '#EC4899', icon: 'arrow-up' },
        customer_return: { color: '#06B6D4', icon: 'undo' },
        supplier_return: { color: '#F97316', icon: 'reply' },
    };

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
                        <Text style={styles.screenTitle}>Summary</Text>
                        <Text style={styles.screenSubtitle}>
                            {branch ? branch.name : 'All Branches'}
                        </Text>
                    </View>
                </View>

                {/* Sub-tabs */}
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

            {loadingSum ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    {/* KPI Cards */}
                    <View style={[styles.kpiGrid, isWeb && styles.kpiGridWeb]}>
                        <KpiCard
                            label="Total Value"
                            value={fmt(summary?.totalValue ?? 0)}
                            icon="dollar"
                            color={colors.primary}
                            bg={`${colors.primary}18`}
                        />
                        <KpiCard
                            label="Total Products"
                            value={summary?.totalProducts ?? 0}
                            icon="cube"
                            color={colors.secondary || '#3B82F6'}
                            bg={(colors.secondary || '#3B82F6') + '18'}
                        />
                        <KpiCard
                            label="Low Stock"
                            value={summary?.lowStockCount ?? 0}
                            sub="Needs reorder"
                            icon="exclamation-triangle"
                            color={colors.warning}
                            bg={colors.warning + '18'}
                            onPress={() => router.push('/(tabs)/inventory' as any)}
                        />
                        <KpiCard
                            label="Out of Stock"
                            value={summary?.outOfStockCount ?? 0}
                            sub="Zero quantity"
                            icon="times-circle"
                            color={colors.danger}
                            bg={colors.danger + '18'}
                            onPress={() => router.push('/(tabs)/inventory' as any)}
                        />
                    </View>

                    {/* Branch Breakdown */}
                    {(summary?.branches?.length ?? 0) > 1 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Branch Breakdown</Text>
                            <View style={styles.table}>
                                <View style={styles.thead}>
                                    <Text style={[styles.th, { flex: 2 }]}>Branch</Text>
                                    <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Products</Text>
                                    <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Items</Text>
                                    <Text style={[styles.th, { flex: 2, textAlign: 'right' }]}>Value</Text>
                                </View>
                                {(summary?.branches ?? []).map((b, i) => (
                                    <View key={b.branch_id} style={[styles.tr, i % 2 === 0 && styles.trEven]}>
                                        <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={styles.branchDot} />
                                            <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>
                                                {b.branch_name}
                                            </Text>
                                        </View>
                                        <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>{b.totalItems}</Text>
                                        <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>{b.totalStock}</Text>
                                        <Text style={[styles.td, { flex: 2, textAlign: 'right', fontWeight: '600' }]}>
                                            {fmt(b.totalValue)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Recent Movements */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Movements</Text>
                            <Pressable onPress={() => router.push('/(tabs)/inventory/movements' as any)}>
                                <Text style={styles.seeAll}>See all →</Text>
                            </Pressable>
                        </View>
                        <View style={styles.table}>
                            {recent.length === 0 ? (
                                <Text style={styles.emptyNote}>No movements yet</Text>
                            ) : recent.map((m, i) => {
                                const cfg = TYPE_KEYS[m.type] ?? { color: '#64748B', icon: 'circle' };
                                const isPos = m.quantity > 0;
                                return (
                                    <View key={m.id} style={[styles.movRow, i % 2 === 0 && styles.trEven]}>
                                        <View style={[styles.movIcon, { backgroundColor: `${cfg.color}18` }]}>
                                            <FontAwesome name={cfg.icon as any} size={12} color={cfg.color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.movProduct} numberOfLines={1}>{m.product_name}</Text>
                                            <Text style={styles.movMeta}>
                                                {m.branch_name || 'All'} · {new Date(m.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <Text style={[styles.movQty, { color: isPos ? colors.success : colors.danger }]}>
                                            {isPos ? '+' : ''}{m.quantity}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: {
        backgroundColor: colors.card + 'E0',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingTop: 16,
    },
    headerTop: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingBottom: 12, gap: 12,
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20, gap: 20, paddingBottom: 100 },
    kpiGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    },
    kpiGridWeb: { flexWrap: 'nowrap' },
    kpiCard: {
        flex: 1,
        minWidth: isWeb ? 0 : '46%',
        backgroundColor: colors.card + 'E0',
        borderRadius: 14,
        padding: 16,
        borderTopWidth: 3,
        alignItems: 'flex-start',
        gap: 6,
        ...Layout.shadows.small,
    },
    kpiIcon: { borderRadius: 10, padding: 8, marginBottom: 4 },
    kpiValue: { fontSize: 24, fontWeight: '800', color: colors.text },
    kpiLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    kpiSub: { fontSize: 11, color: colors.textSecondary },
    section: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 14,
        overflow: 'hidden',
        ...Layout.shadows.small,
    },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10,
    },
    sectionTitle: {
        fontSize: 15, fontWeight: '700', color: colors.text,
        paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10,
    },
    seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },
    table: {},
    thead: {
        flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 8,
        backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    th: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 },
    tr: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 18, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    trEven: { backgroundColor: colors.card + 'E0' },
    td: { fontSize: 13, color: colors.text },
    branchDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
    movRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 18, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        gap: 12,
    },
    movIcon: { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    movProduct: { fontSize: 13, fontWeight: '600', color: colors.text },
    movMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    movQty: { fontSize: 16, fontWeight: '700' },
    emptyNote: { padding: 24, textAlign: 'center', color: colors.textSecondary, fontSize: 14 },
});
