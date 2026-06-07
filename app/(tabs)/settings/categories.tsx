
import { AppHeader } from '@/components/AppHeader';
import { ListItem } from '@/components/ListItem';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';

import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

interface Category {
    id: string;
    name: string;
}

interface Attribute {
    id: string;
    name: string;
    code: string;
}

export default function CategoriesScreen() {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { company } = useAuth();
    const { showFeedback } = useFeedback();
    const [categories, setCategories] = useState<Category[]>([]);
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Modal
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creating, setCreating] = useState(false);

    // Edit/Link Modal
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [linkedAttributeIds, setLinkedAttributeIds] = useState<string[]>([]);
    const [savingLinks, setSavingLinks] = useState(false);

    useEffect(() => {
        if (company) {
            fetchCategories();
            fetchAttributes();
        }
    }, [company]);

    const fetchCategories = async () => {
        const { data, error } = await supabase.from('categories').select('*').order('name');
        if (!error) setCategories(data || []);
    };

    const fetchAttributes = async () => {
        const { data, error } = await supabase.from('attributes').select('*').order('name');
        if (!error) setAttributes(data || []);
    };

    const createCategory = async () => {
        if (creating) return;
        if (!newCategoryName.trim()) return;

        setCreating(true);
        try {
            const { error } = await supabase
                .from('categories')
                .insert([{ company_id: company?.id, name: newCategoryName }]);
            if (error) throw error;
            setCreateModalVisible(false);
            fetchCategories();
            showFeedback('success', t('common.success'), t('settings.saved'));
        } catch (e: any) {
            showFeedback('error', t('common.error'), e.message);
        } finally {
            setCreating(false);
        }
    };

    const openEditModal = async (category: Category) => {
        setSelectedCategory(category);
        setEditModalVisible(true);
        // Fetch linked attributes
        const { data } = await supabase
            .from('category_attributes')
            .select('attribute_id')
            .eq('category_id', category.id);

        if (data) {
            setLinkedAttributeIds(data.map(d => d.attribute_id));
        } else {
            setLinkedAttributeIds([]);
        }
    };

    const toggleAttributeLink = (attributeId: string) => {
        setLinkedAttributeIds(prev => {
            if (prev.includes(attributeId)) {
                return prev.filter(id => id !== attributeId);
            } else {
                return [...prev, attributeId];
            }
        });
    };

    const saveLinks = async () => {
        if (savingLinks || !selectedCategory) return;

        setSavingLinks(true);
        try {
            // 1. Delete all existing links
            await supabase.from('category_attributes').delete().eq('category_id', selectedCategory.id);

            // 2. Insert new links
            if (linkedAttributeIds.length > 0) {
                const toInsert = linkedAttributeIds.map(attrId => ({
                    category_id: selectedCategory.id,
                    attribute_id: attrId
                }));
                const { error } = await supabase.from('category_attributes').insert(toInsert);
                if (error) throw error;
            }

            showFeedback('success', t('common.success'), t('settings.save_configuration'));
            setEditModalVisible(false);
        } catch (e: any) {
            showFeedback('error', t('common.error'), e.message);
        } finally {
            setSavingLinks(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppHeader title={t('settings.categories')} showBack={true} hideThemeToggle={true} />
            <FlatList
                data={categories}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ListItem
                        title={item.name}
                        subtitle={t('settings.link_attributes_helper')}
                        onPress={() => openEditModal(item)}
                    />
                )}
            />

            <View style={styles.fab}>
                <AppButton title={"+ " + t('common.add')} onPress={() => setCreateModalVisible(true)} />
            </View>

            {/* Create Modal */}
            <Modal visible={createModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('settings.new_category')}</Text>
                        <AppTextInput
                            label={t('common.name')}
                            value={newCategoryName}
                            onChangeText={setNewCategoryName}
                        />
                        <View style={styles.modalButtons}>
                            <AppButton
                                title={t('common.cancel')}
                                variant="outline"
                                onPress={() => setCreateModalVisible(false)}
                                style={{ flex: 1, marginRight: 8 }}
                            />
                            <AppButton
                                title={t('common.add')}
                                loading={creating}
                                onPress={createCategory}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit/Link Modal */}
            <Modal visible={editModalVisible} animationType="slide">
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <AppHeader title={`${t('common.edit')} ${selectedCategory?.name}`} showBack={true} onBack={() => setEditModalVisible(false)} hideThemeToggle={true} />
                    <ScrollView contentContainerStyle={styles.content}>
                        <Text style={styles.sectionTitle}>{t('settings.linked_attributes')}</Text>
                        <Text style={styles.helperText}>{t('settings.link_attributes_helper')}</Text>

                        {attributes.map(attr => (
                            <View key={attr.id} style={styles.switchRow}>
                                <View>
                                    <Text style={styles.itemTitle}>{attr.name}</Text>
                                    <Text style={styles.itemSubtitle}>{attr.code}</Text>
                                </View>
                                <Switch
                                    value={linkedAttributeIds.includes(attr.id)}
                                    onValueChange={() => toggleAttributeLink(attr.id)}
                                    trackColor={{ false: '#eee', true: colors.primary }}
                                />
                            </View>
                        ))}
                        {attributes.length === 0 && <Text style={{ textAlign: 'center', marginTop: 20 }}>{t('settings.no_attributes_defined')}</Text>}

                    </ScrollView>
                    <View style={styles.footer}>
                        <AppButton
                            title={t('common.cancel')}
                            variant="outline"
                            onPress={() => setEditModalVisible(false)}
                            style={{ marginBottom: 12 }}
                        />
                        <AppButton
                            title={t('settings.save_configuration')}
                            loading={savingLinks}
                            onPress={saveLinks}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    content: {
        padding: 16,
    },
    fab: {
        padding: 16,
        borderTopWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 16,
        color: colors.text,
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: 16,
    },
    header: {
        padding: 16,
        paddingTop: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
        color: colors.text,
    },
    helperText: {
        color: colors.textSecondary,
        marginBottom: 16,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    itemSubtitle: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    footer: {
        padding: 16,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderColor: colors.border,
    }
});
