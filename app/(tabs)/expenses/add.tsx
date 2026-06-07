
import { AppHeader } from '@/components/AppHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';

import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { useBranches } from '@/hooks/useBranches';
import { useAddExpense, useExpenseCategories } from '@/hooks/useExpenses';
import { pickImage } from '@/lib/imagePicker';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function AddExpenseScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { showFeedback } = useFeedback();
    const { company, isAdmin, isSuperAdmin, branch, allBranches } = useAuth();
    const { t, i18n } = useTranslation();

    const addExpense = useAddExpense();
    const { data: categories } = useExpenseCategories();
    const { branches } = useBranches();

    // Form State
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [branchId, setBranchId] = useState(branch?.id || '');
    const [date, setDate] = useState(new Date());
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [reference, setReference] = useState('');
    const [description, setDescription] = useState('');

    // Recurring State
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
    const [receipt, setReceipt] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const pickReceipt = async () => {
        const uri = await pickImage();
        if (uri) {
            setReceipt(uri);
        }
    };

    const handleSave = async () => {
        if (addExpense.isPending || isSubmitting) return;

        if (!amount || !categoryId) {
            showFeedback('error', 'Required Fields', 'Please enter amount and select a category');
            return;
        }

        setIsSubmitting(true);

        const selectedCategory = categories?.find(c => c.id === categoryId);

        try {
            await addExpense.mutateAsync({
                amount: parseFloat(amount),
                category_id: categoryId,
                category: selectedCategory?.name || 'Uncategorized',
                branch_id: branchId || undefined,
                date: date.toISOString(),
                payment_method: paymentMethod,
                reference: reference || undefined,
                description: description || undefined,
                is_recurring: isRecurring,
                recurring_frequency: isRecurring ? frequency : undefined,
                recurring_start_date: isRecurring ? date.toISOString() : undefined,
            });
            showFeedback('success', 'Success', 'Expense recorded');
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/expenses');
            }
        } catch (e: any) {
            showFeedback('error', 'Error', e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppHeader title="New Expense" showBack />
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>

                <View style={styles.card}>
                    <Text style={styles.label}>Amount *</Text>
                    <AppTextInput
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0.00"
                        keyboardType="numeric"
                        prefix={i18n.language !== 'am' ? (company?.currency || '$') : undefined}
                        suffix={i18n.language === 'am' ? 'ብር' : undefined}
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
                                dropdownIconColor={colors.text}
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
                            dropdownIconColor={colors.text}
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
                        multiline
                        numberOfLines={3}
                        style={{ minHeight: 80, paddingTop: 10 }}
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
                    <TouchableOpacity style={styles.attachmentBtn} onPress={pickReceipt}>
                        {receipt ? (
                            <Image source={{ uri: receipt }} style={styles.attachmentPreview} />
                        ) : (
                            <View style={styles.attachmentPlaceholder}>
                                <Ionicons name="camera-outline" size={32} color="#64748B" />
                                <Text style={styles.subLabel}>Tap to add receipt</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <AppButton
                    title="Save Expense"
                    onPress={handleSave}
                    loading={addExpense.isPending || isSubmitting}
                    style={{ marginTop: 16 }}
                />

            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    content: { padding: 16, paddingBottom: Platform.OS === 'web' ? 50 : 20 },
    card: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
    subLabel: { fontSize: 12, color: colors.textSecondary },
    pickerWrapper: {
        backgroundColor: colors.primary + '15',
        borderWidth: 1,
        borderColor: colors.background === '#09090B' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        height: 48,
        justifyContent: 'center',
        overflow: 'hidden'
    },
    picker: { height: 48, width: '100%', color: colors.text, backgroundColor: 'transparent' },
    row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    chipActive: {
        backgroundColor: colors.primary + '20',
        borderColor: colors.primary,
    },
    chipText: { color: colors.textSecondary, fontWeight: '500', fontSize: 13 },
    chipTextActive: { color: colors.primary, fontWeight: '700' },
    attachmentBtn: {
        borderRadius: 12,
        height: 150,
        backgroundColor: 'rgba(255,255,255,0.06)',
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
