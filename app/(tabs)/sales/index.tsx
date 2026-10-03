import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Gradients, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { useReceiptGenerator } from '@/hooks/useReceiptGenerator';
import { SaleFilters, useSales } from '@/hooks/useSupabaseQuery';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Modal,
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

const shortId = (id: string) => id.split('-')[0].toUpperCase();

const PAYMENT_CONFIG: Record<string, { labelKey: string; icon: any }> = {
    cash: { labelKey: 'sales.cash', icon: 'cash-outline' },
    credit: { labelKey: 'sales.credit', icon: 'time-outline' },
    bank: { labelKey: 'sales.bank', icon: 'business-outline' },
    mobile_money: { labelKey: 'sales.mobile', icon: 'phone-portrait-outline' },
    card: { labelKey: 'sales.card', icon: 'card-outline' },
};

const DATE_CHIPS = [
    { key: 'all', labelKey: 'common.all' },
    { key: 'today', labelKey: 'common.today' },
    { key: 'week', labelKey: 'sales.this_week' },
    { key: 'month', labelKey: 'sales.this_month' },
] as const;

export default function SalesScreen() {
    const { colors, theme } = useTheme();
    const { t, i18n } = useTranslation();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;
    const styles = React.useMemo(() => createStyles(colors, theme, isDesktop), [colors, theme, isDesktop]);
    const router = useRouter();

    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState<SaleFilters['dateRange']>('week');
    const [filters, setFilters] = useState<SaleFilters>({});
    const [filterVisible, setFilterVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const { generateAndShareReceipt } = useReceiptGenerator();
    const { company, user } = useAuth();
    const { showFeedback } = useFeedback();

    const currentLocale = i18n.language === 'am' ? 'am-ET' : 'en-US';
    const formatDate = (d: string) => new Date(d).toLocaleDateString(currentLocale, { month: 'short', day: 'numeric', year: 'numeric' });
    const formatTime = (d: string) => new Date(d).toLocaleTimeString(currentLocale, { hour: '2-digit', minute: '2-digit' });

    const appliedFilters = useMemo<SaleFilters>(() => ({ ...filters, dateRange }), [filters, dateRange]);
    const { data: sales = [], isLoading, refetch } = useSales(search, appliedFilters);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const validSales = useMemo(() => (sales as any[]).filter(x => x.status !== 'returned' && x.status !== 'cancelled'), [sales]);
    const displayTotal = useMemo(() => validSales.reduce((s: number, x: any) => s + (Number(x.total_amount) || 0), 0), [validSales]);
    const displayCount = validSales.length;
    const creditSales = useMemo(() => validSales.filter((x: any) => x.payment_method === 'credit'), [validSales]);
    const creditTotal = useMemo(() => creditSales.reduce((s: number, x: any) => s + (Number(x.total_amount) || 0), 0), [creditSales]);

    const openDetail = (id: string) => { router.push(`/(tabs)/sales/${id}`); };

    const handlePrint = async (sale: any) => {
        const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id);
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
            <LinearGradient
                colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <ResponsiveContainer>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.screenTitle}>{t('common.sales', 'Sales Orders')}</Text>
                        <Text style={styles.screenSubtitle}>{t('sales.manage_track', 'Manage and track customer sales orders')}</Text>
                    </View>

                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.analyticsBtn}
                            onPress={() => router.push('/(tabs)/sales/analytics' as any)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="stats-chart-outline" size={17} color={colors.text} />
                        </TouchableOpacity>

                        <AppButton
                            title={t('sales.new_sale', '+ New Sale')}
                            onPress={() => router.push('/(tabs)/sales/new' as any)}
                            size="sm"
                            icon={<Ionicons name="cart" size={16} color="#FFFFFF" />}
                        />
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                >
                    {/* Top KPI Stats Ribbon */}
                    <View style={styles.kpiGrid}>
                        <View style={styles.kpiCard}>
                            <View style={styles.kpiHeaderRow}>
                                <Text style={styles.kpiLabel}>{t('sales.revenue', 'Total Sales')}</Text>
                                <View style={[styles.kpiIconBox, { backgroundColor: `${colors.success}18` }]}>
                                    <Ionicons name="cash-outline" size={15} color={colors.success} />
                                </View>
                            </View>
                            <Text style={styles.kpiValue}>{formatCurrency(displayTotal)}</Text>
                            <Text style={styles.kpiSub}>{displayCount} {t('common.orders', 'orders completed')}</Text>
                        </View>

                        <View style={styles.kpiCard}>
                            <View style={styles.kpiHeaderRow}>
                                <Text style={styles.kpiLabel}>{t('sales.credit', 'Credit Sales')}</Text>
                                <View style={[styles.kpiIconBox, { backgroundColor: `${colors.warning}18` }]}>
                                    <Ionicons name="time-outline" size={15} color={colors.warning} />
                                </View>
                            </View>
                            <Text style={[styles.kpiValue, { color: colors.warning }]}>{formatCurrency(creditTotal)}</Text>
                            <Text style={styles.kpiSub}>{creditSales.length} {t('customers.receivables', 'credit orders')}</Text>
                        </View>

                        <View style={styles.kpiCard}>
                            <View style={styles.kpiHeaderRow}>
                                <Text style={styles.kpiLabel}>{t('common.average', 'Average Order')}</Text>
                                <View style={[styles.kpiIconBox, { backgroundColor: `${colors.primary}18` }]}>
                                    <Ionicons name="trending-up-outline" size={15} color={colors.primary} />
                                </View>
                            </View>
                            <Text style={styles.kpiValue}>
                                {displayCount > 0 ? formatCurrency(displayTotal / displayCount) : formatCurrency(0)}
                            </Text>
                            <Text style={styles.kpiSub}>Avg revenue per transaction</Text>
                        </View>
                    </View>

                    {/* Search & Filter Bar */}
                    <View style={styles.controlsRow}>
                        <AppTextInput
                            placeholder={t('reports.search_placeholder', 'Search invoice, customer...') + '...'}
                            value={search}
                            onChangeText={setSearch}
                            icon="search"
                            containerStyle={{ flex: 1, marginBottom: 0 }}
                        />

                        <TouchableOpacity
                            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
                            onPress={() => setFilterVisible(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="options-outline" size={16} color={activeFilterCount > 0 ? '#FFFFFF' : colors.textSecondary} />
                            <Text style={[styles.filterBtnText, activeFilterCount > 0 && { color: '#FFFFFF' }]}>
                                {t('common.filter', 'Filter')}
                            </Text>
                            {activeFilterCount > 0 && (
                                <View style={styles.filterBadge}>
                                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Date Filter Pills */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.dateChipsContainer}
                    >
                        {DATE_CHIPS.map(c => {
                            const isSelected = dateRange === c.key;
                            return (
                                <TouchableOpacity
                                    key={c.key}
                                    style={[styles.dateChip, isSelected && styles.dateChipActive]}
                                    onPress={() => setDateRange(c.key as SaleFilters['dateRange'])}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.dateChipText, isSelected && styles.dateChipTextActive]}>
                                        {t(c.labelKey)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* UNIFIED SALES LEDGER CONTAINER (No individual cards) */}
                    <View style={styles.ledgerContainer}>
                        {isLoading ? (
                            <View style={{ padding: 16, gap: 14 }}>
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <Skeleton key={i} height={48} borderRadius={8} />
                                ))}
                            </View>
                        ) : (sales as any[]).length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconCircle}>
                                    <Ionicons name="receipt-outline" size={36} color={colors.textSecondary} />
                                </View>
                                <Text style={styles.emptyTitle}>{t('sales.no_sales_found', 'No sales transactions found')}</Text>
                                <Text style={styles.emptySubtitle}>
                                    {search ? t('common.no_results_found', 'No orders match your search') : t('sales.tap_new', 'Start selling to record your first transaction.')}
                                </Text>
                                <AppButton
                                    title={t('sales.start_selling', 'Create New Sale')}
                                    onPress={() => router.push('/(tabs)/sales/new' as any)}
                                    style={{ marginTop: 16 }}
                                    size="sm"
                                />
                            </View>
                        ) : isDesktop ? (
                            /* Desktop Table View */
                            <View>
                                <View style={styles.desktopTableHeader}>
                                    <Text style={[styles.th, { width: 110 }]}>{t('sales.invoice', 'INVOICE')}</Text>
                                    <Text style={[styles.th, { flex: 2.5 }]}>{t('common.customer', 'CUSTOMER')}</Text>
                                    <Text style={[styles.th, { width: 120 }]}>{t('sales.payment', 'PAYMENT')}</Text>
                                    <Text style={[styles.th, { width: 110, textAlign: 'center' }]}>{t('common.status', 'STATUS')}</Text>
                                    <Text style={[styles.th, { width: 130, textAlign: 'right' }]}>{t('common.total', 'AMOUNT')}</Text>
                                    <Text style={[styles.th, { width: 150, paddingLeft: 12 }]}>{t('common.date', 'DATE / TIME')}</Text>
                                    <Text style={[styles.th, { width: 90, textAlign: 'right' }]}>{t('common.actions', 'ACTIONS')}</Text>
                                </View>

                                {(sales as any[]).map((sale, index) => {
                                    const isLast = index === (sales as any[]).length - 1;
                                    return (
                                        <DesktopSaleRow
                                            key={sale.id}
                                            sale={sale}
                                            isLast={isLast}
                                            onView={() => openDetail(sale.id)}
                                            onPrint={() => handlePrint(sale)}
                                            formatDate={formatDate}
                                            formatTime={formatTime}
                                            colors={colors}
                                            theme={theme}
                                            t={t}
                                        />
                                    );
                                })}
                            </View>
                        ) : (
                            /* Mobile Unified Rows */
                            <View>
                                {(sales as any[]).map((sale, index) => {
                                    const isLast = index === (sales as any[]).length - 1;
                                    return (
                                        <MobileSaleRow
                                            key={sale.id}
                                            sale={sale}
                                            isLast={isLast}
                                            onView={() => openDetail(sale.id)}
                                            onPrint={() => handlePrint(sale)}
                                            formatDate={formatDate}
                                            formatTime={formatTime}
                                            colors={colors}
                                            theme={theme}
                                            t={t}
                                        />
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    <View style={{ height: 60 }} />
                </ScrollView>
            </ResponsiveContainer>

            {/* Filter Popover Dialog */}
            <FilterPopover
                visible={filterVisible}
                filters={filters}
                onApply={setFilters}
                onClose={() => setFilterVisible(false)}
            />
        </View>
    );
}

// ─── Desktop Sale Row ────────────────────────────────────────────────────────
function DesktopSaleRow({ sale, isLast, onView, onPrint, formatDate, formatTime, colors, theme, t }: any) {
    const [hovered, setHovered] = useState(false);
    const isCompleted = sale.status === 'completed';
    const isCredit = sale.payment_method === 'credit';
    const payCfg = PAYMENT_CONFIG[sale.payment_method || 'cash'] ?? { labelKey: sale.payment_method || 'cash', icon: 'cash-outline' };

    return (
        <Pressable
            style={[
                desktopStyles.row,
                !isLast && desktopStyles.rowBorder,
                hovered && { backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)' },
            ]}
            // @ts-ignore Web hover
            onMouseEnter={() => setHovered(true)}
            // @ts-ignore Web hover
            onMouseLeave={() => setHovered(false)}
            onPress={onView}
        >
            <View style={{ width: 110 }}>
                <Text style={desktopStyles.invoiceText}>#{shortId(sale.id)}</Text>
            </View>

            <View style={{ flex: 2.5, paddingRight: 8 }}>
                <Text style={desktopStyles.customerText} numberOfLines={1}>
                    {sale.customers?.name || t('sales.walk_in_guest', 'Walk-in Customer')}
                </Text>
            </View>

            <View style={{ width: 120, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name={payCfg.icon} size={13} color={colors.textSecondary} />
                <Text style={desktopStyles.paymentText}>{t(payCfg.labelKey)}</Text>
            </View>

            <View style={{ width: 110, alignItems: 'center' }}>
                <View style={[
                    desktopStyles.statusPill,
                    {
                        backgroundColor: isCredit
                            ? (colors.warningBg || 'rgba(245, 158, 11, 0.12)')
                            : (isCompleted ? (colors.successBg || 'rgba(16, 185, 129, 0.12)') : (colors.dangerBg || 'rgba(239, 68, 68, 0.12)'))
                    }
                ]}>
                    <View style={[
                        desktopStyles.statusDot,
                        { backgroundColor: isCredit ? (colors.warningText || colors.warning) : (isCompleted ? (colors.successText || colors.success) : (colors.dangerText || colors.danger)) }
                    ]} />
                    <Text style={[
                        desktopStyles.statusPillText,
                        { color: isCredit ? (colors.warningText || colors.warning) : (isCompleted ? (colors.successText || colors.success) : (colors.dangerText || colors.danger)) }
                    ]}>
                        {isCredit ? t('common.credit', 'Credit') : (isCompleted ? t('common.completed', 'Completed') : sale.status)}
                    </Text>
                </View>
            </View>

            <View style={{ width: 130, alignItems: 'flex-end' }}>
                <Text style={desktopStyles.amountText}>{formatCurrency(sale.total_amount)}</Text>
            </View>

            <View style={{ width: 150, paddingLeft: 12 }}>
                <Text style={desktopStyles.dateText}>{formatDate(sale.created_at)}</Text>
                <Text style={desktopStyles.timeText}>{formatTime(sale.created_at)}</Text>
            </View>

            <View style={{ width: 90, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                <TouchableOpacity
                    style={desktopStyles.iconActionBtn}
                    onPress={(e) => { e.stopPropagation?.(); onPrint(); }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="print-outline" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[desktopStyles.iconActionBtn, { backgroundColor: `${colors.primary}12` }]}
                    onPress={(e) => { e.stopPropagation?.(); onView(); }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="eye-outline" size={14} color={colors.primary} />
                </TouchableOpacity>
            </View>
        </Pressable>
    );
}

const desktopStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        cursor: 'pointer' as any,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderColor: 'rgba(150, 150, 150, 0.12)',
    },
    invoiceText: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
    customerText: { fontSize: 13, fontWeight: '700' },
    paymentText: { fontSize: 12, color: '#94A3B8' },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusPillCompleted: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    statusPillCredit: { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
    statusPillOther: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    statusDot: { width: 5, height: 5, borderRadius: 2.5 },
    statusPillText: { fontSize: 11, fontWeight: '700' },
    amountText: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
    dateText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
    timeText: { fontSize: 10, color: '#94A3B8' },
    iconActionBtn: {
        width: 30,
        height: 30,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(150, 150, 150, 0.08)',
    },
});

// ─── Mobile Sale Row (Inside Unified Container) ──────────────────────────────
function MobileSaleRow({ sale, isLast, onView, onPrint, formatDate, formatTime, colors, theme, t }: any) {
    const isCompleted = sale.status === 'completed';
    const isCredit = sale.payment_method === 'credit';
    const payCfg = PAYMENT_CONFIG[sale.payment_method || 'cash'] ?? { labelKey: sale.payment_method || 'cash', icon: 'cash-outline' };

    return (
        <Pressable
            style={[
                mobileStyles.row,
                !isLast && mobileStyles.rowBorder,
            ]}
            onPress={onView}
        >
            <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[mobileStyles.invoiceText, { color: colors.text }]}>#{shortId(sale.id)}</Text>
                    <View style={[
                        mobileStyles.statusPill,
                        {
                            backgroundColor: isCredit
                                ? (colors.warningBg || 'rgba(245, 158, 11, 0.12)')
                                : (isCompleted ? (colors.successBg || 'rgba(16, 185, 129, 0.12)') : (colors.dangerBg || 'rgba(239, 68, 68, 0.12)'))
                        }
                    ]}>
                        <Text style={[
                            mobileStyles.statusPillText,
                            { color: isCredit ? (colors.warningText || colors.warning) : (isCompleted ? (colors.successText || colors.success) : (colors.dangerText || colors.danger)) }
                        ]}>
                            {isCredit ? t('common.credit', 'Credit') : (isCompleted ? t('common.completed', 'Completed') : sale.status)}
                        </Text>
                    </View>
                </View>

                <Text style={[mobileStyles.customerText, { color: colors.text }]} numberOfLines={1}>
                    {sale.customers?.name || t('sales.walk_in_guest', 'Walk-in Customer')}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Ionicons name={payCfg.icon} size={11} color={colors.textSecondary} />
                    <Text style={[mobileStyles.metaText, { color: colors.textSecondary }]}>{t(payCfg.labelKey)}</Text>
                    <Text style={[mobileStyles.metaText, { color: colors.textSecondary }]}>•</Text>
                    <Text style={[mobileStyles.metaText, { color: colors.textSecondary }]}>{formatDate(sale.created_at)}</Text>
                </View>
            </View>

            <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={[mobileStyles.amountText, { color: colors.text }]}>{formatCurrency(sale.total_amount)}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                        style={mobileStyles.iconBtn}
                        onPress={(e) => { e.stopPropagation?.(); onPrint(); }}
                    >
                        <Ionicons name="print-outline" size={13} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[mobileStyles.iconBtn, { backgroundColor: `${colors.primary}12` }]}
                        onPress={(e) => { e.stopPropagation?.(); onView(); }}
                    >
                        <Ionicons name="chevron-forward" size={13} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>
        </Pressable>
    );
}

const mobileStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderColor: 'rgba(150, 150, 150, 0.08)',
    },
    invoiceText: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
    customerText: { fontSize: 14, fontWeight: '700', marginTop: 2 },
    metaText: { fontSize: 11, fontVariant: ['tabular-nums'] },
    amountText: { fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
    statusPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusPillCompleted: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
    statusPillCredit: { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
    statusPillOther: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
    statusPillText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
    iconBtn: {
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: 'rgba(150, 150, 150, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

// ─── Filter Popover ───────────────────────────────────────────────────────────
function FilterPopover({ visible, filters, onApply, onClose }: any) {
    const { colors, theme } = useTheme();
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
            <View style={popoverStyles.overlay}>
                <View style={[popoverStyles.dialog, { backgroundColor: theme === 'dark' ? '#111827' : '#FFFFFF', borderColor: colors.border }]}>
                    <View style={popoverStyles.header}>
                        <Text style={[popoverStyles.title, { color: colors.text }]}>{t('common.filter', 'Filter Sales')}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[popoverStyles.groupLabel, { color: colors.textSecondary }]}>{t('common.status', 'Order Status')}</Text>
                    <View style={popoverStyles.pillsRow}>
                        {['completed', 'returned', 'cancelled'].map(key => {
                            const active = localFilters.status === key;
                            return (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() => toggleStatus(key)}
                                    style={[
                                        popoverStyles.pill,
                                        { borderColor: colors.border },
                                        active && { backgroundColor: `${colors.primary}18`, borderColor: colors.primary },
                                    ]}
                                >
                                    <Text style={[popoverStyles.pillText, { color: active ? colors.primary : colors.textSecondary }]}>
                                        {key.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={[popoverStyles.groupLabel, { color: colors.textSecondary, marginTop: 14 }]}>{t('sales.payment_method', 'Payment Method')}</Text>
                    <View style={popoverStyles.pillsRow}>
                        {['cash', 'credit', 'bank'].map(key => {
                            const active = localFilters.paymentMethod === key;
                            return (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() => togglePayment(key)}
                                    style={[
                                        popoverStyles.pill,
                                        { borderColor: colors.border },
                                        active && { backgroundColor: `${colors.primary}18`, borderColor: colors.primary },
                                    ]}
                                >
                                    <Text style={[popoverStyles.pillText, { color: active ? colors.primary : colors.textSecondary }]}>
                                        {key.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={[popoverStyles.footer, { borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border }]}>
                        <TouchableOpacity onPress={onClose} style={popoverStyles.cancelBtn}>
                            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('common.cancel', 'Cancel')}</Text>
                        </TouchableOpacity>
                        <AppButton
                            title={t('common.apply', 'Apply Filters')}
                            onPress={() => { onApply(localFilters); onClose(); }}
                            size="sm"
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const popoverStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    dialog: { width: '100%', maxWidth: 360, borderRadius: Layout.borderRadius.lg, borderWidth: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 16, fontWeight: '800' },
    groupLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
    pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
    pillText: { fontSize: 12, fontWeight: '700' },
    footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 14, borderTopWidth: 1 },
    cancelBtn: { paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
});

// ─── Main Screen Styles ───────────────────────────────────────────────────────
const createStyles = (colors: any, theme: 'light' | 'dark', isDesktop: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 56 : 24,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    },
    screenTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
    screenSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    analyticsBtn: {
        width: 38,
        height: 38,
        borderRadius: Layout.borderRadius.sm,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },

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
        minWidth: isDesktop ? 200 : 140,
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.7)' : '#FFFFFF',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
        borderWidth: 1,
        borderRadius: Layout.borderRadius.lg,
        padding: 16,
        ...Layout.shadows.small,
    },
    kpiHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    kpiIconBox: { width: 28, height: 28, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
    kpiLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
    kpiValue: { fontSize: 22, fontWeight: '900', color: colors.text, marginTop: 8, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
    kpiSub: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },

    // Controls Row
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
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
    searchInput: { flex: 1, fontSize: 13, color: colors.text, outlineWidth: 0 as any },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: Layout.borderRadius.md,
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.7)' : '#FFFFFF',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
    },
    filterBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterBtnText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    filterBadge: {
        backgroundColor: colors.danger,
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    filterBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

    dateChipsContainer: { gap: 8, paddingBottom: 14 },
    dateChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.6)' : '#FFFFFF',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
    },
    dateChipActive: {
        backgroundColor: `${colors.primary}18`,
        borderColor: colors.primary,
    },
    dateChipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    dateChipTextActive: { color: colors.primary },

    // Single Unified Ledger Container
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
