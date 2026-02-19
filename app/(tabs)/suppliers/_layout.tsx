
import { Stack } from 'expo-router';

export default function SuppliersLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: 'Suppliers', headerShown: false }} />
            <Stack.Screen name="add" options={{ presentation: 'modal', title: 'Add Supplier' }} />
            <Stack.Screen name="[id]" options={{ title: 'Supplier Details' }} />
        </Stack>
    );
}
