

import { useAuth, User } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: User['role'][];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user && !allowedRoles.includes(user.role)) {
            // Redirect or show unauthorized
        }
    }, [user, isLoading, allowedRoles]);

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!user || !allowedRoles.includes(user.role)) {
        return (
            <View style={styles.center}>
                <Text style={styles.text}>You do not have permission to view this content.</Text>
                <Text style={styles.subText}>Required roles: {allowedRoles.join(', ')}</Text>
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
        padding: 24,
    },
    text: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
        color: colors.text,
    },
    subText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});
