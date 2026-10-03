import { SuperAdminGuard } from '@/components/auth/SuperAdminGuard';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Gradients, Layout } from '@/constants/Colors';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Plan {
    id: string;
    name: string;
    price: number;
    duration_months: number;
    max_users: number;
    description: string;
    is_active: boolean;
}

export default function ManagePlansScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);
    const router = useRouter();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Partial<Plan>>({});
    const [fetchError, setFetchError] = useState<string | null>(null);
    const { showFeedback, confirmAction } = useFeedback();

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .order('price');

            if (error) throw error;
            setPlans(data || []);
        } catch (e: any) {
            console.error('Failed to load plans:', e);
            setFetchError(e?.message || 'Network request failed. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleSavePlan = async () => {
        try {
            if (!editingPlan.name || !editingPlan.price || !editingPlan.duration_months) {
                showFeedback('error', 'Error', 'Please fill all required fields');
                return;
            }

            const payload = {
                name: editingPlan.name,
                price: parseFloat(editingPlan.price as any),
                duration_months: parseInt(editingPlan.duration_months as any),
                max_users: parseInt(editingPlan.max_users as any) || 0,
                description: editingPlan.description,
                is_active: editingPlan.is_active !== undefined ? editingPlan.is_active : true,
            };

            let error;
            if (editingPlan.id) {
                const { error: updateError } = await supabase
                    .from('subscription_plans')
                    .update(payload)
                    .eq('id', editingPlan.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('subscription_plans')
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            setModalVisible(false);
            setEditingPlan({});
            fetchPlans();
        } catch (e: any) {
            showFeedback('error', 'Error', e.message);
        }
    };

    const confirmToggleActive = (plan: Plan) => {
        confirmAction(
            'error',
            plan.is_active ? 'Deactivate Plan' : 'Activate Plan',
            `Are you sure you want to ${plan.is_active ? 'deactivate' : 'activate'} this plan?`,
            async () => {
                const { error } = await supabase
                    .from('subscription_plans')
                    .update({ is_active: !plan.is_active })
                    .eq('id', plan.id);
                if (error) showFeedback('error', 'Error', error.message);
                else fetchPlans();
            },
            'Confirm'
        );
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
                <ResponsiveContainer>
                    <View style={styles.topHeader}>
                        <TouchableOpacity onPress={() => router.push('/(super-admin)/superadminDasboarde')} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={20} color={colors.text} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.header}>Subscription Plans</Text>
                            <Text style={styles.headerSub}>Manage tiers, features, and billing pricing</Text>
                        </View>
                        <AppButton
                            title="+ New Plan"
                            size="sm"
                            onPress={() => { setEditingPlan({}); setModalVisible(true); }}
                        />
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {loading ? (
                            <View style={{ gap: 16 }}>
                                <Skeleton height={140} borderRadius={18} />
                                <Skeleton height={140} borderRadius={18} />
                                <Skeleton height={140} borderRadius={18} />
                            </View>
                        ) : fetchError && plans.length === 0 ? (
                            <View style={{ alignItems: 'center', padding: 32, gap: 12 }}>
                                <Ionicons name="cloud-offline-outline" size={48} color={colors.danger} />
                                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Failed to load plans</Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', maxWidth: 320 }}>{fetchError}</Text>
                                <AppButton title="Retry Connection" size="sm" onPress={fetchPlans} style={{ marginTop: 8 }} />
                            </View>
                        ) : (
                            plans.map(plan => (
                                <BlurView
                                    key={plan.id}
                                    intensity={theme === 'dark' ? 35 : 60}
                                    tint={theme === 'dark' ? 'dark' : 'light'}
                                    style={[
                                        styles.card,
                                        theme === 'dark' ? styles.cardDark : styles.cardLight,
                                        !plan.is_active && styles.inactiveCard,
                                    ]}
                                >
                                    <View style={styles.cardHeader}>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Text style={styles.planName}>{plan.name}</Text>
                                                {!plan.is_active && (
                                                    <View style={styles.inactiveBadge}>
                                                        <Text style={styles.inactiveBadgeText}>Inactive</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.planPrice}>
                                                {plan.price} ETB
                                                <Text style={styles.planPeriod}> / {plan.duration_months} mo</Text>
                                            </Text>
                                        </View>
                                        <TouchableOpacity onPress={() => confirmToggleActive(plan)} style={{ padding: 4 }}>
                                            <Ionicons
                                                name={plan.is_active ? 'toggle' : 'toggle-outline'}
                                                size={32}
                                                color={plan.is_active ? colors.success : colors.textSecondary}
                                            />
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={styles.description}>{plan.description || 'Full features access tier'}</Text>

                                    <View style={styles.metaRow}>
                                        <View style={styles.metaChip}>
                                            <Ionicons name="people-outline" size={13} color={colors.primary} />
                                            <Text style={styles.metaChipText}>
                                                {plan.max_users === 0 ? 'Unlimited Users' : `${plan.max_users} Users max`}
                                            </Text>
                                        </View>
                                        <View style={styles.metaChip}>
                                            <Ionicons name="time-outline" size={13} color={colors.primary} />
                                            <Text style={styles.metaChipText}>{plan.duration_months} Months validity</Text>
                                        </View>
                                    </View>

                                    <View style={styles.actions}>
                                        <AppButton
                                            title="Edit Plan"
                                            size="sm"
                                            variant="outline"
                                            onPress={() => { setEditingPlan(plan); setModalVisible(true); }}
                                        />
                                    </View>
                                </BlurView>
                            ))
                        )}
                    </ScrollView>
                </ResponsiveContainer>

                <Modal visible={modalVisible} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <BlurView
                            tint={theme === 'dark' ? 'dark' : 'light'}
                            intensity={theme === 'dark' ? 80 : 95}
                            style={[styles.modalContent, theme === 'dark' ? styles.cardDark : styles.cardLight]}
                        >
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {editingPlan.id ? 'Edit Plan' : 'New Plan'}
                            </Text>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <AppTextInput
                                    label="Name"
                                    value={editingPlan.name}
                                    placeholder="e.g. Pro Annual Plan"
                                    onChangeText={t => setEditingPlan({ ...editingPlan, name: t })}
                                />
                                <View style={styles.row}>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <AppTextInput
                                            label="Price (ETB / ብር)"
                                            value={editingPlan.price?.toString()}
                                            placeholder="2999"
                                            onChangeText={t => setEditingPlan({ ...editingPlan, price: t as any })}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <AppTextInput
                                            label="Duration (Months)"
                                            value={editingPlan.duration_months?.toString()}
                                            placeholder="12"
                                            onChangeText={t => setEditingPlan({ ...editingPlan, duration_months: t as any })}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>
                                <AppTextInput
                                    label="Max Users (0 = Unlimited)"
                                    value={editingPlan.max_users?.toString()}
                                    placeholder="10"
                                    onChangeText={t => setEditingPlan({ ...editingPlan, max_users: t as any })}
                                    keyboardType="numeric"
                                />
                                <AppTextInput
                                    label="Description"
                                    value={editingPlan.description}
                                    placeholder="Summary of tier benefits..."
                                    onChangeText={t => setEditingPlan({ ...editingPlan, description: t })}
                                    multiline
                                />
                            </ScrollView>
                            <View style={styles.modalActions}>
                                <AppButton
                                    title="Cancel"
                                    variant="ghost"
                                    onPress={() => setModalVisible(false)}
                                    style={{ flex: 1, marginRight: 8 }}
                                />
                                <AppButton
                                    title="Save Plan"
                                    onPress={handleSavePlan}
                                    style={{ flex: 1 }}
                                />
                            </View>
                        </BlurView>
                    </View>
                </Modal>
            </View>
        </SuperAdminGuard>
    );
}

const createStyles = (colors: any, theme: 'light' | 'dark') => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 36,
        paddingBottom: 18,
        gap: 14,
    },
    backButton: {
        padding: 10,
        borderRadius: Layout.borderRadius.md,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border,
        width: 42,
        height: 42,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    scrollContent: { padding: 20, paddingTop: 6, paddingBottom: 40 },
    card: {
        overflow: 'hidden',
        padding: 20,
        borderRadius: Layout.borderRadius.lg,
        marginBottom: 16,
        borderWidth: 1,
        ...Layout.shadows.small,
    },
    cardLight: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: colors.border,
    },
    cardDark: {
        backgroundColor: 'rgba(17, 24, 39, 0.75)',
        borderColor: 'rgba(255,255,255,0.08)',
    },
    inactiveCard: { opacity: 0.6 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    planName: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    planPrice: { fontSize: 24, fontWeight: '900', color: colors.primary, marginTop: 4, letterSpacing: -0.5 },
    planPeriod: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
    description: { color: colors.textSecondary, marginBottom: 14, fontSize: 13, lineHeight: 18 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Layout.borderRadius.sm,
        backgroundColor: colors.primaryLight,
    },
    metaChipText: { fontSize: 11, fontWeight: '600', color: colors.primary },
    inactiveBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    inactiveBadgeText: { color: colors.danger, fontSize: 10, fontWeight: '700' },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: {
        borderRadius: Layout.borderRadius.xl,
        padding: 24,
        width: '100%',
        maxWidth: 520,
        maxHeight: '85%',
        borderWidth: 1,
        overflow: 'hidden',
        ...Layout.shadows.large,
    },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, textAlign: 'center', letterSpacing: -0.3 },
    row: { flexDirection: 'row' },
    modalActions: { flexDirection: 'row', marginTop: 20, gap: 10 },
});
