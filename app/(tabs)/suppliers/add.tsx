
import { AppButton } from '@/components/ui/AppButton';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';

import { Gradients } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useSuppliers } from '@/hooks/useSuppliers';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function AddSupplierScreen() {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { createSupplier, isCreating } = useSuppliers();

    // Feedback State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{ type: 'success' | 'error', title: string, message: string }>({
        type: 'success',
        title: '',
        message: ''
    });

    const [form, setForm] = useState({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        tax_id: '',
        registration_number: ''
    });

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            setModalConfig({
                type: 'error',
                title: t('common.validation_error'),
                message: t('suppliers.name_required')
            });
            setModalVisible(true);
            return;
        }

        try {
            await createSupplier(form);
            setModalConfig({
                type: 'success',
                title: t('common.success'),
                message: t('suppliers.supplier_saved')
            });
            setModalVisible(true);
        } catch (err: any) {
            setModalConfig({
                type: 'error',
                title: t('common.error'),
                message: err.message || t('suppliers.fail_save')
            });
            setModalVisible(true);
        }
    };

    const handleModalClose = () => {
        setModalVisible(false);
        if (modalConfig.type === 'success') {
            router.back();
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <ResponsiveContainer>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
                    <Text style={styles.headerTitle}>{t('suppliers.new_supplier')}</Text>
                    <Text style={styles.headerSubtitle}>{t('suppliers.enter_details')}</Text>

                    <View style={styles.formCard}>
                        {/* Name (Required) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('suppliers.business_name')} <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={styles.input}
                                placeholder={t('suppliers.business_placeholder')}
                                placeholderTextColor={colors.textSecondary + '80'}
                                value={form.name}
                                onChangeText={t => setForm(prev => ({ ...prev, name: t }))}
                            />
                        </View>

                        {/* Contact Person */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('suppliers.contact_person')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={t('common.name_placeholder')}
                                placeholderTextColor={colors.textSecondary + '80'}
                                value={form.contact_person}
                                onChangeText={t => setForm(prev => ({ ...prev, contact_person: t }))}
                            />
                        </View>

                        {/* Email & Phone */}
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>{t('suppliers.email')}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('common.email_placeholder')}
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={form.email}
                                    onChangeText={t => setForm(prev => ({ ...prev, email: t }))}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>{t('suppliers.phone')}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('common.phone_placeholder')}
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    keyboardType="phone-pad"
                                    value={form.phone}
                                    onChangeText={t => setForm(prev => ({ ...prev, phone: t }))}
                                />
                            </View>
                        </View>

                        {/* Address */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('suppliers.address')}</Text>
                            <TextInput
                                style={[styles.input, { minHeight: 80 }]}
                                placeholder={t('common.address_placeholder')}
                                placeholderTextColor={colors.textSecondary + '80'}
                                multiline
                                textAlignVertical="top"
                                value={form.address}
                                onChangeText={t => setForm(prev => ({ ...prev, address: t }))}
                            />
                        </View>

                        {/* Tax Info */}
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>{t('common.tax_id')}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('common.optional')}
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    value={form.tax_id}
                                    onChangeText={t => setForm(prev => ({ ...prev, tax_id: t }))}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>{t('suppliers.reg_number')}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('common.optional')}
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    value={form.registration_number}
                                    onChangeText={t => setForm(prev => ({ ...prev, registration_number: t }))}
                                />
                            </View>
                        </View>

                        <View style={styles.actions}>
                            <AppButton
                                title={t('common.cancel')}
                                onPress={() => router.back()}
                                variant="outline"
                                style={{ flex: 1, marginRight: 8 }}
                            />
                            <AppButton
                                title={t('suppliers.save_supplier')}
                                onPress={handleSubmit}
                                loading={isCreating}
                                style={{ flex: 1, marginLeft: 8 }}
                            />
                        </View>
                    </View>
                </ScrollView>
            </ResponsiveContainer>

            <FeedbackModal
                visible={modalVisible}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={handleModalClose}
            />
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    content: {
        padding: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'web' ? 20 : 180,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 4,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 32,
        textAlign: 'center',
    },
    formCard: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 20,
        padding: 24,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    required: {
        color: colors.danger,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.text,
    },
    row: {
        flexDirection: 'row',
    },
    actions: {
        flexDirection: 'row',
        marginTop: 16,
    },
});
