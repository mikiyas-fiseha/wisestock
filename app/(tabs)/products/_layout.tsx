
import { Stack } from 'expo-router';

export default function ProductsLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: 'Products', headerShown: false }} />
            <Stack.Screen name="add" options={{ presentation: 'modal', title: 'Add Product' }} />
            <Stack.Screen name="[id]" options={{ title: 'Product Details', headerShown: true }} />
        </Stack>
    );
}
