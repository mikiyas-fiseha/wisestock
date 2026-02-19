import { Colors, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProductDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { session, company, isAdmin } = useAuth();
    const [product, setProduct] = useState<any>(null);
    const [variants, setVariants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProductDetails();
    }, [id]);

    const fetchProductDetails = async () => {
        try {
            const { data: prodData, error: prodError } = await supabase
                .from('products')
                .select('*, categories(name)')
                .eq('id', id)
                .single();

            if (prodError) throw prodError;
            setProduct(prodData);

            const { data: varData, error: varError } = await supabase
                .from('product_variants')
                .select('*')
                .eq('product_id', id);

            if (varError) throw varError;
            setVariants(varData || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.primary} /></View>;
    if (!product) return <View style={styles.center}><Text>Product not found</Text></View>;

    return (
        <View style={styles.container}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Image Header */}
                <View style={styles.imageContainer}>
                    {product.image_url ? (
                        <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <FontAwesome name="cube" size={60} color="#ccc" />
                        </View>
                    )}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.imageOverlay}
                    >
                        <Text style={styles.headerName}>{product.name}</Text>
                        <Text style={styles.headerSku}>{product.primary_sku}</Text>
                    </LinearGradient>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <FontAwesome name="arrow-left" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Key Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Stock</Text>
                            <Text style={[styles.statValue, product.stock < 10 ? { color: Colors.light.danger } : {}]}>{product.stock}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Price</Text>
                            <Text style={styles.statValue}>${product.sale_price.toFixed(2)}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Cost</Text>
                            <Text style={styles.statValue}>${product.cost_price.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Info Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Details</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Category</Text>
                            <Text style={styles.rowValue}>{product.categories?.name || 'Uncategorized'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Status</Text>
                            <View style={[styles.statusBadge, product.status === 'active' ? styles.statusActive : styles.statusInactive]}>
                                <Text style={styles.statusText}>{product.status.toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Variants Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Variants ({variants.length})</Text>
                    </View>

                    {variants.length === 0 ? (
                        <View style={styles.emptyVariants}>
                            <Text style={styles.emptyText}>No variants (Single product)</Text>
                        </View>
                    ) : (
                        variants.map(v => (
                            <View key={v.id} style={styles.variantCard}>
                                <View>
                                    <Text style={styles.variantName}>{v.sku}</Text>
                                    <Text style={styles.variantDetails}>
                                        {Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(', ')}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.variantPrice}>${v.price_override.toFixed(2)}</Text>
                                    <Text style={[styles.variantStock, v.stock < 5 && { color: Colors.light.danger }]}>{v.stock} left</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>


            {/* Floating Edit Button */}
            {isAdmin && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => router.push({ pathname: '/(tabs)/products/add', params: { id: product.id } })}
                    activeOpacity={0.8}
                >
                    <FontAwesome name="pencil" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.fabText}>Edit Product</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        height: 300,
        width: '100%',
        backgroundColor: '#2c3e50',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e0e0e0',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
        justifyContent: 'flex-end',
        padding: Layout.spacing.lg,
    },
    backButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    headerName: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    headerSku: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    statsContainer: {
        marginTop: -30,
        marginHorizontal: Layout.spacing.lg,
        backgroundColor: '#fff',
        borderRadius: Layout.borderRadius.xl,
        ...Layout.shadows.medium,
        padding: Layout.spacing.lg,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.light.text,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: Colors.light.border,
    },
    section: {
        marginTop: Layout.spacing.xl,
        paddingHorizontal: Layout.spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Layout.spacing.sm,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: Layout.spacing.sm,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: Layout.borderRadius.lg,
        padding: Layout.spacing.md,
        ...Layout.shadows.small,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    rowLabel: {
        fontSize: 16,
        color: Colors.light.textSecondary,
    },
    rowValue: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.light.border,
        marginVertical: 12,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusActive: {
        backgroundColor: '#E3FCEF',
    },
    statusInactive: {
        backgroundColor: '#FFEBE6',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.light.text,
    },
    variantCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: Layout.borderRadius.lg,
        padding: Layout.spacing.md,
        marginBottom: Layout.spacing.sm,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    variantName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: 2,
    },
    variantDetails: {
        fontSize: 14,
        color: Colors.light.textSecondary,
    },
    variantPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.light.primary,
        marginBottom: 2,
    },
    variantStock: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        fontWeight: '600',
    },
    emptyVariants: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
    },
    emptyText: {
        color: '#999',
        fontStyle: 'italic',
    },
    fab: {
        position: 'absolute',
        bottom: 30, // Positioned nicely above bottom safe area
        left: 20,    // Moved to left
        backgroundColor: Colors.light.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        ...Layout.shadows.medium,
        zIndex: 100,
        elevation: 5,
    },
    fabText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    }
});
