import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

interface ProductListItemProps {
    name: string;
    sku: string;
    price: number;
    costPrice?: number;
    stock: number;
    unit?: string;
    imageUrl?: string | null;
    category?: string;
    onPress: () => void;
    onAdjustStock?: () => void;
}

export function ProductListItem({ name, sku, price, costPrice, stock, unit = 'pcs', imageUrl, category, onPress, onAdjustStock }: ProductListItemProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width >= 768;
    const isLowStock = stock > 0 && stock < 10;
    const isOut = stock <= 0;
    const profit = costPrice ? price - costPrice : 0;
    const stockLabel = `${stock} ${unit}`;

    // ─── Web Table Row ───
    if (isWeb) {
        return (
            <TouchableOpacity style={styles.webRow} onPress={onPress} activeOpacity={0.7}>
                {/* Product */}
                <View style={styles.webColProduct}>
                    <View style={styles.imageContainer}>
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.image} />
                        ) : (
                            <View style={styles.placeholder}>
                                <FontAwesome name="cube" size={18} color={colors.textSecondary} />
                            </View>
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.webName} numberOfLines={1}>{name}</Text>
                        <Text style={styles.webSku}>{sku}</Text>
                    </View>
                </View>

                {/* Cost */}
                <View style={styles.webCol}>
                    <Text style={styles.webCost}>{costPrice != null ? `$${costPrice.toFixed(2)}` : '—'}</Text>
                </View>

                {/* Sale Price */}
                <View style={styles.webCol}>
                    <Text style={styles.webPrice}>${price.toFixed(2)}</Text>
                </View>

                {/* Stock + Unit */}
                <View style={styles.webCol}>
                    <View style={[styles.stockBadge, isOut ? styles.stockOut : (isLowStock ? styles.stockLow : styles.stockOk)]}>
                        <Text style={[styles.stockBadgeText, isOut ? { color: colors.danger } : (isLowStock ? { color: colors.warning } : { color: colors.success })]}>
                            {isOut ? 'Out of stock' : stockLabel}
                        </Text>
                    </View>
                </View>

                {/* Profit */}
                <View style={styles.webCol}>
                    <Text style={[styles.webProfit, profit < 0 && { color: colors.danger }]}>
                        {costPrice != null ? `$${profit.toFixed(2)}` : '—'}
                    </Text>
                </View>

                {/* Actions */}
                <View style={styles.webColAction}>
                    {onAdjustStock && (
                        <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); onAdjustStock(); }}
                            style={styles.adjustBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <FontAwesome name="exchange" size={13} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                    <FontAwesome name="chevron-right" size={10} color={colors.textSecondary} />
                </View>
            </TouchableOpacity>
        );
    }

    // ─── Mobile Card ───
    return (
        <TouchableOpacity style={[styles.mobileCard, isOut && styles.mobileCardOut, isLowStock && styles.mobileCardLow]} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.imageContainerMobile}>
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.image} />
                ) : (
                    <View style={styles.placeholder}>
                        <FontAwesome name="cube" size={20} color={colors.textSecondary} />
                    </View>
                )}
            </View>

            <View style={styles.mobileContent}>
                <Text style={styles.mobileName} numberOfLines={1}>{name}</Text>
                <Text style={styles.mobilePrice}>${price.toFixed(2)}</Text>
                <View style={styles.mobileFooter}>
                    <View style={[styles.stockBadgeSmall, isOut ? styles.stockOut : (isLowStock ? styles.stockLow : styles.stockOk)]}>
                        <FontAwesome
                            name={isOut ? 'times-circle' : (isLowStock ? 'exclamation-circle' : 'check-circle')}
                            size={9}
                            color={isOut ? colors.danger : (isLowStock ? colors.warning : colors.success)}
                            style={{ marginRight: 3 }}
                        />
                        <Text style={[styles.stockTextSmall, isOut ? { color: colors.danger } : (isLowStock ? { color: colors.warning } : { color: colors.success })]}>
                            {isOut ? 'Out' : stockLabel}
                        </Text>
                    </View>
                    {onAdjustStock && (
                        <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); onAdjustStock(); }}
                            style={styles.adjustBtnMobile}
                        >
                            <FontAwesome name="exchange" size={11} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FontAwesome name="chevron-right" size={11} color={colors.textSecondary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    // ─── Web Table Row ───
    webRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: (colors.card + 'E0'),
        paddingVertical: 14,
        paddingHorizontal: 20,
        cursor: 'pointer' as any,
    },
    webColProduct: { flex: 3, flexDirection: 'row', alignItems: 'center', gap: 12 },
    webCol: { flex: 1.2, alignItems: 'flex-end', paddingRight: 12 },
    webColAction: { width: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },

    webName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 1 },
    webSku: { fontSize: 11, color: colors.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    webCost: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    webPrice: { fontSize: 14, fontWeight: '700', color: colors.text },
    webProfit: { fontSize: 13, fontWeight: '700', color: colors.success },

    adjustBtn: {
        width: 30, height: 30, borderRadius: 8,
        backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center',
    },

    // ─── Stock Badges ───
    stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    stockBadgeSmall: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
    stockBadgeText: { fontSize: 12, fontWeight: '700' },
    stockTextSmall: { fontSize: 10, fontWeight: '700' },
    stockOk: { backgroundColor: colors.success + '15' },
    stockLow: { backgroundColor: colors.warning + '15' },
    stockOut: { backgroundColor: colors.danger + '15' },

    // ─── Image ───
    imageContainer: { width: 40, height: 40, borderRadius: 8, overflow: 'hidden', backgroundColor: 'transparent' },
    imageContainerMobile: { width: 48, height: 48, borderRadius: 10, overflow: 'hidden', backgroundColor: 'transparent', marginRight: 12 },
    image: { width: '100%', height: '100%' },
    placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },

    // ─── Mobile Card ───
    mobileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: (colors.card + 'E0'),
        borderRadius: 16,
        padding: 14,
        marginTop: 10,
        marginHorizontal: 16,
    },
    mobileCardOut: { backgroundColor: colors.danger + '10' },
    mobileCardLow: { backgroundColor: colors.warning + '10' },
    mobileContent: { flex: 1 },
    mobileName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
    mobilePrice: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 6 },
    mobileFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    adjustBtnMobile: {
        width: 26, height: 26, borderRadius: 7,
        backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center',
    },
});
