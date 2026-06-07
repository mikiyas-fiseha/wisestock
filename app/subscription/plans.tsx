import { AppHeader } from '@/components/AppHeader';
import { PlansList } from '@/components/subscription/PlansList';
import { useTheme } from '@/context/ThemeContext';
import { Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';

export default function SubscriptionPlans() {
    const { colors } = useTheme();
    const { t } = useTranslation();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.safeArea}>
                <AppHeader title={t('subscription.plans')} showBack />

                <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                    <PlansList />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        paddingBottom: 40,
    },

});
