import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { useReceiptGenerator } from '@/hooks/useReceiptGenerator';
import { SaleFilters, useProcessReturn, useSaleDetail, useSales } from '@/hooks/useSupabaseQuery';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';

const isWeb = Platform.OS === 'web';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (d: string) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
const formatTime = (d: string) => new Date(d).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
const shortId = (id: string) => id.split('-')[0].toUpperCase();

const PAYMENT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    cash: { label: 'Cash', bg: '#D1FAE5', color: '#065F46' },
    credit: { label: 'Credit', bg: '#FEF3C7', color: '#92400E' },
    bank: { label: 'Bank', bg: '#DBEAFE', color: '#1E40AF' },
    mobile_money: { label: 'Mobile', bg: '#EDE9FE', color: '#5B21B6' },
    card: { label: 'Card', bg: '#E0F2FE', color: '#0369A1' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    completed: { label: 'Completed', bg: '#D1FAE5', color: '#065F46' },
    credit: { label: 'Credit', bg: '#FEF3C7', color: '#92400E' },
    returned: { label: 'Returned', bg: '#FEE2E2', color: '#991B1B' },
    cancelled: { label: 'Cancelled', bg: '#F1F5F9', color: '#475569' },
};

// ─── Date Range Chips ─────────────────────────────────────────────────────────
const DATE_CHIPS = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
] as const;

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    const { colors } = useTheme();
    const cColor = color || colors.primary;
    return (
        <View style={[kpiStyles.card, { backgroundColor: colors.card + 'E0' }]}>
            <Text style={[kpiStyles.value, { color: colors.text }]} numberOfLines={1}>{value}</Text>
            <Text style={[kpiStyles.label, { color: colors.textSecondary }]}>{label}</Text>
            {sub ? <Text style={[kpiStyles.sub, { color: cColor }]}>{sub}</Text> : null}
        </View>
    );
}

const kpiStyles = StyleSheet.create({
    card: { flex: 1, borderRadius: 14, padding: 14, marginHorizontal: 4 },
    value: { fontSize: 20, fontWeight: '800' },
    label: { fontSize: 11, marginTop: 2, fontWeight: '500' },
    sub: { fontSize: 12, fontWeight: '700', marginTop: 4 },
});

// ─── Payment Badge ────────────────────────────────────────────────────────────
function PayBadge({ method }: { method?: string }) {
    const cfg = PAYMENT_CONFIG[method || 'cash'] ?? { label: method || '—', bg: '#F1F5F9', color: '#475569' };
    return (
        <View style={[badgeStyles.pill, { backgroundColor: cfg.bg }]}>
            <Text style={[badgeStyles.text, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
    );
}

function StatusBadge({ status }: { status?: string }) {
    const cfg = STATUS_CONFIG[status || 'completed'] ?? { label: status || '—', bg: '#F1F5F9', color: '#475569' };
    return (
        <View style={[badgeStyles.pill, { backgroundColor: cfg.bg }]}>
            <Text style={[badgeStyles.text, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
    );
}

const badgeStyles = StyleSheet.create({
    pill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    text: { fontSize: 11, fontWeight: '700' },
});

// ─── Action Menu ─────────────────────────────────────────────────────────────
function QuickActions({ sale, onView, onRefund, onPrint }: {
    sale: any; onView: () => void; onRefund: () => void; onPrint: () => void;
}) {
    return (
        <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity style={actionStyles.btn} onPress={onView}>
                <FontAwesome name="eye" size={13} color="#0052CC" />
            </TouchableOpacity>
            <TouchableOpacity style={actionStyles.btn} onPress={onPrint}>
                <FontAwesome name="print" size={13} color="#475569" />
            </TouchableOpacity>
            {sale.status !== 'returned' && sale.status !== 'cancelled' && (
                <TouchableOpacity style={[actionStyles.btn, { backgroundColor: '#FEE2E2' }]} onPress={onRefund}>
                    <FontAwesome name="undo" size={13} color="#DC2626" />
                </TouchableOpacity>
            )}
        </View>
    );
}
const actionStyles = StyleSheet.create({
    btn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }
});

function SaleCard({ sale, onView, onPrint, onRefund }: any) {
    const { colors } = useTheme();
    return (
        <TouchableOpacity style={[cardS.container, { backgroundColor: colors.card + 'E0' }]} onPress={onView} activeOpacity={0.7}>
            <View style={cardS.top}>
                <View style={{ flex: 1 }}>
                    <Text style={[cardS.invoice, { color: colors.text }]}>INV-{shortId(sale.id)}</Text>
                    <Text style={[cardS.customer, { color: colors.textSecondary }]} numberOfLines={1}>{sale.customers?.name || 'Walk-in Guest'}</Text>
                </View>
                <StatusBadge status={sale.status} />
            </View>
            <View style={cardS.middle}>
                <PayBadge method={sale.payment_method} />
                <Text style={[cardS.date, { color: colors.textSecondary }]}>{formatDate(sale.created_at)} · {formatTime(sale.created_at)}</Text>
            </View>
            <View style={cardS.bottom}>
                <Text style={[cardS.amount, { color: colors.text }]}>${(sale.total_amount || 0).toFixed(2)}</Text>
                <QuickActions sale={sale} onView={onView} onPrint={onPrint} onRefund={onRefund} />
            </View>
        </TouchableOpacity>
    );
}

const cardS = StyleSheet.create({
    container: { borderRadius: 16, marginBottom: 10, padding: 16 },
    top: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    invoice: { fontSize: 14, fontWeight: '800' },
    customer: { fontSize: 13, marginTop: 2 },
    middle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    date: { fontSize: 11 },
    bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    amount: { fontSize: 20, fontWeight: '800' },
});

// ─── Filter Popover ───────────────────────────────────────────────────────────
function FilterPopover({ visible, filters, onApply, onClose }: any) {
    const { colors } = useTheme();
    const [localFilters, setLocalFilters] = useState(filters);
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: colors.card + 'E0', padding: 20, borderRadius: 16, width: 300 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: colors.text }}>Filters</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                        <TouchableOpacity onPress={onClose}><Text style={{ color: colors.textSecondary, padding: 10 }}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => { onApply(localFilters); onClose(); }} style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Web Table Row ────────────────────────────────────────────────────────────
function WebTableRow({ sale, isAdmin, onView, onPrint, onRefund }: any) {
    const { colors } = useTheme();
    const [hovered, setHovered] = useState(false);
    return (
        <Pressable
            style={[
                { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomColor: colors.border + '40', borderBottomWidth: 1 } as any,
                hovered && { backgroundColor: colors.primary + '10' }
            ]}
            onHoverIn={() => setHovered(true)}
            onHoverOut={() => setHovered(false)}
            onPress={onView}
        >
            <Text style={[{ flex: 1.2, fontSize: 13, color: colors.text, fontWeight: '600' }]} numberOfLines={1}>INV-{shortId(sale.id)}</Text>
            <Text style={[{ flex: 2, fontSize: 13, color: colors.textSecondary }]} numberOfLines={1}>{sale.customers?.name || 'Walk-in Guest'}</Text>
            <View style={{ flex: 1 }}><PayBadge method={sale.payment_method} /></View>
            <View style={{ flex: 1.2 }}><StatusBadge status={sale.status} /></View>
            <Text style={[{ flex: 1.2, fontSize: 13, color: colors.text, fontWeight: '700', textAlign: 'right' }]}>${(sale.total_amount || 0).toFixed(2)}</Text>
            <Text style={[{ flex: 1.5, fontSize: 12, color: colors.textSecondary, paddingLeft: 12 }]}>{formatDate(sale.created_at)} · {formatTime(sale.created_at)}</Text>
            <View style={{ flex: 1.5 }}>
                <QuickActions sale={sale} onView={onView} onPrint={onPrint} onRefund={onRefund} />
            </View>
        </Pressable>
    );
}

// ─── Sale Detail Modal ────────────────────────────────────────────────────────
function SaleDetailModal({ saleId, visible, onClose }: any) {
    const { colors } = useTheme();
    const { data: detail, isLoading } = useSaleDetail(saleId || '');
    const { mutate: processReturn, isPending: isReturning } = useProcessReturn();
    const { showFeedback } = useFeedback();

    const handleReturn = () => {
        if (!detail) return;
        processReturn({
            saleId: detail.sale.id,
            items: detail.items,
            refundAmount: detail.sale.paid_amount
        }, {
            onSuccess: () => {
                onClose();
                showFeedback('success', 'Return Processed', 'Sale returned successfully.');
            },
            onError: (err: any) => showFeedback('error', 'Return Failed', err.message)
        });
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: colors.card + 'E0', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>Sale Details</Text>
                        <TouchableOpacity onPress={onClose}><FontAwesome name="times" size={24} color={colors.textSecondary} /></TouchableOpacity>
                    </View>
                    {isLoading ? <ActivityIndicator size="large" color={colors.primary} /> : !detail ? <Text style={{ color: colors.text }}>No details found</Text> : (
                        <ScrollView>
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, color: colors.textSecondary }}>Invoice: INV-{shortId(detail.sale.id)}</Text>
                                <Text style={{ fontSize: 14, color: colors.textSecondary }}>Customer: {detail.sale.customers?.name || 'Walk-in Guest'}</Text>
                                <Text style={{ fontSize: 14, color: colors.textSecondary }}>Total: ${detail.sale.total_amount}</Text>
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: colors.text }}>Items</Text>
                            {detail.items.map((item: any, i: number) => (
                                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ color: colors.text }}>{item.quantity}x {item.product_name}</Text>
                                    <Text style={{ fontWeight: '500', color: colors.text }}>${item.total_price}</Text>
                                </View>
                            ))}
                            {detail.sale.status !== 'returned' && detail.sale.status !== 'cancelled' && (
                                <TouchableOpacity onPress={handleReturn} disabled={isReturning} style={{ backgroundColor: '#EF4444', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 }}>
                                    {isReturning ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Return / Refund</Text>}
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SalesScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { isAdmin } = useAuth();
    const { width } = useWindowDimensions();
    const isWebWide = isWeb && width >= 900;
    const statusBarPadding = 0;

    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState<SaleFilters['dateRange']>('all');
    const [filters, setFilters] = useState<SaleFilters>({});
    const [filterVisible, setFilterVisible] = useState(false);
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);

    const { generateAndShareReceipt } = useReceiptGenerator();
    const { company } = useAuth();
    const { showFeedback } = useFeedback();

    const appliedFilters: SaleFilters = { ...filters, dateRange };
    const { data: sales = [], isLoading } = useSales(search, appliedFilters);

    // KPI aggregates (client-side from today's filtered data)
    const todayFilter: SaleFilters = { dateRange: 'today' };
    const { data: todaySalesRaw = [] } = useSales('', todayFilter);
    const todaySales = useMemo(() => (todaySalesRaw as any[]).filter(x => x.status !== 'returned' && x.status !== 'cancelled'), [todaySalesRaw]);

    const todayTotal = useMemo(() => todaySales.reduce((s: number, x: any) => s + (Number(x.total_amount) || 0), 0), [todaySales]);
    const todayCount = todaySales.length;
    const creditCount = useMemo(() => todaySales.filter((x: any) => x.payment_method === 'credit').length, [todaySales]);

    const openDetail = (id: string) => { setSelectedSaleId(id); setDetailVisible(true); };

    const handlePrint = async (sale: any) => {
        const { data: items } = await import('@/lib/supabase').then(m => m.supabase.from('sale_items').select('*').eq('sale_id', sale.id));
        if (!items?.length) { showFeedback('error', 'No Items', 'No items found for this sale'); return; }
        const subtotal = sale.subtotal || (sale.total_amount - (sale.tax || 0) + (sale.discount || 0));
        const totalTax = sale.tax || 0;
        const totalDiscount = sale.discount || 0;

        await generateAndShareReceipt({
            companyName: company?.name || 'My Shop',
            saleId: shortId(sale.id),
            date: new Date(sale.created_at).toLocaleString(),
            customerName: sale.customers?.name,
            items: items.map((i: any) => ({ name: i.product_name, quantity: i.quantity, price: i.unit_price || 0, total: i.total_price })),
            subtotal: subtotal,
            taxAmount: totalTax,
            discountAmount: totalDiscount,
            total: sale.total_amount || sale.total,
            amountPaid: sale.paid_amount || sale.total_amount || sale.total,
            paymentMethod: sale.payment_method || 'cash',
            status: sale.status
        });
    };

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <View style={[styles.header, { paddingTop: statusBarPadding }]}>
                <View>
                    <Text style={styles.headerTitle}>Sales</Text>
                    <Text style={styles.headerSub}>Manage and track transactions</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        style={[styles.newBtn, { backgroundColor: '#1E293B', paddingHorizontal: 12 }]}
                        onPress={() => router.push('/(tabs)/sales/analytics')}
                    >
                        <FontAwesome name="line-chart" size={14} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/(tabs)/sales/new')}>
                        <FontAwesome name="plus" size={13} color="#fff" />
                        <Text style={styles.newBtnText}>New Sale</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.kpiRow}>
                <KpiCard label="Today's Revenue" value={`$${todayTotal.toFixed(2)}`} />
                <KpiCard label="Today's Sales" value={`${todayCount}`} />
                <KpiCard label="On Credit" value={`${creditCount}`} color="#D97706" />
            </View>

            <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                    <FontAwesome name="search" size={14} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Invoice #, customer, phone..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <FontAwesome name="times-circle" size={14} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
                    onPress={() => setFilterVisible(true)}
                >
                    <FontAwesome name="sliders" size={14} color={activeFilterCount > 0 ? '#fff' : '#475569'} />
                    {activeFilterCount > 0 && (
                        <View style={styles.filterBadge}><Text style={{ fontSize: 10, color: '#fff', fontWeight: '800' }}>{activeFilterCount}</Text></View>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateChips} style={{ flexGrow: 0 }}>
                {DATE_CHIPS.map(c => (
                    <TouchableOpacity
                        key={c.key}
                        style={[styles.dateChip, dateRange === c.key && styles.dateChipActive]}
                        onPress={() => setDateRange(c.key as SaleFilters['dateRange'])}
                    >
                        <Text style={[styles.dateChipText, dateRange === c.key && styles.dateChipTextActive]}>{c.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : isWebWide ? (
                <ScrollView style={{ flex: 1 }}>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHead]}>
                            <Text style={[styles.th, { flex: 1.2 }]}>Invoice</Text>
                            <Text style={[styles.th, { flex: 2 }]}>Customer</Text>
                            <Text style={[styles.th, { flex: 1 }]}>Payment</Text>
                            <Text style={[styles.th, { flex: 1.2 }]}>Status</Text>
                            <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>Total</Text>
                            <Text style={[styles.th, { flex: 1.5 }]}>Date</Text>
                            <Text style={[styles.th, { flex: 1.5 }]}>Actions</Text>
                        </View>
                        {(sales as any[]).map(sale => (
                            <WebTableRow
                                key={sale.id}
                                sale={sale}
                                isAdmin={isAdmin}
                                onView={() => openDetail(sale.id)}
                                onPrint={() => handlePrint(sale)}
                                onRefund={() => openDetail(sale.id)}
                            />
                        ))}
                        {sales.length === 0 && (
                            <View style={styles.empty}><Text style={styles.emptyText}>No sales found</Text></View>
                        )}
                    </View>
                </ScrollView>
            ) : (
                <FlatList
                    data={sales as any[]}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <SaleCard
                            sale={item}
                            onView={() => openDetail(item.id)}
                            onPrint={() => handlePrint(item)}
                            onRefund={() => openDetail(item.id)}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <View style={styles.emptyIcon}><Text style={{ fontSize: 32 }}>🏷️</Text></View>
                            <Text style={styles.emptyTitle}>No sales yet</Text>
                            <Text style={styles.emptyText}>Tap "New Sale" to record your first transaction.</Text>
                            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/sales/new')}>
                                <Text style={styles.emptyBtnText}>Start Selling</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            <SaleDetailModal
                saleId={selectedSaleId}
                visible={detailVisible}
                onClose={() => setDetailVisible(false)}
            />

            <FilterPopover
                visible={filterVisible}
                filters={filters}
                onApply={setFilters}
                onClose={() => setFilterVisible(false)}
            />
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 24 },
    newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    kpiRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12 },
    searchRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 10 },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card + 'E0', borderRadius: 14, paddingHorizontal: 14, height: 44 },
    searchInput: { flex: 1, fontSize: 14, color: colors.text, outlineStyle: 'none' } as any,
    filterBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.card + 'E0', justifyContent: 'center', alignItems: 'center' },
    filterBtnActive: { backgroundColor: colors.primary },
    filterBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
    dateChips: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, flexDirection: 'row', alignItems: 'center' },
    dateChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.card + 'E0' },
    dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    dateChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    dateChipTextActive: { color: '#fff' },
    list: { padding: 16, paddingTop: 4, paddingBottom: 110 },
    table: { marginHorizontal: 16, backgroundColor: colors.card + 'E0', borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    tableHead: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
    th: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', paddingHorizontal: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', paddingTop: 16, paddingHorizontal: 32 },
    emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    emptyBtn: { marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
