
import { AppButton } from '@/components/ui/AppButton';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface SuperAdminGuardProps {
    children: React.ReactNode;
}

export function SuperAdminGuard({ children }: SuperAdminGuardProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { isSuperAdmin, isLoading } = useAuth();
    const router = useRouter();

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!isSuperAdmin) {
        return (
            <View style={styles.center}>
                <Text style={styles.text}>Access Denied</Text>
                <Text style={styles.subText}>You do not have Super Admin privileges.</Text>
                <AppButton
                    title="Go Back"
                    onPress={() => router.back()}
                    style={{ marginTop: 20 }}
                />
            </View>
        );
    }

    return <>{children}</>;
}

const createStyles = (colors: any) => StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
        padding: 20,
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.danger,
        marginBottom: 8,
    },
    subText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
    }
});
