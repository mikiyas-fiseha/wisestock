import { Stack } from 'expo-router';

export default function InventoryLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, headerStyle: { backgroundColor: 'transparent' }, headerShadowVisible: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="movements" />
            <Stack.Screen name="summary" />
        </Stack>
    );
}
