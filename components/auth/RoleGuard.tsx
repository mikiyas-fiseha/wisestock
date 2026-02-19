
import { Colors } from '@/constants/Colors';
import { useAuth, User } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: User['role'][];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
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
                <ActivityIndicator size="large" color={Colors.light.primary} />
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

const styles = StyleSheet.create({
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
        color: Colors.light.text,
    },
    subText: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        textAlign: 'center',
    },
});
