import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Gradients } from '@/constants/Colors';

import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { useAdjustStock } from '@/hooks/useInventoryLogs';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const REASONS = [
    { label: 'Damaged', value: 'damaged', icon: '💥' },
    { label: 'Expired', value: 'expired', icon: '⏰' },
    { label: 'Correction', value: 'correction', icon: '✏️' },
    { label: 'Other', value: 'other', icon: '📋' },
];

interface AdjustStockModalProps {
    visible: boolean;
    onClose: () => void;
    productId: string;
    productName: string;
    currentStock: number;
    unit: string;
}

export function AdjustStockModal({ visible, onClose, productId, productName, currentStock, unit }: AdjustStockModalProps) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('correction');
    const [notes, setNotes] = useState('');
    const { showFeedback } = useFeedback();
    const adjustStock = useAdjustStock();

    const handleSave = async () => {
        const qty = parseFloat(quantity);
        if (!qty || qty <= 0) {
            showFeedback('error', 'Error', 'Please enter a valid quantity');
            return;
        }

        try {
            await adjustStock.mutateAsync({
                productId,
                adjustmentType,
                quantity: qty,
                reason,
                notes: notes || undefined,
            });
            showFeedback('success', 'Success', `Stock ${adjustmentType === 'add' ? 'increased' : 'decreased'} by ${qty} ${unit}`);
            handleClose();
        } catch (e: any) {
            showFeedback('error', 'Error', e.message || 'Failed to adjust stock');
        }
    };

    const handleClose = () => {
        setQuantity('');
        setNotes('');
        setReason('correction');
        setAdjustmentType('add');
        onClose();
    };

    const newStock = adjustmentType === 'add'
        ? currentStock + (parseFloat(quantity) || 0)
        : currentStock - (parseFloat(quantity) || 0);

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.overlay}>
                <View style={[styles.container, { overflow: 'hidden' }]}>
                    {/* Background Gradient */}
                    <LinearGradient
                        colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />

                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Adjust Stock</Text>
                            <Text style={styles.subtitle}>{productName}</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <FontAwesome name="times" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Current Stock Display */}
                    <View style={styles.stockDisplay}>
                        <View style={styles.stockBox}>
                            <Text style={styles.stockLabel}>Current</Text>
                            <Text style={styles.stockValue}>{currentStock} {unit}</Text>
                        </View>
                        <FontAwesome name="arrow-right" size={16} color={colors.textSecondary} />
                        <View style={styles.stockBox}>
                            <Text style={styles.stockLabel}>New</Text>
                            <Text style={[styles.stockValue, newStock < 0 && { color: colors.danger }]}>
                                {newStock < 0 ? '—' : `${newStock} ${unit}`}
                            </Text>
                        </View>
                    </View>

                    {/* Type Toggle */}
                    <View style={styles.typeToggle}>
                        <TouchableOpacity
                            style={[styles.typeBtn, adjustmentType === 'add' && styles.typeBtnActiveAdd]}
                            onPress={() => setAdjustmentType('add')}
                        >
                            <FontAwesome name="plus" size={12} color={adjustmentType === 'add' ? '#fff' : colors.textSecondary} />
                            <Text style={[styles.typeBtnText, adjustmentType === 'add' && styles.typeBtnTextActive]}>Add Stock</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeBtn, adjustmentType === 'remove' && styles.typeBtnActiveRemove]}
                            onPress={() => setAdjustmentType('remove')}
                        >
                            <FontAwesome name="minus" size={12} color={adjustmentType === 'remove' ? '#fff' : colors.textSecondary} />
                            <Text style={[styles.typeBtnText, adjustmentType === 'remove' && styles.typeBtnTextActive]}>Remove Stock</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Quantity */}
                    <AppTextInput
                        label={`Quantity (${unit})`}
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="numeric"
                        placeholder="0"
                    />

                    {/* Reason Pills */}
                    <Text style={styles.reasonLabel}>Reason</Text>
                    <View style={styles.reasonGrid}>
                        {REASONS.map(r => (
                            <TouchableOpacity
                                key={r.value}
                                style={[styles.reasonPill, reason === r.value && styles.reasonPillActive]}
                                onPress={() => setReason(r.value)}
                            >
                                <Text style={styles.reasonIcon}>{r.icon}</Text>
                                <Text style={[styles.reasonText, reason === r.value && styles.reasonTextActive]}>{r.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Notes */}
                    <AppTextInput
                        label="Notes (optional)"
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Additional details..."
                        multiline
                        numberOfLines={2}
                        style={{ height: 60 }}
                    />

                    {/* Actions */}
                    <View style={styles.actions}>
                        <AppButton title="Cancel" variant="outline" onPress={handleClose} style={{ flex: 1 }} />
                        <AppButton
                            title={adjustStock.isPending ? 'Saving...' : 'Confirm'}
                            onPress={handleSave}
                            loading={adjustStock.isPending}
                            style={{ flex: 1 }}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
    container: { backgroundColor: 'transparent', borderRadius: 16, padding: 20, maxWidth: 480, width: '100%', alignSelf: 'center', borderWidth: 1, borderColor: colors.border },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    title: { fontSize: 18, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    closeBtn: { padding: 4 },

    stockDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20, backgroundColor: 'transparent', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
    stockBox: { alignItems: 'center', flex: 1 },
    stockLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    stockValue: { fontSize: 20, fontWeight: '800', color: colors.text },

    typeToggle: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: 'transparent' },
    typeBtnActiveAdd: { backgroundColor: colors.success, borderColor: colors.success },
    typeBtnActiveRemove: { backgroundColor: colors.danger, borderColor: colors.danger },
    typeBtnText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    typeBtnTextActive: { color: '#fff' },

    reasonLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 12 },
    reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    reasonPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: 'transparent' },
    reasonPillActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
    reasonIcon: { fontSize: 14 },
    reasonText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    reasonTextActive: { color: colors.primary },

    actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
