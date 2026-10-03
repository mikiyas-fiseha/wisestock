import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { pickImage } from '@/lib/imagePicker';
import { supabase } from '@/lib/supabase';
import { FontAwesome, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

interface PaymentGuideProps {
    amount?: number | null;
    currency?: string;
    planId?: string;
    onComplete: () => void;
    onCancel?: () => void;
}

export function PaymentGuide({ amount, currency, planId, onComplete, onCancel }: PaymentGuideProps) {
    const { colors, theme } = useTheme();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const styles = React.useMemo(() => createStyles(colors, theme, isDesktop), [colors, theme, isDesktop]);
    const { company, user } = useAuth();
    const { showFeedback } = useFeedback();
    const { t, i18n } = useTranslation();

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);
    const [fetchedCurrency, setFetchedCurrency] = useState<string | null>(null);
    const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        };
    }, []);

    React.useEffect(() => {
        if (amount == null) {
            supabase
                .from('subscription_plans')
                .select('price, currency, duration_months, name')
                .or('duration_months.eq.12,name.ilike.%year%,name.ilike.%annual%')
                .limit(1)
                .maybeSingle()
                .then(({ data }) => {
                    if (data) {
                        setFetchedPrice(2999);
                        if (data.currency) setFetchedCurrency(data.currency);
                    }
                });
        }
    }, [amount]);

    const displayAmount = amount ?? fetchedPrice ?? 2999;
    const currencyStr = currency || fetchedCurrency || (i18n.language?.startsWith('am') ? 'ብር' : 'ETB');
    const formattedAmount = `${displayAmount.toLocaleString('en-US')} ${currencyStr}`;

    const paymentMethods = [
        {
            id: 'cbe',
            name: t('subscription.bank_cbe', 'Commercial Bank of Ethiopia (CBE)'),
            account: '1000300692382',
            holder: 'Mikiyas Fiseha',
            icon: 'university',
            colors: ['#4B2C82', '#6A4BB2']
        },
        {
            id: 'telebirr',
            name: t('subscription.bank_telebirr', 'Telebirr'),
            account: '0939393770',
            holder: 'Mikiyas Fiseha',
            icon: 'mobile-alt',
            colors: ['#00AEEF', '#007BB5']
        },
        {
            id: 'Abyssina',
            name: t('subscription.bank_Abyssina', 'Abyssina'),
            account: '187437008',
            holder: 'Mikiyas Fiseha',
            icon: 'wallet',
            colors: ['#8E24AA', '#5E35B1']
        },
        // {
        //     id: 'awash',
        //     name: t('subscription.bank_awash', 'Awash Bank'),
        //     account: '01320814576700',
        //     holder: 'Mikiyas Fiseha',
        //     icon: 'landmark',
        //     colors: ['#F57C00', '#D84315']
        // }
    ];

    const handlePickImage = async () => {
        try {
            const uri = await pickImage();
            if (uri) setImageUri(uri);
        } catch (e) {
            showFeedback('error', t('common.error', 'Error'), t('subscription.failed_pick_image'));
        }
    };

    const handleRemoveImage = () => {
        setImageUri(null);
    };

    const handleCopy = async (text: string) => {
        try {
            await Clipboard.setStringAsync(text);
            setCopiedText(text);
            showFeedback('success', t('common.success', 'Success'), t('subscription.account_copied', 'Account number copied!'));
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = setTimeout(() => setCopiedText(null), 2500);
        } catch (e) {
            showFeedback('error', t('common.error', 'Error'), t('subscription.failed_copy', 'Failed to copy text'));
        }
    };

    const handleUploadAndComplete = async () => {
        if (!imageUri) {
            showFeedback('error', t('subscription.required', 'Required'), t('subscription.upload_first', 'Please upload a receipt screenshot first.'));
            return;
        }

        const activeCompanyId = company?.id || user?.companyId;
        if (!activeCompanyId) {
            showFeedback('error', t('common.error', 'Error'), 'Company identification not found.');
            return;
        }

        setUploading(true);
        try {
            let { data: sub, error: subError } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('company_id', activeCompanyId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!sub) {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setMonth(endDate.getMonth() + 12);

                let targetPlanId = planId;
                if (!targetPlanId) {
                    const { data: plans } = await supabase.from('subscription_plans').select('id').limit(1);
                    targetPlanId = plans && plans.length > 0 ? plans[0].id : 'pro-annual-2999';
                }

                const { data: newSub, error: createError } = await supabase
                    .from('subscriptions')
                    .insert({
                        company_id: activeCompanyId,
                        plan_id: targetPlanId,
                        start_date: startDate.toISOString(),
                        end_date: endDate.toISOString(),
                        status: 'pending_approval',
                        payment_reference: `BILL-${Date.now()}`
                    })
                    .select('id')
                    .single();

                if (createError) throw createError;
                sub = newSub;
            }

            const response = await fetch(imageUri);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();
            const fileName = `${activeCompanyId}/${Date.now()}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('subscription-receipts')
                .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('subscription-receipts').getPublicUrl(fileName);
            const receiptUrl = urlData.publicUrl;

            const { error: updateError } = await supabase
                .from('subscriptions')
                .update({ receipt_url: receiptUrl })
                .eq('id', sub.id);

            if (updateError) throw updateError;

            showFeedback('success', t('subscription.thank_you'), t('subscription.receipt_uploaded'));
            onComplete();
        } catch (e: any) {
            showFeedback('error', t('subscription.upload_failed'), e.message || t('subscription.something_went_wrong'));
        } finally {
            setUploading(false);
        }
    };

    const openSupport = (type: 'tel' | 'telegram') => {
        if (type === 'tel') {
            Linking.openURL('tel:0979990435');
        } else {
            Linking.openURL('https://t.me/wisestocksupport');
        }
    };

    const renderOrderSummary = () => (
        <View style={styles.summaryCardWrapper}>
            <LinearGradient
                colors={theme === 'dark' ? ['rgba(99, 102, 241, 0.2)', 'rgba(79, 70, 229, 0.08)'] : ['#EEF2FF', '#E0E7FF']}
                style={styles.summaryCard}
            >
                <View style={styles.summaryHeaderRow}>
                    <View style={styles.planBadge}>
                        <FontAwesome5 name="crown" size={12} color="#4F46E5" />
                        <Text style={styles.planBadgeText}>{t('subscription.order_summary', 'ORDER SUMMARY')}</Text>
                    </View>
                    <View style={styles.billingBadge}>
                        <Text style={styles.billingBadgeText}>1 {t('subscription.year', 'Year')}</Text>
                    </View>
                </View>

                <View style={styles.summaryContentRow}>
                    <View style={styles.planDetailsColumn}>
                        <Text style={styles.planTitle}>{t('subscription.enterprise_pro_plan', 'Enterprise Pro Plan (1 Year)')}</Text>
                        <Text style={styles.planDesc}>{t('subscription.plan_subtitle', 'Unlimited access to all enterprise tools and features for 1 full year.')}</Text>
                    </View>
                    <View style={styles.priceColumn}>
                        <Text style={styles.priceLabel}>{t('subscription.total_due', 'Total Due')}</Text>
                        <Text style={styles.priceValue}>{formattedAmount}</Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );

    const renderSteps = () => (
        <View style={styles.stepsSection}>
            <Text style={styles.sectionLabel}>{t('subscription.follow_steps', 'Follow these simple steps to activate your subscription.')}</Text>
            <View style={styles.stepsTimeline}>
                <View style={styles.stepRow}>
                    <View style={styles.stepTimelineLeft}>
                        <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.stepCircle}>
                            <Text style={styles.stepNumber}>1</Text>
                        </LinearGradient>
                        <View style={styles.stepLine} />
                    </View>
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>{t('subscription.step1_title', 'Transfer Funds')}</Text>
                        <Text style={styles.stepSub}>
                            {t('subscription.step1_desc', 'Transfer {{amount}} using any payment method below.', { amount: formattedAmount })}
                        </Text>
                    </View>
                </View>

                <View style={styles.stepRow}>
                    <View style={styles.stepTimelineLeft}>
                        <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.stepCircle}>
                            <Text style={styles.stepNumber}>2</Text>
                        </LinearGradient>
                        <View style={styles.stepLine} />
                    </View>
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>{t('subscription.step2_title', 'Capture Receipt')}</Text>
                        <Text style={styles.stepSub}>
                            {t('subscription.step2_desc', 'Capture a screenshot or photo of your transaction receipt / SMS.')}
                        </Text>
                    </View>
                </View>

                <View style={styles.stepRow}>
                    <View style={styles.stepTimelineLeft}>
                        <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.stepCircle}>
                            <Text style={styles.stepNumber}>3</Text>
                        </LinearGradient>
                    </View>
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>{t('subscription.step3_title', 'Upload & Activate')}</Text>
                        <Text style={styles.stepSub}>
                            {t('subscription.step3_desc', 'Upload the receipt file below for workspace activation.')}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderPaymentMethods = () => (
        <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('subscription.payment_methods', 'PAYMENT METHODS')}</Text>
            <View style={styles.paymentGrid}>
                {paymentMethods.map((method) => {
                    const isCopied = copiedText === method.account;
                    return (
                        <View key={method.id} style={styles.methodCardWrapper}>
                            <View style={styles.methodCard}>
                                <BlurView intensity={theme === 'dark' ? 20 : 40} style={StyleSheet.absoluteFill} tint={theme} />
                                <LinearGradient colors={method.colors as any} style={styles.methodIcon}>
                                    <FontAwesome5 name={method.icon as any} size={18} color="#fff" />
                                </LinearGradient>

                                <View style={styles.methodInfo}>
                                    <Text style={styles.methodName} numberOfLines={1}>{method.name}</Text>

                                    <View style={styles.accountRow}>
                                        <Text style={styles.methodAcc} selectable>{method.account}</Text>
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            style={[styles.copyBtn, isCopied && styles.copyBtnSuccess]}
                                            onPress={() => handleCopy(method.account)}
                                        >
                                            <MaterialCommunityIcons
                                                name={isCopied ? "check" : "content-copy"}
                                                size={15}
                                                color={isCopied ? "#10B981" : colors.primary}
                                            />
                                            <Text style={[styles.copyBtnText, isCopied && styles.copyBtnTextSuccess]}>
                                                {isCopied ? t('subscription.copied', 'Copied!') : t('common.copy', 'Copy')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.holderRow}>
                                        <FontAwesome name="user" size={11} color={colors.textSecondary} style={{ opacity: 0.6 }} />
                                        <Text style={styles.methodHolder}>{method.holder}</Text>
                                        <View style={styles.amountBadge}>
                                            <Text style={styles.amountBadgeText}>{formattedAmount}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );

    const renderProofOfPayment = () => (
        <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('subscription.proof_of_payment', 'PROOF OF PAYMENT')}</Text>
            <View style={styles.uploadCardWrapper}>
                {imageUri ? (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: imageUri }} style={styles.previewImage} />
                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.previewOverlay}>
                            <View style={styles.previewActions}>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={handlePickImage}
                                    style={styles.changeImageBtn}
                                >
                                    <FontAwesome name="camera" size={13} color="#fff" />
                                    <Text style={styles.changeImageText}>{t('subscription.update_receipt', 'Update Receipt')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={handleRemoveImage}
                                    style={styles.removeImageBtn}
                                >
                                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                                    <Text style={styles.removeImageText}>{t('subscription.remove_receipt', 'Remove Receipt')}</Text>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </View>
                ) : (
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handlePickImage}
                        style={styles.dropzoneWrapper}
                    >
                        <BlurView intensity={theme === 'dark' ? 20 : 40} style={StyleSheet.absoluteFill} tint={theme} />
                        <View style={styles.dropzoneContent}>
                            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.dropzoneCircle}>
                                <MaterialCommunityIcons name="cloud-upload-outline" size={28} color="#fff" />
                            </LinearGradient>
                            <Text style={styles.dropzoneTitle}>{t('subscription.drag_or_browse', 'Tap to browse or upload receipt image')}</Text>
                            <Text style={styles.dropzoneSubtext}>{t('subscription.jpg_png_gallery', 'JPG or PNG from gallery')}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.submitBtnWrapper}>
                <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.gradientBtn}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleUploadAndComplete}
                        style={styles.actionBtnInner}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <View style={styles.submitBtnContent}>
                                <MaterialCommunityIcons name="shield-check" size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.submitBtnText}>{t('subscription.submit_receipt', 'Submit Receipt for Activation')}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </LinearGradient>
            </View>
        </View>
    );

    const renderAssistance = () => (
        <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('subscription.assistance', 'ASSISTANCE')}</Text>
            <View style={styles.supportBento}>
                <View style={styles.supportTileWrapper}>
                    <TouchableOpacity onPress={() => openSupport('tel')} style={styles.supportTile}>
                        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={theme} />
                        <FontAwesome name="phone" size={14} color={colors.primary} />
                        <Text style={[styles.supportText, { color: colors.primary }]}>{t('subscription.call_support', 'Call Support')}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.supportTileWrapper}>
                    <TouchableOpacity onPress={() => openSupport('telegram')} style={styles.supportTile}>
                        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={theme} />
                        <FontAwesome name="paper-plane" size={14} color="#0088cc" />
                        <Text style={[styles.supportText, { color: '#0088cc' }]}>{t('subscription.telegram', 'Telegram')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <LinearGradient
                    colors={theme === 'dark' ? ['rgba(99, 102, 241, 0.15)', 'transparent'] : ['rgba(99, 102, 241, 0.08)', 'transparent']}
                    style={styles.headerGradient}
                />
                <Text style={styles.title}>{t('subscription.secure_payment_title', 'Secure Payment Guide')}</Text>
            </View>

            {renderOrderSummary()}

            {renderSteps()}

            {isDesktop ? (
                <View style={styles.desktopSplit}>
                    <View style={styles.desktopColumn}>
                        {renderPaymentMethods()}
                        {renderAssistance()}
                    </View>
                    <View style={styles.desktopColumn}>
                        {renderProofOfPayment()}
                    </View>
                </View>
            ) : (
                <>
                    {renderPaymentMethods()}
                    {renderProofOfPayment()}
                    {renderAssistance()}
                </>
            )}

            {onCancel && (
                <View style={styles.footer}>
                    <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
                        <Text style={styles.cancelText}>{t('subscription.back_to_plans', 'Back to Plans')}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const createStyles = (colors: any, theme: string, isDesktop: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    content: {
        padding: isDesktop ? 40 : 20,
        paddingBottom: 60,
        maxWidth: isDesktop ? 960 : 480,
        width: '100%',
        alignSelf: 'center',
    },
    header: { marginBottom: 20, paddingTop: 10, alignItems: 'center' },
    headerGradient: {
        position: 'absolute',
        top: -100,
        width: '170%',
        height: 220,
        borderRadius: 300,
        alignSelf: 'center',
    },
    title: { fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: 4, letterSpacing: -0.5, textAlign: 'center' },

    summaryCardWrapper: {
        marginBottom: 24,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.2)',
        ...Platform.select({
            ios: { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
            android: { elevation: 3 },
            web: { boxShadow: '0 6px 16px rgba(99, 102, 241, 0.12)' } as any
        })
    },
    summaryCard: {
        padding: 20,
    },
    summaryHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    planBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(79, 70, 229, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    planBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#4F46E5',
        letterSpacing: 0.8,
    },
    billingBadge: {
        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    billingBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    summaryContentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 16,
        flexWrap: 'wrap',
    },
    planDetailsColumn: {
        flex: 1,
        minWidth: 200,
    },
    planTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 4,
    },
    planDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 17,
        opacity: 0.8,
    },
    priceColumn: {
        alignItems: Platform.OS === 'web' && isDesktop ? 'flex-end' : 'flex-start',
    },
    priceLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    priceValue: {
        fontSize: 22,
        fontWeight: '900',
        color: colors.primary,
        letterSpacing: -0.5,
    },

    desktopSplit: {
        flexDirection: 'row',
        gap: 28,
    },
    desktopColumn: {
        flex: 1,
    },

    section: { marginBottom: 24 },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.textSecondary,
        marginBottom: 12,
        letterSpacing: 1.2,
        opacity: 0.7,
        textTransform: 'uppercase'
    },

    stepsSection: {
        marginBottom: 28,
    },
    stepsTimeline: {
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    stepTimelineLeft: {
        alignItems: 'center',
        marginRight: 14,
        width: 32,
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumber: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '900',
    },
    stepLine: {
        width: 2,
        height: 32,
        backgroundColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
        marginVertical: 4,
    },
    stepContent: {
        flex: 1,
        paddingTop: 4,
        paddingBottom: 14,
    },
    stepTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 2,
    },
    stepSub: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
        opacity: 0.85,
    },

    paymentGrid: { gap: 12 },
    methodCardWrapper: {
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
            android: { elevation: 2 },
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.03)' } as any
        })
    },
    methodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        padding: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        backgroundColor: theme === 'dark' ? 'rgba(30,30,30,0.4)' : 'rgba(255,255,255,0.7)',
    },
    methodIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    methodInfo: { flex: 1 },
    methodName: { fontSize: 12, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
    accountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
    methodAcc: { fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: 0.5, flex: 1 },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: colors.primary + '15',
        borderRadius: 10,
    },
    copyBtnSuccess: {
        backgroundColor: '#10B98118',
    },
    copyBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    copyBtnTextSuccess: {
        color: '#10B981',
    },
    holderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    methodHolder: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', opacity: 0.75 },
    amountBadge: {
        marginLeft: 'auto',
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    amountBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.primary,
    },

    uploadCardWrapper: {
        marginBottom: 16,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10 },
            android: { elevation: 3 },
            web: { boxShadow: '0 6px 16px rgba(0,0,0,0.04)' } as any
        })
    },
    dropzoneWrapper: {
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)',
        backgroundColor: theme === 'dark' ? 'rgba(30,30,30,0.3)' : 'rgba(255,255,255,0.7)',
        paddingVertical: 28,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropzoneContent: { alignItems: 'center' },
    dropzoneCircle: {
        width: 58,
        height: 58,
        borderRadius: 29,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        ...Platform.select({
            ios: { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
            android: { elevation: 4 },
        })
    },
    dropzoneTitle: { fontSize: 15, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 4 },
    dropzoneSubtext: { fontSize: 12, color: colors.textSecondary, opacity: 0.7, textAlign: 'center' },

    previewContainer: {
        width: '100%',
        height: 220,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
    previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    previewOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        padding: 14,
    },
    previewActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    changeImageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    changeImageText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    removeImageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.25)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    removeImageText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },

    submitBtnWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10 },
            android: { elevation: 5 },
            web: { boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)' } as any
        })
    },
    gradientBtn: {
        borderRadius: 16,
    },
    actionBtnInner: {
        height: 54,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    submitBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

    supportBento: { flexDirection: 'row', gap: 12 },
    supportTileWrapper: {
        flex: 1,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 6 },
            android: { elevation: 1 },
            web: { boxShadow: '0 4px 8px rgba(0,0,0,0.02)' } as any
        })
    },
    supportTile: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        paddingVertical: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        backgroundColor: theme === 'dark' ? 'rgba(30,30,30,0.4)' : 'rgba(255,255,255,0.7)',
        gap: 8,
    },
    supportText: { fontSize: 13, fontWeight: '700' },

    footer: { marginTop: 12, alignItems: 'center' },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
    cancelText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13, opacity: 0.75 },
});
