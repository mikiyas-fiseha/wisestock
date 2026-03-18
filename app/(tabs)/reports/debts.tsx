import { AgingBadge } from '@/components/reports/AgingBadge';
import { DateRange, ReportLayout } from '@/components/reports/ReportLayout';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { useCollectPayment } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ─── Hook ─────────────────────────────────────────────────────────────────────
function useARaging() {
    const { company, branch } = useAuth();
    return useQuery({
        queryKey: ['ar-aging', company?.id, branch?.id],
        queryFn: async () => {
            if (!company?.id) return [];
            const { data, error } = await supabase.rpc('get_ar_aging', {
                p_company_id: company.id,
                p_branch_id: branch?.id || null,
            });
            if (error) throw error;
            return data || [];
        },
        enabled: !!company?.id,
    });
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ReceivablesReport() {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { data = [], isLoading, refetch } = useARaging();
    const { showFeedback } = useFeedback();
    const queryClient = useQueryClient();

    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date()
    });


    // Collection State
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const { mutate: collectPayment, isPending: isCollecting } = useCollectPayment();

    const totals = useMemo(() => ({
        total: data.reduce((s: number, r: any) => s + Number(r.current_balance || 0), 0),
        b0_30: data.reduce((s: number, r: any) => s + Number(r.bucket_0_30 || 0), 0),
        b31_60: data.reduce((s: number, r: any) => s + Number(r.bucket_31_60 || 0), 0),
        b61: data.reduce((s: number, r: any) => s + Number(r.bucket_61_plus || 0), 0),
    }), [data]);

    const handlePaymentSubmit = () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            showFeedback('error', 'Error', "Please enter a valid amount");
            return;
        }

        collectPayment({
            customerId: selectedCustomer.customer_id,
            amount: paymentAmount,
            notes: paymentNotes
        }, {
            onSuccess: () => {
                setSelectedCustomer(null);
                setPaymentAmount('');
                setPaymentNotes('');
                showFeedback('success', 'Success', "Payment recorded");
                refetch();
                queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            },
            onError: (err) => {
                showFeedback('error', 'Error', err.message);
            }
        });
    };

    return (
        <ReportLayout
            title="Receivables (AR)"
            subtitle="Customer outstanding balances & aging"
            onDateRangeChange={setRange}
            isLoading={isLoading}
        >
            <View style={styles.container}>
                {/* Summary Banner */}
                <View style={styles.banner}>
                    <View style={styles.bannerItem}>
                        <Text style={styles.bannerLabel}>Total Receivables</Text>
                        <Text style={[styles.bannerValue, { color: colors.secondary || '#0EA5E9' }]}>{totals.total.toFixed(2)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.bannerItem}>
                        <Text style={styles.bannerLabel}>0–30 Days</Text>
                        <Text style={[styles.bannerValue, { color: colors.success }]}>{totals.b0_30.toFixed(2)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.bannerItem}>
                        <Text style={styles.bannerLabel}>31–60 Days</Text>
                        <Text style={[styles.bannerValue, { color: colors.warning }]}>{totals.b31_60.toFixed(2)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.bannerItem}>
                        <Text style={styles.bannerLabel}>60+ Days</Text>
                        <Text style={[styles.bannerValue, { color: colors.danger }]}>{totals.b61.toFixed(2)}</Text>
                    </View>
                </View>

                {data.length === 0 ? (
                    <View style={styles.center}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
                        <Text style={styles.emptyTitle}>No Outstanding Receivables</Text>
                        <Text style={styles.emptyText}>All customer balances are settled.</Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                        {(data as any[]).map((row) => (
                            <TouchableOpacity
                                key={row.customer_id}
                                style={styles.card}
                                onPress={() => router.push(`/(tabs)/customers/${row.customer_id}`)}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.name}>{row.customer_name}</Text>
                                        {row.phone ? <Text style={styles.phone}>{row.phone}</Text> : null}
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <TouchableOpacity
                                                style={styles.actionBtn}
                                                onPress={() => {
                                                    setSelectedCustomer(row);
                                                    setPaymentAmount(row.current_balance.toString());
                                                }}
                                            >
                                                <FontAwesome name="money" size={16} color={colors.primary} />
                                                <Text style={styles.actionText}>Collect</Text>
                                            </TouchableOpacity>
                                            <Text style={styles.balance}>{Number(row.current_balance).toFixed(2)}</Text>
                                        </View>
                                        <AgingBadge days={row.overdue_days || 0} />
                                    </View>
                                </View>
                                {/* Bucket breakdown */}
                                <View style={styles.buckets}>
                                    <View style={styles.bucket}>
                                        <Text style={styles.bucketLabel}>0–30 Days</Text>
                                        <Text style={[styles.bucketValue, !Number(row.bucket_0_30) && { color: colors.border }]}>
                                            {Number(row.bucket_0_30).toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={styles.bucket}>
                                        <Text style={styles.bucketLabel}>31–60 Days</Text>
                                        <Text style={[styles.bucketValue, Number(row.bucket_31_60) > 0 && { color: colors.warning }, !Number(row.bucket_31_60) && { color: colors.border }]}>
                                            {Number(row.bucket_31_60).toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={styles.bucket}>
                                        <Text style={styles.bucketLabel}>60+ Days</Text>
                                        <Text style={[styles.bucketValue, Number(row.bucket_61_plus) > 0 && { color: colors.danger }, !Number(row.bucket_61_plus) && { color: colors.border }]}>
                                            {Number(row.bucket_61_plus).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
                {/* Payment Modal */}
                <Modal visible={!!selectedCustomer} animationType="fade" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Collect Payment</Text>
                            <Text style={styles.modalSubtitle}>Record a payment from {selectedCustomer?.customer_name}</Text>

                            <View style={{ marginBottom: 16 }}>
                                <AppTextInput
                                    label="Amount"
                                    value={paymentAmount}
                                    onChangeText={setPaymentAmount}
                                    keyboardType="numeric"
                                    prefix="$"
                                    placeholder="0.00"
                                />
                                <AppTextInput
                                    label="Notes (Optional)"
                                    value={paymentNotes}
                                    onChangeText={setPaymentNotes}
                                    placeholder="Ref #, Bank info..."
                                />
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <AppButton title="Cancel" variant="outline" onPress={() => setSelectedCustomer(null)} style={{ flex: 1 }} />
                                <AppButton title="Confirm Payment" onPress={handlePaymentSubmit} loading={isCollecting} style={{ flex: 1 }} />
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </ReportLayout>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    banner: { flexDirection: 'row', backgroundColor: colors.card + 'F0', paddingVertical: 18, paddingHorizontal: 12, borderRadius: 16, marginBottom: 16, marginHorizontal: 16 },
    bannerItem: { flex: 1, alignItems: 'center' },
    bannerLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
    bannerValue: { fontSize: 15, fontWeight: '800', color: colors.text },
    divider: { width: 1, backgroundColor: colors.border + '40', marginVertical: 8 },
    card: { backgroundColor: colors.card + 'E0', borderRadius: 16, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    name: { fontSize: 15, fontWeight: '700', color: colors.text },
    phone: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    balance: { fontSize: 18, fontWeight: '800', color: colors.text },
    buckets: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border + '40', paddingTop: 12 },
    bucket: { flex: 1, alignItems: 'center' },
    bucketLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 },
    bucketValue: { fontSize: 13, fontWeight: '700', color: colors.text },
    // Modal & Buttons
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    actionText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: colors.card + 'F0', borderRadius: 24, padding: 24, overflow: 'hidden' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8, textAlign: 'center' },
    modalSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24, textAlign: 'center' },
});
