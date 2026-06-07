import { Stack } from 'expo-router';

export default function ReportsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, headerStyle: { backgroundColor: 'transparent' }, headerShadowVisible: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="sales" />
            <Stack.Screen name="inventory" />
            <Stack.Screen name="expenses" />
            <Stack.Screen name="financials" />
            <Stack.Screen name="customers" />
            <Stack.Screen name="purchases" />
            <Stack.Screen name="returns" />
            <Stack.Screen name="branches" />
            <Stack.Screen name="debts" />
            <Stack.Screen name="payables" />
        </Stack>
    );
}
