import { Stack } from 'expo-router';

export default function SalesLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="new" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="[id]" />
        </Stack>
    );
}
