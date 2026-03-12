
import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';

export default function Index() {
    const { session, isLoading, isSuperAdmin } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Loading...</Text>
            </View>
        );
    }

    if (session) {
        if (isSuperAdmin) {
            return <Redirect href="/(super-admin)/superadminDasboarde" />;
        }
        return <Redirect href="/(tabs)/dashboard" />;
    }

    return <Redirect href="/login" />;
}
