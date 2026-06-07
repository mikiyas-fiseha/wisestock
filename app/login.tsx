
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

export default function LoginScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { login, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const insets = useSafeAreaInsets();
    const { showFeedback } = useFeedback();
    const { t } = useTranslation();

    const handleLogin = async () => {
        if (!email || !password) {
            showFeedback('error', t('common.error'), t('auth.enter_email_password'));
            return;
        }

        const { error } = await login(email, password);
        if (error) {
            showFeedback('error', t('auth.login_failed'), error.message);
        } else {
            router.replace('/(tabs)/dashboard');
        }
    };

    const handleRegister = () => {
        router.push('/register');
    };

    const scrollRef = React.useRef<ScrollView>(null);

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 150);
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
                        ref={scrollRef}
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
                                <Text style={styles.title}>{t('auth.welcome_back')}</Text>
                                <Text style={styles.subtitle}>{t('auth.sign_in_subtitle')}</Text>
                            </View>

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

                            <AppButton
                                title={t('auth.sign_in')}
                                onPress={handleLogin}
                                loading={isLoading}
                                style={styles.button}
                            />

                            <View style={styles.registerContainer}>
                                <Text style={styles.registerText}>{t('auth.no_account')}</Text>
                                <TouchableOpacity onPress={handleRegister}>
                                    <Text style={styles.registerLink}>{t('auth.create_account')}</Text>
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
        backgroundColor: '#e2e8f0', // Silver metallic light
        borderColor: '#cbd5e1',
        shadowColor: '#94a3b8',
    },
    logoCircleDark: {
        backgroundColor: '#1e293b', // Dark metallic
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
        fontSize: 16,
        color: colors.textSecondary,
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
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    registerText: {
        color: colors.textSecondary,
        fontSize: 15,
    },
    registerLink: {
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
