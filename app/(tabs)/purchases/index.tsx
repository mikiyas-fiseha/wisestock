import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Gradients, Layout, withOpacity } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { usePurchases } from '@/hooks/usePurchases';
import { formatCurrency } from '@/lib/formatters';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FlatList,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type FilterType = 'all' | 'paid' | 'partial';

export default function PurchasesListScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);
    const router = useRouter();
    const { purchases, isLoading } = usePurchases();
    const { branch } = useAuth();
    const { t, i18n } = useTranslation();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterType>('all');

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString(i18n.language === 'am' ? 'am-ET' : 'en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const stats = useMemo(() => {
        if (!purchases?.length) return { total: 0, count: 0, thisMonth: 0, paidCount: 0, partialCount: 0 };
        const now = new Date();
        const thisMonth = purchases.filter((p: any) => {
            const d = new Date(p.purchase_date || p.created_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const paidCount = purchases.filter((p: any) => (p.amount_paid || 0) >= (p.total_amount || 0)).length;
        return {
            total: purchases.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0),
            count: purchases.length,
            thisMonth: thisMonth.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0),
            paidCount,
            partialCount: purchases.length - paidCount,
        };
    }, [purchases]);

    const filteredPurchases = useMemo(() => {
        if (!purchases) return [];
        return purchases.filter((p: any) => {
            const matchesSearch =
                !searchQuery ||
                (p.supplier?.name && p.supplier.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (p.invoice_number && String(p.invoice_number).toLowerCase().includes(searchQuery.toLowerCase())) ||
                (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));

            const isPaid = (p.amount_paid || 0) >= (p.total_amount || 0);
            const matchesFilter =
                filterStatus === 'all' ? true :
                filterStatus === 'paid' ? isPaid :
                !isPaid;

            return matchesSearch && matchesFilter;
        });
    }, [purchases, searchQuery, filterStatus]);

    const renderPurchaseRow = ({ item, index }: { item: any; index: number }) => {
        const isPaid = (item.amount_paid || 0) >= (item.total_amount || 0);
        const supplierInitial = (item.supplier?.name || 'S').charAt(0).toUpperCase();
        const isLast = index === filteredPurchases.length - 1;

        return (
            <PurchaseRowItem
                item={item}
                isPaid={isPaid}
                isLast={isLast}
                supplierInitial={supplierInitial}
                formattedDate={formatDate(item.purchase_date || item.created_at)}
                onPress={() => router.push(`/(tabs)/purchases/${item.id}`)}
                colors={colors}
                theme={theme}
                t={t}
            />
        );
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
                    <View style={styles.headerTitleGroup}>
                        <Text style={styles.title}>{t('purchases.purchases', 'Purchases')}</Text>
                        <View style={styles.headerMetaRow}>
                            {branch && (
                                <View style={styles.branchPill}>
                                    <Ionicons name="business-outline" size={12} color={colors.primary} />
                                    <Text style={styles.branchLabel}>{branch.name}</Text>
                                </View>
                            )}
                            <Text style={styles.countLabel}>
                                {stats.count} {t('common.total', 'total')}
                            </Text>
                        </View>
                    </View>
                    <AppButton
                        title={t('purchases.new_purchase', '+ New Purchase')}
                        onPress={() => router.push('/(tabs)/purchases/add')}
                        size="sm"
                        icon={<Ionicons name="add" size={18} color={colors.card} />}
                    />
                </View>

                {/* Stats Ribbon */}
                <View style={styles.statsRibbon}>
                    <View style={styles.statCard}>
                        <View style={styles.statIconWrap}>
                            <Ionicons name="bag-handle-outline" size={16} color={colors.primary} />
                        </View>
                        <Text style={styles.statValue}>{stats.count}</Text>
                        <Text style={styles.statLabel}>{t('purchases.total_orders', 'Total Orders')}</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconWrap, { backgroundColor: withOpacity(colors.success, 0.18) }]}>
                            <Ionicons name="wallet-outline" size={16} color={colors.success} />
                        </View>
                        <Text style={[styles.statValue, { color: colors.success }]}>{formatCurrency(stats.total)}</Text>
                        <Text style={styles.statLabel}>{t('purchases.all_time', 'All Time')}</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconWrap, { backgroundColor: withOpacity(colors.secondary, 0.18) }]}>
                            <Ionicons name="calendar-outline" size={16} color={colors.secondary} />
                        </View>
                        <Text style={styles.statValue}>{formatCurrency(stats.thisMonth)}</Text>
                        <Text style={styles.statLabel}>{t('purchases.this_month', 'This Month')}</Text>
                    </View>
                </View>

                {/* Search & Filter Bar */}
                <View style={styles.searchFilterContainer}>
                    <AppTextInput
                        placeholder={t('common.search', 'Search supplier, invoice #, or notes...')}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        icon="search"
                        containerStyle={{ marginBottom: 0 }}
                    />

                    {/* Filter Pills */}
                    <View style={styles.filterPillsRow}>
                        <TouchableOpacity
                            onPress={() => setFilterStatus('all')}
                            style={[styles.filterPill, filterStatus === 'all' && styles.filterPillActive]}
                        >
                            <Text style={[styles.filterPillText, filterStatus === 'all' && styles.filterPillTextActive]}>
                                {t('common.all', 'All')} ({stats.count})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setFilterStatus('paid')}
                            style={[styles.filterPill, filterStatus === 'paid' && styles.filterPillActive]}
                        >
                            <View style={[styles.dot, { backgroundColor: colors.success }]} />
                            <Text style={[styles.filterPillText, filterStatus === 'paid' && styles.filterPillTextActive]}>
                                {t('purchases.paid', 'Paid')} ({stats.paidCount})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setFilterStatus('partial')}
                            style={[styles.filterPill, filterStatus === 'partial' && styles.filterPillActive]}
                        >
                            <View style={[styles.dot, { backgroundColor: colors.warning }]} />
                            <Text style={[styles.filterPillText, filterStatus === 'partial' && styles.filterPillTextActive]}>
                                {t('purchases.partial', 'Partial')} ({stats.partialCount})
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Unified Ledger Container */}
                {isLoading ? (
                    <View style={{ paddingHorizontal: 16, gap: 10 }}>
                        <Skeleton height={56} borderRadius={10} />
                        <Skeleton height={56} borderRadius={10} />
                        <Skeleton height={56} borderRadius={10} />
                        <Skeleton height={56} borderRadius={10} />
                    </View>
                ) : filteredPurchases.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconBg}>
                            <Ionicons name="receipt-outline" size={44} color={colors.textSecondary} />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {searchQuery ? t('common.no_results', 'No matching purchases') : t('purchases.no_purchases', 'No Purchases Yet')}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {searchQuery
                                ? t('common.try_different_search', 'Try adjusting your search terms or filter.')
                                : t('purchases.no_purchases_subtitle', 'Record and manage wholesale supply orders and supplier bills.')}
                        </Text>
                        {!searchQuery && (
                            <AppButton
                                title={t('purchases.create_first', '+ Record First Purchase')}
                                onPress={() => router.push('/(tabs)/purchases/add')}
                                style={{ marginTop: 18 }}
                            />
                        )}
                    </View>
                ) : (
                    <View style={styles.tableWrapper}>
                        <View style={styles.tableContainer}>
                            {/* Table Header Row */}
                            <View style={styles.tableHeaderRow}>
                                <Text style={[styles.thText, { flex: 2 }]}>
                                    {t('purchases.supplier', 'SUPPLIER / ORDER')}
                                </Text>
                                <Text style={[styles.thText, { width: 100, textAlign: 'center' }]}>
                                    {t('common.status', 'STATUS')}
                                </Text>
                                <Text style={[styles.thText, { flex: 1.2, textAlign: 'right' }]}>
                                    {t('common.amount', 'AMOUNT')}
                                </Text>
                            </View>

                            <FlatList
                                data={filteredPurchases}
                                keyExtractor={(item: any) => item.id}
                                renderItem={renderPurchaseRow}
                                showsVerticalScrollIndicator={false}
                            />
                        </View>
                    </View>
                )}
            </ResponsiveContainer>
        </View>
    );
}

// Clean Unified Row Item (Divided by simple 1px hairline lines, NOT individual floating cards)
function PurchaseRowItem({ item, isPaid, isLast, supplierInitial, formattedDate, onPress, colors, theme, t }: any) {
    const [isHovered, setIsHovered] = useState(false);
    const balanceDue = (item.total_amount || 0) - (item.amount_paid || 0);

    return (
        <Pressable
            onPress={onPress}
            // @ts-ignore Web hover
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={[
                rowStyles.row,
                !isLast && rowStyles.borderBottom,
                isHovered && rowStyles.rowHovered,
            ]}
        >
            {/* Left: Avatar & Supplier / Date / Invoice */}
            <View style={rowStyles.leftCol}>
                <View style={[rowStyles.avatar, { backgroundColor: withOpacity(colors.primary, 0.18), borderColor: withOpacity(colors.primary, 0.3) }]}>
                    <Text style={[rowStyles.avatarText, { color: colors.primary }]}>{supplierInitial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[rowStyles.supplierName, { color: colors.text }]} numberOfLines={1}>
                        {item.supplier?.name || t('purchases.supplier', 'Supplier')}
                    </Text>
                    <View style={rowStyles.metaLine}>
                        <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} />
                        <Text style={[rowStyles.dateText, { color: colors.textSecondary }]}>{formattedDate}</Text>
                        {item.invoice_number ? (
                            <>
                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>•</Text>
                                <View style={[rowStyles.invoiceBadge, { backgroundColor: colors.primaryLight }]}>
                                    <Text style={[rowStyles.invoiceText, { color: colors.primary }]}>
                                        #{item.invoice_number}
                                    </Text>
                                </View>
                            </>
                        ) : null}
                        {item.notes ? (
                            <>
                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>•</Text>
                                <Text style={[rowStyles.noteText, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {item.notes}
                                </Text>
                            </>
                        ) : null}
                    </View>
                </View>
            </View>

            {/* Center: Status Pill */}
            <View style={rowStyles.centerCol}>
                <View
                    style={[
                        rowStyles.statusPill,
                        isPaid
                            ? { backgroundColor: colors.successBg || withOpacity(colors.success, 0.18), borderColor: 'transparent' }
                            : { backgroundColor: colors.warningBg || withOpacity(colors.warning, 0.18), borderColor: 'transparent' },
                    ]}
                >
                    <View style={[rowStyles.statusDot, { backgroundColor: isPaid ? (colors.successText || colors.success) : (colors.warningText || colors.warning) }]} />
                    <Text style={[rowStyles.statusText, { color: isPaid ? (colors.successText || colors.success) : (colors.warningText || colors.warning) }]}>
                        {isPaid ? t('purchases.paid', 'Paid') : t('purchases.partial', 'Partial')}
                    </Text>
                </View>
                {!isPaid && balanceDue > 0 && (
                    <Text style={[rowStyles.dueSubtext, { color: colors.dangerText || colors.danger }]}>
                        {t('purchases.due', 'Due')}: {formatCurrency(balanceDue)}
                    </Text>
                )}
            </View>

            {/* Right: Amount & Arrow */}
            <View style={rowStyles.rightCol}>
                <Text style={[rowStyles.totalAmount, { color: colors.text }]}>
                    {formatCurrency(item.total_amount)}
                </Text>
                <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={isHovered ? colors.primary : colors.textSecondary}
                    style={{ marginLeft: 6 }}
                />
            </View>
        </Pressable>
    );
}

const rowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 16,
        ...(Platform.OS === 'web' ? {
            cursor: 'pointer',
            transition: 'background-color 0.12s ease',
        } as any : {}),
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150, 150, 150, 0.12)',
    },
    rowHovered: {
        backgroundColor: 'rgba(150, 150, 150, 0.06)',
    },
    leftCol: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingRight: 8,
    },
    avatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '800',
    },
    supplierName: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    metaLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 2,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '500',
    },
    invoiceBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 5,
    },
    invoiceText: {
        fontSize: 10,
        fontWeight: '700',
    },
    noteText: {
        fontSize: 11,
        fontStyle: 'italic',
        maxWidth: 120,
    },
    centerCol: {
        width: 100,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    dueSubtext: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
        fontVariant: ['tabular-nums'],
    },
    rightCol: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    totalAmount: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.3,
        fontVariant: ['tabular-nums'],
    },
});

const createStyles = (colors: any, theme: 'light' | 'dark') => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingTop: Platform.OS === 'ios' ? 56 : 24,
        paddingBottom: 16,
    },
    headerTitleGroup: {
        gap: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.5,
    },
    headerMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    branchPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: Layout.borderRadius.sm,
        backgroundColor: colors.primaryLight,
    },
    branchLabel: {
        fontSize: 11,
        color: colors.primary,
        fontWeight: '600',
    },
    countLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    statsRibbon: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.75)' : '#FFFFFF',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
        borderWidth: 1,
        borderRadius: Layout.borderRadius.md,
        padding: 12,
        ...Layout.shadows.small,
    },
    statIconWrap: {
        width: 28,
        height: 28,
        borderRadius: Layout.borderRadius.sm,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.3,
        fontVariant: ['tabular-nums'],
    },
    statLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginTop: 2,
    },
    searchFilterContainer: {
        paddingHorizontal: 16,
        marginBottom: 14,
        gap: 10,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.7)' : '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: Layout.borderRadius.md,
        paddingHorizontal: 12,
        height: 42,
    },
    searchInput: {
        flex: 1,
        color: colors.text,
        fontSize: 14,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    filterPillsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: Layout.borderRadius.full,
        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterPillActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },
    filterPillText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    filterPillTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    tableWrapper: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    tableContainer: {
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.75)' : '#FFFFFF',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
        borderWidth: 1,
        borderRadius: Layout.borderRadius.lg,
        overflow: 'hidden',
        ...Layout.shadows.small,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150, 150, 150, 0.12)',
    },
    thText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.5,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 56,
        paddingHorizontal: 24,
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    emptySubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 6,
        maxWidth: 300,
        lineHeight: 18,
    },
});
