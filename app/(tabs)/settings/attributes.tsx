
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
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';

interface Attribute {
    id: string;
    name: string;
    code: string;
    type: string;
}

export default function AttributesScreen() {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { company } = useAuth();
    const { showFeedback } = useFeedback();
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (company) fetchAttributes();
    }, [company]);

    const fetchAttributes = async () => {
        try {
            const { data, error } = await supabase
                .from('attributes')
                .select('*')
                .order('name');
            if (error) throw error;
            setAttributes(data || []);
        } catch (e) {
            console.error(e);
            showFeedback('error', t('common.error'), t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const createAttribute = async () => {
        if (creating) return;
        if (!name.trim() || !code.trim()) return;

        setCreating(true);
        try {
            const { error } = await supabase
                .from('attributes')
                .insert([{
                    company_id: company?.id,
                    name,
                    code: code.toLowerCase().replace(/\s+/g, '_'),
                    type: 'text' // Hardcoded for MVP
                }]);

            if (error) throw error;

            setName('');
            setCode('');
            setModalVisible(false);
            fetchAttributes();
        } catch (e: any) {
            showFeedback('error', t('common.error'), e.message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppHeader title={t('settings.attributes')} showBack={true} hideThemeToggle={true} />
            <FlatList
                data={attributes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ListItem title={item.name} subtitle={`${t('settings.attribute_code')}: ${item.code} | ${t('settings.attribute_type')}: ${item.type}`} />
                )}
            />

            <View style={styles.fab}>
                <AppButton title={"+ " + t('settings.add_attribute')} onPress={() => setModalVisible(true)} />
            </View>

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('settings.new_attribute')}</Text>
                        <AppTextInput
                            label={t('common.name')}
                            value={name}
                            onChangeText={(t) => {
                                setName(t);
                                if (!code) setCode(t.toLowerCase().replace(/\s+/g, '_'));
                            }}
                        />
                        <AppTextInput
                            label={t('settings.attribute_code')}
                            value={code}
                            onChangeText={setCode}
                            placeholder="unique_code"
                        />
                        <View style={styles.modalButtons}>
                            <AppButton
                                title={t('common.cancel')}
                                variant="outline"
                                onPress={() => setModalVisible(false)}
                                style={{ flex: 1, marginRight: 8 }}
                            />
                            <AppButton
                                title={t('common.confirm')}
                                loading={creating}
                                onPress={createAttribute}
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
    container: {
        flex: 1,
        backgroundColor: 'transparent',
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
});
