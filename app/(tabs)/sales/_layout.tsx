import { Stack } from 'expo-router';

export default function SalesLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, headerStyle: { backgroundColor: 'transparent' }, headerShadowVisible: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="new" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="[id]" />
            <Stack.Screen name="analytics" />
        </Stack>
    );
}
