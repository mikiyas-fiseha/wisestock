import { AppHeader } from '@/components/AppHeader';
import { ListItem } from '@/components/ListItem';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';

import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { useAddExpenseCategory, useExpenseCategories } from '@/hooks/useExpenses';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, View } from 'react-native';

export default function ExpenseCategoriesScreen() {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { company, isAdmin, isSuperAdmin } = useAuth();
    const { showFeedback } = useFeedback();

    const { data: categories, isLoading } = useExpenseCategories();
    const addCategory = useAddExpenseCategory();

    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');

    const handleAdd = () => {
        if (addCategory.isPending) return;
        if (!name.trim()) return;

        addCategory.mutate(name, {
            onSuccess: () => {
                showFeedback('success', t('common.success'), t('common.saved'));
                setName('');
                setModalVisible(false);
            },
            onError: (err: any) => {
                showFeedback('error', t('common.error'), err.message);
            }
        });
    };

    if (!isAdmin && !isSuperAdmin) {
        return (
            <View style={styles.center}>
                <Text>Access Denied</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppHeader title={t('settings.expense_categories')} showBack hideThemeToggle={true} />

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            ) : (
                <FlatList
                    data={categories}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <ListItem
                            title={item.name}
                            subtitle={item.is_system ? t('common.system') : t('common.custom')}
                            rightIcon={item.is_system ? undefined : "chevron-right"}
                        />
                    )}
                    contentContainerStyle={{ padding: 16 }}
                />
            )}

            <View style={styles.footer}>
                <AppButton title={"+ " + t('common.add')} onPress={() => setModalVisible(true)} />
            </View>

            <Modal visible={modalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('settings.new_category')}</Text>
                        <AppTextInput
                            label={t('settings.category_name')}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Travel, Software"
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <AppButton
                                title={t('common.cancel')}
                                variant="outline"
                                onPress={() => setModalVisible(false)}
                                style={{ flex: 1, marginRight: 8 }}
                            />
                            <AppButton
                                title={t('common.add')}
                                loading={addCategory.isPending}
                                onPress={handleAdd}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    footer: { padding: 16, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 16,
    },
    modalButtons: { flexDirection: 'row', marginTop: 24 },
});
