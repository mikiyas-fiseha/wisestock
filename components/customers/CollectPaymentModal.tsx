import { AppButton } from '@/components/ui/AppButton';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency } from '@/lib/formatters';
import { pickImage } from '@/lib/imagePicker';
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

interface CollectPaymentModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: { amount: number; method: string; date: Date; notes: string; receiptUri: string | null; saleId?: string }) => Promise<void>;
    customerName: string;
    currentBalance: number;
    isLoading?: boolean;
    sales?: any[];
}

export function CollectPaymentModal({ visible, onClose, onSubmit, customerName, currentBalance, isLoading, sales }: CollectPaymentModalProps) {
    const { colors, theme } = useTheme();
    const { company } = useAuth();
    const { t, i18n } = useTranslation();
    const { showFeedback } = useFeedback();
    const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width >= 768;

    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash'); // cash, bank, check
    const [notes, setNotes] = useState('');
    const [receiptUri, setReceiptUri] = useState<string | null>(null);
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

    // Reset when selecting a sale
    useEffect(() => {
        if (selectedSaleId) {
            const sale = sales?.find(p => p.id === selectedSaleId);
            if (sale) {
                const unpaid = sale.balance_due || ((sale.total_amount || 0) - (sale.paid_amount || 0));
                if (unpaid > 0) {
                    setAmount(unpaid.toFixed(2));
                }
            }
        }
    }, [selectedSaleId, sales]);

    // Reset form when opening
    useEffect(() => {
        if (visible) {
            setAmount('');
            setMethod('cash');
            setNotes('');
            setReceiptUri(null);
            setSelectedSaleId(null);
        }
    }, [visible]);

    const handleSubmit = () => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return;
        }
        if (parsedAmount > currentBalance) {
            setAmount(currentBalance.toFixed(2));
            showFeedback('warning', t('customers.amount_adjusted'), t('customers.amount_exceed_balance'));
            return;
        }
        if (sales && sales.length > 0 && !selectedSaleId) {
            showFeedback('error', t('customers.selection_required'), t('customers.select_sale_error'));
            return;
        }
        onSubmit({
            amount: parsedAmount,
            method,
            date: new Date(),
            notes,
            receiptUri,
            saleId: selectedSaleId || undefined
        });
    };

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.overlay}>
                <TouchableOpacity
                    activeOpacity={1}
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                />

                <View style={[styles.container, isWeb && styles.containerWeb]}>
                    {Platform.OS !== 'web' && (
                        <BlurView
                            tint={theme === 'dark' ? 'dark' : 'light'}
                            intensity={80}
                            style={StyleSheet.absoluteFill}
                        />
                    )}

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>{t('customers.collect_payment')}</Text>
                            <Text style={styles.subtitle}>{t('customers.from')}: {customerName}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <FontAwesome name="times" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Balance Info */}
                    <View style={styles.balanceContainer}>
                        <Text style={styles.balanceLabel}>{t('customers.current_balance')}</Text>
                        <Text style={styles.balanceValue}>{formatCurrency(currentBalance)}</Text>
                    </View>

                    {/* Form */}
                    <ScrollView bounces={false} style={{ flexGrow: 0 }}>
                        <View style={styles.form}>
                            {/* Amount */}
                            <View style={[styles.inputGroup, { zIndex: 100 }]}>
                                <AppTextInput
                                    label={t('customers.amount_collected')}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={(text) => {
                                        if (text === '') {
                                            setAmount('');
                                            return;
                                        }

                                        const parsed = parseFloat(text);
                                        if (!isNaN(parsed) && parsed > currentBalance) {
                                            setAmount(currentBalance.toFixed(2));
                                            showFeedback('warning', t('customers.amount_adjusted'), t('customers.amount_exceed_balance'));
                                        } else {
                                            setAmount(text);
                                        }
                                    }}
                                    autoFocus
                                    prefix={i18n.language !== 'am' ? (company?.currency || '$') : undefined}
                                    suffix={i18n.language === 'am' ? 'ብር' : undefined}
                                />
                            </View>

                            {sales && sales.length > 0 && (
                                <View style={[styles.inputGroup, { zIndex: 90 }]}>
                                    <AppSelect
                                        label={t('customers.link_to_sale')}
                                        options={sales.map(s => {
                                            const due = s.balance_due || ((s.total_amount || 0) - (s.paid_amount || 0));
                                            return {
                                                label: `${t('common.inv')}: ${s.invoice_number || s.id.split('-')[0].toUpperCase()} - ${t('common.due')}: ${formatCurrency(due)}`,
                                                value: s.id
                                            };
                                        })}
                                        selectedValue={selectedSaleId || ''}
                                        onValueChange={(val) => setSelectedSaleId(val || null)}
                                        containerStyle={{ marginBottom: 0 }}
                                        error={!selectedSaleId ? t('common.required') : undefined}
                                    />
                                </View>
                            )}

                            {/* Method */}
                            <View style={[styles.inputGroup, { zIndex: 10 }]}>
                                <Text style={styles.label}>{t('sales.payment_method')}</Text>
                                <View style={styles.methodRow}>
                                    {['cash', 'bank', 'check'].map(m => (
                                        <TouchableOpacity
                                            key={m}
                                            style={[styles.methodChip, method === m && styles.methodChipActive]}
                                            onPress={() => setMethod(m)}
                                        >
                                            <Text style={[styles.methodText, method === m && styles.methodTextActive]}>
                                                {t(`common.${m}`).toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Notes */}
                            <View style={styles.inputGroup}>
                                <AppTextInput
                                    label={t('customers.notes_optional')}
                                    placeholder={t('customers.notes_placeholder')}
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.proofBtn, receiptUri ? styles.proofBtnActive : null]}
                                onPress={async () => {
                                    const uri = await pickImage();
                                    if (uri) {
                                        setReceiptUri(uri);
                                    }
                                }}
                            >
                                <FontAwesome name="image" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                                <Text style={{ color: colors.textSecondary, flex: 1, fontSize: 13, fontWeight: '600' }}>{receiptUri ? t('common.file_attached') : t('common.attach_receipt')}</Text>
                                {receiptUri && (
                                    <TouchableOpacity onPress={() => setReceiptUri(null)} hitSlop={10}>
                                        <FontAwesome name="times-circle" size={18} color={colors.danger} />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>

                            {/* Submit */}
                            <View style={styles.actions}>
                                <AppButton
                                    title={t('common.cancel')}
                                    onPress={onClose}
                                    variant="outline"
                                    style={{ flex: 1, marginRight: 8 }}
                                />
                                <AppButton
                                    title={`${t('customers.collect_amount')} ${formatCurrency(parseFloat(amount) || 0)}`}
                                    onPress={handleSubmit}
                                    loading={isLoading}
                                    style={{ flex: 2 }}
                                    disabled={!amount || parseFloat(amount) <= 0}
                                />
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors: any, theme: string) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: theme === 'dark' ? colors.card + 'F0' : '#FFFFFFE0',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 450,
        overflow: 'hidden',
    },
    containerWeb: {
        maxWidth: 500,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    closeBtn: {
        padding: 4,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2,
    },
    balanceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.success + '10',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
    },
    balanceLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.success,
    },
    balanceValue: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.success,
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
    },
    methodRow: {
        flexDirection: 'row',
        gap: 10,
    },
    methodChip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
    },
    methodChipActive: {
        backgroundColor: colors.primary,
    },
    methodText: {
        color: colors.textSecondary,
        fontWeight: '700',
        fontSize: 11,
    },
    methodTextActive: {
        color: '#fff',
    },
    actions: {
        flexDirection: 'row',
        marginTop: 10,
    },
    proofBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
        padding: 14,
        borderRadius: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'transparent' : 'rgba(0,0,0,0.1)',
    },
    proofBtnActive: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary + '30',
        borderWidth: 1,
    }
});
