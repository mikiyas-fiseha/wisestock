
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';

import { supabase } from '@/lib/supabase';
import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface StockAdjustmentModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productId: string;
    variantId?: string; // Optional, if null it's a base product adjustment
    currentStock: number;
    companyId: string;
}

export function StockAdjustmentModal({ visible, onClose, onSuccess, productId, variantId, currentStock, companyId }: StockAdjustmentModalProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'set'>('add');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!quantity) {
            Alert.alert('Error', 'Please enter a quantity');
            return;
        }

        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty <= 0) {
            Alert.alert('Error', 'Invalid quantity');
            return;
        }

        setLoading(true);
        try {
            let qtyChange = 0;
            let movementType = 'adjustment';

            // Calculate change based on type
            if (adjustmentType === 'add') {
                qtyChange = qty;
            } else if (adjustmentType === 'remove') {
                qtyChange = -qty;
            } else if (adjustmentType === 'set') {
                qtyChange = qty - currentStock;
                movementType = 'correction'; // Explicit set is a correction
            }

            if (qtyChange === 0) {
                onClose();
                return;
            }

            // Insert into stock_movements
            // This will trigger the DB function to update the product/variant stock
            const { error } = await supabase.from('stock_movements').insert([{
                company_id: companyId,
                product_id: productId,
                variant_id: variantId || null,
                qty_change: qtyChange,
                reason: reason || (adjustmentType === 'set' ? 'Manual Correction' : 'Manual Adjustment'),
                type: movementType
            }]);

            if (error) throw error;

            Alert.alert('Success', 'Stock updated successfully');
            setQuantity('');
            setReason('');
            onSuccess();
            onClose();

        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <Text style={styles.title}>Adjust Stock</Text>
                    <Text style={styles.subtitle}>Current Stock: {currentStock}</Text>

                    <View style={styles.typeContainer}>
                        <TouchableOpacity style={[styles.typeButton, adjustmentType === 'add' && styles.typeActive]} onPress={() => setAdjustmentType('add')}>
                            <Text style={[styles.typeText, adjustmentType === 'add' && styles.typeTextActive]}>+ Add</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.typeButton, adjustmentType === 'remove' && styles.typeActive]} onPress={() => setAdjustmentType('remove')}>
                            <Text style={[styles.typeText, adjustmentType === 'remove' && styles.typeTextActive]}>- Remove</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.typeButton, adjustmentType === 'set' && styles.typeActive]} onPress={() => setAdjustmentType('set')}>
                            <Text style={[styles.typeText, adjustmentType === 'set' && styles.typeTextActive]}>Set To</Text>
                        </TouchableOpacity>
                    </View>

                    <AppTextInput
                        label={adjustmentType === 'set' ? "New Total Stock" : "Quantity to Adjust"}
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="numeric"
                    />

                    <AppTextInput
                        label="Reason (Optional)"
                        value={reason}
                        onChangeText={setReason}
                        placeholder="e.g. Damage, Restock"
                    />

                    <View style={styles.footer}>
                        <AppButton title="Cancel" onPress={onClose} variant="outline" style={{ flex: 1, marginRight: 8 }} />
                        <AppButton title="Save" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    content: { backgroundColor: 'white', borderRadius: 12, padding: 20 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
    typeContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    typeButton: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.primary, alignItems: 'center' },
    typeActive: { backgroundColor: colors.primary },
    typeText: { color: colors.primary, fontWeight: '600' },
    typeTextActive: { color: 'white' },
    footer: { flexDirection: 'row', marginTop: 16 }
});
