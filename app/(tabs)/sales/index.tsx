import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { useReceiptGenerator } from '@/hooks/useReceiptGenerator';
import { SaleFilters, useSales } from '@/hooks/useSupabaseQuery';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatCurrency } from '@/lib/formatters';
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
const shortId = (id: string) => id.split('-')[0].toUpperCase();


const PAYMENT_CONFIG: Record<string, { labelKey: string; bg: string; color: string }> = {
    cash: { labelKey: 'sales.cash', bg: '#D1FAE5', color: '#065F46' },
    credit: { labelKey: 'sales.credit', bg: '#FEF3C7', color: '#92400E' },
    bank: { labelKey: 'sales.bank', bg: '#DBEAFE', color: '#1E40AF' },
    mobile_money: { labelKey: 'sales.mobile', bg: '#EDE9FE', color: '#5B21B6' },
    card: { labelKey: 'sales.card', bg: '#E0F2FE', color: '#0369A1' },
};

const STATUS_CONFIG: Record<string, { labelKey: string; bg: string; color: string }> = {
    completed: { labelKey: 'common.completed', bg: '#D1FAE5', color: '#065F46' },
    credit: { labelKey: 'common.credit', bg: '#FEF3C7', color: '#92400E' },
    returned: { labelKey: 'common.return', bg: '#FEE2E2', color: '#991B1B' },
    cancelled: { labelKey: 'common.cancel', bg: '#F1F5F9', color: '#475569' },
};

const DATE_CHIPS = [
    { key: 'all', labelKey: 'common.all' },
    { key: 'today', labelKey: 'common.today' },
    { key: 'week', labelKey: 'sales.this_week' },
    { key: 'month', labelKey: 'sales.this_month' },
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
    const { t } = useTranslation();
    const cfg = PAYMENT_CONFIG[method || 'cash'] ?? { labelKey: method || '—', bg: '#F1F5F9', color: '#475569' };
    return (
        <View style={[badgeStyles.pill, { backgroundColor: cfg.bg }]}>
            <Text style={[badgeStyles.text, { color: cfg.color }]}>{t(cfg.labelKey)}</Text>
        </View>
    );
}

function StatusBadge({ status }: { status?: string }) {
    const { t } = useTranslation();
    const cfg = STATUS_CONFIG[status || 'completed'] ?? { labelKey: status || '—', bg: '#F1F5F9', color: '#475569' };
    return (
        <View style={[badgeStyles.pill, { backgroundColor: cfg.bg }]}>
            <Text style={[badgeStyles.text, { color: cfg.color }]}>{t(cfg.labelKey)}</Text>
        </View>
    );
}

const badgeStyles = StyleSheet.create({
    pill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    text: { fontSize: 11, fontWeight: '700' },
});

// ─── Action Menu ─────────────────────────────────────────────────────────────
function QuickActions({ onView, onPrint }: {
    onView: () => void; onPrint: () => void;
}) {
    return (
        <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity style={actionStyles.btn} onPress={onView}>
                <FontAwesome name="eye" size={13} color="#0052CC" />
            </TouchableOpacity>
            <TouchableOpacity style={actionStyles.btn} onPress={onPrint}>
                <FontAwesome name="print" size={13} color="#475569" />
            </TouchableOpacity>
        </View>
    );
}
const actionStyles = StyleSheet.create({
    btn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }
});

function SaleCard({ sale, onView, onPrint, formatDate, formatTime }: any) {
    const { colors } = useTheme();
    const { t } = useTranslation();
    return (
        <TouchableOpacity style={[cardS.container, { backgroundColor: colors.card + 'E0' }]} onPress={onView} activeOpacity={0.7}>
            <View style={cardS.top}>
                <View style={{ flex: 1 }}>
                    <Text style={[cardS.invoice, { color: colors.text }]}>{t('sales.invoice')} #{shortId(sale.id)}</Text>
                    <Text style={[cardS.customer, { color: colors.textSecondary }]} numberOfLines={1}>{sale.customers?.name || t('sales.walk_in_guest')}</Text>
                </View>
                <StatusBadge status={sale.status} />
            </View>
            <View style={cardS.middle}>
                <PayBadge method={sale.payment_method} />
                <Text style={[cardS.date, { color: colors.textSecondary }]}>{formatDate(sale.created_at)} · {formatTime(sale.created_at)}</Text>
            </View>
            <View style={cardS.bottom}>
                <Text style={[cardS.amount, { color: colors.text }]}>{formatCurrency(sale.total_amount)}</Text>
                <QuickActions onView={onView} onPrint={onPrint} />
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
    const { t } = useTranslation();
    const [localFilters, setLocalFilters] = useState<any>({});

    React.useEffect(() => {
        if (visible) setLocalFilters(filters || {});
    }, [visible, filters]);

    const toggleStatus = (s: string) => {
        setLocalFilters((prev: any) => ({ ...prev, status: prev.status === s ? undefined : s }));
    };

    const togglePayment = (p: string) => {
        setLocalFilters((prev: any) => ({ ...prev, paymentMethod: prev.paymentMethod === p ? undefined : p }));
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: colors.card + 'E0', padding: 20, borderRadius: 16, width: 320 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: colors.text }}>{t('common.filter')}</Text>

                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>{t('common.status')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                        {Object.entries(STATUS_CONFIG)
                            .filter(([key]) => key !== 'credit')
                            .map(([key, cfg]) => {
                                const active = localFilters.status === key;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        onPress={() => toggleStatus(key)}
                                        style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border }, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                    >
                                        <Text style={[{ fontSize: 13, color: colors.text }, active && { color: '#fff', fontWeight: 'bold' }]}>{t(cfg.labelKey)}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>{t('sales.payment_method')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {Object.entries(PAYMENT_CONFIG)
                            .filter(([key]) => key !== 'mobile_money' && key !== 'card')
                            .map(([key, cfg]) => {
                                const active = localFilters.paymentMethod === key;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        onPress={() => togglePayment(key)}
                                        style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border }, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                    >
                                        <Text style={[{ fontSize: 13, color: colors.text }, active && { color: '#fff', fontWeight: 'bold' }]}>{t(cfg.labelKey)}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                        <TouchableOpacity onPress={onClose}><Text style={{ color: colors.textSecondary, padding: 10 }}>{t('common.cancel')}</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => { onApply(localFilters); onClose(); }} style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('common.apply')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Web Table Row ────────────────────────────────────────────────────────────
function WebTableRow({ sale, onView, onPrint, formatDate, formatTime }: any) {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const [hovered, setHovered] = useState(false);
    return (
        <Pressable
            style={[
                { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomColor: colors.border + '40', borderBottomWidth: 1 } as any,
                hovered && { backgroundColor: colors.primary + '10' }
            ] as any}
            onHoverIn={() => setHovered(true)}
            onHoverOut={() => setHovered(false)}
            onPress={onView}
        >
            <Text style={[{ flex: 1.2, fontSize: 13, color: colors.text, fontWeight: '600' }]} numberOfLines={1}>INV-{shortId(sale.id)}</Text>
            <Text style={[{ flex: 2, fontSize: 13, color: colors.textSecondary }]} numberOfLines={1}>{sale.customers?.name || t('sales.walk_in_guest')}</Text>
            <View style={{ flex: 1 }}><PayBadge method={sale.payment_method} /></View>
            <View style={{ flex: 1.2 }}><StatusBadge status={sale.status} /></View>
            <Text style={[{ flex: 1.2, fontSize: 13, color: colors.text, fontWeight: '700', textAlign: 'right' }]}>{formatCurrency(sale.total_amount)}</Text>
            <Text style={[{ flex: 1.5, fontSize: 12, color: colors.textSecondary, paddingLeft: 12 }]}>{formatDate(sale.created_at)} · {formatTime(sale.created_at)}</Text>
            <View style={{ flex: 1.5 }}>
                <QuickActions onView={onView} onPrint={onPrint} />
            </View>
        </Pressable>
    );
}


// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SalesScreen() {
    const { colors, theme } = useTheme();
    const { t, i18n } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isWebWide = width >= 768;
    const statusBarPadding = 0;

    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState<SaleFilters['dateRange']>('week');
    const [filters, setFilters] = useState<SaleFilters>({});
    const [filterVisible, setFilterVisible] = useState(false);

    const { generateAndShareReceipt } = useReceiptGenerator();
    const { company, user, isAdmin } = useAuth();
    const { showFeedback } = useFeedback();

    const currentLocale = i18n.language === 'am' ? 'am-ET' : 'en-US';

    const formatDate = (d: string) => new Date(d).toLocaleDateString(currentLocale, { month: 'short', day: 'numeric', year: 'numeric' });
    const formatTime = (d: string) => new Date(d).toLocaleTimeString(currentLocale, { hour: '2-digit', minute: '2-digit' });

    const appliedFilters = useMemo<SaleFilters>(() => ({ ...filters, dateRange }), [filters, dateRange]);
    const { data: sales = [], isLoading } = useSales(search, appliedFilters);

    // KPI aggregates (calculated from dynamically filtered sales)
    const validSales = useMemo(() => (sales as any[]).filter(x => x.status !== 'returned' && x.status !== 'cancelled'), [sales]);

    const displayTotal = useMemo(() => validSales.reduce((s: number, x: any) => s + (Number(x.total_amount) || 0), 0), [validSales]);
    const displayCount = validSales.length;
    const creditCount = useMemo(() => validSales.filter((x: any) => x.payment_method === 'credit').length, [validSales]);

    // Format labels based on dateRange
    const getRangeLabel = () => {
        switch (dateRange) {
            case 'today': return t('common.today');
            case 'week': return t('sales.this_week');
            case 'month': return t('sales.this_month');
            default: return t('common.total');
        }
    };
    const titlePrefix = getRangeLabel();

    const openDetail = (id: string) => { router.push(`/(tabs)/sales/${id}`); };

    const handlePrint = async (sale: any) => {
        const { data: items } = await import('@/lib/supabase').then(m => m.supabase.from('sale_items').select('*').eq('sale_id', sale.id));
        if (!items?.length) { showFeedback('error', t('common.error'), t('sales.no_search_results')); return; }
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
            status: sale.status,
            tin: company?.tin,
            vatNo: company?.vatNo,
            address: company?.address,
            city: company?.city,
            phone: company?.contactEmail || user?.email,
            customerPhone: sale.customers?.phone,
            customerAddress: sale.customers?.address,
            customerTin: sale.customers?.tax_id
        });
    };

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

            <View style={[styles.header, { paddingTop: statusBarPadding }]}>
                <View>
                    <Text style={styles.headerTitle}>{t('common.sales')}</Text>
                    <Text style={styles.headerSub}>{t('sales.manage_track')}</Text>
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
                        <Text style={styles.newBtnText}>{t('sales.new_sale')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {isWebWide && (
                <View style={styles.kpiRow}>
                    <KpiCard label={`${titlePrefix} ${t('sales.revenue')}`} value={formatCurrency(displayTotal)} />
                    <KpiCard label={`${titlePrefix} ${t('common.sales')}`} value={`${displayCount}`} />
                    <KpiCard label={t('sales.credit')} value={`${creditCount}`} color="#D97706" />
                </View>
            )}

            <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                    <FontAwesome name="search" size={14} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('reports.search_placeholder')}
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
                        <Text style={[styles.dateChipText, dateRange === c.key && styles.dateChipTextActive]}>{t(c.labelKey)}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : isWebWide ? (
                <ScrollView style={{ flex: 1 }}>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHead]}>
                            <Text style={[styles.th, { flex: 1.2 }]}>{t('sales.invoice')}</Text>
                            <Text style={[styles.th, { flex: 2 }]}>{t('common.customer')}</Text>
                            <Text style={[styles.th, { flex: 1 }]}>{t('sales.payment')}</Text>
                            <Text style={[styles.th, { flex: 1.2 }]}>{t('common.status')}</Text>
                            <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>{t('common.total')}</Text>
                            <Text style={[styles.th, { flex: 1.5 }]}>{t('common.date')}</Text>
                            <Text style={[styles.th, { flex: 1.5 }]}>{t('common.actions')}</Text>
                        </View>
                        {(sales as any[]).map(sale => (
                            <WebTableRow
                                key={sale.id}
                                sale={sale}
                                onView={() => openDetail(sale.id)}
                                onPrint={() => handlePrint(sale)}
                                formatDate={formatDate}
                                formatTime={formatTime}
                            />
                        ))}
                        {sales.length === 0 && (
                            <View style={styles.empty}><Text style={styles.emptyText}>{t('sales.no_sales_found')}</Text></View>
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
                            formatDate={formatDate}
                            formatTime={formatTime}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <View style={styles.emptyIcon}><Text style={{ fontSize: 32 }}>🏷️</Text></View>
                            <Text style={styles.emptyTitle}>{t('sales.no_sales_yet')}</Text>
                            <Text style={styles.emptyText}>{t('sales.tap_new')}</Text>
                            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/sales/new')}>
                                <Text style={styles.emptyBtnText}>{t('sales.start_selling')}</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}


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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, marginTop: 8 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
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
    dateChips: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 10, flexDirection: 'row', alignItems: 'center' },
    dateChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, backgroundColor: colors.card + 'E0', alignItems: 'center', justifyContent: 'center', minWidth: 75, height: 42 },
    dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    dateChipText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
    dateChipTextActive: { color: '#fff' },
    list: { padding: 16, paddingTop: 4, paddingBottom: 20 },
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
