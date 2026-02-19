
import { SuperAdminGuard } from '@/components/auth/SuperAdminGuard';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Colors, Layout } from '@/constants/Colors';
import { useFeedback } from '@/context/FeedbackContext';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
                .order('price'); // Show all, including inactive

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
                max_users: parseInt(editingPlan.max_users as any) || 0, // 0 as unlimited
                description: editingPlan.description,
                is_active: editingPlan.is_active !== undefined ? editingPlan.is_active : true
            };

            let error;
            if (editingPlan.id) {
                // Update
                const { error: updateError } = await supabase
                    .from('subscription_plans')
                    .update(payload)
                    .eq('id', editingPlan.id);
                error = updateError;
            } else {
                // Create
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
            'error', // Use warning/error color for destructive/major actions
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
            <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
                <View style={styles.headerRow}>
                    <Text style={styles.header}>Subscription Plans</Text>
                    <AppButton title="+ New Plan" onPress={() => { setEditingPlan({}); setModalVisible(true); }} style={{ paddingVertical: 8, paddingHorizontal: 12 }} textStyle={{ fontSize: 14 }} />
                </View>

                {plans.map(plan => (
                    <View key={plan.id} style={[styles.card, !plan.is_active && styles.inactiveCard]}>
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.planName}>{plan.name} {plan.is_active ? '' : '(Inactive)'}</Text>
                                <Text style={styles.planPrice}>${plan.price} / {plan.duration_months}mo</Text>
                            </View>
                            <TouchableOpacity onPress={() => confirmToggleActive(plan)}>
                                <FontAwesome name={plan.is_active ? "toggle-on" : "toggle-off"} size={24} color={plan.is_active ? Colors.light.success : Colors.light.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.description}>{plan.description}</Text>
                        <Text style={styles.details}>Users: {plan.max_users === 0 ? 'Unlimited' : plan.max_users}</Text>

                        <View style={styles.actions}>
                            <TouchableOpacity onPress={() => { setEditingPlan(plan); setModalVisible(true); }} style={styles.editButton}>
                                <Text style={styles.editButtonText}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingPlan.id ? 'Edit Plan' : 'New Plan'}</Text>
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
                    </View>
                </View>
            </Modal>
        </SuperAdminGuard>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    header: { fontSize: 24, fontWeight: 'bold' },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, ...Layout.shadows.small },
    inactiveCard: { opacity: 0.6 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    planName: { fontSize: 18, fontWeight: 'bold', color: Colors.light.text },
    planPrice: { fontSize: 16, fontWeight: '600', color: Colors.light.primary },
    description: { color: Colors.light.textSecondary, marginBottom: 8 },
    details: { fontSize: 12, fontWeight: '600', color: Colors.light.text },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
    editButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
    editButtonText: { fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '80%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    row: { flexDirection: 'row' },
    modalActions: { flexDirection: 'row', marginTop: 20 }
});
