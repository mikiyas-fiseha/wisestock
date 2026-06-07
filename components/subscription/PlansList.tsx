import { AppButton } from '@/components/ui/AppButton';
import { Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

interface Plan {
    id: string;
    name: string;
    price: number;
    duration_months: number;
    description: string;
    max_users: number;
    features: any;
}

interface PlansListProps {
    onSuccess?: () => void;
}

export function PlansList({ onSuccess }: PlansListProps) {
    const { colors, theme } = useTheme();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const styles = React.useMemo(() => createStyles(colors, isDesktop, theme), [colors, isDesktop, theme]);
    const { company } = useAuth();
    const router = useRouter();
    const { showFeedback } = useFeedback();
    const { t } = useTranslation();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
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
            const fetchedPlans = data || [];
            setPlans(fetchedPlans);
            if (fetchedPlans.length > 0) {
                const proIndex = fetchedPlans.findIndex(p => p.name.toLowerCase().includes('pro'));
                setSelectedPlanId(proIndex !== -1 ? fetchedPlans[proIndex].id : fetchedPlans[0].id);
            }
        } catch (e) {
            showFeedback('error', t('common.error'), t('subscription.failed_load'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        const plan = plans.find(p => p.id === selectedPlanId);
        if (!company || !plan) return;
        setSubscribing(plan.id);

        try {
            if (plan.price === 0) {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 7);

                const { error } = await supabase.from('subscriptions').insert({
                    company_id: company.id,
                    plan_id: plan.id,
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    status: 'on_trial',
                    payment_reference: 'TRIAL'
                });
                if (error) throw error;
                showFeedback('success', t('subscription.trial_started'), t('subscription.trial_active'));
            } else {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setMonth(endDate.getMonth() + plan.duration_months);

                const { error } = await supabase.from('subscriptions').insert({
                    company_id: company.id,
                    plan_id: plan.id,
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    status: 'pending_approval',
                    payment_reference: `BILL-${Date.now()}`
                });
                if (error) throw error;
                showFeedback('success', t('subscription.plan_selected'), t('subscription.follow_guide'));
            }

            if (onSuccess) onSuccess();
            else router.replace('/(tabs)/dashboard');
        } catch (e: any) {
            showFeedback('error', t('common.error'), e.message || t('subscription.action_failed'));
        } finally {
            setSubscribing(null);
        }
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
    }

    const filteredPlans = plans;

    const renderHeader = () => (
        <View style={styles.headerArea}>
            <Text style={styles.mainTitle}>{t('subscription.choose_plan')}</Text>
            <Text style={styles.subTitle}>{t('subscription.affordable_pricing')}</Text>
        </View>
    );

    if (isDesktop) {
        return (
            <View style={styles.mainWrapperDesktop}>
                {renderHeader()}
                <View style={styles.desktopGrid}>
                    {filteredPlans.map((plan) => {
                        const isSelected = selectedPlanId === plan.id;
                        const isHighlighted = isSelected; // In the screenshot, the selected one is fully styled blue
                        const price = plan.price;

                        return (
                            <TouchableOpacity
                                key={plan.id}
                                activeOpacity={0.9}
                                onPress={() => setSelectedPlanId(plan.id)}
                                style={[
                                    styles.desktopCard,
                                    isHighlighted && styles.desktopCardHighlighted
                                ]}
                            >
                                <View style={styles.cardContent}>
                                    <View style={styles.titleArea}>
                                        <View style={[styles.checkbox, isSelected && styles.checkboxActive, isHighlighted && styles.checkboxHighlighted]}>
                                            {isSelected && <FontAwesome5 name="check" size={10} color={isHighlighted ? colors.primary : '#fff'} />}
                                        </View>
                                        <View>
                                            <Text style={[styles.planLabel, isHighlighted && { color: '#fff' }]}>
                                                {t(`subscription.dynamic.${plan.name}`, plan.name)}
                                            </Text>
                                        </View>
                                        {plan.duration_months === 12 && (
                                            <View style={[styles.badge, isHighlighted && styles.badgeHighlighted]}>
                                                <Text style={[styles.badgeText, isHighlighted && styles.badgeTextHighlighted]}>{t('subscription.save_40')}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[styles.descriptionText, isHighlighted && { color: 'rgba(255,255,255,0.8)' }]}>{(!plan.description || plan.description.trim() === '') ? t('subscription.get_full_access') : t(`subscription.dynamic.${plan.description}`, plan.description)}</Text>

                                    <View style={[styles.divider, isHighlighted && styles.dividerHighlighted]} />

                                    <View style={styles.priceRow}>
                                        <Text style={[styles.priceSymbol, isHighlighted && { color: '#fff' }]}>Br</Text>
                                        <Text style={[styles.priceValue, isHighlighted && { color: '#fff' }]}>{price}</Text>
                                        <Text style={[styles.pricePeriod, isHighlighted && { color: 'rgba(255,255,255,0.8)' }]}>/{plan.duration_months === 12 ? t('subscription.year') : t('subscription.month')}</Text>
                                    </View>

                                    <View style={styles.featuresList}>
                                        {plan.features && Array.isArray(plan.features) && plan.features.map((feature, i) => (
                                            <View key={i} style={styles.featureRow}>
                                                <FontAwesome5 name="check" size={12} color={isHighlighted ? '#fff' : colors.text} />
                                                <Text style={[styles.featureText, isHighlighted && { color: '#fff' }]}>{feature}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.cardFooter}>
                                    <TouchableOpacity style={styles.viewMoreBtn}>
                                        <Text style={[styles.viewMoreText, isHighlighted && { color: '#fff' }]}>{t('subscription.view_details')}</Text>
                                    </TouchableOpacity>

                                    <AppButton
                                        title={subscribing === plan.id ? "..." : t('subscription.select_package')}
                                        onPress={handleSubscribe}
                                        loading={subscribing === plan.id}
                                        style={StyleSheet.flatten([
                                            styles.desktopButton,
                                            isHighlighted ? styles.buttonHighlighted : styles.buttonNormal
                                        ])}
                                        textStyle={isHighlighted ? styles.buttonTextHighlighted : styles.buttonTextNormal}
                                    />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.mobileWrapper}>
            {renderHeader()}
            <View style={styles.mobileList}>
                {filteredPlans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const isHighlighted = isSelected;
                    return (
                        <TouchableOpacity
                            key={plan.id}
                            activeOpacity={0.7}
                            onPress={() => setSelectedPlanId(plan.id)}
                            style={[
                                styles.mobileRow,
                                isHighlighted && { backgroundColor: colors.primary, borderColor: colors.primary }
                            ]}
                        >
                            <View style={styles.rowMain}>
                                <View style={[styles.radio, isHighlighted && { borderColor: '#fff' }]}>
                                    <LinearGradient
                                        colors={isSelected ? (isHighlighted ? ['#fff', '#fff'] : ['#6366F1', '#4F46E5']) : ['transparent', 'transparent']}
                                        style={styles.radioInner}
                                    />
                                </View>
                                <View style={styles.rowInfo}>
                                    <View style={styles.rowTitleArea}>
                                        <Text style={[styles.rowName, { color: isHighlighted ? '#fff' : colors.text }]}>{t(`subscription.dynamic.${plan.name}`, plan.name)}</Text>
                                        {plan.duration_months === 12 && (
                                            <View style={[styles.mobileBadge, isHighlighted && styles.badgeHighlighted]}>
                                                <Text style={[styles.mobileBadgeText, isHighlighted && styles.badgeTextHighlighted]}>{t('subscription.save_40')}</Text>
                                            </View>
                                        )}
                                    </View>
                                    {/* Description hidden on mobile as requested */}
                                </View>
                            </View>
                            <View style={styles.rowPriceArea}>
                                <Text style={[styles.rowPrice, { color: isHighlighted ? '#fff' : colors.text }]}>Br {plan.price}</Text>
                                <Text style={[styles.rowPriceSub, isHighlighted && { color: 'rgba(255,255,255,0.8)' }]}>/{plan.duration_months === 12 ? t('subscription.year_short') : t('subscription.month_short')}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.mobileStickyFooter}>
                <AppButton
                    title={subscribing ? t('subscription.processing') : t('subscription.continue_payment')}
                    onPress={handleSubscribe}
                    loading={!!subscribing}
                    style={styles.mobileContinueBtn}
                />
                <Text style={styles.mobileFooterNote}>{t('subscription.secure_payment')}</Text>
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
    mainWrapperDesktop: {
        width: '100%',
        alignItems: 'center',
        paddingTop: 40,
        paddingHorizontal: 20,
    },
    headerArea: {
        alignItems: 'center',
        marginBottom: 40,
    },
    mainTitle: {
        fontSize: isDesktop ? 36 : 28,
        fontWeight: '800',
        color: colors.text,
        textAlign: 'center',
        lineHeight: isDesktop ? 44 : 34,
        letterSpacing: -0.5,
        marginBottom: 12,
    },
    subTitle: {
        fontSize: isDesktop ? 16 : 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: isDesktop ? 32 : 20,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: theme === 'dark' ? '#1f2937' : '#f3f4f6',
        padding: 6,
        borderRadius: 16,
        width: 320,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    toggleBtnActive: {
        backgroundColor: colors.primary,
        ...Layout.shadows.medium,
    },
    toggleBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    toggleBtnTextActive: {
        color: '#fff',
    },
    desktopGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 20,
        paddingBottom: 60,
        maxWidth: 1300,
    },
    desktopCard: {
        width: 280,
        padding: 24,
        borderRadius: 20,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'space-between',
        position: 'relative',
        ...Layout.shadows.small,
    },
    desktopCardHighlighted: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
        ...Layout.shadows.large,
        transform: [{ scale: 1.02 }, { translateY: -4 }],
    },
    cardContent: {
        flex: 1,
    },
    titleArea: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 6,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme === 'dark' ? '#1f2937' : '#f3f4f6',
    },
    checkboxActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
    },
    checkboxHighlighted: {
        borderColor: '#fff',
        backgroundColor: '#fff',
    },
    planLabel: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
    },
    descriptionText: {
        fontSize: 13,
        color: colors.textSecondary,
        paddingLeft: 34,
    },
    badge: {
        backgroundColor: 'rgba(52, 199, 89, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 'auto',
    },
    badgeHighlighted: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    badgeText: {
        color: colors.success,
        fontSize: 12,
        fontWeight: '700',
    },
    badgeTextHighlighted: {
        color: '#fff',
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 20,
    },
    dividerHighlighted: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 24,
    },
    priceSymbol: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        marginRight: 4,
    },
    priceValue: {
        fontSize: 40,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: -1,
    },
    pricePeriod: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
        marginLeft: 4,
    },
    featuresList: {
        gap: 14,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    featureText: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
    },
    cardFooter: {
        marginTop: 32,
    },
    viewMoreBtn: {
        alignItems: 'center',
        marginBottom: 16,
    },
    viewMoreText: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '600',
    },
    desktopButton: {
        height: 48,
        borderRadius: 12,
    },
    buttonNormal: {
        backgroundColor: colors.primary,
    },
    buttonHighlighted: {
        backgroundColor: '#fff',
    },
    buttonTextNormal: {
        color: '#fff',
        fontWeight: '700',
    },
    buttonTextHighlighted: {
        color: colors.primary,
        fontWeight: '800',
    },
    // Mobile Styles
    mobileWrapper: {
        width: '100%',
        alignItems: 'center',
        paddingTop: 108,
        paddingHorizontal: 16,
    },
    mobileList: {
        width: '100%',
        gap: 12,
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    mobileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    rowMain: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rowInfo: {
        flex: 1,
    },
    rowTitleArea: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    rowName: {
        fontSize: 15,
        fontWeight: '800',
    },
    mobileBadge: {
        backgroundColor: 'rgba(52, 199, 89, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 8,
    },
    mobileBadgeText: {
        color: colors.success,
        fontSize: 10,
        fontWeight: '800',
    },
    rowLimit: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    rowPriceArea: {
        alignItems: 'flex-end',
        marginLeft: 12,
    },
    rowPrice: {
        fontSize: 16,
        fontWeight: '900',
    },
    rowPriceSub: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    mobileStickyFooter: {
        width: '100%',
        paddingHorizontal: 20,
        paddingBottom: 30,
        alignItems: 'center',
    },
    mobileContinueBtn: {
        width: '100%',
        height: 52,
        borderRadius: 16,
    },
    mobileFooterNote: {
        marginTop: 12,
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    }
});
