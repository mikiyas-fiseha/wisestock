import { Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { PaymentGuide } from './PaymentGuide';

interface PlansListProps {
    onSuccess?: () => void;
}

export interface SubscriptionPlan {
    id: string;
    name?: string;
    price: number;
    duration_months?: number;
    currency?: string;
    [key: string]: any;
}

export function PlansList({ onSuccess }: PlansListProps) {
    const { colors, theme } = useTheme();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const styles = React.useMemo(() => createStyles(colors, isDesktop, theme), [colors, isDesktop, theme]);
    const { company, user, session, recheckSubscription } = useAuth();
    const router = useRouter();
    const { showFeedback } = useFeedback();
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const [dbPlanId, setDbPlanId] = useState<string | null>(null);
    const [subscribing, setSubscribing] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        fetchPlanInfo();
    }, []);

    const fetchPlanInfo = async () => {
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .order('price', { ascending: true });

            if (!error && data && data.length > 0) {
                // In payment plan option only show the yearly and make it 2999
                const yearlyPlans = data.filter((p: any) =>
                    p.duration_months === 12 ||
                    (p.name && (p.name.toLowerCase().includes('year') || p.name.toLowerCase().includes('annual') || p.name.toLowerCase().includes('ዓመት'))) ||
                    p.billing_cycle === 'yearly' ||
                    p.billing_cycle === 'annual' ||
                    p.price === 2999
                );
                const sourcePlan = yearlyPlans.length > 0 ? yearlyPlans[0] : data[0];
                const normalizedPlan: SubscriptionPlan = {
                    ...sourcePlan,
                    name: sourcePlan.name || (i18n.language === 'am' ? 'ዓመታዊ እቅድ' : 'Pro Annual Plan'),
                    price: 2999,
                    duration_months: 12,
                };
                setAllPlans([normalizedPlan]);
                setSelectedPlan(normalizedPlan);
                setDbPlanId(normalizedPlan.id);
            } else {
                const defaultPlan: SubscriptionPlan = {
                    id: 'pro-annual-2999',
                    name: i18n.language === 'am' ? 'ዓመታዊ እቅድ' : 'Pro Annual Plan',
                    price: 2999,
                    duration_months: 12,
                    currency: i18n.language === 'am' ? 'ብር' : 'ETB',
                };
                setAllPlans([defaultPlan]);
                setSelectedPlan(defaultPlan);
                setDbPlanId(defaultPlan.id);
            }
        } catch (e) {
            console.error('Error fetching subscription plan info:', e);
            const defaultPlan: SubscriptionPlan = {
                id: 'pro-annual-2999',
                name: i18n.language === 'am' ? 'ዓመታዊ እቅድ' : 'Pro Annual Plan',
                price: 2999,
                duration_months: 12,
                currency: i18n.language === 'am' ? 'ብር' : 'ETB',
            };
            setAllPlans([defaultPlan]);
            setSelectedPlan(defaultPlan);
            setDbPlanId(defaultPlan.id);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        const activeCompanyId = company?.id || user?.companyId;

        if (!activeCompanyId) {
            if (!session) {
                showFeedback('error', t('common.error'), 'Please sign in to choose a subscription package.');
                router.push('/login');
            } else if (user?.isSuperAdmin) {
                showFeedback('info', 'Super Admin', 'Super Admins do not require a subscription plan.');
                router.replace('/(super-admin)/superadminDasboarde');
            } else {
                showFeedback('error', t('common.error'), 'No company profile found for this account.');
            }
            return;
        }

        setSubscribing(true);

        try {
            let targetPlanId = selectedPlan?.id || dbPlanId;
            if (!targetPlanId) {
                const { data: plans } = await supabase.from('subscription_plans').select('id').limit(1);
                if (plans && plans.length > 0) {
                    targetPlanId = plans[0].id;
                } else {
                    targetPlanId = 'pro-annual-2999';
                }
            }

            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + (selectedPlan?.duration_months || 12));

            const { error: insertError } = await supabase.from('subscriptions').insert({
                company_id: activeCompanyId,
                plan_id: targetPlanId,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                status: 'pending_approval',
                payment_reference: `BILL-${Date.now()}`
            });

            if (insertError) {
                console.warn('Initial subscription insert warning:', insertError.message);
                const { data: fallbackPlans } = await supabase.from('subscription_plans').select('id').limit(1);
                if (fallbackPlans && fallbackPlans.length > 0 && fallbackPlans[0].id !== targetPlanId) {
                    const { error: retryError } = await supabase.from('subscriptions').insert({
                        company_id: activeCompanyId,
                        plan_id: fallbackPlans[0].id,
                        start_date: startDate.toISOString(),
                        end_date: endDate.toISOString(),
                        status: 'pending_approval',
                        payment_reference: `BILL-${Date.now()}`
                    });
                    if (retryError) throw retryError;
                } else {
                    throw insertError;
                }
            }

            showFeedback('success', t('subscription.plan_selected'), t('subscription.follow_guide'));
            await recheckSubscription();

            if (onSuccess) {
                onSuccess();
            } else {
                setShowGuide(true);
            }
        } catch (e: any) {
            console.error('Subscription error:', e);
            showFeedback('error', t('common.error'), e.message || t('subscription.action_failed'));
        } finally {
            setSubscribing(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (showGuide) {
        return (
            <PaymentGuide
                amount={selectedPlan?.price}
                currency={selectedPlan?.currency}
                planId={selectedPlan?.id}
                onComplete={() => {
                    setShowGuide(false);
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.replace('/(tabs)/dashboard');
                    }
                }}
                onCancel={() => setShowGuide(false)}
            />
        );
    }

    const isAmharic = i18n.language === 'am';
    const displayPrice = 2999;
    const planCurrency = selectedPlan?.currency || (isAmharic ? 'ብር' : 'ETB');
    const planName = selectedPlan?.name || (isAmharic ? 'ዓመታዊ እቅድ' : 'Pro Annual Plan');
    const durationMonths = 12;
    const monthlyPrice = Math.round(displayPrice / durationMonths);
    const originalPrice = selectedPlan?.original_price ?? Math.round(displayPrice * 2.5);

    const periodLabel = isAmharic ? 'ዓመት' : 'year';
    const periodShort = isAmharic ? 'ዓመት' : 'yr';

    const featuresList = [
        t('subscription.feature_1', 'Unlimited Inventory & POS'),
        t('subscription.feature_2', 'Multi-Branch Management'),
        t('subscription.feature_3', 'Analytics & Advanced Reports'),
        t('subscription.feature_4', 'Receivables & Payables'),
        t('subscription.feature_5', 'Receipt Generator'),
        t('subscription.feature_6', 'Priority Support'),
    ];

    return (
        <View style={styles.container}>
            {/* Header Area */}
            <View style={styles.headerArea}>
                <Text style={styles.mainTitle}>{t('subscription.choose_plan', 'Enterprise Pro Plan')}</Text>
                <Text style={styles.subTitle}>
                    {t('subscription.sub_title', 'All-in-one business solution for inventory, sales, branches, and financial analytics.')}
                </Text>
            </View>

            {/* Payment Plan Option (Only showing the yearly option at 2999) */}
            {allPlans.length > 0 && (
                <View style={styles.planSelectorRow}>
                    {allPlans.map((plan) => {
                        const isSelected = selectedPlan?.id === plan.id;
                        const pPrice = 2999;
                        const pCurr = plan.currency || planCurrency;
                        const planLabel = isAmharic ? 'ዓመታዊ (1 ዓመት)' : 'Yearly (1 Year)';
                        return (
                            <TouchableOpacity
                                key={plan.id}
                                activeOpacity={0.8}
                                onPress={() => {
                                    setSelectedPlan(plan);
                                    setDbPlanId(plan.id);
                                }}
                                style={[
                                    styles.planTabCard,
                                    isSelected && styles.planTabCardSelected,
                                ]}
                            >
                                <Text style={[styles.planTabText, isSelected && styles.planTabTextSelected]}>
                                    {planLabel}
                                </Text>
                                <Text style={[styles.planTabPrice, isSelected && styles.planTabPriceSelected]}>
                                    {pPrice.toLocaleString()} {pCurr}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Selected Plan Offer Card */}
            <View style={styles.cardWrapper}>
                <View style={styles.cardBorderGlow}>
                    <View style={styles.card}>
                        {/* Top Badge */}
                        <View style={styles.badgeRow}>
                            <LinearGradient
                                colors={['#F59E0B', '#EF4444']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.popularBadge}
                            >
                                <FontAwesome5 name="fire" size={12} color="#FFF" style={{ marginRight: 6 }} />
                                <Text style={styles.popularBadgeText}>
                                    {t('subscription.popular_badge', 'MOST POPULAR • SAVE 60%')}
                                </Text>
                            </LinearGradient>
                        </View>

                        {/* Title Section */}
                        <View style={styles.titleSection}>
                            <LinearGradient
                                colors={theme === 'dark' ? ['rgba(99,102,241,0.25)', 'rgba(79,70,229,0.1)'] : ['rgba(99,102,241,0.15)', 'rgba(79,70,229,0.05)']}
                                style={styles.iconCircle}
                            >
                                <Ionicons name="sparkles" size={24} color={colors.primary} />
                            </LinearGradient>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.planName}>{planName}</Text>
                                <Text style={styles.planSubtitle}>
                                    {t('subscription.plan_subtitle', 'Unlimited access to all enterprise tools and features for 1 full year.')}
                                </Text>
                            </View>
                        </View>

                        {/* Pricing Section */}
                        <View style={styles.priceContainer}>
                            <View style={styles.originalPriceRow}>
                                <Text style={styles.originalPrice}>{`${originalPrice.toLocaleString()} ${planCurrency}`}</Text>
                                <View style={styles.savePill}>
                                    <Text style={styles.savePillText}>{t('subscription.save_badge', 'Save 60%')}</Text>
                                </View>
                            </View>
                            <View style={styles.mainPriceRow}>
                                <Text style={styles.priceAmount}>{displayPrice.toLocaleString()}</Text>
                                <View style={styles.priceUnitCol}>
                                    <Text style={styles.currencyCode}>{planCurrency}</Text>
                                    <Text style={styles.perYear}>/ {periodLabel}</Text>
                                </View>
                            </View>
                            <Text style={styles.monthlyBreakdown}>
                                ~{monthlyPrice.toLocaleString()} {planCurrency} / {t('subscription.month', 'month')} ({t('subscription.billed_annually', 'Billed annually')})
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        {/* Feature List */}
                        <View style={styles.featuresSection}>
                            <Text style={styles.featuresTitle}>
                                {t('subscription.features_header', `Included in ${planName}:`)}
                            </Text>
                            <View style={styles.featuresGrid}>
                                {featuresList.map((feat, idx) => (
                                    <View key={idx} style={styles.featureItem}>
                                        <View style={styles.checkBadge}>
                                            <FontAwesome5 name="check" size={11} color="#FFF" />
                                        </View>
                                        <Text style={styles.featureText}>{feat}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* CTA Section */}
                        <View style={styles.ctaSection}>
                            <LinearGradient
                                colors={['#6366F1', '#4F46E5']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.ctaGradient}
                            >
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={handleSubscribe}
                                    disabled={subscribing}
                                    style={styles.ctaButton}
                                >
                                    {subscribing ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="rocket-launch" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                            <Text style={styles.ctaButtonText}>
                                                {isAmharic
                                                    ? `አሁኑኑ ያድሱ - ${displayPrice.toLocaleString()} ${planCurrency}/${periodShort}`
                                                    : `Upgrade Now - ${displayPrice.toLocaleString()} ${planCurrency}/${periodShort}`}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </LinearGradient>

                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => setShowGuide(true)}
                                style={styles.viewGuideBtn}
                            >
                                <Ionicons name="receipt-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                                <Text style={styles.viewGuideText}>
                                    {t('subscription.view_payment_instructions', 'View Payment Guide & Account Details')}
                                </Text>
                            </TouchableOpacity>

                            <Text style={styles.paymentMethodsNote}>
                                {t('subscription.payment_note', 'Supported payment methods: CBE Birr, Telebirr, and Bank Transfer')}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

const createStyles = (colors: any, isDesktop: boolean, theme: string) => StyleSheet.create({
    center: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        width: '100%',
        alignItems: 'center',
        paddingTop: isDesktop ? 30 : 16,
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    headerArea: {
        alignItems: 'center',
        marginBottom: 24,
    },
    mainTitle: {
        fontSize: isDesktop ? 34 : 26,
        fontWeight: '900',
        color: colors.text,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subTitle: {
        fontSize: isDesktop ? 15 : 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 6,
        maxWidth: 500,
        lineHeight: 20,
    },
    planSelectorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 20,
        width: '100%',
        maxWidth: 540,
    },
    planTabCard: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        minWidth: 120,
    },
    planTabCardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '15',
    },
    planTabText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    planTabTextSelected: {
        color: colors.primary,
    },
    planTabPrice: {
        fontSize: 14,
        fontWeight: '900',
        color: colors.text,
        marginTop: 2,
    },
    planTabPriceSelected: {
        color: colors.primary,
    },
    cardWrapper: {
        width: '100%',
        maxWidth: 540,
        alignSelf: 'center',
    },
    cardBorderGlow: {
        borderRadius: 24,
        padding: 2,
        backgroundColor: colors.primary + '30',
        borderWidth: 1.5,
        borderColor: colors.primary,
        ...Layout.shadows.large,
    },
    card: {
        borderRadius: 22,
        backgroundColor: colors.card,
        padding: isDesktop ? 32 : 20,
    },
    badgeRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
    },
    popularBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
    },
    popularBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    titleSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 20,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    planName: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
    },
    planSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
        lineHeight: 18,
    },
    priceContainer: {
        alignItems: 'center',
        marginVertical: 12,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.04)',
        padding: 18,
        borderRadius: 16,
    },
    originalPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    originalPrice: {
        textDecorationLine: 'line-through',
        color: colors.textSecondary,
        fontSize: 15,
        fontWeight: '600',
    },
    savePill: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    savePillText: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '800',
    },
    mainPriceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 6,
    },
    priceAmount: {
        fontSize: isDesktop ? 44 : 38,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: -1,
    },
    priceUnitCol: {
        marginBottom: 6,
    },
    currencyCode: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.primary,
    },
    perYear: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    monthlyBreakdown: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 20,
    },
    featuresSection: {
        marginBottom: 24,
    },
    featuresTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 14,
        letterSpacing: 0.4,
    },
    featuresGrid: {
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    checkBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    ctaSection: {
        alignItems: 'center',
        gap: 12,
    },
    ctaGradient: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
    },
    ctaButton: {
        height: 54,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    ctaButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    viewGuideBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: colors.primary + '12',
        borderWidth: 1,
        borderColor: colors.primary + '30',
        width: '100%',
    },
    viewGuideText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '700',
    },
    paymentMethodsNote: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        opacity: 0.8,
    },
});
