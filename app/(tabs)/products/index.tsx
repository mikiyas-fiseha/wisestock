import { ProductListItem } from '@/components/ProductListItem';
import { SearchFilterHeader } from '@/components/SearchFilterHeader';
import { AppButton } from '@/components/ui/AppButton';
import { Colors, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

// Define Product type interface matching Supabase schema
export interface Product {
    id: string;
    name: string;
    primary_sku: string;
    secondary_sku?: string;
    cost_price: number;
    sale_price: number;
    stock: number;
    image_url?: string;
    status: 'active' | 'inactive';
    categories?: { name: string };
}

export default function ProductsScreen() {
    const router = useRouter();
    const { session, company, branch, isAdmin } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({});

    const fetchProducts = async (search = searchQuery, currentFilters = filters) => {
        try {
            setLoading(true);
            let query = supabase
                .from('products')
                .select('*, categories(name), branch_products!inner(stock, min_stock_level)')
                .eq('company_id', company?.id)
                .eq('branch_products.branch_id', branch?.id)
                .order('name');

            if (search) {
                // Search by Name or SKU
                // Supabase doesn't support OR across columns easily with ILIKE in JS client without raw SQL or dedicated text search
                // For simple use case, we can use .or() syntax properly:
                query = query.or(`name.ilike.%${search}%,primary_sku.ilike.%${search}%`);
            }

            if (currentFilters.status) {
                query = query.eq('status', currentFilters.status);
            }

            // Category filter would require joining or known ID. 
            // For now, if we filter by category name, we might need to filter client side or do a complex query.
            // Let's assume we filter by status for now as per plan, and maybe stock status?

            // Stock Status Logic (Client side or RPC? Client side for now)

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching products:', error);
            } else {
                let result = data || [];

                // Map branch stock to root stock
                result = result.map((p: any) => ({
                    ...p,
                    stock: p.branch_products?.[0]?.stock ?? 0,
                    min_stock_level: p.branch_products?.[0]?.min_stock_level ?? 0
                }));

                // Client-side filtering for complex logic not easily done in simple Supabase query builder
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
            if (company?.id && branch?.id) fetchProducts();
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
        // Automatically search for the scanned data (SKU)
        setSearchQuery(data);
        fetchProducts(data, filters);
    };

    return (
        <View style={styles.container}>
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
                <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.primary} /></View>
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchProducts(searchQuery, filters)} />}
                    renderItem={({ item }) => (
                        <ProductListItem
                            name={item.name}
                            sku={item.primary_sku}
                            price={item.sale_price}
                            stock={item.stock}
                            imageUrl={item.image_url}
                            category={item.categories?.name}
                            onPress={() => router.push({ pathname: '/(tabs)/products/[id]', params: { id: item.id } })}
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
            )}

            {isAdmin && (
                <View style={styles.fabContainer}>
                    <AppButton title="+ New Item" onPress={handleAddProduct} style={styles.fab} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
        paddingTop: 50, // Safe Area
    },
    header: {
        paddingHorizontal: Layout.spacing.lg,
        paddingBottom: Layout.spacing.sm, // Reduced padding
        backgroundColor: Colors.light.background,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.light.text,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        marginTop: 2,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 100,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#e3e8f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Layout.spacing.md,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        textAlign: 'center',
        maxWidth: '70%',
        lineHeight: 20,
    },
    fabContainer: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        left: undefined, // Override previous styling if needed
    },
    fab: {
        borderRadius: 30,
        paddingHorizontal: 24,
        ...Layout.shadows.medium,
    },
});
