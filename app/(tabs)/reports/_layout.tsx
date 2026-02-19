import { Stack } from 'expo-router';

export default function ReportsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="sales" options={{ headerShown: true, title: 'Sales Report', headerBackTitle: 'Reports' }} />
            <Stack.Screen name="inventory" options={{ headerShown: true, title: 'Inventory', headerBackTitle: 'Reports' }} />
            <Stack.Screen name="financials" options={{ headerShown: true, title: 'Financials', headerBackTitle: 'Reports' }} />
        </Stack>
    );
}
