
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { AppTextInput } from '../ui/AppTextInput';
import { AppButton } from '../ui/AppButton';
import { useAddCustomer } from '@/hooks/useSupabaseQuery';
import { useTheme } from '@/context/ThemeContext';
import { Gradients } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface QuickAddCustomerModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: (customer: any) => void;
}

export function QuickAddCustomerModal({ visible, onClose, onSuccess }: QuickAddCustomerModalProps) {
    const { colors, theme } = useTheme();
    const { mutateAsync: addCustomer, isPending: isAdding } = useAddCustomer();
    
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    
    const handleSave = async () => {
        if (isAdding) return;
        if (!name.trim()) return;
        

        try {
            const newCustomer = await addCustomer({
                name: name.trim(),
                phone: phone.trim() || null,
                customer_type: 'retail'
            });
            
            onSuccess(newCustomer);
            resetForm();
            onClose();
        } catch (error) {
            console.error('Failed to create customer:', error);
        }
    };

    const resetForm = () => {
        setName('');
        setPhone('');
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.content]}>
                    <LinearGradient
                        colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Quick Add Customer</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <FontAwesome name="times" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                        <AppTextInput
                            label="Customer Name *"
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. John Doe"
                            autoFocus
                        />
                        <View style={{ height: 12 }} />
                        <AppTextInput
                            label="Phone Number"
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Optional"
                            keyboardType="phone-pad"
                        />
                        <View style={{ height: 24 }} />
                    </ScrollView>

                    <View style={styles.footer}>
                        <AppButton
                            title="Cancel"
                            variant="outline"
                            onPress={onClose}
                            style={{ flex: 1, marginRight: 8 }}
                        />
                        <AppButton
                            title="Save Customer"
                            onPress={handleSave}
                            loading={isAdding}
                            disabled={!name.trim()}
                            style={{ flex: 2 }}
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
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
    },
    closeBtn: {
        padding: 4,
    },
    form: {
        maxHeight: 400,
        padding: 20,
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
});
