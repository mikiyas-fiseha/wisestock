import { Stack } from 'expo-router';

export default function ReportsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, headerStyle: { backgroundColor: 'transparent' }, headerShadowVisible: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="sales" options={{ headerShown: true, title: 'Sales Report', headerBackTitle: 'Reports' }} />
            <Stack.Screen name="inventory" options={{ headerShown: true, title: 'Inventory', headerBackTitle: 'Reports' }} />
            <Stack.Screen name="expenses" options={{ headerShown: true, title: 'Expenses', headerBackTitle: 'Reports' }} />
            <Stack.Screen name="financials" options={{ headerShown: true, title: 'Financials', headerBackTitle: 'Reports' }} />
            <Stack.Screen name="customers" options={{ headerShown: true, title: 'Customer Analysis', headerBackTitle: 'Reports' }} />
            <Stack.Screen name="debts" options={{ headerShown: true, title: 'Receivables (AR)', headerBackTitle: 'Reports' }} />
            <Stack.Screen name="payables" options={{ headerShown: true, title: 'Payables (AP)', headerBackTitle: 'Reports' }} />
        </Stack>
    );
}
