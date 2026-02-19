import { Colors, Layout } from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProductListItemProps {
    name: string;
    sku: string;
    price: number;
    stock: number;
    imageUrl?: string | null;
    category?: string;
    onPress: () => void;
}

export function ProductListItem({ name, sku, price, stock, imageUrl, category, onPress }: ProductListItemProps) {
    const isLowStock = stock < 10;
    const isOut = stock === 0;

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.imageContainer}>
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.image} />
                ) : (
                    <View style={styles.placeholder}>
                        <FontAwesome name="cube" size={24} color={Colors.light.textSecondary} />
                    </View>
                )}
            </View>

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                    <Text style={styles.price}>${price.toFixed(2)}</Text>
                </View>

                <View style={styles.detailsRow}>
                    <Text style={styles.sku}>{sku}</Text>
                    {category && <Text style={styles.category}>• {category}</Text>}
                </View>

                <View style={styles.footer}>
                    <View style={[styles.stockBadge, isOut ? styles.stockOut : (isLowStock ? styles.stockLow : styles.stockOk)]}>
                        <FontAwesome
                            name={isOut ? "times-circle" : (isLowStock ? "exclamation-circle" : "check-circle")}
                            size={10}
                            color={isOut ? Colors.light.danger : (isLowStock ? '#B76E00' : Colors.light.success)}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.stockText, isOut ? { color: Colors.light.danger } : (isLowStock ? { color: '#B76E00' } : { color: Colors.light.success })]}>
                            {isOut ? 'Out of Stock' : `${stock} in stock`}
                        </Text>
                    </View>
                </View>
            </View>

            <FontAwesome name="chevron-right" size={12} color={Colors.light.textSecondary} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.card,
        borderRadius: Layout.borderRadius.lg,
        padding: Layout.spacing.md,
        marginTop: Layout.spacing.sm,
        marginHorizontal: Layout.spacing.md,
        ...Layout.shadows.small,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    imageContainer: {
        width: 50,
        height: 50,
        borderRadius: Layout.borderRadius.md,
        overflow: 'hidden',
        marginRight: Layout.spacing.md,
        backgroundColor: Colors.light.background,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.light.text,
        flex: 1,
        marginRight: 8,
    },
    price: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.light.primary,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    sku: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        backgroundColor: '#F4F5F7',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 3,
        overflow: 'hidden',
    },
    category: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        marginLeft: 4,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: '#EDFCF2', // Default success light
    },
    stockOk: {
        backgroundColor: '#E3FCEF',
    },
    stockLow: {
        backgroundColor: '#FFF7E6',
    },
    stockOut: {
        backgroundColor: '#FFEBE6',
    },
    stockText: {
        fontSize: 11,
        fontWeight: '600',
    },
});
