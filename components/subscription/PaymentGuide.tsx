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
    onComplete: () => void;
    onCancel?: () => void;
}

export function PaymentGuide({ amount, onComplete, onCancel }: PaymentGuideProps) {
    const { colors, theme } = useTheme();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const styles = React.useMemo(() => createStyles(colors, theme, isDesktop), [colors, theme, isDesktop]);
    const { company } = useAuth();
    const { showFeedback } = useFeedback();
    const { t } = useTranslation();

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [copiedText, setCopiedText] = useState<string | null>(null);

    const paymentMethods = [
        {
            name: 'Bank of Ethiopia (CBE)',
            account: '1000300692382',
            holder: 'Mikiyas Fiseha',
            icon: 'university',
            colors: ['#4B2C82', '#6A4BB2']
        },
        {
            name: 'Telebirr Wallet',
            account: '0939393770',
            holder: 'Mikiyas Fiseha',
            icon: 'mobile-alt',
            colors: ['#00AEEF', '#007BB5']
        }
    ];

    const handlePickImage = async () => {
        try {
            const uri = await pickImage();
            if (uri) setImageUri(uri);
        } catch (e) {
            showFeedback('error', t('common.error'), t('subscription.failed_pick_image'));
        }
    };

    const handleCopy = async (text: string) => {
        try {
            await Clipboard.setStringAsync(text);
            setCopiedText(text);
            setTimeout(() => setCopiedText(null), 2000);
        } catch (e) {
            showFeedback('error', t('common.error'), t('subscription.failed_copy'));
        }
    };

    const handleUploadAndComplete = async () => {
        if (!imageUri) {
            showFeedback('error', t('subscription.required'), t('subscription.upload_first'));
            return;
        }

        setUploading(true);
        try {
            const { data: sub, error: subError } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('company_id', company!.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (subError) throw subError;

            const response = await fetch(imageUri);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();
            const fileName = `${company?.id}/${Date.now()}.jpg`;

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

    const renderSteps = () => (
        <View style={styles.stepsSection}>
            <View style={styles.stepItem}>
                <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.stepCircle}>
                    <Text style={styles.stepNumber}>1</Text>
                </LinearGradient>
                <View style={styles.stepInfo}>
                    <Text style={styles.stepTitle}>{t('subscription.transfer_funds')}</Text>
                    <Text style={styles.stepSub}>
                        {t('subscription.send_amount')} {amount ? <Text style={styles.boldAmount}>Br {amount}</Text> : t('subscription.for_your_plan')} {t('subscription.to_chosen_bank')}
                    </Text>
                </View>
            </View>

            <View style={styles.stepConnector} />

            <View style={styles.stepItem}>
                <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.stepCircle}>
                    <Text style={styles.stepNumber}>2</Text>
                </LinearGradient>
                <View style={styles.stepInfo}>
                    <Text style={styles.stepTitle}>{t('subscription.upload_screenshot')}</Text>
                    <Text style={styles.stepSub}>{t('subscription.take_screenshot')}</Text>
                </View>
            </View>

            <View style={styles.stepConnector} />

            <View style={styles.stepItem}>
                <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.stepCircle}>
                    <Text style={styles.stepNumber}>3</Text>
                </LinearGradient>
                <View style={styles.stepInfo}>
                    <Text style={styles.stepTitle}>{t('subscription.done')}</Text>
                    <Text style={styles.stepSub}>{t('subscription.once_verified')}</Text>
                </View>
            </View>
        </View>
    );

    const renderPaymentMethods = () => (
        <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('subscription.payment_methods')}</Text>
            <View style={styles.bentoGrid}>
                {paymentMethods.map((method, index) => (
                    <View key={index} style={styles.methodCardWrapper}>
                        <View style={styles.methodCard}>
                            <BlurView intensity={theme === 'dark' ? 20 : 40} style={StyleSheet.absoluteFill} tint={theme} />
                            <LinearGradient colors={method.colors as any} style={styles.methodIcon}>
                                <FontAwesome5 name={method.icon as any} size={16} color="#fff" />
                            </LinearGradient>
                            <View style={styles.methodInfo}>
                                <Text style={styles.methodName}>{method.name}</Text>
                                <View style={styles.accountRow}>
                                    <Text style={styles.methodAcc}>{method.account}</Text>
                                    <TouchableOpacity 
                                        style={[styles.copyBtn, copiedText === method.account && styles.copyBtnSuccess]} 
                                        onPress={() => handleCopy(method.account)}
                                    >
                                        <MaterialCommunityIcons 
                                            name={copiedText === method.account ? "check" : "content-copy"} 
                                            size={16} 
                                            color={copiedText === method.account ? "#10b981" : colors.primary} 
                                        />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.methodHolder}>{method.holder}</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    const renderProofOfPayment = () => (
        <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('subscription.proof_of_payment')}</Text>
            <View style={styles.uploadCardWrapper}>
                <TouchableOpacity activeOpacity={0.8} onPress={handlePickImage} style={styles.uploadWrapper}>
                    <BlurView intensity={theme === 'dark' ? 20 : 40} style={StyleSheet.absoluteFill} tint={theme} />
                    {imageUri ? (
                        <View style={styles.previewContainer}>
                            <Image source={{ uri: imageUri }} style={styles.preview} />
                            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.changeOverlay}>
                                <View style={styles.changeBadge}>
                                    <FontAwesome name="camera" size={12} color="#fff" />
                                    <Text style={styles.changeText}>{t('subscription.update_receipt')}</Text>
                                </View>
                            </LinearGradient>
                        </View>
                    ) : (
                        <View style={styles.uploadPlaceholder}>
                            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.uploadCircle}>
                                <FontAwesome name="cloud-upload" size={20} color="#fff" />
                            </LinearGradient>
                            <Text style={styles.uploadText}>{t('subscription.select_screenshot')}</Text>
                            <Text style={styles.uploadSubtext}>{t('subscription.jpg_png_gallery')}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderAssistance = () => (
        <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('subscription.assistance')}</Text>
            <View style={styles.supportBento}>
                <View style={styles.supportTileWrapper}>
                    <TouchableOpacity onPress={() => openSupport('tel')} style={styles.supportTile}>
                        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={theme} />
                        <FontAwesome name="phone" size={14} color={colors.primary} />
                        <Text style={[styles.supportText, { color: colors.primary }]}>{t('subscription.call_support')}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.supportTileWrapper}>
                    <TouchableOpacity onPress={() => openSupport('telegram')} style={styles.supportTile}>
                        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={theme} />
                        <FontAwesome name="paper-plane" size={14} color="#0088cc" />
                        <Text style={[styles.supportText, { color: '#0088cc' }]}>{t('subscription.telegram')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <LinearGradient
                    colors={theme === 'dark' ? ['rgba(99, 102, 241, 0.12)', 'transparent'] : ['rgba(99, 102, 241, 0.05)', 'transparent']}
                    style={styles.headerGradient}
                />
                <Text style={styles.title}>{t('subscription.secure_payment_title')}</Text>
                <Text style={styles.subtitle}>{t('subscription.follow_steps')}</Text>
            </View>

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

            <View style={styles.footer}>
                <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.doneBtnWrapper}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleUploadAndComplete}
                        style={styles.doneBtnInner}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.doneBtnText}>{t('subscription.confirm_payment')}</Text>
                        )}
                    </TouchableOpacity>
                </LinearGradient>

                {onCancel && (
                    <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
                        <Text style={styles.cancelText}>{t('subscription.back_to_plans')}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
}

const createStyles = (colors: any, theme: string, isDesktop: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    content: {
        padding: isDesktop ? 40 : 20,
        paddingBottom: 60,
        maxWidth: isDesktop ? 960 : 480, // Expand maxWidth for desktop to fit columns
        width: '100%',
        alignSelf: 'center',
    },
    header: { marginBottom: 32, paddingTop: 10, alignItems: 'center' },
    headerGradient: {
        position: 'absolute',
        top: -100, // Move up further to look natural
        width: '170%',
        height: 220,
        borderRadius: 300,
        alignSelf: 'center',
    },
    title: { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 8, letterSpacing: -0.5, textAlign: 'center' },
    subtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, opacity: 0.8, textAlign: 'center' },

    desktopSplit: {
        flexDirection: 'row',
        gap: 32,
    },
    desktopColumn: {
        flex: 1,
    },

    section: { marginBottom: 28 },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.textSecondary,
        marginBottom: 12,
        letterSpacing: 1.2,
        opacity: 0.7,
        textTransform: 'uppercase'
    },

    bentoGrid: { gap: 12 },
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
        backgroundColor: theme === 'dark' ? 'rgba(30,30,30,0.4)' : 'rgba(255,255,255,0.6)',
    },
    methodIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    methodInfo: { flex: 1 },
    methodName: { fontSize: 12, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.5 },
    accountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
    methodAcc: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: 0.5 },
    copyBtn: {
        padding: 6,
        backgroundColor: colors.primary + '15',
        borderRadius: 8,
    },
    copyBtnSuccess: {
        backgroundColor: '#10b98115',
    },
    methodHolder: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', opacity: 0.7 },

    uploadCardWrapper: {
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10 },
            android: { elevation: 3 },
            web: { boxShadow: '0 6px 16px rgba(0,0,0,0.04)' } as any
        })
    },
    uploadWrapper: {
        width: '100%',
        aspectRatio: isDesktop ? 1.5 : 1.8,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(63, 102, 241, 0.1)',
        backgroundColor: theme === 'dark' ? 'rgba(30,30,30,0.4)' : 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: isDesktop ? 180 : 140, // Reduce minHeight on mobile to prevent overflow from aspectRatio
    },
    uploadPlaceholder: { alignItems: 'center' },
    uploadCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        ...Platform.select({
            ios: { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
            android: { elevation: 4 },
        })
    },
    uploadText: { fontSize: 16, fontWeight: '800', color: colors.text },
    uploadSubtext: { fontSize: 13, color: colors.textSecondary, marginTop: 4, opacity: 0.7 },

    previewContainer: { width: '100%', height: '100%' },
    preview: { width: '100%', height: '100%', resizeMode: 'cover' },
    changeOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        padding: 12,
    },
    changeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignSelf: 'center',
        gap: 6,
        marginBottom: 8,
    },
    changeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    supportBento: { flexDirection: 'row', gap: 12, marginTop: isDesktop ? -10 : 0 },
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

    footer: { marginTop: 20, gap: 12, maxWidth: isDesktop ? 480 : '100%', alignSelf: 'center', width: '100%' },
    doneBtnWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10 },
            android: { elevation: 5 },
            web: { boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)' } as any
        })
    },
    doneBtnInner: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
    cancelBtn: { alignItems: 'center', paddingTop: 6 },
    cancelText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13, opacity: 0.7 },

    stepsSection: {
        marginBottom: 32,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
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
    stepInfo: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 2,
    },
    stepSub: {
        fontSize: 12,
        color: colors.textSecondary,
        opacity: 0.7,
        lineHeight: 16,
    },
    boldAmount: {
        fontWeight: '900',
        color: colors.text,
    },
    stepConnector: {
        width: 2,
        height: 12,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        marginLeft: 15,
        marginVertical: 4,
    },
});
