
import { SuperAdminGuard } from '@/components/auth/SuperAdminGuard';
import { Colors, Layout } from '@/constants/Colors';
import { useFeedback } from '@/context/FeedbackContext';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CompaniesScreen() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { showFeedback } = useFeedback();

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            // Use the secure RPC function
            const { data, error } = await supabase.rpc('get_admin_companies');

            if (error) throw error;
            setCompanies(data || []);
        } catch (e) {
            console.error(e);
            showFeedback('error', 'Error', 'Failed to load companies');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id: string, current: string) => {
        const newStatus = current === 'active' ? 'suspended' : 'active';
        const { error } = await supabase.from('companies').update({ status: newStatus }).eq('id', id);
        if (error) showFeedback('error', 'Error', error.message);
        else fetchCompanies();
    };

    const approveSubscription = async (subId: string) => {
        // Use the secure RPC function
        const { error } = await supabase.rpc('approve_subscription', { sub_id: subId });
        if (error) {
            showFeedback('error', 'Error', 'Failed to approve subscription');
        } else {
            showFeedback('success', 'Success', 'Subscription approved');
            fetchCompanies();
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <SuperAdminGuard>
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Text style={styles.header}>Company Management</Text>
                </View>

                <FlatList
                    data={companies}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 20 }}
                    renderItem={({ item }) => {
                        // RPC returns flattened structure, need to adapt if needed or use as is
                        // The RPC returns: id, name, ..., plan_name, sub_status, sub_end_date, sub_id

                        const planName = item.plan_name || 'No Plan';
                        const subStatus = item.sub_status;
                        const subEndDate = item.sub_end_date;
                        const subId = item.sub_id;

                        return (
                            <View style={styles.card}>
                                <View style={styles.row}>
                                    <View>
                                        <Text style={styles.name}>{item.name}</Text>
                                        <Text style={styles.email}>{item.contact_email}</Text>
                                        <Text style={styles.meta}>Joined: {formatDate(item.created_at)}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => toggleStatus(item.id, item.status)}>
                                        <View style={[styles.badge, item.status === 'active' ? styles.badgeActive : styles.badgeSuspended]}>
                                            <Text style={styles.badgeText}>{item.status?.toUpperCase()}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.subInfo}>
                                    <Text style={styles.subTitle}>Subscription</Text>
                                    <View style={styles.row}>
                                        <Text style={styles.planName}>{planName}</Text>
                                        <Text style={[styles.subStatus, subStatus === 'active' ? { color: 'green' } : subStatus === 'pending_approval' ? { color: 'orange' } : { color: 'red' }]}>
                                            {subStatus?.toUpperCase() || 'NONE'}
                                        </Text>
                                    </View>
                                    {subEndDate && (
                                        <Text style={styles.expiry}>Expires: {formatDate(subEndDate)}</Text>
                                    )}
                                    {subStatus === 'pending_approval' && subId && (
                                        <TouchableOpacity
                                            style={styles.approveBtn}
                                            onPress={() => approveSubscription(subId)}
                                        >
                                            <Text style={styles.approveText}>Approve Subscription</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Future: Actions to extend subscription manually */}
                            </View>
                        );
                    }}
                />
            </View>
        </SuperAdminGuard>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    headerRow: { padding: 20, paddingBottom: 0 },
    header: { fontSize: 24, fontWeight: 'bold', color: Colors.light.text },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, ...Layout.shadows.small },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    name: { fontSize: 18, fontWeight: 'bold', color: Colors.light.text },
    email: { color: Colors.light.textSecondary, marginBottom: 4 },
    meta: { fontSize: 12, color: '#999' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeActive: { backgroundColor: '#E3FCEF' },
    badgeSuspended: { backgroundColor: '#FFEBE6' },
    badgeText: { fontSize: 10, fontWeight: 'bold', color: '#172B4D' },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
    subInfo: {},
    subTitle: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 4 },
    planName: { fontSize: 16, fontWeight: '600' },
    subStatus: { fontWeight: 'bold' },
    expiry: { fontSize: 12, color: '#999', marginTop: 2 },
    approveBtn: { backgroundColor: Colors.light.primary, padding: 8, borderRadius: 6, marginTop: 8, alignItems: 'center' },
    approveText: { color: '#fff', fontWeight: 'bold', fontSize: 12 }
});
