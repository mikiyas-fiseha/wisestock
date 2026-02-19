
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

export default function CompanySettingsScreen() {
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
        }
    }, [company]);

    const handleSave = async () => {
        if (!name.trim()) {
            showFeedback('error', 'Validation', 'Company Name is required');
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
            woreda
        });
        setLoading(false);

        if (error) {
            showFeedback('error', 'Error', error.message || 'Failed to update company profile');
        } else {
            showFeedback('success', 'Success', 'Company profile updated');
            router.back();
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <Stack.Screen options={{ title: 'Company Profile' }} />

            <ScrollView contentContainerStyle={styles.content}>

                <AppTextInput
                    label="Company Name *"
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter company name"
                />

                <AppTextInput
                    label="TIN Number"
                    value={tin}
                    onChangeText={setTin}
                    placeholder="Tax Identification Number"
                    keyboardType="numeric"
                />

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <AppTextInput
                            label="VAT Number"
                            value={vatNo}
                            onChangeText={setVatNo}
                            placeholder="Optional"
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <AppTextInput
                            label="VAT Reg Date"
                            value={vatRegDate}
                            onChangeText={setVatRegDate}
                            placeholder="YYYY-MM-DD"
                        />
                    </View>
                </View>

                <AppTextInput
                    label="Address / Street"
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Physical address"
                />

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <AppTextInput
                            label="City / Town"
                            value={city}
                            onChangeText={setCity}
                            placeholder="e.g. Addis Ababa"
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <AppTextInput
                            label="Sub-City / Zone"
                            value={subCity}
                            onChangeText={setSubCity}
                            placeholder="e.g. Bole"
                        />
                    </View>
                </View>

                <AppTextInput
                    label="Woreda"
                    value={woreda}
                    onChangeText={setWoreda}
                    placeholder="e.g. 03"
                />

                <View style={styles.footer}>
                    <AppButton
                        title="Save Changes"
                        onPress={handleSave}
                        loading={loading}
                    />
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
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
