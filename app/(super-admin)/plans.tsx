import { SuperAdminGuard } from '@/components/auth/SuperAdminGuard';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Gradients } from '@/constants/Colors';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
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
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Partial<Plan>>({});
    const { showFeedback, confirmAction } = useFeedback();

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .order('price');

            if (error) throw error;
            setPlans(data || []);
        } catch (e) {
            console.error(e);
            showFeedback('error', 'Error', 'Failed to load plans');
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
                is_active: editingPlan.is_active !== undefined ? editingPlan.is_active : true
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
            plan.is_active ? "Deactivate Plan" : "Activate Plan",
            `Are you sure you want to ${plan.is_active ? 'deactivate' : 'activate'} this plan?`,
            async () => {
                const { error } = await supabase
                    .from('subscription_plans')
                    .update({ is_active: !plan.is_active })
                    .eq('id', plan.id);
                if (error) showFeedback('error', "Error", error.message);
                else fetchPlans();
            },
            "Confirm"
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
                <View style={styles.topHeader}>
                    <TouchableOpacity onPress={() => router.push('/(super-admin)/superadminDasboarde')} style={styles.backButton}>
                        <FontAwesome name="arrow-left" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.header}>Subscription Plans</Text>
                        <Text style={styles.headerSub}>Manage tiers and pricing</Text>
                    </View>
                    <AppButton
                        title="+ New"
                        onPress={() => { setEditingPlan({}); setModalVisible(true); }}
                        style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 }}
                        textStyle={{ fontSize: 13 }}
                    />
                </View>

                <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10 }}>
                    {plans.map(plan => (
                        <BlurView
                            key={plan.id}
                            intensity={theme === 'dark' ? 60 : 80}
                            tint={theme === 'dark' ? 'dark' : 'light'}
                            style={[
                                styles.card,
                                theme === 'dark' ? styles.cardDark : styles.cardLight,
                                !plan.is_active && styles.inactiveCard
                            ]}
                        >
                            <View style={styles.cardHeader}>
                                <View>
                                    <Text style={styles.planName}>{plan.name} {plan.is_active ? '' : '(Inactive)'}</Text>
                                    <Text style={styles.planPrice}>${plan.price} / {plan.duration_months}mo</Text>
                                </View>
                                <TouchableOpacity onPress={() => confirmToggleActive(plan)}>
                                    <FontAwesome name={plan.is_active ? "toggle-on" : "toggle-off"} size={24} color={plan.is_active ? colors.success : colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.description}>{plan.description}</Text>
                            <Text style={styles.details}>Users: {plan.max_users === 0 ? 'Unlimited' : plan.max_users}</Text>

                            <View style={styles.actions}>
                                <TouchableOpacity onPress={() => { setEditingPlan(plan); setModalVisible(true); }} style={styles.editButton}>
                                    <Text style={styles.editButtonText}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                        </BlurView>
                    ))}
                </ScrollView>
            </View>

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <BlurView
                        tint={theme === 'dark' ? 'dark' : 'light'}
                        intensity={theme === 'dark' ? 80 : 100}
                        style={[styles.modalContent, theme === 'dark' ? styles.cardDark : styles.cardLight]}
                    >
                        <Text style={[styles.modalTitle, { color: colors.text }]}>{editingPlan.id ? 'Edit Plan' : 'New Plan'}</Text>
                        <ScrollView>
                            <AppTextInput label="Name" value={editingPlan.name} onChangeText={t => setEditingPlan({ ...editingPlan, name: t })} />
                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <AppTextInput label="Price" value={editingPlan.price?.toString()} onChangeText={t => setEditingPlan({ ...editingPlan, price: t as any })} keyboardType="numeric" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <AppTextInput label="Duration (Months)" value={editingPlan.duration_months?.toString()} onChangeText={t => setEditingPlan({ ...editingPlan, duration_months: t as any })} keyboardType="numeric" />
                                </View>
                            </View>
                            <AppTextInput label="Max Users (0 = Unlimited)" value={editingPlan.max_users?.toString()} onChangeText={t => setEditingPlan({ ...editingPlan, max_users: t as any })} keyboardType="numeric" />
                            <AppTextInput label="Description" value={editingPlan.description} onChangeText={t => setEditingPlan({ ...editingPlan, description: t })} multiline />
                        </ScrollView>
                        <View style={styles.modalActions}>
                            <AppButton title="Cancel" variant="outline" onPress={() => setModalVisible(false)} style={{ flex: 1, marginRight: 8 }} />
                            <AppButton title="Save" onPress={handleSavePlan} style={{ flex: 1 }} />
                        </View>
                    </BlurView>
                </View>
            </Modal>
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
    header: { fontSize: 24, fontWeight: 'bold', color: colors.text, letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    card: {
        overflow: 'hidden',
        padding: 16,
        borderRadius: 24,
        marginBottom: 16,
    },
    cardLight: {
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderColor: 'rgba(255,255,255,0.8)',
        borderWidth: 1,
    },
    cardDark: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
    },
    inactiveCard: { opacity: 0.6 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    planName: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    planPrice: { fontSize: 16, fontWeight: '600', color: colors.primary },
    description: { color: colors.textSecondary, marginBottom: 8 },
    details: { fontSize: 12, fontWeight: '600', color: colors.text },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
    editButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.card + '40', borderRadius: 8 },
    editButtonText: { fontWeight: '600', color: colors.text },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 24, padding: 24, maxHeight: '80%', overflow: 'hidden' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    row: { flexDirection: 'row' },
    modalActions: { flexDirection: 'row', marginTop: 20 }
});
