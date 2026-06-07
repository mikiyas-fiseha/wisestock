import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function Index() {
    const { session, isLoading, isSuperAdmin } = useAuth();

    // Auth is still resolving — RootNavigator blocks the Stack until isLoading is
    // false, so this branch should never actually render. It's a safety fallback.
    if (isLoading) {
        return <View style={{ flex: 1, backgroundColor: '#1a1a2e' }} />;
    }

    if (session) {
        if (isSuperAdmin) {
            return <Redirect href="/(super-admin)/superadminDasboarde" />;
        }
        return <Redirect href="/(tabs)/dashboard" />;
    }

    return <Redirect href="/login" />;
}
