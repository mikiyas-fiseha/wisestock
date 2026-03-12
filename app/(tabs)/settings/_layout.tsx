
import { Stack } from 'expo-router';

export default function SettingsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, headerStyle: { backgroundColor: 'transparent' }, headerShadowVisible: false }}>
            <Stack.Screen name="index" options={{ title: 'Settings', headerShown: false }} />
            <Stack.Screen name="team" options={{ title: 'Team Management' }} />
        </Stack>
    );
}
