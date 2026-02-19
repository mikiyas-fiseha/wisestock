
import { AppHeader } from '@/components/AppHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput'; // Assuming we have this
import { Colors } from '@/constants/Colors';
import { useFeedback } from '@/context/FeedbackContext';
import { useAddExpense } from '@/hooks/useExpenses';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CATEGORIES = [
    'Rent',
    'Utilities',
    'Salaries',
    'Maintenance',
    'Marketing',
    'Office Supplies',
    'Transport',
    'Other'
];

export default function AddExpenseScreen() {
    const router = useRouter();
    const { showFeedback } = useFeedback();
    const addExpense = useAddExpense();

    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [customCategory, setCustomCategory] = useState('');
    const [date, setDate] = useState(new Date());
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [reference, setReference] = useState('');
    const [description, setDescription] = useState('');

    const isCustomCategory = category === 'Other';

    const handleSave = () => {
        if (!amount || isNaN(parseFloat(amount))) {
            showFeedback('error', 'Invalid Amount', 'Please enter a valid amount');
            return;
        }

        const finalCategory = isCustomCategory ? (customCategory || 'Other') : category;

        addExpense.mutate({
            date: date.toISOString(),
            amount: parseFloat(amount),
            category: finalCategory,
            payment_method: paymentMethod,
            reference,
            description
        }, {
            onSuccess: () => {
                showFeedback('success', 'Expense Added', 'Record saved successfully');
                router.back();
            },
            onError: (err: any) => {
                showFeedback('error', 'Error', err.message);
            }
        });
    };

    return (
        <View style={styles.container}>
            <AppHeader title="New Expense" showBack />
            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.card}>
                    <Text style={styles.label}>Amount *</Text>
                    <AppTextInput
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0.00"
                        keyboardType="numeric"
                        prefix="$"
                        style={{ fontSize: 24, fontWeight: 'bold', color: Colors.light.danger }}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Category *</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={category}
                            onValueChange={setCategory}
                            style={styles.picker}
                        >
                            {CATEGORIES.map(c => <Picker.Item key={c} label={c} value={c} />)}
                        </Picker>
                    </View>

                    {isCustomCategory && (
                        <AppTextInput
                            placeholder="Enter custom category"
                            value={customCategory}
                            onChangeText={setCustomCategory}
                            style={{ marginTop: 12 }}
                        />
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Payment Method</Text>
                    <View style={styles.row}>
                        {['Cash', 'Bank', 'Card'].map(m => (
                            <TouchableOpacity
                                key={m}
                                style={[styles.chip, paymentMethod === m && styles.chipActive]}
                                onPress={() => setPaymentMethod(m)}
                            >
                                <Text style={[styles.chipText, paymentMethod === m && styles.chipTextActive]}>{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.card}>
                    <AppTextInput
                        label="Reference (Optional)"
                        placeholder="Invoice #, Receipt ID"
                        value={reference}
                        onChangeText={setReference}
                    />
                    <View style={{ height: 12 }} />
                    <AppTextInput
                        label="Description (Optional)"
                        placeholder="Notes about this expense..."
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={3}
                        style={{ height: 80, textAlignVertical: 'top' }}
                    />
                </View>

                <AppButton
                    title="Save Expense"
                    onPress={handleSave}
                    loading={addExpense.isPending}
                    style={{ marginTop: 16 }}
                />

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    content: { padding: 16, paddingBottom: 50 },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
        marginBottom: 8,
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
        height: 50,
        justifyContent: 'center',
    },
    picker: { height: 50, width: '100%' },
    row: { flexDirection: 'row', gap: 12 },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipActive: {
        backgroundColor: '#e6f0ff',
        borderColor: Colors.light.primary,
    },
    chipText: { color: '#666' },
    chipTextActive: { color: Colors.light.primary, fontWeight: '600' },
});
