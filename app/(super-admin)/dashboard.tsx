
import { SuperAdminGuard } from '@/components/auth/SuperAdminGuard';
import { AppButton } from '@/components/ui/AppButton';
import { Colors, Layout } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useFeedback } from '@/context/FeedbackContext';

export default function SuperAdminDashboard() {
    const router = useRouter();
    const { showFeedback } = useFeedback();
    const [stats, setStats] = useState({
        totalCompanies: 0,
        activeSubscriptions: 0,
        totalRevenue: 0 // Mocked for now
    });
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // 1. Get Company Count
            const { count: companyCount } = await supabase.from('companies').select('*', { count: 'exact', head: true });

            // 2. Get Active Subscriptions Count
            const { count: subCount } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');

            setStats({
                totalCompanies: companyCount || 0,
                activeSubscriptions: subCount || 0,
                totalRevenue: (subCount || 0) * 29.99 // Mock calc
            });

            // 3. Get Recent Companies
            const { data: recentCompanies } = await supabase
                .from('companies')
                .select('*, subscriptions(status, plan_id)')
                .order('created_at', { ascending: false })
                .limit(5);

            setCompanies(recentCompanies || []);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleCompanyStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        const { error } = await supabase.from('companies').update({ status: newStatus }).eq('id', id);

        if (error) {
            showFeedback('error', 'Error', error.message);
        } else {
            fetchDashboardData(); // Refresh
        }
    };

    return (
        <SuperAdminGuard>
            <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
                <Text style={styles.header}>Super Admin</Text>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.totalCompanies}</Text>
                        <Text style={styles.statLabel}>Companies</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.activeSubscriptions}</Text>
                        <Text style={styles.statLabel}>Active Subs</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>${stats.totalRevenue.toFixed(0)}</Text>
                        <Text style={styles.statLabel}>MRR (Est)</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Management</Text>
                </View>
                <View style={styles.actionRow}>
                    <AppButton
                        title="Manage Plans"
                        onPress={() => router.push('/(super-admin)/plans')}
                        variant="outline"
                        style={{ flex: 1, marginRight: 10 }}
                    />
                    <AppButton
                        title="All Companies"
                        onPress={() => router.push('/(super-admin)/companies')}
                        variant="outline"
                        style={{ flex: 1 }}
                    />
                </View>

                {/* Recent Companies */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Companies</Text>
                </View>

                {companies.map(comp => (
                    <View key={comp.id} style={styles.companyCard}>
                        <View>
                            <Text style={styles.companyName}>{comp.name}</Text>
                            <Text style={styles.companyMeta}>Joined: {new Date(comp.created_at).toLocaleDateString()}</Text>
                            <Text style={[styles.statusText, comp.status === 'active' ? { color: 'green' } : { color: 'red' }]}>
                                {comp.status?.toUpperCase() || 'UNKNOWN'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => toggleCompanyStatus(comp.id, comp.status)}
                            style={styles.actionButton}
                        >
                            <FontAwesome name={comp.status === 'active' ? 'pause' : 'play'} size={16} color={Colors.light.textSecondary} />
                        </TouchableOpacity>
                    </View>
                ))}

            </ScrollView>
        </SuperAdminGuard>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    header: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginBottom: 24,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        ...Layout.shadows.small,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.light.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.light.textSecondary,
    },
    sectionHeader: {
        marginBottom: 16,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    actionRow: {
        flexDirection: 'row',
        marginBottom: 32,
    },
    companyCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    companyName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    companyMeta: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        marginVertical: 2,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    actionButton: {
        padding: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    }
});
