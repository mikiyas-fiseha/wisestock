import { AppButton } from '@/components/ui/AppButton';

import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { usePurchases } from '@/hooks/usePurchases';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

export default function PurchasesListScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width >= 768;
    const { purchases, isLoading } = usePurchases();
    const { branch } = useAuth();

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatCurrency = (amount: number) => {
        return `$${(amount || 0).toFixed(2)}`;
    };

    const stats = useMemo(() => {
        if (!purchases?.length) return { total: 0, count: 0, thisMonth: 0 };
        const now = new Date();
        const thisMonth = purchases.filter((p: any) => {
            const d = new Date(p.purchase_date || p.created_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        return {
            total: purchases.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0),
            count: purchases.length,
            thisMonth: thisMonth.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0),
        };
    }, [purchases]);

    const renderPurchaseCard = ({ item }: { item: any }) => (
        <Pressable
            style={[styles.card, isWeb && styles.cardWeb]}
            onPress={() => router.push(`/(tabs)/purchases/${item.id}`)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                    <View style={styles.iconCircle}>
                        <FontAwesome name="shopping-bag" size={16} color={colors.primary} />
                    </View>
                    <View>
                        <Text style={styles.supplierName}>{item.supplier?.name || 'Unknown Supplier'}</Text>
                        <Text style={styles.cardDate}>{formatDate(item.purchase_date || item.created_at)}</Text>
                    </View>
                </View>
                <View style={styles.cardRight}>
                    <Text style={styles.cardAmount}>{formatCurrency(item.total_amount)}</Text>
                    {item.invoice_number ? (
                        <Text style={styles.invoiceNum}>#{item.invoice_number}</Text>
                    ) : null}
                </View>
            </View>
            <View style={styles.cardFooter}>
                <View style={[styles.statusBadge, item.amount_paid >= item.total_amount ? styles.badgePaid : styles.badgeUnpaid]}>
                    <Text style={[styles.statusText, item.amount_paid >= item.total_amount ? styles.statusPaid : styles.statusUnpaid]}>
                        {item.amount_paid >= item.total_amount ? 'Paid' : 'Partial'}
                    </Text>
                </View>
                {item.notes ? <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text> : null}
            </View>
        </Pressable>
    );

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            {/* Header */}
            <View style={[styles.header, isWeb && styles.headerWeb]}>
                <View>
                    <Text style={styles.title}>Purchases</Text>
                    {branch && <Text style={styles.branchLabel}>{branch.name}</Text>}
                </View>
                <AppButton
                    title="+ New Purchase"
                    onPress={() => router.push('/(tabs)/purchases/add')}
                    style={{ paddingHorizontal: 20 }}
                />
            </View>

            {/* Stats Row */}
            <View style={[styles.statsRow, isWeb && styles.statsRowWeb]}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Purchases</Text>
                    <Text style={styles.statValue}>{stats.count}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>All Time</Text>
                    <Text style={styles.statValue}>{formatCurrency(stats.total)}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>This Month</Text>
                    <Text style={styles.statValue}>{formatCurrency(stats.thisMonth)}</Text>
                </View>
            </View>

            {/* Purchase List */}
            {!purchases?.length ? (
                <View style={styles.emptyState}>
                    <FontAwesome name="inbox" size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyTitle}>No purchases yet</Text>
                    <Text style={styles.emptySubtitle}>Create a purchase to add stock to your branches</Text>
                    <AppButton
                        title="Create First Purchase"
                        onPress={() => router.push('/(tabs)/purchases/add')}
                        style={{ marginTop: 16 }}
                    />
                </View>
            ) : (
                <FlatList
                    data={purchases}
                    keyExtractor={(item: any) => item.id}
                    renderItem={renderPurchaseCard}
                    contentContainerStyle={[styles.list, isWeb && styles.listWeb, { paddingBottom: 20 }]}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 16, backgroundColor: colors.card + 'E0' },
    headerWeb: { paddingTop: 20 },
    title: { fontSize: 22, fontWeight: '700', color: colors.text },
    branchLabel: { fontSize: 13, color: colors.primary, fontWeight: '500', marginTop: 2 },

    // Stats
    statsRow: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
    statsRowWeb: { paddingHorizontal: 24 },
    statCard: { flex: 1, backgroundColor: colors.card + 'E0', borderRadius: 16, padding: 14 },
    statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
    statValue: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 4 },

    // List
    list: { padding: 16, paddingTop: 8 },
    listWeb: { paddingHorizontal: 24 },

    // Card
    card: { backgroundColor: colors.card + 'E0', borderRadius: 16, padding: 14, marginBottom: 10 },
    cardWeb: { maxWidth: 800 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
    supplierName: { fontSize: 15, fontWeight: '600', color: colors.text },
    cardDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    cardRight: { alignItems: 'flex-end' },
    cardAmount: { fontSize: 16, fontWeight: '700', color: colors.text },
    invoiceNum: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: colors.border + '40' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgePaid: { backgroundColor: colors.success + '20' },
    badgeUnpaid: { backgroundColor: colors.warning + '20' },
    statusText: { fontSize: 11, fontWeight: '600' },
    statusPaid: { color: colors.success },
    statusUnpaid: { color: colors.warning },
    notes: { fontSize: 12, color: colors.textSecondary, flex: 1 },

    // Empty State
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textSecondary, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 6 },
});
