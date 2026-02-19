
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Colors, Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RegisterScreen() {
    const router = useRouter();
    const { register, isLoading } = useAuth();
    const insets = useSafeAreaInsets();

    const [companyName, setCompanyName] = useState('');
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { showFeedback } = useFeedback();

    const handleRegister = async () => {
        if (!companyName || !userName || !email || !password) {
            showFeedback('error', 'Error', 'Please fill in all fields');
            return;
        }

        const { error } = await register(companyName, userName, email, password);
        if (error) {
            showFeedback('error', 'Registration Failed', error.message || 'Something went wrong');
        } else {
            router.replace('/(tabs)/dashboard');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient
                colors={Gradients.primary}
                style={[styles.background, { paddingTop: insets.top }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.headerContainer}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                <Text style={styles.backButtonText}>← Back</Text>
                            </TouchableOpacity>
                            <Text style={styles.appName}>Create Account</Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.header}>
                                <Text style={styles.title}>Get Started</Text>
                                <Text style={styles.subtitle}>Start managing your stock today</Text>
                            </View>

                            <AppTextInput
                                label="Company Name"
                                placeholder="e.g. My Business Inc."
                                value={companyName}
                                onChangeText={setCompanyName}
                                style={styles.input}
                            />

                            <AppTextInput
                                label="Your Name"
                                placeholder="e.g. John Founder"
                                value={userName}
                                onChangeText={setUserName}
                                style={styles.input}
                            />

                            <AppTextInput
                                label="Email Address"
                                placeholder="admin@business.com"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                style={styles.input}
                            />

                            <AppTextInput
                                label="Password"
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                style={styles.input}
                            />

                            <View style={styles.footerButtons}>
                                <AppButton
                                    title="Create Account"
                                    onPress={handleRegister}
                                    loading={isLoading}
                                    style={styles.button}
                                />

                                <View style={styles.loginContainer}>
                                    <Text style={styles.loginText}>Already have an account? </Text>
                                    <TouchableOpacity onPress={() => router.back()}>
                                        <Text style={styles.loginLink}>Sign In</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>By registering, you agree to our Terms & Privacy</Text>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
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
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 32,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.light.textSecondary,
    },
    input: {
        backgroundColor: '#F7F8FA',
    },
    footerButtons: {
        marginTop: 12,
    },
    button: {
        borderRadius: 12,
        height: 56,
        shadowColor: Colors.light.primary,
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
        color: Colors.light.textSecondary,
        fontSize: 15,
    },
    loginLink: {
        color: Colors.light.primary,
        fontWeight: '600',
        fontSize: 15,
    },
    footer: {
        marginTop: 24,
        alignItems: 'center',
    },
    footerText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        textAlign: 'center',
    },
});
