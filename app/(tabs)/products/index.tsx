import { AdjustStockModal } from '@/components/AdjustStockModal';
import { ProductListItem } from '@/components/ProductListItem';
import { SearchFilterHeader } from '@/components/SearchFilterHeader';
import { AppButton } from '@/components/ui/AppButton';
import { Gradients, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useProducts } from '@/hooks/useProducts';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

export interface Product {
    id: string;
    name: string;
    primary_sku: string;
    cost_price: number;
    sale_price: number;
    stock: number;
    unit: string;
    image_url?: string;
    status: 'active' | 'inactive';
    categories?: { name: string };
}

export default function ProductsScreen() {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { session, company, branch, isAdmin } = useAuth();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width >= 768;
    const statusBarPadding = 0;
    const { stockStatus } = useLocalSearchParams<{ stockStatus?: string }>();
    const [filters, setFilters] = useState<Record<string, string>>(stockStatus ? { stockStatus } : {});
    const [searchQuery, setSearchQuery] = useState('');

    React.useEffect(() => {
        if (stockStatus) {
            setFilters(prev => ({ ...prev, stockStatus }));
        }
    }, [stockStatus]);

    const {
        data: products = [],
        isLoading: loading,
        refetch: fetchProducts
    } = useProducts({
        search: searchQuery,
        status: filters.status,
        stockStatus: filters.stockStatus
    });

    // Adjust stock modal
    const [adjustModalVisible, setAdjustModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
    };

    const handleFilter = (newFilters: Record<string, string>) => {
        setFilters(newFilters);
    };

    const handleAddProduct = () => {
        router.push('/(tabs)/products/add');
    };

    const filterGroups = [
        {
            key: 'stockStatus',
            title: t('inventory.stock_status'),
            options: [
                { label: t('inventory.in_stock'), value: 'in_stock' },
                { label: t('inventory.low_stock'), value: 'low_stock' },
                { label: t('inventory.out_of_stock'), value: 'out_of_stock' }
            ]
        },
        {
            key: 'status',
            title: t('common.status'),
            options: [
                { label: t('common.active'), value: 'active' },
                { label: t('common.inactive'), value: 'inactive' }
            ]
        }
    ];

    const handleScan = (data: string) => {
        setSearchQuery(data);
        fetchProducts();
    };

    const handleAdjustStock = (product: Product) => {
        setSelectedProduct(product);
        setAdjustModalVisible(true);
    };

    // Web Table Header
    const TableHeader = () => (
        <View style={styles.tableHeader}>
            <Text style={[styles.thText, { flex: 3 }]}>{t('inventory.products')}</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 1.2 }]}>{t('products.cost')}</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 1.2 }]}>{t('inventory.sale_price')}</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 1.2 }]}>{t('inventory.stock')}</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 1.2 }]}>{t('products.profit')}</Text>
            <View style={{ width: 60 }} />
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: statusBarPadding }]}>
            <LinearGradient
                colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('products.product_list')}</Text>
                <Text style={styles.headerSubtitle}>{products.length} {t('products.items_found')}</Text>
            </View>

            <SearchFilterHeader
                onSearch={handleSearch}
                onFilter={handleFilter}
                onScan={handleScan}
                filterGroups={filterGroups}
                activeFilters={filters}
                placeholder={t('products.search_placeholder')}
            />

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
                <>
                    {isWeb && products.length > 0 && (
                        <View style={styles.tableContainer}>
                            <TableHeader />
                        </View>
                    )}
                    <FlatList
                        data={products}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={[styles.listContent, isWeb && styles.listContentWeb]}
                        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchProducts()} />}
                        renderItem={({ item }) => (
                            <ProductListItem
                                name={item.name}
                                sku={item.primary_sku}
                                price={item.sale_price}
                                costPrice={item.cost_price}
                                stock={item.stock}
                                unit={item.unit ? t(`common.${item.unit}`) : t('common.pcs')}
                                imageUrl={item.image_url}
                                category={item.categories?.name}
                                onPress={() => router.push({ pathname: '/(tabs)/products/[id]', params: { id: item.id } })}
                                onAdjustStock={isAdmin ? () => handleAdjustStock(item) : undefined}
                            />
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconCircle}>
                                    <Text style={{ fontSize: 32 }}>📦</Text>
                                </View>
                                <Text style={styles.emptyText}>{t('products.empty_products')}</Text>
                                <Text style={styles.emptySubtext}>{t('products.adjust_search')}</Text>
                                {isAdmin && (
                                    <AppButton
                                        title={t('products.add_product')}
                                        onPress={handleAddProduct}
                                        style={{ marginTop: 20 }}
                                    />
                                )}
                            </View>
                        }
                    />
                </>
            )}

            {isAdmin && (
                <View style={styles.fabContainer}>
                    <AppButton title={t('products.new_item')} onPress={handleAddProduct} style={styles.fab} />
                </View>
            )}

            {/* Adjust Stock Modal */}
            {selectedProduct && (
                <AdjustStockModal
                    visible={adjustModalVisible}
                    onClose={() => {
                        setAdjustModalVisible(false);
                        setSelectedProduct(null);
                        fetchProducts();
                    }}
                    productId={selectedProduct.id}
                    productName={selectedProduct.name}
                    currentStock={selectedProduct.stock}
                    unit={selectedProduct.unit || 'pcs'}
                />
            )}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        paddingHorizontal: Layout.spacing.lg,
        paddingTop: Layout.spacing.lg,
        paddingBottom: Layout.spacing.sm,
        backgroundColor: 'transparent',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Web table
    tableContainer: {
        marginHorizontal: 12,
        backgroundColor: colors.card + 'E0',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'transparent',
    },
    thText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    thRight: { textAlign: 'right', paddingRight: 12 },

    listContent: {
        paddingBottom: 20,
    },
    listContentWeb: {
        marginHorizontal: 12,
        backgroundColor: colors.card + 'E0',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 16,
        paddingHorizontal: 20,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Layout.spacing.md,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: '70%' as any,
        lineHeight: 20,
    },
    fabContainer: {
        position: 'absolute',
        bottom: 24,
        right: 24,
    },
    fab: {
        borderRadius: 30,
        paddingHorizontal: 24,
    },
});
