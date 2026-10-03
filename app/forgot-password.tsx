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

export default function ForgotPasswordScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { resetPasswordForEmail } = useAuth();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const insets = useSafeAreaInsets();
    const { showFeedback } = useFeedback();
    const { t } = useTranslation();

    const handleResetPassword = async () => {
        if (!email.trim()) {
            showFeedback('error', t('common.error'), t('auth.fill_all_fields', 'Please fill in all fields'));
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await resetPasswordForEmail(email.trim());
            if (result?.error) {
                showFeedback('error', t('common.error'), result.error.message || 'Failed to send reset link');
                setIsSubmitting(false);
            } else {
                setIsSent(true);
                showFeedback(
                    'success',
                    t('auth.reset_link_sent', 'Reset Link Sent'),
                    t('auth.reset_link_sent_desc', 'Check your email for instructions to reset your password.')
                );
                setIsSubmitting(false);
            }
        } catch (e: any) {
            showFeedback('error', t('common.error'), e?.message || 'Failed to send reset link');
            setIsSubmitting(false);
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

                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.logoContainer}>
                            <View style={[styles.logoCircle, theme === 'dark' ? styles.logoCircleDark : styles.logoCircleLight]}>
                                <Text style={[styles.logoText, theme === 'dark' ? styles.logoTextDark : styles.logoTextLight]}>B</Text>
                            </View>
                            <Text style={[styles.appName, { color: theme === 'dark' ? '#fff' : '#1e293b' }]}>ብልህStock</Text>
                        </View>

                        <BlurView
                            tint={theme === 'dark' ? 'dark' : 'light'}
                            intensity={theme === 'dark' ? 60 : 80}
                            style={[styles.card, theme === 'dark' ? styles.cardDark : styles.cardLight]}
                        >
                            <View style={styles.header}>
                                <Text style={styles.title}>{t('auth.reset_password', 'Reset Password')}</Text>
                                <Text style={styles.subtitle}>
                                    {isSent
                                        ? t('auth.reset_link_sent_desc', 'Check your email for instructions to reset your password.')
                                        : t('auth.reset_password_subtitle', 'Enter your email to receive a password reset link')}
                                </Text>
                            </View>

                            {!isSent ? (
                                <>
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

                                    <AppButton
                                        title={t('auth.send_reset_link', 'Send Reset Link')}
                                        onPress={handleResetPassword}
                                        loading={isSubmitting}
                                        style={styles.button}
                                    />
                                </>
                            ) : (
                                <View style={styles.successContainer}>
                                    <View style={styles.successCircle}>
                                        <FontAwesome name="check" size={32} color={colors.success} />
                                    </View>
                                </View>
                            )}

                            <View style={styles.loginContainer}>
                                <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backRow}>
                                    <FontAwesome name="arrow-left" size={14} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={styles.loginLink}>{t('auth.back_to_login', 'Back to Login')}</Text>
                                </TouchableOpacity>
                            </View>
                        </BlurView>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Secure Business Management v1.0</Text>
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
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    logoCircleLight: {
        backgroundColor: '#e2e8f0',
        borderColor: '#cbd5e1',
        shadowColor: '#94a3b8',
    },
    logoCircleDark: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        shadowColor: '#000',
    },
    logoText: {
        fontSize: 40,
        fontWeight: 'bold',
    },
    logoTextLight: {
        color: '#64748b',
        textShadowColor: 'rgba(255,255,255,0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
    logoTextDark: {
        color: '#cbd5e1',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
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
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    input: {
        backgroundColor: 'transparent',
    },
    button: {
        marginTop: 12,
        borderRadius: 12,
        height: 56,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    successContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    successCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    backRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loginLink: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 15,
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    topActions: {
        position: 'absolute',
        right: 20,
        zIndex: 1000,
    },
});
