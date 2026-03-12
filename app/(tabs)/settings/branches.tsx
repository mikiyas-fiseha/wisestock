
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';

import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { Branch, useBranches } from '@/hooks/useBranches';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients } from '@/constants/Colors';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function BranchesScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { company, isAdmin } = useAuth();
    const { showFeedback } = useFeedback();
    const { branches, createBranch, updateBranch, deleteBranch, isCreating, isUpdating, isDeleting } = useBranches();

    // Create Modal
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');

    // Edit Modal
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

    const handleCreate = async () => {
        if (!name.trim()) return;
        try {
            await createBranch({ name, address, phone });
            setCreateModalVisible(false);
            setName('');
            setAddress('');
            setPhone('');
            showFeedback('success', 'Success', 'Branch created');
        } catch (e: any) {
            showFeedback('error', 'Error', e.message);
        }
    };

    const handleUpdate = async () => {
        if (!selectedBranch || !name.trim()) return;
        try {
            await updateBranch({ id: selectedBranch.id, name, address, phone });
            setEditModalVisible(false);
            setSelectedBranch(null);
            showFeedback('success', 'Success', 'Branch updated');
        } catch (e: any) {
            showFeedback('error', 'Error', e.message);
        }
    };

    const handleToggleStatus = async (branch: Branch) => {
        const newStatus = branch.status === 'active' ? 'inactive' : 'active';
        try {
            await updateBranch({ id: branch.id, status: newStatus } as any);
            showFeedback('success', 'Status Updated', `${branch.name} is now ${newStatus}`);
        } catch (e: any) {
            showFeedback('error', 'Error', e.message);
        }
    };

    const handleSetDefault = async (branch: Branch) => {
        Alert.alert(
            'Set as Default',
            `Set "${branch.name}" as the main branch? This will unset the current main branch.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            // Unset current main
                            const currentMain = branches?.find(b => b.is_main);
                            if (currentMain) {
                                await updateBranch({ id: currentMain.id, is_main: false } as any);
                            }
                            // Set new main
                            await updateBranch({ id: branch.id, is_main: true } as any);
                            showFeedback('success', 'Success', `${branch.name} is now the main branch`);
                        } catch (e: any) {
                            showFeedback('error', 'Error', e.message);
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = async (id: string, branchName: string) => {
        Alert.alert(
            'Delete Branch',
            `Are you sure you want to delete "${branchName}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteBranch(id);
                            showFeedback('success', 'Success', 'Branch deleted');
                        } catch (e: any) {
                            showFeedback('error', 'Error', e.message);
                        }
                    }
                }
            ]
        );
    };

    const openEditModal = (branch: Branch) => {
        setSelectedBranch(branch);
        setName(branch.name);
        setAddress(branch.address || '');
        setPhone(branch.phone || '');
        setEditModalVisible(true);
    };

    const openCreateModal = () => {
        setName('');
        setAddress('');
        setPhone('');
        setCreateModalVisible(true);
    };

    const renderBranchItem = ({ item }: { item: Branch }) => {
        const isActive = item.status !== 'inactive';
        return (
            <View style={[styles.branchCard, !isActive && styles.branchCardInactive]}>
                <View style={styles.branchHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.branchTitleRow}>
                            <FontAwesome name="building-o" size={16} color={isActive ? colors.primary : '#94A3B8'} />
                            <Text style={[styles.branchName, !isActive && { color: '#94A3B8' }]}>{item.name}</Text>
                            {item.is_main && (
                                <View style={styles.mainBadge}>
                                    <FontAwesome name="star" size={10} color="#F59E0B" />
                                    <Text style={styles.mainBadgeText}>Main</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.branchAddress}>{item.address || 'No address set'}</Text>
                        {item.phone && <Text style={styles.branchPhone}>{item.phone}</Text>}
                    </View>

                    {/* Status Toggle */}
                    <View style={styles.statusToggle}>
                        <Text style={styles.statusLabel}>{isActive ? 'Active' : 'Inactive'}</Text>
                        <Switch
                            value={isActive}
                            onValueChange={() => handleToggleStatus(item)}
                            trackColor={{ false: '#E2E8F0', true: `${colors.primary}40` }}
                            thumbColor={isActive ? colors.primary : '#94A3B8'}
                            disabled={item.is_main}
                        />
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.branchActions}>
                    <Pressable style={styles.actionBtn} onPress={() => openEditModal(item)}>
                        <FontAwesome name="pencil" size={12} color="#64748B" />
                        <Text style={styles.actionBtnText}>Edit</Text>
                    </Pressable>

                    {!item.is_main && (
                        <>
                            <Pressable style={styles.actionBtn} onPress={() => handleSetDefault(item)}>
                                <FontAwesome name="star-o" size={12} color="#F59E0B" />
                                <Text style={styles.actionBtnText}>Set as Main</Text>
                            </Pressable>
                            <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(item.id, item.name)}>
                                <FontAwesome name="trash-o" size={12} color="#DC2626" />
                                <Text style={styles.actionBtnTextDanger}>Delete</Text>
                            </Pressable>
                        </>
                    )}
                </View>
            </View>
        );
    };

    const renderModal = (visible: boolean, onClose: () => void, onSubmit: () => void, loading: boolean, title: string, submitLabel: string) => (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{title}</Text>

                    <AppTextInput label="Branch Name *" value={name} onChangeText={setName} />
                    <AppTextInput label="Address" value={address} onChangeText={setAddress} />
                    <AppTextInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

                    <View style={styles.modalButtons}>
                        <AppButton title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1, marginRight: 8 }} />
                        <AppButton title={submitLabel} loading={loading} onPress={onSubmit} style={{ flex: 1 }} />
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Branches</Text>
                    <Text style={styles.headerSubtitle}>{branches?.length || 0} locations</Text>
                </View>
            </View>

            <FlatList
                data={branches}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={renderBranchItem}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <FontAwesome name="building" size={36} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No branches yet</Text>
                    </View>
                }
            />

            <View style={styles.fab}>
                <AppButton title="+ Add Branch" onPress={openCreateModal} />
            </View>

            {renderModal(createModalVisible, () => setCreateModalVisible(false), handleCreate, isCreating, "New Branch", "Create")}
            {renderModal(editModalVisible, () => setEditModalVisible(false), handleUpdate, isUpdating, "Edit Branch", "Update")}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#94A3B8',
    },
    listContent: { padding: 16, paddingBottom: 100 },

    // Branch Card
    branchCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    branchCardInactive: {
        opacity: 0.6,
        backgroundColor: '#F8FAFC',
    },
    branchHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    branchTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    branchName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    mainBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    mainBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#92400E',
    },
    branchAddress: {
        fontSize: 13,
        color: '#64748B',
        marginLeft: 24,
    },
    branchPhone: {
        fontSize: 12,
        color: '#94A3B8',
        marginLeft: 24,
        marginTop: 2,
    },

    // Status
    statusToggle: {
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 2,
    },

    // Actions
    branchActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#F1F5F9',
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748B',
    },
    actionBtnDanger: {
        backgroundColor: '#FEF2F2',
    },
    actionBtnTextDanger: {
        fontSize: 12,
        fontWeight: '500',
        color: '#DC2626',
    },

    // Empty
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        color: '#94A3B8',
    },

    // FAB & Modal
    fab: { padding: 16, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
    modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
    modalButtons: { flexDirection: 'row', marginTop: 16 },
});
