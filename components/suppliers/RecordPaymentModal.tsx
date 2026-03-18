
import { AppButton } from '@/components/ui/AppButton';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';

interface RecordPaymentModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: { amount: number; method: string; date: Date; notes: string }) => Promise<void>;
    supplierName: string;
    currentBalance: number;
    isLoading?: boolean;
}

export function RecordPaymentModal({ visible, onClose, onSubmit, supplierName, currentBalance, isLoading }: RecordPaymentModalProps) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width >= 768;

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
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.overlay}>
                <TouchableOpacity
                    activeOpacity={1}
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                />

                <View style={[styles.container, isWeb && styles.containerWeb]}>
                    {Platform.OS !== 'web' && (
                        <BlurView
                            tint={theme === 'dark' ? 'dark' : 'light'}
                            intensity={80}
                            style={StyleSheet.absoluteFill}
                        />
                    )}

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>Record Payment</Text>
                            <Text style={styles.subtitle}>To: {supplierName}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <FontAwesome name="times" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Balance Info */}
                    <View style={styles.balanceContainer}>
                        <Text style={styles.balanceLabel}>Current Debt</Text>
                        <Text style={styles.balanceValue}>${currentBalance.toFixed(2)}</Text>
                    </View>

                    {/* Form */}
                    <ScrollView bounces={false} style={{ flexGrow: 0 }}>
                        <View style={styles.form}>
                            {/* Amount */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Amount Paid</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                    autoFocus
                                />
                            </View>

                            {/* Method */}
                            <View style={styles.inputGroup}>
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
                            </View>

                            {/* Notes */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Notes (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ref #, Transaction ID, etc."
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    value={notes}
                                    onChangeText={setNotes}
                                />
                            </View>

                            {/* Submit */}
                            <View style={styles.actions}>
                                <AppButton
                                    title="Cancel"
                                    onPress={onClose}
                                    variant="outline"
                                    style={{ flex: 1, marginRight: 8 }}
                                />
                                <AppButton
                                    title={`Pay $${parseFloat(amount) || 0}`}
                                    onPress={handleSubmit}
                                    loading={isLoading}
                                    style={{ flex: 2 }}
                                    disabled={!amount || parseFloat(amount) <= 0}
                                />
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors: any, theme: string) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: theme === 'dark' ? colors.card + 'F0' : '#FFFFFFE0',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 450,
        overflow: 'hidden',
    },
    containerWeb: {
        maxWidth: 500,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    closeBtn: {
        padding: 4,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2,
    },
    balanceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.danger + '10',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
    },
    balanceLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.danger,
    },
    balanceValue: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.danger,
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: colors.text,
    },
    methodRow: {
        flexDirection: 'row',
        gap: 10,
    },
    methodChip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        alignItems: 'center',
    },
    methodChipActive: {
        backgroundColor: colors.primary,
    },
    methodText: {
        color: colors.textSecondary,
        fontWeight: '700',
        fontSize: 11,
    },
    methodTextActive: {
        color: '#fff',
    },
    actions: {
        flexDirection: 'row',
        marginTop: 10,
    }
});
