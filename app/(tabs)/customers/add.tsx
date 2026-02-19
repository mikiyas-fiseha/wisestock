import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useAddCustomer, useUpdateCustomer } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AddCustomerScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { company } = useAuth();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [creditLimit, setCreditLimit] = useState('');
    const [loading, setLoading] = useState(false);
    const { showFeedback } = useFeedback();

    useEffect(() => {
        if (id) fetchCustomer();
    }, [id]);

    const fetchCustomer = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setName(data.name);
            setPhone(data.phone || '');
            setEmail(data.email || '');
            setAddress(data.address || '');
            setCreditLimit(data.credit_limit?.toString() || '');
        } catch (e) {
            console.error(e);
            showFeedback('error', 'Error', 'Failed to load customer');
        } finally {
            setLoading(false);
        }
    };

    const addCustomer = useAddCustomer();
    const updateCustomer = useUpdateCustomer();

    const handleSave = () => {
        if (!company?.id) {
            showFeedback('error', 'Error', 'Company ID missing. Please re-login.');
            return;
        }

        if (!name) {
            showFeedback('error', 'Error', 'Name is required');
            return;
        }

        const customerData = {
            company_id: company?.id,
            name,
            phone,
            email,
            address,
            credit_limit: creditLimit ? parseFloat(creditLimit) : 0
        };

        const mutation = id ? updateCustomer : addCustomer;
        const payload = id ? { id, ...customerData } : customerData;

        mutation.mutate(payload, {
            onSuccess: () => {
                showFeedback('success', 'Success', 'Customer saved');
                router.back();
            },
            onError: (error) => {
                showFeedback('error', 'Error', error.message);
            }
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{id ? 'Edit Customer' : 'New Customer'}</Text>
                <AppButton title="Close" onPress={() => router.back()} variant="outline" style={{ width: 80 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <AppTextInput label="Name *" value={name} onChangeText={setName} placeholder="John Doe" />
                <AppTextInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+123456789" />
                <AppTextInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="john@example.com" />
                <AppTextInput label="Address" value={address} onChangeText={setAddress} placeholder="123 Main St" />
                <AppTextInput label="Credit Limit" value={creditLimit} onChangeText={setCreditLimit} keyboardType="numeric" prefix="$" placeholder="0.00" />
            </ScrollView>

            <View style={styles.footer}>
                <AppButton title="Save Customer" onPress={handleSave} loading={addCustomer.isPending || updateCustomer.isPending} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', paddingTop: 60 },
    title: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 16 },
    footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
});
