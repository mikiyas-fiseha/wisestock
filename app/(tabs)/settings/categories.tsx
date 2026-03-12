
import { ListItem } from '@/components/ListItem';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';

import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients } from '@/constants/Colors';
import React, { useEffect, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

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
        if (!newCategoryName.trim()) return;
        setCreating(true);
        try {
            const { error } = await supabase
                .from('categories')
                .insert([{ company_id: company?.id, name: newCategoryName }]);
            if (error) throw error;
            setCreateModalVisible(false);
            fetchCategories();
            showFeedback('success', 'Success', 'Category created');
        } catch (e: any) {
            showFeedback('error', 'Error', e.message);
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
        if (!selectedCategory) return;
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

            showFeedback('success', 'Success', 'Configuration saved');
            setEditModalVisible(false);
        } catch (e: any) {
            showFeedback('error', 'Error', e.message);
        } finally {
            setSavingLinks(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />
            <FlatList
                data={categories}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ListItem
                        title={item.name}
                        subtitle="Tap to configure attributes"
                        onPress={() => openEditModal(item)}
                    />
                )}
            />

            <View style={styles.fab}>
                <AppButton title="+ Add Category" onPress={() => setCreateModalVisible(true)} />
            </View>

            {/* Create Modal */}
            <Modal visible={createModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Category</Text>
                        <AppTextInput
                            label="Name"
                            value={newCategoryName}
                            onChangeText={setNewCategoryName}
                        />
                        <View style={styles.modalButtons}>
                            <AppButton
                                title="Cancel"
                                variant="outline"
                                onPress={() => setCreateModalVisible(false)}
                                style={{ flex: 1, marginRight: 8 }}
                            />
                            <AppButton
                                title="Create"
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
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Configure {selectedCategory?.name}</Text>
                    </View>
                    <ScrollView contentContainerStyle={styles.content}>
                        <Text style={styles.sectionTitle}>Linked Attributes</Text>
                        <Text style={styles.helperText}>Select attributes available for products in this category.</Text>

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
                        {attributes.length === 0 && <Text style={{ textAlign: 'center', marginTop: 20 }}>No attributes defined. Go to Attributes screen first.</Text>}

                    </ScrollView>
                    <View style={styles.footer}>
                        <AppButton
                            title="Cancel"
                            variant="outline"
                            onPress={() => setEditModalVisible(false)}
                            style={{ marginBottom: 12 }}
                        />
                        <AppButton
                            title="Save Configuration"
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
        borderColor: '#eee',
        backgroundColor: '#fff',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: 16,
    },
    header: {
        padding: 16,
        paddingTop: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    helperText: {
        color: '#666',
        marginBottom: 16,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: '#f0f0f0',
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    itemSubtitle: {
        color: '#999',
        fontSize: 12,
    },
    footer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderColor: '#eee',
    }
});
