import { TransactionItem } from '@/components/TransactionItem';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Colors, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useCollectPayment } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CustomerDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { company } = useAuth();
    const { showFeedback } = useFeedback();

    const [customer, setCustomer] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Payment State
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const { mutate: collectPayment, isPending: isCollecting } = useCollectPayment();

    useEffect(() => {
        fetchCustomerDetails();
    }, [id]);

    const fetchCustomerDetails = async () => {
        try {
            setLoading(true);
            const { data: custData, error: custError } = await supabase
                .from('customers')
                .select('*')
                .eq('id', id)
                .single();

            if (custError) throw custError;

            setCustomer(custData);

            const { data: transData, error: transError } = await supabase
                .from('customer_transactions')
                .select('*')
                .eq('customer_id', id)
                .order('created_at', { ascending: false });

            if (transError) throw transError;
            setTransactions(transData || []);

        } catch (e) {
            console.error(e);
            showFeedback('error', 'Error', 'Failed to load customer');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSubmit = () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            showFeedback('error', 'Error', "Please enter a valid amount");
            return;
        }

        collectPayment({
            customerId: id,
            amount: paymentAmount,
            notes: paymentNotes
        }, {
            onSuccess: () => {
                setPaymentModalVisible(false);
                setPaymentAmount('');
                setPaymentNotes('');
                setPaymentNotes('');
                showFeedback('success', 'Success', "Payment recorded");
                fetchCustomerDetails(); // Refresh
            },
            onError: (err) => {
                showFeedback('error', 'Error', err.message);
            }
        });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator /></View>;
    if (!customer) return <View style={styles.center}><Text>Customer not found</Text></View>;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.name}>{customer.name}</Text>
                        <Text style={styles.info}>{customer.phone || 'No Phone'} • {customer.email || 'No Email'}</Text>
                    </View>
                </View>
                <AppButton
                    title="Edit"
                    variant="outline"
                    onPress={() => router.push({ pathname: '/(tabs)/customers/add', params: { id: customer.id } })}
                    style={{ paddingVertical: 6, paddingHorizontal: 16, height: 36 }}
                />
            </View>

            <View style={styles.card}>
                <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Current Balance</Text>
                    <Text style={[
                        styles.balance,
                        customer.current_balance > 0 ? { color: Colors.light.danger } : { color: Colors.light.success }
                    ]}>
                        ${customer.current_balance.toFixed(2)}
                    </Text>
                </View>
                <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Credit Limit</Text>
                    <Text style={styles.limit}>${customer.credit_limit?.toFixed(2) || '0.00'}</Text>
                </View>

                {customer.current_balance > 0 && (
                    <AppButton
                        title="Collect Payment"
                        onPress={() => setPaymentModalVisible(true)}
                        style={{ marginTop: 16 }}
                    />
                )}
            </View>

            <View style={styles.listContainer}>
                <Text style={styles.sectionTitle}>Transaction History</Text>
                <FlatList
                    data={transactions}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <TransactionItem
                            date={item.created_at}
                            type={item.type}
                            amount={item.amount} // Assumed signed
                            description={item.description}
                        />
                    )}
                    ListEmptyComponent={<Text style={{ padding: 16, color: '#999', textAlign: 'center' }}>No transactions yet.</Text>}
                />
            </View>

            {/* Payment Modal */}
            <Modal visible={paymentModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Collect Payment</Text>
                        <Text style={styles.modalSubtitle}>Record a payment from {customer.name}</Text>

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
                                placeholder="e.g. Bank Transfer Ref..."
                            />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <AppButton title="Cancel" variant="outline" onPress={() => setPaymentModalVisible(false)} style={{ flex: 1 }} />
                            <AppButton title="Confirm Payment" onPress={handlePaymentSubmit} loading={isCollecting} style={{ flex: 1 }} />
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontSize: 22, fontWeight: 'bold' },
    info: { color: '#666', marginTop: 4 },
    card: { margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardLabel: { fontSize: 16, color: '#666' },
    balance: { fontSize: 24, fontWeight: 'bold' },
    limit: { fontSize: 18, color: '#333' },
    listContainer: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
    modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, ...Layout.shadows.medium },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
});
