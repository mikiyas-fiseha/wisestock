
import { AppHeader } from '@/components/AppHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';

import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useBranches } from '@/hooks/useBranches';
import { useAddExpense, useExpenseCategories } from '@/hooks/useExpenses';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients } from '@/constants/Colors';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function AddExpenseScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { showFeedback } = useFeedback();
    const { isAdmin, isSuperAdmin, branch: currentBranch } = useAuth();

    const addExpense = useAddExpense();
    const { data: categories } = useExpenseCategories();
    const { branches } = useBranches();

    // Form State
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [branchId, setBranchId] = useState(currentBranch?.id || '');
    const [date, setDate] = useState(new Date());
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [reference, setReference] = useState('');
    const [description, setDescription] = useState('');

    // Recurring State
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
    const [endDate, setEndDate] = useState('');
    const [attachment, setAttachment] = useState<string | null>(null);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setAttachment(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!amount || !categoryId) {
            showFeedback('error', 'Required Fields', 'Please enter amount and select a category');
            return;
        }

        const selectedCategory = categories?.find(c => c.id === categoryId);

        try {
            await addExpense.mutateAsync({
                amount: parseFloat(amount),
                category_id: categoryId,
                category: selectedCategory?.name || 'Uncategorized',
                branch_id: branchId || undefined, // Use undefined (which results in null in DB) if empty
                date: date.toISOString(),
                payment_method: paymentMethod,
                reference: reference || undefined,
                description: description || undefined,
                is_recurring: isRecurring,
                recurring_frequency: isRecurring ? frequency : undefined,
                recurring_start_date: isRecurring ? date.toISOString() : undefined,
            });
            showFeedback('success', 'Success', 'Expense recorded');
            router.push('/expenses'); // Use push/replace instead of back to ensure we land on the list
        } catch (e: any) {
            showFeedback('error', 'Error', e.message);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />
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
                        style={{ fontSize: 24, fontWeight: 'bold', color: colors.danger }}
                    />
                </View>

                {(isAdmin || isSuperAdmin) && (
                    <View style={styles.card}>
                        <Text style={styles.label}>Branch</Text>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={branchId}
                                onValueChange={setBranchId}
                                style={styles.picker}
                            >
                                <Picker.Item label="Select Branch" value="" />
                                {branches?.map(b => <Picker.Item key={b.id} label={b.name} value={b.id} />)}
                            </Picker>
                        </View>
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.label}>Category *</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={categoryId}
                            onValueChange={setCategoryId}
                            style={styles.picker}
                        >
                            <Picker.Item label="Select Category" value="" />
                            {categories?.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
                        </Picker>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Payment Method</Text>
                    <View style={styles.row}>
                        {['Cash', 'Bank', 'Mobile Money'].map(m => (
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
                    <View style={styles.switchRow}>
                        <View>
                            <Text style={styles.label}>Recurring Expense?</Text>
                            <Text style={styles.subLabel}>Automatically repeat this expense</Text>
                        </View>
                        <Switch value={isRecurring} onValueChange={setIsRecurring} />
                    </View>

                    {isRecurring && (
                        <View style={{ marginTop: 16 }}>
                            <Text style={styles.label}>Frequency</Text>
                            <View style={styles.row}>
                                {['daily', 'weekly', 'monthly'].map(f => (
                                    <TouchableOpacity
                                        key={f}
                                        style={[styles.chip, frequency === f && styles.chipActive]}
                                        onPress={() => setFrequency(f as any)}
                                    >
                                        <Text style={[styles.chipText, frequency === f && styles.chipTextActive, { textTransform: 'capitalize' }]}>{f}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.card}>
                    <AppTextInput
                        label="Description"
                        placeholder="What was this for?"
                        value={description}
                        onChangeText={setDescription}
                    />
                    <View style={{ height: 12 }} />
                    <AppTextInput
                        label="Reference (Optional)"
                        placeholder="Invoice #, Receipt ID"
                        value={reference}
                        onChangeText={setReference}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Receipt / Attachment</Text>
                    <TouchableOpacity style={styles.attachmentBtn} onPress={pickImage}>
                        {attachment ? (
                            <Image source={{ uri: attachment }} style={styles.attachmentPreview} />
                        ) : (
                            <View style={styles.attachmentPlaceholder}>
                                <Ionicons name="camera-outline" size={32} color="#64748B" />
                                <Text style={styles.subLabel}>Tap to add receipt</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    {attachment && (
                        <TouchableOpacity onPress={() => setAttachment(null)} style={{ marginTop: 8 }}>
                            <Text style={{ color: colors.danger, textAlign: 'center' }}>Remove</Text>
                        </TouchableOpacity>
                    )}
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

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { padding: 16, paddingBottom: 50 },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
    subLabel: { fontSize: 12, color: '#64748B' },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        backgroundColor: '#fff',
        height: 50,
        justifyContent: 'center',
        overflow: 'hidden'
    },
    picker: { height: 50, width: '100%' },
    row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipActive: {
        backgroundColor: '#E0E7FF',
        borderColor: colors.primary,
    },
    chipText: { color: '#64748B', fontWeight: '500', fontSize: 13 },
    chipTextActive: { color: colors.primary, fontWeight: '700' },
    attachmentBtn: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        height: 150,
        backgroundColor: '#F8FAFC',
        overflow: 'hidden'
    },
    attachmentPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8
    },
    attachmentPreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    }
});
