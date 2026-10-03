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

export default function LoginScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const insets = useSafeAreaInsets();
    const { showFeedback } = useFeedback();
    const { t } = useTranslation();

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            showFeedback('error', t('common.error'), t('auth.enter_email_password'));
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await login(email.trim(), password);
            if (result.error) {
                showFeedback('error', t('auth.login_failed'), result.error.message || 'Login failed');
                setIsSubmitting(false);
            } else {
                if (result.isSuperAdmin) {
                    router.replace('/(super-admin)/superadminDasboarde');
                } else {
                    router.replace('/(tabs)/dashboard');
                }
            }
        } catch (e: any) {
            showFeedback('error', t('auth.login_failed'), e?.message || 'Login failed');
            setIsSubmitting(false);
        }
    };

    const handleRegister = () => {
        router.push('/register');
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
                        {/* Hero Header */}
                        <View style={styles.heroHeader}>
                            <View style={styles.logoBadgeContainer}>
                                <LinearGradient
                                    colors={['#3B82F6', '#1D4ED8']}
                                    style={styles.logoBadge}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <FontAwesome name="cubes" size={32} color="#FFFFFF" />
                                </LinearGradient>
                            </View>
                            <Text style={styles.brandTitle}>WiseStock</Text>
                            <Text style={styles.brandSubtitle}>Enterprise Inventory & POS</Text>
                        </View>

                        {/* Card & Backdrop */}
                        <BlurView
                            tint={theme === 'dark' ? 'dark' : 'light'}
                            intensity={theme === 'dark' ? 65 : 85}
                            style={[styles.card, theme === 'dark' ? styles.cardDark : styles.cardLight]}
                        >
                            <View style={styles.header}>
                                <Text style={styles.title}>{t('auth.welcome_back')}</Text>
                                <Text style={styles.subtitle}>{t('auth.sign_in_subtitle')}</Text>
                            </View>

                            <AppTextInput
                                label={t('auth.email')}
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
                                label={t('auth.password')}
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                secureTextEntry={!showPassword}
                                autoComplete="password"
                                textContentType="password"
                                style={styles.input}
                                icon="lock"
                                rightIcon={showPassword ? 'eye-slash' : 'eye'}
                                onRightIconPress={() => setShowPassword((prev) => !prev)}
                                rightIconAccessibilityLabel={showPassword ? t('auth.hide_password', 'Hide password') : t('auth.show_password', 'Show password')}
                            />

                            <TouchableOpacity
                                onPress={() => router.push('/forgot-password')}
                                style={styles.forgotPasswordContainer}
                                activeOpacity={0.7}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityRole="button"
                            >
                                <Text style={styles.forgotPasswordText}>
                                    {t('auth.forgot_password', 'Forgot Password?')}
                                </Text>
                            </TouchableOpacity>

                            <AppButton
                                title={t('auth.sign_in')}
                                onPress={handleLogin}
                                loading={isSubmitting}
                                style={styles.button}
                            />

                            <View style={styles.registerContainer}>
                                <Text style={styles.registerText}>{t('auth.no_account')} </Text>
                                <TouchableOpacity onPress={handleRegister} activeOpacity={0.7}>
                                    <Text style={styles.registerLink}>{t('auth.create_account')}</Text>
                                </TouchableOpacity>
                            </View>
                        </BlurView>

                        <View style={styles.footer}>
                            <FontAwesome
                                name="shield"
                                size={13}
                                color={theme === 'dark' ? '#94A3B8' : '#64748B'}
                                style={styles.footerIcon}
                            />
                            <Text style={styles.footerText}>
                                {t('auth.terms_privacy', 'Protected by enterprise-grade encryption')}
                            </Text>
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
        paddingTop: 40,
        paddingBottom: 40,
    },
    topActions: {
        position: 'absolute',
        right: 20,
        zIndex: 1000,
    },
    heroHeader: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoBadgeContainer: {
        marginBottom: 16,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
    },
    logoBadge: {
        width: 72,
        height: 72,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    brandTitle: {
        fontSize: 32,
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
        marginBottom: 24,
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
    forgotPasswordContainer: {
        alignSelf: 'flex-end',
        marginTop: 2,
        marginBottom: 16,
    },
    forgotPasswordText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    button: {
        marginTop: 8,
        borderRadius: 12,
        height: 52,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    registerText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    registerLink: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 36,
    },
    footerIcon: {
        marginRight: 6,
    },
    footerText: {
        color: theme === 'dark' ? '#94A3B8' : '#64748B',
        fontSize: 13,
        fontWeight: '500',
    },
});
