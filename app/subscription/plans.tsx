
import { AppButton } from '@/components/ui/AppButton';

import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

interface Plan {
    id: string;
    name: string;
    price: number;
    duration_months: number;
    description: string;
    max_users: number;
    features: any;
}

export default function SubscriptionPlansScreen() {
    const { colors, theme } = useTheme();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const styles = React.useMemo(() => createStyles(colors, isDesktop), [colors, isDesktop]);
    const { company } = useAuth();
    const router = useRouter();
    const { showFeedback } = useFeedback();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState<string | null>(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('is_active', true)
                .order('price');

            if (error) throw error;
            setPlans(data || []);
        } catch (e) {
            console.error(e);
            showFeedback('error', 'Error', 'Failed to load plans');
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (plan: Plan) => {
        if (!company) return;
        setSubscribing(plan.id);

        try {
            // Mock Payment Flow
            // In reality, this would open a Stripe/payment sheet.
            // For now, we'll confirm via simple alert and then create the subscription.

            if (plan.price === 0) {
                // Free Trial - Auto Activate
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 7); // 7 Days for trial

                const { error } = await supabase.from('subscriptions').insert({
                    company_id: company.id,
                    plan_id: plan.id,
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    status: 'on_trial',
                    payment_reference: 'TRIAL'
                });
                if (error) throw error;

                showFeedback('success', 'Success', 'Your 7-day free trial has started!');
                router.replace('/(tabs)/dashboard');

            } else {
                // Paid Plan - Pending Approval
                const startDate = new Date();
                const endDate = new Date();
                endDate.setMonth(endDate.getMonth() + plan.duration_months);

                const { error } = await supabase.from('subscriptions').insert({
                    company_id: company.id,
                    plan_id: plan.id,
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    status: 'pending_approval',
                    payment_reference: `PENDING-${Date.now()}`
                });

                if (error) throw error;

                if (error) throw error;
                showFeedback('success', 'Subscription Submitted', 'Your subscription is pending Super Admin approval. You will be notified once active.');
                router.replace('/(tabs)/dashboard');
            }

        } catch (e: any) {
            showFeedback('error', 'Error', e.message || 'Subscription failed');
        } finally {
            setSubscribing(null);
        }
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <ScrollView contentContainerStyle={{ paddingVertical: 20 }}>
                <Text style={styles.header}>Choose a Plan</Text>
                <Text style={styles.subHeader}>Select the best plan for {company?.name}</Text>

                <View style={styles.plansContainer}>
                    {plans.map((plan, index) => {
                        const isPopular = index === 1 || plan.name.toLowerCase().includes('pro');
                        return (
                            <BlurView
                                key={plan.id}
                                tint={theme === 'dark' ? 'dark' : 'light'}
                                intensity={theme === 'dark' ? 60 : 80}
                                style={[
                                    styles.planCard,
                                    theme === 'dark' ? styles.cardDark : styles.cardLight,
                                    isPopular && styles.cardPopular
                                ]}
                            >
                                {isPopular && (
                                    <View style={styles.popularBadge}>
                                        <Text style={styles.popularText}>★ MOST POPULAR</Text>
                                    </View>
                                )}
                                <View style={styles.planHeader}>
                                    <Text style={styles.planName}>{plan.name}</Text>
                                    <Text style={styles.planPrice}>${plan.price}</Text>
                                    <Text style={styles.planDuration}>/ {plan.duration_months === 1 ? 'month' : plan.duration_months === 12 ? 'year' : `${plan.duration_months} months`}</Text>
                                </View>

                                <View style={[styles.divider, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />

                                <Text style={styles.description}>{plan.description}</Text>

                                {/* Feature List (Mock) */}
                                <View style={styles.features}>
                                    <View style={styles.featureRow}><FontAwesome name="check" color={colors.primary} /><Text style={styles.featureText}>{plan.max_users === 0 ? 'Unlimited' : plan.max_users} Users</Text></View>
                                    <View style={styles.featureRow}><FontAwesome name="check" color={colors.primary} /><Text style={styles.featureText}>Full Inventory Access</Text></View>
                                    <View style={styles.featureRow}><FontAwesome name="check" color={colors.primary} /><Text style={styles.featureText}>24/7 Support</Text></View>
                                </View>

                                <AppButton
                                    title={subscribing === plan.id ? "Processing..." : "Subscribe"}
                                    onPress={() => handleSubscribe(plan)}
                                    loading={subscribing === plan.id}
                                    style={{ ...styles.subscribeBtn, ...(isPopular ? { backgroundColor: colors.primary } : {}) } as any}
                                />
                            </BlurView>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any, isDesktop: boolean) => StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginTop: Platform.OS === 'ios' ? 60 : 40,
    },
    subHeader: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
    },
    plansContainer: {
        gap: 24,
        paddingBottom: 40,
        flexDirection: isDesktop ? 'row' : 'column',
        flexWrap: isDesktop ? 'wrap' : 'nowrap',
        justifyContent: isDesktop ? 'center' : 'flex-start',
        alignItems: isDesktop ? 'center' : 'stretch',
    },
    planCard: {
        borderRadius: 24,
        padding: 32,
        paddingTop: 40,
        overflow: 'hidden',
        position: 'relative',
        width: isDesktop ? 300 : '100%',
    },
    cardPopular: {
        transform: isDesktop ? [{ scale: 1.05 }] : undefined,
        borderColor: colors.primary,
        borderWidth: 2,
        zIndex: 10,
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
            },
            android: {
                elevation: 10,
            }
        })
    },
    popularBadge: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.primary,
        paddingVertical: 8,
        alignItems: 'center',
    },
    popularText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
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
    subscribeBtn: {
        marginTop: 20,
        borderRadius: 16,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    planHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    planName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 8,
    },
    planPrice: {
        fontSize: 36,
        fontWeight: '800',
        color: colors.text,
    },
    planDuration: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 16,
    },
    description: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    features: {
        marginBottom: 24,
        gap: 8,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    featureText: {
        color: colors.text,
        fontSize: 14,
    }
});
