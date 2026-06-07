
import { AppHeader } from '@/components/AppHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Gradients } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function CompanySettingsScreen() {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { company, updateCompanyProfile } = useAuth();
    const { showFeedback } = useFeedback();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [tin, setTin] = useState('');
    const [vatNo, setVatNo] = useState('');
    const [vatRegDate, setVatRegDate] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [subCity, setSubCity] = useState('');
    const [woreda, setWoreda] = useState('');
    const [defaultTaxRate, setDefaultTaxRate] = useState('');
    const [currency, setCurrency] = useState('$');
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        if (company) {
            setName(company.name || '');
            setTin(company.tin || '');
            setVatNo(company.vatNo || '');
            setVatRegDate(company.vatRegDate || '');
            setAddress(company.address || '');
            setCity(company.city || '');
            setSubCity(company.subCity || '');
            setWoreda(company.woreda || '');
            setDefaultTaxRate(company.defaultTaxRate?.toString() || '0');
            setCurrency(company.currency || '$');
        }
    }, [company]);

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setVatRegDate(selectedDate.toISOString().split('T')[0]);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            showFeedback('error', t('common.validation_error'), t('settings.company_name_placeholder'));
            return;
        }

        setLoading(true);
        const { error } = await updateCompanyProfile({
            name,
            tin,
            vatNo,
            vatRegDate,
            address,
            city,
            subCity,
            woreda,
            defaultTaxRate: parseFloat(defaultTaxRate) || 0,
            currency: currency || '$'
        });
        setLoading(false);

        if (error) {
            showFeedback('error', t('common.error'), error.message || t('common.error'));
        } else {
            showFeedback('success', t('common.success'), t('common.saved'));
            router.back();
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <AppHeader title={t('settings.company_profile')} showBack={true} hideThemeToggle={true} />

            <ScrollView contentContainerStyle={styles.content}>

                <AppTextInput
                    label={t('settings.company_name') + " *"}
                    value={name}
                    onChangeText={setName}
                    placeholder={t('settings.company_name_placeholder')}
                />

                <AppTextInput
                    label={t('settings.tin_number')}
                    value={tin}
                    onChangeText={setTin}
                    placeholder={t('settings.tin_placeholder')}
                    keyboardType="numeric"
                />

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <AppTextInput
                            label={t('settings.vat_number')}
                            value={vatNo}
                            onChangeText={setVatNo}
                            placeholder={t('common.optional')}
                        />
                    </View>
                    <View style={styles.halfInput}>
                        {Platform.OS === 'web' ? (
                            <AppTextInput
                                label={t('settings.vat_reg_date')}
                                value={vatRegDate}
                                onChangeText={setVatRegDate}
                                placeholder="YYYY-MM-DD"
                                icon="calendar"
                            />
                        ) : (
                            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                <View pointerEvents="none">
                                    <AppTextInput
                                        label={t('settings.vat_reg_date')}
                                        value={vatRegDate}
                                        placeholder={t('common.select_range')}
                                        editable={false}
                                        icon="calendar"
                                    />
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={(() => {
                            if (!vatRegDate) return new Date();
                            const d = new Date(vatRegDate);
                            return isNaN(d.getTime()) ? new Date() : d;
                        })()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                        onChange={onDateChange}
                    />
                )}

                <AppTextInput
                    label={t('settings.address_street')}
                    value={address}
                    onChangeText={setAddress}
                    placeholder={t('settings.address_placeholder')}
                />

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <AppTextInput
                            label={t('settings.city_town')}
                            value={city}
                            onChangeText={setCity}
                            placeholder="e.g. Addis Ababa"
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <AppTextInput
                            label={t('settings.sub_city_zone')}
                            value={subCity}
                            onChangeText={setSubCity}
                            placeholder="e.g. Bole"
                        />
                    </View>
                </View>

                <AppTextInput
                    label={t('settings.woreda')}
                    value={woreda}
                    onChangeText={setWoreda}
                    placeholder="e.g. 03"
                />

                <AppTextInput
                    label={t('settings.tax_rate')}
                    value={defaultTaxRate}
                    onChangeText={setDefaultTaxRate}
                    placeholder="e.g. 15"
                    keyboardType="numeric"
                />

                <AppTextInput
                    label={t('settings.currency_symbol')}
                    value={currency}
                    onChangeText={setCurrency}
                    placeholder="e.g. $ or ETB"
                />

                <View style={styles.footer}>
                    <AppButton
                        title={t('common.save_changes')}
                        onPress={handleSave}
                        loading={loading}
                    />
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    content: {
        padding: 20,
        gap: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    halfInput: {
        flex: 1,
    },
    footer: {
        marginTop: 20,
        marginBottom: 40,
    }
});
