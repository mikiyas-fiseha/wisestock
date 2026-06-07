
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { LanguagePicker } from '@/components/ui/LanguagePicker';
import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RegisterScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { register, isLoading } = useAuth();
    const insets = useSafeAreaInsets();

    const [companyName, setCompanyName] = useState('');
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { showFeedback } = useFeedback();
    const { t } = useTranslation();

    const handleRegister = async () => {
        if (!companyName || !userName || !email || !password) {
            showFeedback('error', t('common.error'), t('auth.fill_all_fields'));
            return;
        }

        const { error } = await register(companyName, userName, email, password);
        if (error) {
            showFeedback('error', t('auth.registration_failed'), error.message || 'Something went wrong');
        } else {
            router.replace('/(tabs)/dashboard');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient
                colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                style={[styles.background, { paddingTop: insets.top }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={[styles.topActions, { top: insets.top + 8 }]}>
                        <LanguagePicker />
                    </View>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.headerContainer}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                <Text style={[styles.backButtonText, { color: theme === 'dark' ? '#cbd5e1' : '#64748b' }]}>← {t('common.back')}</Text>
                            </TouchableOpacity>
                            <Text style={[styles.appName, { color: theme === 'dark' ? '#fff' : '#1e293b' }]}>{t('auth.create_account')}</Text>
                        </View>

                        <BlurView
                            tint={theme === 'dark' ? 'dark' : 'light'}
                            intensity={theme === 'dark' ? 60 : 80}
                            style={[styles.card, theme === 'dark' ? styles.cardDark : styles.cardLight]}
                        >
                            <View style={styles.header}>
                                <Text style={styles.title}>{t('auth.get_started')}</Text>
                                <Text style={styles.subtitle}>{t('auth.register_subtitle')}</Text>
                            </View>

                            <AppTextInput
                                label={t('auth.company_name')}
                                placeholder="e.g. My Business Inc."
                                value={companyName}
                                onChangeText={setCompanyName}
                                style={styles.input}
                                icon="building-o"
                            />

                            <AppTextInput
                                label={t('auth.your_name')}
                                placeholder="e.g. John Founder"
                                value={userName}
                                onChangeText={setUserName}
                                style={styles.input}
                                icon="user-o"
                            />

                            <AppTextInput
                                label={t('auth.email')}
                                placeholder="admin@business.com"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                style={styles.input}
                                icon="envelope-o"
                            />

                            <AppTextInput
                                label={t('auth.password')}
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                style={styles.input}
                                icon="lock"
                            />

                            <View style={styles.footerButtons}>
                                <AppButton
                                    title={t('auth.create_account')}
                                    onPress={handleRegister}
                                    loading={isLoading}
                                    style={styles.button}
                                />

                                <View style={styles.loginContainer}>
                                    <Text style={styles.loginText}>{t('auth.already_account')}</Text>
                                    <TouchableOpacity onPress={() => router.back()}>
                                        <Text style={styles.loginLink}>{t('auth.sign_in')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </BlurView>

                        <View style={styles.footer}>
                            <Text style={[styles.footerText, { color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>{t('auth.terms_privacy')}</Text>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
        alignSelf: 'center',
        width: '100%',
        maxWidth: 500,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    headerContainer: {
        marginBottom: 24,
    },
    backButton: {
        marginBottom: 16,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    card: {
        borderRadius: 24,
        padding: 32,
        overflow: 'hidden',
    },
    cardLight: {
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderColor: 'rgba(255,255,255,0.8)',
        borderWidth: 1,
    },
    cardDark: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    input: {
        backgroundColor: 'transparent',
    },
    footerButtons: {
        marginTop: 12,
    },
    button: {
        borderRadius: 12,
        height: 56,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    loginText: {
        color: colors.textSecondary,
        fontSize: 15,
    },
    loginLink: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 15,
    },
    footer: {
        marginTop: 24,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        textAlign: 'center',
    },
    topActions: {
        position: 'absolute',
        right: 20,
        zIndex: 1000,
    },
});
