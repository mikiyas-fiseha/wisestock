
import { ListItem } from '@/components/ListItem';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { Branch, useBranches } from '@/hooks/useBranches';
import React, { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';

export default function BranchesScreen() {
    const { company } = useAuth();
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

    const handleDelete = async (id: string) => {
        try {
            await deleteBranch(id);
            showFeedback('success', 'Success', 'Branch deleted');
        } catch (e: any) {
            showFeedback('error', 'Error', e.message);
        }
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
            <FlatList
                data={branches}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <ListItem
                        title={item.name}
                        subtitle={`${item.is_main ? '(Main) ' : ''}${item.address || 'No Address'}`}
                        onPress={() => openEditModal(item)}
                        rightIcon={!item.is_main && (
                            <Text style={{ color: 'red', fontSize: 13 }} onPress={() => handleDelete(item.id)}>Delete</Text>
                        )}
                    />
                )}
            />

            <View style={styles.fab}>
                <AppButton title="+ Add Branch" onPress={openCreateModal} />
            </View>

            {renderModal(createModalVisible, () => setCreateModalVisible(false), handleCreate, isCreating, "New Branch", "Create")}
            {renderModal(editModalVisible, () => setEditModalVisible(false), handleUpdate, isUpdating, "Edit Branch", "Update")}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    listContent: { padding: 16 },
    fab: { padding: 16, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
    modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
    modalButtons: { flexDirection: 'row', marginTop: 16 },
});
