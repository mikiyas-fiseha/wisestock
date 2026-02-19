
import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';

export default function Index() {
    const { session, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Loading...</Text>
            </View>
        );
    }

    if (session) {
        return <Redirect href="/(tabs)/dashboard" />;
    }

    return <Redirect href="/login" />;
}
