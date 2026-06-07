import { AgingBadge } from '@/components/reports/AgingBadge';
import { DateRange, ReportLayout } from '@/components/reports/ReportLayout';
import { RecordPaymentModal } from '@/components/suppliers/RecordPaymentModal';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { useSuppliers } from '@/hooks/useSuppliers';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ─── Hook ─────────────────────────────────────────────────────────────────────
function useAPaging() {
    const { company, branch } = useAuth();
    return useQuery({
        queryKey: ['ap-aging', company?.id, branch?.id],
        queryFn: async () => {
            if (!company?.id) return [];
            const { data, error } = await supabase.rpc('get_ap_aging', {
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
export default function PayablesReport() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { data = [], isLoading, refetch } = useAPaging();
    const { company } = useAuth();
    const { showFeedback } = useFeedback();
    const queryClient = useQueryClient();

    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().setDate(new Date().getDate() - 7)),
        end: new Date()
    });


    // Payment State
    const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
    const { recordPayment, isRecordingPayment } = useSuppliers();
    const [isUploading, setIsUploading] = useState(false);

    const totals = useMemo(() => ({
        total: data.reduce((s: number, r: any) => s + Number(r.current_balance || 0), 0),
        b0_30: data.reduce((s: number, r: any) => s + Number(r.bucket_0_30 || 0), 0),
        b31_60: data.reduce((s: number, r: any) => s + Number(r.bucket_31_60 || 0), 0),
        b61: data.reduce((s: number, r: any) => s + Number(r.bucket_61_plus || 0), 0),
    }), [data]);

    const handlePaymentSubmit = async (p: { amount: number; method: string; date: Date; notes: string; receiptUri: string | null }) => {
        try {
            setIsUploading(true);
            let receiptUrl = null;
            if (p.receiptUri) {
                receiptUrl = await uploadImageToCloudinary(p.receiptUri);
            }
            const paymentId = await recordPayment({
                supplier_id: selectedSupplier.supplier_id,
                amount: p.amount,
                payment_date: p.date,
                method: p.method,
                notes: p.notes
            });
            if (receiptUrl && paymentId) {
                await supabase.from('supplier_payments').update({ receipt_url: receiptUrl }).eq('id', paymentId);
            }
            showFeedback('success', t('common.success'), t('common.save_success'));
            setSelectedSupplier(null);
            refetch();
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        } catch (error: any) {
            showFeedback('error', t('common.error'), error.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <ReportLayout
            title={t('reports.payables_ap')}
            subtitle={t('reports.payables_subtitle')}
            onDateRangeChange={setRange}
            isLoading={isLoading}
        >
            <View style={styles.container}>
                {/* Summary Banner */}
                <View style={styles.banner}>
                    <View style={styles.bannerItem}>
                        <Text style={styles.bannerLabel}>{t('reports.payables')}</Text>
                        <Text style={[styles.bannerValue, { color: colors.danger }]}>{formatCurrency(totals.total)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.bannerItem}>
                        <Text style={styles.bannerLabel}>0–30 {t('reports.days')}</Text>
                        <Text style={[styles.bannerValue, { color: colors.success }]}>{formatCurrency(totals.b0_30)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.bannerItem}>
                        <Text style={styles.bannerLabel}>31–60 {t('reports.days')}</Text>
                        <Text style={[styles.bannerValue, { color: colors.warning }]}>{formatCurrency(totals.b31_60)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.bannerItem}>
                        <Text style={styles.bannerLabel}>60+ {t('reports.days')}</Text>
                        <Text style={[styles.bannerValue, { color: colors.danger }]}>{formatCurrency(totals.b61)}</Text>
                    </View>
                </View>

                {data.length === 0 ? (
                    <View style={styles.center}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
                        <Text style={styles.emptyTitle}>{t('reports.no_outstanding_payables')}</Text>
                        <Text style={styles.emptyText}>{t('reports.no_outstanding_payables_subtitle')}</Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                        {(data as any[]).map((row) => (
                            <TouchableOpacity
                                key={row.supplier_id}
                                style={styles.card}
                                onPress={() => router.push(`/(tabs)/suppliers/${row.supplier_id}`)}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.name}>{row.supplier_name}</Text>
                                        {row.phone ? <Text style={styles.phone}>{row.phone}</Text> : null}
                                        {row.oldest_due_date && (
                                            <Text style={styles.dueDate}>{t('reports.oldest')}: {new Date(row.oldest_due_date).toLocaleDateString()}</Text>
                                        )}
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <TouchableOpacity
                                                style={[styles.actionBtn, { backgroundColor: colors.danger + '18' }]}
                                                onPress={() => setSelectedSupplier(row)}
                                            >
                                                <FontAwesome name="send" size={14} color={colors.danger} />
                                                <Text style={[styles.actionText, { color: colors.danger }]}>{t('common.payment')}</Text>
                                            </TouchableOpacity>
                                            <Text style={[styles.balance, { color: colors.danger }]}>{formatCurrency(Number(row.current_balance))}</Text>
                                        </View>
                                        <AgingBadge days={row.overdue_days || 0} />
                                    </View>
                                </View>
                                {/* Bucket breakdown */}
                                <View style={styles.buckets}>
                                    <View style={styles.bucket}>
                                        <Text style={styles.bucketLabel}>0–30 {t('reports.days')}</Text>
                                        <Text style={[styles.bucketValue, !Number(row.bucket_0_30) && { color: colors.border }]}>
                                            {formatCurrency(Number(row.bucket_0_30))}
                                        </Text>
                                    </View>
                                    <View style={styles.bucket}>
                                        <Text style={styles.bucketLabel}>31–60 {t('reports.days')}</Text>
                                        <Text style={[styles.bucketValue, Number(row.bucket_31_60) > 0 && { color: colors.warning }, !Number(row.bucket_31_60) && { color: colors.border }]}>
                                            {formatCurrency(Number(row.bucket_31_60))}
                                        </Text>
                                    </View>
                                    <View style={styles.bucket}>
                                        <Text style={styles.bucketLabel}>60+ {t('reports.days')}</Text>
                                        <Text style={[styles.bucketValue, Number(row.bucket_61_plus) > 0 && { color: colors.danger }, !Number(row.bucket_61_plus) && { color: colors.border }]}>
                                            {formatCurrency(Number(row.bucket_61_plus))}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
                {/* Record Payment Modal */}
                <RecordPaymentModal
                    visible={!!selectedSupplier}
                    onClose={() => setSelectedSupplier(null)}
                    onSubmit={handlePaymentSubmit}
                    supplierName={selectedSupplier?.supplier_name || t('common.supplier')}
                    currentBalance={Number(selectedSupplier?.current_balance || 0)}
                    isLoading={isRecordingPayment || isUploading}
                />
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
    card: { backgroundColor: colors.card + 'E0', borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: colors.danger },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    name: { fontSize: 15, fontWeight: '700', color: colors.text },
    phone: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    dueDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    balance: { fontSize: 18, fontWeight: '800' },
    buckets: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border + '40', paddingTop: 12 },
    bucket: { flex: 1, alignItems: 'center' },
    bucketLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 },
    bucketValue: { fontSize: 13, fontWeight: '700', color: colors.text },
    // Actions
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    actionText: { fontSize: 12, fontWeight: '700' },
});
