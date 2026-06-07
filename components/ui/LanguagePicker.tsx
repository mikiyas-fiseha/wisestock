
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const LANGUAGES = [
    { label: 'English', value: 'en', flag: '🇺🇸' },
    { label: 'አማርኛ', value: 'am', flag: '🇪🇹' },
    { label: 'Afaan Oromoo', value: 'om', flag: '🇪🇹' },
    { label: 'ትግርኛ', value: 'ti', flag: '🇪🇹' },
    { label: 'Af-Soomaali', value: 'so', flag: '🇸🇴' },
];

const LANGUAGE_KEY = 'user-language';

export function LanguagePicker() {
    const { colors, theme } = useTheme();
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const alternativeLanguage = i18n.language === 'en'
        ? LANGUAGES.find(l => l.value === 'am')!
        : LANGUAGES.find(l => l.value === 'en')!;

    const handleSelect = async (lang: string) => {
        try {
            await i18n.changeLanguage(lang);
            await AsyncStorage.setItem(LANGUAGE_KEY, lang);
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to change language:', error);
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={() => setIsOpen(true)}
                style={[
                    styles.selector,
                    {
                        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                    }
                ]}
            >
                <Text style={styles.flag}>{alternativeLanguage.flag}</Text>
                <Text style={[styles.label, { color: theme === 'dark' ? '#fff' : colors.text }]}>
                    {alternativeLanguage.label}
                </Text>
                <FontAwesome name="globe" size={12} color={theme === 'dark' ? 'rgba(255,255,255,0.6)' : colors.textSecondary} />
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
                    <View style={[
                        styles.modalContent,
                        {
                            backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                            shadowColor: '#000',
                        }
                    ]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Language</Text>
                            <TouchableOpacity onPress={() => setIsOpen(false)}>
                                <FontAwesome name="times" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {LANGUAGES.map((lang) => (
                                <TouchableOpacity
                                    key={lang.value}
                                    style={[
                                        styles.langOption,
                                        i18n.language === lang.value && { backgroundColor: colors.primary + '15' }
                                    ]}
                                    onPress={() => handleSelect(lang.value)}
                                >
                                    <View style={styles.langLeft}>
                                        <Text style={styles.optionFlag}>{lang.flag}</Text>
                                        <Text style={[
                                            styles.optionText,
                                            { color: colors.text },
                                            i18n.language === lang.value && { color: colors.primary, fontWeight: '700' }
                                        ]}>
                                            {lang.label}
                                        </Text>
                                    </View>
                                    {i18n.language === lang.value && (
                                        <FontAwesome name="check" size={14} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        zIndex: 100,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
    },
    flag: {
        fontSize: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 24,
        padding: 20,
        elevation: 5,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    langOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 4,
    },
    langLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    optionFlag: {
        fontSize: 20,
    },
    optionText: {
        fontSize: 16,
    },
});
