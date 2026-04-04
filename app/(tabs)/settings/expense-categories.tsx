import { AppHeader } from '@/components/AppHeader';
import { ListItem } from '@/components/ListItem';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';

import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useAddExpenseCategory, useExpenseCategories } from '@/hooks/useExpenses';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients } from '@/constants/Colors';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function ExpenseCategoriesScreen() {
    const { colors, theme } = useTheme();
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
                showFeedback('success', 'Success', 'Category added successfully');
                setName('');
                setModalVisible(false);
            },
            onError: (err: any) => {
                showFeedback('error', 'Error', err.message);
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
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />
            <AppHeader title="Expense Categories" showBack />

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            ) : (
                <FlatList
                    data={categories}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <ListItem
                            title={item.name}
                            subtitle={item.is_system ? 'System Category' : 'Custom'}
                            rightIcon={item.is_system ? undefined : "chevron-right"}
                        />
                    )}
                    contentContainerStyle={{ padding: 16 }}
                />
            )}

            <View style={styles.footer}>
                <AppButton title="+ Add Category" onPress={() => setModalVisible(true)} />
            </View>

            <Modal visible={modalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Category</Text>
                        <AppTextInput
                            label="Category Name"
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Travel, Software"
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <AppButton
                                title="Cancel"
                                variant="outline"
                                onPress={() => setModalVisible(false)}
                                style={{ flex: 1, marginRight: 8 }}
                            />
                            <AppButton
                                title="Add"
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
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    footer: { padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: 'white',
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
        color: '#1E293B',
        marginBottom: 16,
    },
    modalButtons: { flexDirection: 'row', marginTop: 24 },
});
