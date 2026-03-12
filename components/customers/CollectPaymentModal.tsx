
import { AppButton } from '@/components/ui/AppButton';

import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface CollectPaymentModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: { amount: number; method: string; date: Date; notes: string }) => Promise<void>;
    customerName: string;
    currentBalance: number;
    isLoading?: boolean;
}

export function CollectPaymentModal({ visible, onClose, onSubmit, customerName, currentBalance, isLoading }: CollectPaymentModalProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash'); // cash, bank, check
    const [notes, setNotes] = useState('');

    // Reset form when opening
    useEffect(() => {
        if (visible) {
            setAmount('');
            setMethod('cash');
            setNotes('');
        }
    }, [visible]);

    const handleSubmit = () => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return;
        }
        onSubmit({
            amount: parsedAmount,
            method,
            date: new Date(),
            notes
        });
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Collect Payment</Text>
                            <Text style={styles.subtitle}>From: {customerName}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <FontAwesome name="times" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Balance Info */}
                    <View style={styles.balanceContainer}>
                        <Text style={styles.balanceLabel}>Current Balance:</Text>
                        <Text style={styles.balanceValue}>${currentBalance.toFixed(2)}</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Amount */}
                        <Text style={styles.label}>Amount Collected</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                            autoFocus
                        />

                        {/* Method */}
                        <Text style={styles.label}>Payment Method</Text>
                        <View style={styles.methodRow}>
                            {['cash', 'bank', 'check'].map(m => (
                                <TouchableOpacity
                                    key={m}
                                    style={[styles.methodChip, method === m && styles.methodChipActive]}
                                    onPress={() => setMethod(m)}
                                >
                                    <Text style={[styles.methodText, method === m && styles.methodTextActive]}>
                                        {m.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Notes */}
                        <Text style={styles.label}>Notes (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ref #, Transaction ID, etc."
                            value={notes}
                            onChangeText={setNotes}
                        />

                        {/* Submit */}
                        <AppButton
                            title={`Collect $${parseFloat(amount) || 0}`}
                            onPress={handleSubmit}
                            loading={isLoading}
                            style={{ marginTop: 20 }}
                            disabled={!amount || parseFloat(amount) <= 0}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 500,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    balanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E6FFFA', // Light teal for customer balance (positive collection)
        padding: 12,
        borderRadius: 8,
        marginBottom: 24,
    },
    balanceLabel: {
        fontSize: 16,
        color: '#276749',
        marginRight: 8,
    },
    balanceValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#276749',
    },
    form: {
        gap: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 18,
    },
    methodRow: {
        flexDirection: 'row',
        gap: 12,
    },
    methodChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        minWidth: 80,
        alignItems: 'center',
    },
    methodChipActive: {
        backgroundColor: colors.primary,
    },
    methodText: {
        color: colors.textSecondary,
        fontWeight: '600',
        fontSize: 12,
    },
    methodTextActive: {
        color: '#fff',
    }
});
