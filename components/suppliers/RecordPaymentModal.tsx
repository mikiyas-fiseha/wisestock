
import { AppButton } from '@/components/ui/AppButton';
import { Colors } from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface RecordPaymentModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: { amount: number; method: string; date: Date; notes: string }) => Promise<void>;
    supplierName: string;
    currentBalance: number;
    isLoading?: boolean;
}

export function RecordPaymentModal({ visible, onClose, onSubmit, supplierName, currentBalance, isLoading }: RecordPaymentModalProps) {
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
            // Basic validation
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
                            <Text style={styles.title}>Record Payment</Text>
                            <Text style={styles.subtitle}>To: {supplierName}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <FontAwesome name="times" size={24} color={Colors.light.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Balance Info */}
                    <View style={styles.balanceContainer}>
                        <Text style={styles.balanceLabel}>Current Debt:</Text>
                        <Text style={styles.balanceValue}>${currentBalance.toFixed(2)}</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Amount */}
                        <Text style={styles.label}>Amount Paid</Text>
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
                            title={`Pay $${parseFloat(amount) || 0}`}
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

const styles = StyleSheet.create({
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
        color: Colors.light.text,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.light.textSecondary,
    },
    balanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF5F5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 24,
    },
    balanceLabel: {
        fontSize: 16,
        color: '#C53030',
        marginRight: 8,
    },
    balanceValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#C53030',
    },
    form: {
        gap: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
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
        backgroundColor: Colors.light.primary,
    },
    methodText: {
        color: Colors.light.textSecondary,
        fontWeight: '600',
        fontSize: 12,
    },
    methodTextActive: {
        color: '#fff',
    }
});
