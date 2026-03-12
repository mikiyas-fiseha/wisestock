import { Stack } from 'expo-router';

export default function CustomersLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, headerStyle: { backgroundColor: 'transparent' }, headerShadowVisible: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="add" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="[id]" />
        </Stack>
    );
}
