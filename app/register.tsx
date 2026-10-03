import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { LanguagePicker } from '@/components/ui/LanguagePicker';
import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
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
    const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);
    const router = useRouter();
    const { register, isLoading } = useAuth();
    const insets = useSafeAreaInsets();

    const [companyName, setCompanyName] = useState('');
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
            <LinearGradient
                colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                style={styles.background}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={[styles.topActions, { top: insets.top + 12 }]}>
                    <LanguagePicker />
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={[styles.keyboardView, { paddingTop: insets.top }]}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.headerNav}>
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backButton}
                                activeOpacity={0.7}
                            >
                                <FontAwesome name="arrow-left" size={14} color={theme === 'dark' ? '#94A3B8' : '#64748B'} />
                                <Text style={styles.backButtonText}>{t('common.back', 'Back')}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Hero Header */}
                        <View style={styles.heroHeader}>
                            <View style={styles.logoBadgeContainer}>
                                <LinearGradient
                                    colors={['#3B82F6', '#1D4ED8']}
                                    style={styles.logoBadge}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <FontAwesome name="building" size={28} color="#FFFFFF" />
                                </LinearGradient>
                            </View>
                            <Text style={styles.brandTitle}>{t('auth.create_account', 'Create Account')}</Text>
                            <Text style={styles.brandSubtitle}>WiseStock Enterprise Platform</Text>
                        </View>

                        {/* Glassmorphic Slate Card */}
                        <BlurView
                            tint={theme === 'dark' ? 'dark' : 'light'}
                            intensity={theme === 'dark' ? 65 : 85}
                            style={[styles.card, theme === 'dark' ? styles.cardDark : styles.cardLight]}
                        >
                            <View style={styles.header}>
                                <Text style={styles.title}>{t('auth.get_started', 'Get Started')}</Text>
                                <Text style={styles.subtitle}>{t('auth.register_subtitle', 'Set up your business workspace')}</Text>
                            </View>

                            <AppTextInput
                                label={t('auth.company_name', 'Company Name')}
                                placeholder="e.g. Acme Corporation"
                                value={companyName}
                                onChangeText={setCompanyName}
                                autoCapitalize="words"
                                autoCorrect={false}
                                autoComplete="organization"
                                textContentType="organizationName"
                                style={styles.input}
                                icon="building"
                            />

                            <AppTextInput
                                label={t('auth.your_name', 'Full Name')}
                                placeholder="e.g. Jane Doe"
                                value={userName}
                                onChangeText={setUserName}
                                autoCapitalize="words"
                                autoCorrect={false}
                                autoComplete="name"
                                textContentType="name"
                                style={styles.input}
                                icon="user"
                            />

                            <AppTextInput
                                label={t('auth.email', 'Email Address')}
                                placeholder="admin@business.com"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="email-address"
                                autoComplete="email"
                                textContentType="emailAddress"
                                style={styles.input}
                                icon="envelope"
                            />

                            <AppTextInput
                                label={t('auth.password', 'Password')}
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                secureTextEntry={!showPassword}
                                autoComplete="new-password"
                                textContentType="newPassword"
                                style={styles.input}
                                icon="lock"
                                rightIcon={showPassword ? 'eye-slash' : 'eye'}
                                onRightIconPress={() => setShowPassword((prev) => !prev)}
                                rightIconAccessibilityLabel={showPassword ? t('auth.hide_password', 'Hide password') : t('auth.show_password', 'Show password')}
                            />

                            <View style={styles.footerButtons}>
                                <AppButton
                                    title={t('auth.create_account', 'Create Account')}
                                    onPress={handleRegister}
                                    loading={isLoading}
                                    style={styles.button}
                                />

                                <View style={styles.loginContainer}>
                                    <Text style={styles.loginText}>{t('auth.already_account', 'Already have an account?')} </Text>
                                    <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                                        <Text style={styles.loginLink}>{t('auth.sign_in', 'Sign In')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </BlurView>

                        <View style={styles.footer}>
                            <FontAwesome
                                name="shield"
                                size={13}
                                color={theme === 'dark' ? '#94A3B8' : '#64748B'}
                                style={styles.footerIcon}
                            />
                            <Text style={styles.footerText}>{t('auth.terms_privacy', 'Protected by enterprise-grade encryption')}</Text>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
}

const createStyles = (colors: any, theme: 'light' | 'dark') => StyleSheet.create({
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
        maxWidth: 480,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
    },
    topActions: {
        position: 'absolute',
        right: 20,
        zIndex: 1000,
    },
    headerNav: {
        marginBottom: 16,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
        gap: 8,
    },
    backButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme === 'dark' ? '#CBD5E1' : '#475569',
    },
    heroHeader: {
        alignItems: 'center',
        marginBottom: 28,
    },
    logoBadgeContainer: {
        marginBottom: 14,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
    },
    logoBadge: {
        width: 68,
        height: 68,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    brandTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
        letterSpacing: -0.5,
    },
    brandSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme === 'dark' ? '#94A3B8' : '#64748B',
        marginTop: 4,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    card: {
        borderRadius: 24,
        padding: 28,
        overflow: 'hidden',
    },
    cardLight: {
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        borderColor: 'rgba(255, 255, 255, 0.8)',
        borderWidth: 1,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 6,
    },
    cardDark: {
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.35,
        shadowRadius: 32,
        elevation: 10,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    input: {
        backgroundColor: 'transparent',
    },
    footerButtons: {
        marginTop: 12,
    },
    button: {
        borderRadius: 12,
        height: 52,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    loginText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    loginLink: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
    },
    footerIcon: {
        marginRight: 6,
    },
    footerText: {
        color: theme === 'dark' ? '#94A3B8' : '#64748B',
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
    },
});
