import { SuperAdminGuard } from '@/components/auth/SuperAdminGuard';
import { AppButton } from '@/components/ui/AppButton';
import { Gradients, Layout } from '@/constants/Colors';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SuperAdminDashboard() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { showFeedback } = useFeedback();

    const [metrics, setMetrics] = useState<any>(null);
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        try {
            const [metricsRes, companiesRes] = await Promise.all([
                supabase.rpc('get_super_admin_metrics'),
                supabase
                    .from('companies')
                    .select('*, subscriptions(status, plan_id)')
                    .order('created_at', { ascending: false })
                    .limit(5)
            ]);

            if (metricsRes.error) throw metricsRes.error;
            if (companiesRes.error) throw companiesRes.error;

            setMetrics(metricsRes.data);
            setCompanies(companiesRes.data || []);
        } catch (e: any) {
            console.error('Super Admin Fetch Error:', e);
            showFeedback('error', 'Error', e.message || 'Failed to load system metrics.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showFeedback]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDashboardData();
    }, [fetchDashboardData]);

    const toggleCompanyStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        const { error } = await supabase.from('companies').update({ status: newStatus }).eq('id', id);

        if (error) {
            showFeedback('error', 'Error', error.message);
        } else {
            showFeedback('success', 'Status Updated', `Company is now ${newStatus}`);
            fetchDashboardData();
        }
    };

    if (loading) {
        return (
            <SuperAdminGuard>
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SuperAdminGuard>
        );
    }

    const { system_health = {}, platform_usage = {}, subscriptions = {} } = metrics || {};
    const pendingSubs = subscriptions.pending_approval || 0;

    return (
        <SuperAdminGuard>
            <View style={styles.container}>
                <LinearGradient
                    colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                <View style={styles.topHeader}>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/settings')} style={styles.backButton}>
                        <FontAwesome name="arrow-left" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.header}>Command Center</Text>
                        <Text style={styles.headerSub}>Platform Metrics & Management</Text>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                >
                    {/* Critical Alert Pipeline */}
                    {pendingSubs > 0 && (
                        <View style={styles.alertBox}>
                            <View style={styles.alertIcon}>
                                <FontAwesome name="bell" size={20} color="#fff" />
                            </View>
                            <View style={styles.alertContent}>
                                <Text style={styles.alertTitle}>{pendingSubs} Pending Approvals</Text>
                                <Text style={styles.alertDesc}>Companies are waiting for subscription confirmation.</Text>
                            </View>
                            <TouchableOpacity style={styles.alertAction} onPress={() => router.push('/(super-admin)/companies')}>
                                <Text style={styles.alertActionText}>Review</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Quick Management Actions */}
                    <View style={styles.actionRow}>
                        <AppButton
                            title="Manage Companies"
                            onPress={() => router.push('/(super-admin)/companies')}
                            style={{ flex: 1, marginRight: 10 }}
                            icon={<FontAwesome name="building" size={16} color="#fff" style={{ marginRight: 8 }} />}
                        />
                        <AppButton
                            title="Pricing Plans"
                            onPress={() => router.push('/(super-admin)/plans')}
                            variant="outline"
                            style={{ flex: 1 }}
                            icon={<FontAwesome name="tags" size={16} color={colors.primary} style={{ marginRight: 8 }} />}
                        />
                    </View>

                    {/* Primary Metrics */}
                    <Text style={styles.sectionTitle}>System Health</Text>
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { borderTopColor: '#3B82F6', borderTopWidth: 4 }]}>
                            <View style={styles.statIconWrapper}>
                                <FontAwesome name="building-o" size={18} color="#3B82F6" />
                            </View>
                            <Text style={styles.statValue}>{system_health.total_companies || 0}</Text>
                            <Text style={styles.statLabel}>Total Companies</Text>
                            <Text style={styles.statSubInfo}>{system_health.active_companies || 0} active currently</Text>
                        </View>

                        <View style={[styles.statCard, { borderTopColor: '#10B981', borderTopWidth: 4 }]}>
                            <View style={styles.statIconWrapper}>
                                <FontAwesome name="users" size={18} color="#10B981" />
                            </View>
                            <Text style={styles.statValue}>{system_health.total_users || 0}</Text>
                            <Text style={styles.statLabel}>Platform Users</Text>
                            <Text style={styles.statSubInfo}>Across all branches</Text>
                        </View>
                    </View>

                    {/* Revenue & Usage */}
                    <Text style={styles.sectionTitle}>Platform Usage (30d)</Text>
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { borderTopColor: '#F59E0B', borderTopWidth: 4 }]}>
                            <View style={styles.statIconWrapper}>
                                <FontAwesome name="line-chart" size={18} color="#F59E0B" />
                            </View>
                            <Text style={styles.statValue}>{(platform_usage.revenue_last_30d || 0).toLocaleString()}</Text>
                            <Text style={styles.statLabel}>Total GMV Processed</Text>
                            <Text style={styles.statSubInfo}>Topline sales volume</Text>
                        </View>

                        <View style={[styles.statCard, { borderTopColor: '#8B5CF6', borderTopWidth: 4 }]}>
                            <View style={styles.statIconWrapper}>
                                <FontAwesome name="shopping-cart" size={18} color="#8B5CF6" />
                            </View>
                            <Text style={styles.statValue}>{(platform_usage.sales_last_30d || 0).toLocaleString()}</Text>
                            <Text style={styles.statLabel}>Transactions</Text>
                            <Text style={styles.statSubInfo}>Total sales recorded</Text>
                        </View>
                    </View>

                    {/* Recent Registrations Feed */}
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Recent Registrations</Text>
                        <TouchableOpacity onPress={() => router.push('/(super-admin)/companies')}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {companies.map(comp => {
                        const subsArray = Array.isArray(comp.subscriptions) ? comp.subscriptions : (comp.subscriptions ? [comp.subscriptions] : []);
                        const activeSub = subsArray.find((s: any) => s.status === 'active');
                        const pendingSub = subsArray.find((s: any) => s.status === 'pending_approval');
                        const statusBadgeColor = comp.status === 'active' ? '#10B981' : '#EF4444';

                        return (
                            <View key={comp.id} style={styles.companyCard}>
                                <View style={styles.companyInfoArea}>
                                    <View style={styles.companyAvatar}>
                                        <Text style={styles.companyAvatarText}>{comp.name.charAt(0).toUpperCase()}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.companyName} numberOfLines={1}>{comp.name}</Text>
                                        <Text style={styles.companyMeta}>{comp.contact_email}</Text>
                                        <View style={styles.companyBadges}>
                                            <View style={[styles.microBadge, { backgroundColor: statusBadgeColor + '20', borderColor: statusBadgeColor }]}>
                                                <Text style={[styles.microBadgeText, { color: statusBadgeColor }]}>{comp.status?.toUpperCase()}</Text>
                                            </View>
                                            {activeSub && (
                                                <View style={[styles.microBadge, { backgroundColor: '#3B82F620', borderColor: '#3B82F6' }]}>
                                                    <Text style={[styles.microBadgeText, { color: '#3B82F6' }]}>SUBSCRIBED</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => toggleCompanyStatus(comp.id, comp.status)}
                                    style={styles.actionButton}
                                >
                                    <FontAwesome name={comp.status === 'active' ? 'pause' : 'play'} size={14} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
        </SuperAdminGuard>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 15,
    },
    backButton: {
        marginRight: 16,
        padding: 10,
        borderRadius: 20,
        backgroundColor: colors.card + '30',
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: { fontSize: 28, fontWeight: 'bold', color: colors.text, letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    
    alertBox: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        ...Layout.shadows.medium,
    },
    alertIcon: {
        width: 40, height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
    },
    alertContent: { flex: 1 },
    alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    alertDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    alertAction: {
        backgroundColor: '#fff',
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 6,
    },
    alertActionText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },

    actionRow: { flexDirection: 'row', marginBottom: 24 },

    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 12,
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12, marginTop: 8 },
    viewAllText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

    statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    statCard: {
        flex: 1,
        backgroundColor: colors.card + 'F0',
        padding: 16,
        borderRadius: 12,
        ...Layout.shadows.small,
    },
    statIconWrapper: {
        width: 32, height: 32,
        borderRadius: 8,
        backgroundColor: colors.background,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 12,
    },
    statValue: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 2 },
    statLabel: { fontSize: 13, color: colors.primary, fontWeight: '600', marginBottom: 6 },
    statSubInfo: { fontSize: 11, color: colors.textSecondary },

    companyCard: {
        backgroundColor: colors.card + 'F0',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        ...Layout.shadows.small,
    },
    companyInfoArea: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
    companyAvatar: {
        width: 44, height: 44,
        borderRadius: 10,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
    },
    companyAvatarText: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
    companyName: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 2 },
    companyMeta: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
    companyBadges: { flexDirection: 'row', gap: 6 },
    microBadge: {
        paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: 4, borderWidth: 1,
    },
    microBadgeText: { fontSize: 9, fontWeight: 'bold' },
    
    actionButton: {
        width: 36, height: 36,
        borderRadius: 18,
        backgroundColor: colors.background,
        justifyContent: 'center', alignItems: 'center',
    }
});
