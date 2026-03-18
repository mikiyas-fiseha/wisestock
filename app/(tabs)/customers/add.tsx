import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';

import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { useAddCustomer, useUpdateCustomer } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AddCustomerScreen() {
    const { colors, theme } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = React.useMemo(() => createStyles(colors, insets), [colors, insets]);
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { company } = useAuth();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [taxId, setTaxId] = useState('');
    const [customerType, setCustomerType] = useState('retail');
    const [status, setStatus] = useState('active');
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
            setTaxId(data.tax_id || '');
            setCustomerType(data.customer_type || 'retail');
            setStatus(data.status || 'active');
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
            tax_id: taxId,
            customer_type: customerType,
            status,
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
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.header}>
                <Text style={styles.title}>{id ? 'Edit Customer' : 'New Customer'}</Text>
                <AppButton title="Close" onPress={() => router.back()} variant="outline" style={{ width: 80 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
                <AppTextInput label="Name *" value={name} onChangeText={setName} placeholder="John Doe" />
                <AppTextInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+123456789" />
                <AppTextInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="john@example.com" />
                <AppTextInput label="Address" value={address} onChangeText={setAddress} placeholder="123 Main St" />
                <AppTextInput label="Tax ID" value={taxId} onChangeText={setTaxId} placeholder="Optional" />

                <View style={styles.selectGroup}>
                    <Text style={styles.label}>Customer Type</Text>
                    <View style={styles.row}>
                        <TouchableOpacity
                            style={[styles.chip, customerType === 'retail' && styles.chipActive]}
                            onPress={() => setCustomerType('retail')}
                        >
                            <Text style={[styles.chipText, customerType === 'retail' && styles.chipTextActive]}>Retail</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.chip, customerType === 'wholesale' && styles.chipActive]}
                            onPress={() => setCustomerType('wholesale')}
                        >
                            <Text style={[styles.chipText, customerType === 'wholesale' && styles.chipTextActive]}>Wholesale</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.selectGroup}>
                    <Text style={styles.label}>Status</Text>
                    <View style={styles.row}>
                        {['active', 'blocked', 'inactive'].map((s) => (
                            <TouchableOpacity
                                key={s}
                                style={[styles.chip, status === s && styles.chipActive]}
                                onPress={() => setStatus(s)}
                            >
                                <Text style={[styles.chipText, status === s && styles.chipTextActive]}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <AppTextInput label="Credit Limit" value={creditLimit} onChangeText={setCreditLimit} keyboardType="numeric" prefix="$" placeholder="0.00" />
            </ScrollView>

            <View style={styles.footer}>
                <AppButton title="Save Customer" onPress={handleSave} loading={addCustomer.isPending || updateCustomer.isPending} />
            </View>
        </View>
    );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.08)', paddingTop: 16 },
    title: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 16 },
    footer: { 
        padding: 16, 
        paddingBottom: Platform.OS === 'web' ? 16 : Math.max(insets.bottom, 16) + 110,
        backgroundColor: 'rgba(255,255,255,0.08)', 
        borderTopWidth: 1, 
        borderColor: colors.border + '40' 
    },
    selectGroup: { marginBottom: 16 },
    label: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '500' },
    row: { flexDirection: 'row', gap: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.border + '40' },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, color: '#666', fontWeight: '500' },
    chipTextActive: { color: '#fff' },
});
