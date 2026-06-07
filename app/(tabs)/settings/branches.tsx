
import { AppHeader } from '@/components/AppHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';

import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { Branch, useBranches } from '@/hooks/useBranches';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

export default function BranchesScreen() {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
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
        if (isCreating) return;
        if (!name.trim()) return;

        try {
            await createBranch({ name, address, phone });
            setCreateModalVisible(false);
            setName('');
            setAddress('');
            setPhone('');
            showFeedback('success', t('common.success'), t('settings.branch_created'));
        } catch (e: any) {
            showFeedback('error', t('common.error'), e.message);
        }
    };

    const handleUpdate = async () => {
        if (isUpdating) return;
        if (!selectedBranch || !name.trim()) return;

        try {
            await updateBranch({ id: selectedBranch.id, name, address, phone });
            setEditModalVisible(false);
            setSelectedBranch(null);
            showFeedback('success', t('common.success'), t('settings.branch_updated'));
        } catch (e: any) {
            showFeedback('error', t('common.error'), e.message);
        }
    };

    const handleToggleStatus = async (branch: Branch) => {
        if (isUpdating) return;
        const newStatus = branch.status === 'active' ? 'inactive' : 'active';

        try {
            await updateBranch({ id: branch.id, status: newStatus } as any);
            showFeedback('success', t('common.status'), `${branch.name} ${t('common.is_now')} ${t('common.' + newStatus)}`);
        } catch (e: any) {
            showFeedback('error', t('common.error'), e.message);
        }
    };

    const handleSetDefault = async (branch: Branch) => {
        Alert.alert(
            t('settings.set_as_main'),
            `${t('settings.set_as_main')} "${branch.name}"? ${t('settings.set_as_main_helper')}`,
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.confirm'),
                    onPress: async () => {
                        try {
                            // Unset current main
                            const currentMain = branches?.find(b => b.is_main);
                            if (currentMain) {
                                await updateBranch({ id: currentMain.id, is_main: false } as any);
                            }
                            // Set new main
                            await updateBranch({ id: branch.id, is_main: true } as any);
                            showFeedback('success', t('common.success'), `${branch.name} ${t('common.is_now')} ${t('settings.main')}`);
                        } catch (e: any) {
                            showFeedback('error', t('common.error'), e.message);
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = async (id: string, branchName: string) => {
        Alert.alert(
            t('settings.delete_branch'),
            `${t('settings.delete_branch')} "${branchName}"? ${t('common.cannot_be_undone')}`,
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteBranch(id);
                            showFeedback('success', t('common.success'), t('settings.branch_deleted'));
                        } catch (e: any) {
                            showFeedback('error', t('common.error'), e.message);
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
                                    <Text style={styles.mainBadgeText}>{t('settings.main')}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.branchAddress}>{item.address || t('settings.no_address')}</Text>
                        {item.phone && <Text style={styles.branchPhone}>{item.phone}</Text>}
                    </View>

                    {/* Status Toggle */}
                    <View style={styles.statusToggle}>
                        <Text style={styles.statusLabel}>{isActive ? t('common.active') : t('common.inactive')}</Text>
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
                        <Text style={styles.actionBtnText}>{t('common.edit')}</Text>
                    </Pressable>

                    {!item.is_main && (
                        <>
                            <Pressable style={styles.actionBtn} onPress={() => handleSetDefault(item)}>
                                <FontAwesome name="star-o" size={12} color="#F59E0B" />
                                <Text style={styles.actionBtnText}>{t('settings.set_as_main')}</Text>
                            </Pressable>
                            <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(item.id, item.name)}>
                                <FontAwesome name="trash-o" size={12} color="#DC2626" />
                                <Text style={styles.actionBtnTextDanger}>{t('common.delete')}</Text>
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

                    <AppTextInput label={t('settings.branch_name') + " *"} value={name} onChangeText={setName} />
                    <AppTextInput label={t('customers.address_placeholder')} value={address} onChangeText={setAddress} />
                    <AppTextInput label={t('common.phone_placeholder')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

                    <View style={styles.modalButtons}>
                        <AppButton title={t('common.cancel')} variant="outline" onPress={onClose} style={{ flex: 1, marginRight: 8 }} />
                        <AppButton title={submitLabel} loading={loading} onPress={onSubmit} style={{ flex: 1 }} />
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppHeader title={t('settings.branches')} showBack={true} hideThemeToggle={true} />

            <FlatList
                data={branches}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={renderBranchItem}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <FontAwesome name="building" size={36} color="#CBD5E1" />
                        <Text style={styles.emptyText}>{t('settings.no_branches')}</Text>
                    </View>
                }
            />

            <View style={styles.fab}>
                <AppButton title={"+ " + t('settings.add_branch')} onPress={openCreateModal} />
            </View>

            {renderModal(createModalVisible, () => setCreateModalVisible(false), handleCreate, isCreating, t('settings.new_branch'), t('common.add'))}
            {renderModal(editModalVisible, () => setEditModalVisible(false), handleUpdate, isUpdating, t('settings.edit_branch'), t('common.edit'))}
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
        color: colors.textSecondary,
    },
    listContent: { padding: 16, paddingBottom: 100 },

    // Branch Card
    branchCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border + '50',
    },
    branchCardInactive: {
        opacity: 0.6,
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
        color: colors.textSecondary,
        marginLeft: 24,
    },
    branchPhone: {
        fontSize: 12,
        color: colors.textSecondary + '80',
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
        color: colors.textSecondary,
        marginBottom: 2,
    },

    // Actions
    branchActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border + '20',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: colors.border + '30',
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    actionBtnDanger: {
        backgroundColor: '#FEF2F220',
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
        color: colors.textSecondary,
    },

    // FAB & Modal
    fab: { padding: 16, borderTopWidth: 1, borderColor: colors.border + '20', backgroundColor: colors.background },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
    modalContent: { backgroundColor: colors.card, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: colors.border + '50' },
    modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16, color: colors.text },
    modalButtons: { flexDirection: 'row', marginTop: 16 },
});
