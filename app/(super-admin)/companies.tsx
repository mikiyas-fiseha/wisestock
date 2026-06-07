import { SuperAdminGuard } from '@/components/auth/SuperAdminGuard';
import { Gradients, Layout } from '@/constants/Colors';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View, Modal, Image, ActivityIndicator } from 'react-native';

export default function CompaniesScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);
    const router = useRouter();
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
    const { showFeedback } = useFeedback();

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
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
                <LinearGradient
                    colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.topHeader}>
                    <TouchableOpacity onPress={() => router.push('/(super-admin)/superadminDasboarde')} style={styles.backButton}>
                        <FontAwesome name="arrow-left" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.header}>Companies</Text>
                        <Text style={styles.headerSub}>Company Management</Text>
                    </View>
                </View>

                <FlatList
                    data={companies}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 20, paddingTop: 10 }}
                    renderItem={({ item }) => {
                        const planName = item.plan_name || 'No Plan';
                        const subStatus = item.sub_status;
                        const subEndDate = item.sub_end_date;
                        const subId = item.sub_id;
                        const receiptUrl = item.sub_receipt_url;

                        return (
                            <View style={styles.card}>
                                <View style={styles.row}>
                                    <View style={{ flex: 1 }}>
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
                                        <Text style={styles.planNameText}>{planName}</Text>
                                        <Text style={[styles.subStatus, subStatus === 'active' ? { color: 'green' } : subStatus === 'pending_approval' ? { color: 'orange' } : { color: 'red' }]}>
                                            {subStatus?.toUpperCase() || 'NONE'}
                                        </Text>
                                    </View>
                                    {subEndDate && (
                                        <Text style={styles.expiry}>Expires: {formatDate(subEndDate)}</Text>
                                    )}

                                    <View style={styles.subActions}>
                                        {receiptUrl && (
                                            <TouchableOpacity
                                                style={[styles.receiptBtn, { borderColor: colors.primary }]}
                                                onPress={() => setSelectedReceipt(receiptUrl)}
                                            >
                                                <FontAwesome name="file-image-o" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                                                <Text style={[styles.receiptText, { color: colors.primary }]}>View Receipt</Text>
                                            </TouchableOpacity>
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
                                </View>
                            </View>
                        );
                    }}
                />

                {/* Receipt Preview Modal */}
                <Modal visible={!!selectedReceipt} transparent animationType="fade" onRequestClose={() => setSelectedReceipt(null)}>
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={styles.modalCloseArea} onPress={() => setSelectedReceipt(null)} />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Payment Proof</Text>
                                <TouchableOpacity onPress={() => setSelectedReceipt(null)} style={styles.closeIcon}>
                                    <FontAwesome name="times" size={20} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            {selectedReceipt ? (
                                <Image
                                    source={{ uri: selectedReceipt }}
                                    style={styles.receiptImage}
                                    resizeMode="contain"
                                />
                            ) : (
                                <ActivityIndicator size="large" color={colors.primary} />
                            )}
                        </View>
                    </View>
                </Modal>
            </View>
        </SuperAdminGuard>
    );
}

const createStyles = (colors: any, theme: string) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 15,
        gap: 12,
    },
    backButton: {
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
    card: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,

        ...Layout.shadows.small
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    name: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    email: { color: colors.textSecondary, marginBottom: 4, fontSize: 13 },
    meta: { fontSize: 12, color: colors.textSecondary },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeActive: { backgroundColor: '#E3FCEF' },
    badgeSuspended: { backgroundColor: '#FFEBE6' },
    badgeText: { fontSize: 10, fontWeight: 'bold', color: '#172B4D' },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
    subInfo: {},
    subTitle: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' },
    planNameText: { fontSize: 16, fontWeight: '600', color: colors.text },
    subStatus: { fontWeight: 'bold', fontSize: 13 },
    expiry: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    subActions: { marginTop: 12, gap: 10 },
    receiptBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1.5,
        backgroundColor: 'transparent',
    },
    receiptText: { fontWeight: '700', fontSize: 13 },
    approveBtn: { backgroundColor: colors.primary, padding: 10, borderRadius: 8, alignItems: 'center' },
    approveText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseArea: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
    },
    modalContent: {
        width: '90%',
        height: '80%',
        backgroundColor: colors.card,
        borderRadius: 20,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    closeIcon: { padding: 4 },
    receiptImage: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
    }
});
