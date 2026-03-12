import { useTheme } from '@/context/ThemeContext';
import { Stack } from 'expo-router';

export default function ProductsLayout() {
    const { colors } = useTheme();

    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: colors.text,
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            headerShadowVisible: false
        }}>
            <Stack.Screen name="index" options={{ title: 'Products' }} />
            <Stack.Screen name="add" options={{ presentation: 'modal', title: 'Add Product' }} />
            <Stack.Screen name="[id]" options={{ title: 'Product Details' }} />
        </Stack>
    );
}
