import { AppButton } from '@/components/ui/AppButton';
import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PaymentGuide } from '../subscription/PaymentGuide';
import { PlansList } from '../subscription/PlansList';

interface SubscriptionGuardProps {
    children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
    const { colors, theme } = useTheme();
    const {
        isLoading: authLoading,
        isSuperAdmin,
        subStatus,
        subLoading,
        subReceiptUrl,
        subAmount,
        recheckSubscription,
    } = useAuth();
    const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);
    const { t } = useTranslation();
    const [showPaymentGuide, setShowPaymentGuide] = useState(false);
    const [manualReceiptUploaded, setManualReceiptUploaded] = useState(false);

    // Wait for both auth AND subscription to resolve before making any decision.
    // Because subscription is fetched in AuthContext alongside the profile, this
    // loading state is very short (no extra network round-trip).
    if (authLoading || subLoading) {
        return (
            <View style={styles.fullCenter}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // Super admins and active/trial users go straight through
    if (isSuperAdmin || subStatus === 'active' || subStatus === 'on_trial') {
        return <>{children}</>;
    }

    const hasReceiptUploaded = !!subReceiptUrl;
    const isPendingAndUploaded = subStatus === 'pending_approval' && (hasReceiptUploaded || manualReceiptUploaded);

    if (showPaymentGuide || (subStatus === 'pending_approval' && !isPendingAndUploaded)) {
        return (
            <SafeAreaView style={styles.safeContainer}>
                <LinearGradient
                    colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.guideWrapper}>
                    <PaymentGuide
                        amount={subAmount}
                        onComplete={() => {
                            setManualReceiptUploaded(true);
                            setShowPaymentGuide(false);
                            recheckSubscription();
                        }}
                        onCancel={subStatus === null ? () => setShowPaymentGuide(false) : undefined}
                    />
                </View>
            </SafeAreaView>
        );
    }

    const getStatusConfig = () => {
        switch (subStatus) {
            case 'pending_approval':
                return {
                    icon: 'clock-outline',
                    color: '#F59E0B',
                    title: t('subscription.status_reviewing'),
                    sub: t('subscription.reviewing_desc')
                };
            case 'expired':
                return {
                    icon: 'lock-outline',
                    color: '#EF4444',
                    title: t('subscription.expired'),
                    sub: t('subscription.renew_continue')
                };
            default:
                return {
                    icon: 'rocket-launch-outline',
                    color: '#6366F1',
                    title: t('subscription.welcome'),
                    sub: t('subscription.choose_plan_start')
                };
        }
    };

    const config = getStatusConfig();

    return (
        <SafeAreaView style={styles.safeContainer}>
            <LinearGradient
                colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {subStatus !== null && (
                    <View style={styles.header}>
                        <LinearGradient
                            colors={[config.color + '15', 'transparent']}
                            style={styles.headerAccent}
                        />

                        <View style={[styles.statusIcon, { backgroundColor: config.color + '15' }]}>
                            <MaterialCommunityIcons name={config.icon as any} size={28} color={config.color} />
                        </View>

                        <Text style={styles.title}>{config.title}</Text>
                        <Text style={styles.subtitle}>{config.sub}</Text>
                    </View>
                )}

                {subStatus === null ? (
                    <PlansList onSuccess={() => { recheckSubscription(); }} />
                ) : (
                    <View style={styles.actionArea}>
                        {subStatus === 'pending_approval' && (
                            <View style={styles.supportBento}>
                                <TouchableOpacity onPress={() => Linking.openURL('tel:0979990435')} style={styles.supportTile}>
                                    <FontAwesome name="phone" size={14} color={colors.primary} />
                                    <Text style={[styles.supportText, { color: colors.primary }]}>{t('subscription.call_support')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => Linking.openURL('https://t.me/wisestocksupport')} style={styles.supportTile}>
                                    <FontAwesome name="paper-plane" size={14} color="#00AEEF" />
                                    <Text style={[styles.supportText, { color: '#00AEEF' }]}>{t('subscription.telegram')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.primaryBtnWrapper}>
                            <AppButton
                                title={t('subscription.check_updates')}
                                onPress={recheckSubscription}
                                style={styles.actionBtn}
                            />
                        </LinearGradient>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: any, theme: string) => StyleSheet.create({
    safeContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    fullCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 48,
        paddingBottom: 32,
        overflow: 'hidden',
    },
    headerAccent: {
        position: 'absolute',
        top: -80,
        width: '140%',
        height: 240,
        borderRadius: 120,
    },
    statusIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: colors.text,
        marginBottom: 4,
        textAlign: 'center',
        letterSpacing: -0.4
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 20,
        opacity: 0.7
    },
    actionArea: {
        flex: 1,
        paddingHorizontal: 24,
        gap: 12,
        alignItems: 'center',
        paddingTop: 16
    },
    primaryBtnWrapper: {
        width: '100%',
        maxWidth: 260,
        borderRadius: 14,
        overflow: 'hidden',
    },
    actionBtn: {
        width: '100%',
        height: 50,
        backgroundColor: 'transparent',
    },
    guideWrapper: {
        flex: 1,
    },
    supportBento: {
        width: '100%',
        maxWidth: 320,
        gap: 12,
        marginBottom: 20,
    },
    supportTile: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        paddingVertical: 16,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        gap: 12,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
            android: { elevation: 2 },
            web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } as any
        })
    },
    supportText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
});
