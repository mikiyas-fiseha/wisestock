import { useTheme } from '@/context/ThemeContext';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function ProductsLayout() {
    const { colors } = useTheme();
    const { t } = useTranslation();

    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: colors.text,
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            headerShadowVisible: false
        }}>
            <Stack.Screen name="index" options={{ title: t('inventory.products') }} />
            <Stack.Screen name="add" options={{ presentation: 'modal', title: t('products.add_product') }} />
            <Stack.Screen name="[id]" options={{ title: t('products.product_details') || 'Product Details' }} />
        </Stack>
    );
}
