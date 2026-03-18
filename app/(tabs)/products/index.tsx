import { AdjustStockModal } from '@/components/AdjustStockModal';
import { ProductListItem } from '@/components/ProductListItem';
import { SearchFilterHeader } from '@/components/SearchFilterHeader';
import { AppButton } from '@/components/ui/AppButton';
import { Gradients, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
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
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { session, company, branch, isAdmin } = useAuth();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width >= 768;
    const statusBarPadding = 0;
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({});

    // Adjust stock modal
    const [adjustModalVisible, setAdjustModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const fetchProducts = async (search = searchQuery, currentFilters = filters) => {
        try {
            setLoading(true);
            let selectQuery = '*, categories(name)';

            // Try to get stock from stock table
            let query = supabase
                .from('products')
                .select(selectQuery)
                .eq('company_id', company?.id)
                .order('name');

            if (search) {
                query = query.or(`name.ilike.%${search}%,primary_sku.ilike.%${search}%`);
            }

            if (currentFilters.status) {
                query = query.eq('status', currentFilters.status);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching products:', error);
            } else {
                let result: any[] = data || [];

                // Fetch stock quantities from branch_products
                const productIds = result.map((p: any) => p.id);
                if (productIds.length > 0) {
                    let bpQuery = supabase
                        .from('branch_products')
                        .select('product_id, stock')
                        .in('product_id', productIds);
                    if (branch?.id) bpQuery = bpQuery.eq('branch_id', branch.id);
                    const { data: bpData } = await bpQuery;

                    const stockMap = new Map();
                    bpData?.forEach((bp: any) => {
                        const existing = stockMap.get(bp.product_id) || 0;
                        stockMap.set(bp.product_id, existing + Number(bp.stock));
                    });

                    result = result.map((p: any) => ({
                        ...p,
                        stock: stockMap.get(p.id) ?? 0,
                        unit: p.unit || 'pcs',
                    }));
                }

                // Client-side filters
                if (currentFilters.stockStatus) {
                    if (currentFilters.stockStatus === 'in_stock') {
                        result = result.filter(p => p.stock > 10);
                    } else if (currentFilters.stockStatus === 'low_stock') {
                        result = result.filter(p => p.stock <= 10 && p.stock > 0);
                    } else if (currentFilters.stockStatus === 'out_of_stock') {
                        result = result.filter(p => p.stock === 0);
                    }
                }

                setProducts(result);
            }
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (company?.id) fetchProducts();
        }, [company?.id, branch?.id])
    );

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        fetchProducts(text, filters);
    };

    const handleFilter = (newFilters: Record<string, string>) => {
        setFilters(newFilters);
        fetchProducts(searchQuery, newFilters);
    };

    const handleAddProduct = () => {
        router.push('/(tabs)/products/add');
    };

    const filterGroups = [
        {
            key: 'stockStatus',
            title: 'Stock Status',
            options: [
                { label: 'In Stock', value: 'in_stock' },
                { label: 'Low Stock', value: 'low_stock' },
                { label: 'Out of Stock', value: 'out_of_stock' }
            ]
        },
        {
            key: 'status',
            title: 'Product Status',
            options: [
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' }
            ]
        }
    ];

    const handleScan = (data: string) => {
        setSearchQuery(data);
        fetchProducts(data, filters);
    };

    const handleAdjustStock = (product: Product) => {
        setSelectedProduct(product);
        setAdjustModalVisible(true);
    };

    // Web Table Header
    const TableHeader = () => (
        <View style={styles.tableHeader}>
            <Text style={[styles.thText, { flex: 3 }]}>Product</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 1.2 }]}>Cost</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 1.2 }]}>Sale Price</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 1.2 }]}>Stock</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 1.2 }]}>Profit</Text>
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
                <Text style={styles.headerTitle}>Products</Text>
                <Text style={styles.headerSubtitle}>{products.length} items found</Text>
            </View>

            <SearchFilterHeader
                onSearch={handleSearch}
                onFilter={handleFilter}
                onScan={handleScan}
                filterGroups={filterGroups}
                activeFilters={filters}
                placeholder="Search name or SKU..."
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
                        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchProducts(searchQuery, filters)} />}
                        renderItem={({ item }) => (
                            <ProductListItem
                                name={item.name}
                                sku={item.primary_sku}
                                price={item.sale_price}
                                costPrice={item.cost_price}
                                stock={item.stock}
                                unit={item.unit || 'pcs'}
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
                                <Text style={styles.emptyText}>No products found</Text>
                                <Text style={styles.emptySubtext}>Try adjusting your search or filters.</Text>
                                {isAdmin && (
                                    <AppButton
                                        title="+ Add Product"
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
                    <AppButton title="+ New Item" onPress={handleAddProduct} style={styles.fab} />
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
        paddingBottom: Layout.spacing.sm,
        backgroundColor: 'transparent',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
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
        paddingBottom: 110,
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
        bottom: 110,
        right: 24,
    },
    fab: {
        borderRadius: 30,
        paddingHorizontal: 24,
    },
});
