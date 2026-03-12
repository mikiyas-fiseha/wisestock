import { AdjustStockModal } from '@/components/AdjustStockModal';
import { ReturnModal } from '@/components/ReturnModal';
import { StockTransferModal } from '@/components/StockTransferModal';
import { Gradients, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useProductBranchBreakdown } from '@/hooks/useInventory';
import { useInventoryLogs } from '@/hooks/useInventoryLogs';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

export default function ProductDetailsScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { session, company, branch, isAdmin } = useAuth();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width >= 768;
    const [product, setProduct] = useState<any>(null);
    const [variants, setVariants] = useState<any[]>([]);
    const [stockQty, setStockQty] = useState(0);
    const [loading, setLoading] = useState(true);
    const [adjustModalVisible, setAdjustModalVisible] = useState(false);
    const [transferModalVisible, setTransferModalVisible] = useState(false);
    const [returnType, setReturnType] = useState<'customer_return' | 'supplier_return' | null>(null);

    const { data: branchBreakdown = [] } = useProductBranchBreakdown(id as string);

    // Stock History pagination
    const [historyPage, setHistoryPage] = useState(0);
    const pageSize = isWeb ? 10 : 5;
    const { data: historyData, isLoading: historyLoading } = useInventoryLogs(id as string, historyPage, pageSize);

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

            // Get stock from branch_products
            let bpQuery = supabase
                .from('branch_products')
                .select('stock')
                .eq('product_id', id as string);
            if (branch?.id) bpQuery = bpQuery.eq('branch_id', branch.id);
            const { data: bpData } = await bpQuery;

            const totalStock = bpData?.reduce((sum: number, bp: any) => sum + Number(bp.stock), 0) || 0;
            setStockQty(totalStock);

            // Get variants
            const { data: varData } = await supabase
                .from('product_variants')
                .select('*')
                .eq('product_id', id);
            setVariants(varData || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
    if (!product) return <View style={styles.center}><Text style={{ color: colors.text }}>Product not found</Text></View>;

    const unit = product.unit || 'pcs';
    const profit = (product.sale_price || 0) - (product.cost_price || 0);
    const isLowStock = stockQty > 0 && stockQty < 10;
    const isOutOfStock = stockQty <= 0;
    const totalPages = historyData ? Math.ceil(historyData.count / pageSize) : 0;

    const getTypeBadge = (type: string) => {
        const map: Record<string, { bg: string; color: string; label: string }> = {
            purchase: { bg: colors.success + '20', color: colors.success, label: 'Purchase' },
            sale: { bg: colors.primary + '20', color: colors.primary, label: 'Sale' },
            adjustment: { bg: colors.warning + '20', color: colors.warning, label: 'Adjustment' },
            return: { bg: '#F5F3FF', color: '#7C3AED', label: 'Return' },
            transfer_out: { bg: colors.danger + '20', color: colors.danger, label: 'Transfer Out' },
            transfer_in: { bg: colors.success + '20', color: colors.success, label: 'Transfer In' },
        };
        return map[type] || { bg: colors.background, color: colors.textSecondary, label: type };
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
    };

    // ─── Stock History Table (Web) ───
    const StockHistoryTable = () => (
        <View style={styles.historyTable}>
            <View style={styles.historyHeader}>
                <Text style={[styles.historyTh, { flex: 1.5 }]}>Date</Text>
                <Text style={[styles.historyTh, { flex: 1 }]}>Type</Text>
                <Text style={[styles.historyTh, styles.historyThRight, { flex: 1 }]}>Change</Text>
                <Text style={[styles.historyTh, styles.historyThRight, { flex: 1 }]}>Previous</Text>
                <Text style={[styles.historyTh, styles.historyThRight, { flex: 1 }]}>New</Text>
                <Text style={[styles.historyTh, { flex: 1.5, textAlign: 'right' }]}>Reference</Text>
            </View>
            {historyData?.data.map((log: any) => {
                const badge = getTypeBadge(log.type);
                return (
                    <View key={log.id} style={styles.historyRow}>
                        <View style={{ flex: 1.5 }}>
                            <Text style={styles.historyDate}>{formatDate(log.created_at)}</Text>
                            <Text style={styles.historyTime}>{formatTime(log.created_at)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                                <Text style={[styles.typeBadgeText, { color: badge.color }]}>{badge.label}</Text>
                            </View>
                        </View>
                        <Text style={[styles.historyChange, styles.historyThRight, { flex: 1, color: log.quantity > 0 ? colors.success : colors.danger }]}>
                            {log.quantity > 0 ? '+' : ''}{log.quantity} {unit}
                        </Text>
                        <Text style={[styles.historyCell, styles.historyThRight, { flex: 1 }]}>{log.previous_stock ?? '—'}</Text>
                        <Text style={[styles.historyCell, styles.historyThRight, { flex: 1 }]}>{log.new_stock ?? '—'}</Text>
                        <Text style={[styles.historyRef, { flex: 1.5, textAlign: 'right' }]} numberOfLines={1}>{log.notes || log.reference_type || '—'}</Text>
                    </View>
                );
            })}
            {(!historyData?.data || historyData.data.length === 0) && (
                <View style={styles.historyEmpty}>
                    <Text style={styles.historyEmptyText}>No stock history yet</Text>
                </View>
            )}
        </View>
    );

    // ─── Stock History Cards (Mobile) ───
    const StockHistoryCards = () => (
        <View>
            {historyData?.data.map((log: any) => {
                const badge = getTypeBadge(log.type);
                return (
                    <View key={log.id} style={styles.historyCard}>
                        <View style={styles.historyCardTop}>
                            <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                                <Text style={[styles.typeBadgeText, { color: badge.color }]}>{badge.label}</Text>
                            </View>
                            <Text style={styles.historyCardDate}>{formatDate(log.created_at)}</Text>
                        </View>
                        <View style={styles.historyCardBody}>
                            <View style={styles.historyCardStat}>
                                <Text style={styles.historyCardLabel}>Change</Text>
                                <Text style={[styles.historyCardValue, { color: log.quantity > 0 ? colors.success : colors.danger }]}>
                                    {log.quantity > 0 ? '+' : ''}{log.quantity} {unit}
                                </Text>
                            </View>
                            <View style={styles.historyCardStat}>
                                <Text style={styles.historyCardLabel}>Before</Text>
                                <Text style={styles.historyCardValue}>{log.previous_stock ?? '—'}</Text>
                            </View>
                            <View style={styles.historyCardStat}>
                                <Text style={styles.historyCardLabel}>After</Text>
                                <Text style={styles.historyCardValue}>{log.new_stock ?? '—'}</Text>
                            </View>
                        </View>
                        {log.notes && <Text style={styles.historyCardNote} numberOfLines={1}>{log.notes}</Text>}
                    </View>
                );
            })}
            {(!historyData?.data || historyData.data.length === 0) && (
                <View style={styles.historyEmpty}>
                    <Text style={styles.historyEmptyText}>No stock history yet</Text>
                </View>
            )}
        </View>
    );

    // ─── Pagination Controls ───
    const Pagination = () => (
        totalPages > 1 ? (
            <View style={styles.pagination}>
                <TouchableOpacity
                    onPress={() => setHistoryPage(Math.max(0, historyPage - 1))}
                    disabled={historyPage === 0}
                    style={[styles.pageBtn, historyPage === 0 && styles.pageBtnDisabled]}
                >
                    <FontAwesome name="chevron-left" size={12} color={historyPage === 0 ? colors.textSecondary : colors.primary} />
                </TouchableOpacity>
                <Text style={styles.pageText}>Page {historyPage + 1} of {totalPages}</Text>
                <TouchableOpacity
                    onPress={() => setHistoryPage(Math.min(totalPages - 1, historyPage + 1))}
                    disabled={historyPage >= totalPages - 1}
                    style={[styles.pageBtn, historyPage >= totalPages - 1 && styles.pageBtnDisabled]}
                >
                    <FontAwesome name="chevron-right" size={12} color={historyPage >= totalPages - 1 ? colors.textSecondary : colors.primary} />
                </TouchableOpacity>
            </View>
        ) : null
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Image Header */}
                <View style={[styles.imageContainer, !isWeb && { height: 250 }]}>
                    {product.image_url ? (
                        <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <FontAwesome name="cube" size={48} color={colors.textSecondary} />
                        </View>
                    )}
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.imageOverlay}>
                        <View style={styles.headerContent}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.headerName}>{product.name}</Text>
                                <Text style={styles.headerSku}>{product.primary_sku || 'No SKU'}</Text>
                            </View>
                            <View style={[styles.stockPill, isOutOfStock ? styles.stockPillRed : (isLowStock ? styles.stockPillYellow : styles.stockPillGreen)]}>
                                <Text style={styles.stockPillText}>{stockQty} {unit}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <FontAwesome name="arrow-left" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* ─── Info Cards ─── */}
                <View style={[styles.cardsRow, !isWeb && styles.cardsColumn]}>
                    {/* Pricing Card */}
                    <View style={[styles.infoCard, isWeb && { flex: 1 }]}>
                        <View style={styles.infoCardHeader}>
                            <FontAwesome name="dollar" size={14} color={colors.primary} />
                            <Text style={styles.infoCardTitle}>Pricing</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Cost Price</Text>
                            <Text style={styles.infoValue}>${(product.cost_price || 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Sale Price</Text>
                            <Text style={[styles.infoValue, { color: colors.primary }]}>${(product.sale_price || 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Profit</Text>
                            <Text style={[styles.infoValue, { color: profit >= 0 ? colors.success : colors.danger, fontWeight: '800' }]}>
                                ${profit.toFixed(2)}
                            </Text>
                        </View>
                    </View>

                    {/* Inventory Card */}
                    <View style={[styles.infoCard, isWeb && { flex: 1 }]}>
                        <View style={styles.infoCardHeader}>
                            <FontAwesome name="archive" size={14} color="#7C3AED" />
                            <Text style={styles.infoCardTitle}>Inventory</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Current Stock</Text>
                            <Text style={[styles.infoValue, isOutOfStock && { color: colors.danger }, isLowStock && { color: colors.warning }]}>
                                {stockQty} {unit}
                            </Text>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Unit</Text>
                            <Text style={styles.infoValue}>{unit}</Text>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Status</Text>
                            <View style={[styles.statusBadge, product.status === 'active' ? styles.statusActive : styles.statusInactive]}>
                                <Text style={[styles.statusText, { color: product.status === 'active' ? colors.success : colors.danger }]}>
                                    {product.status?.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        {isAdmin && (
                            <>
                                <View style={styles.infoDivider} />
                                <TouchableOpacity style={styles.adjustStockBtn} onPress={() => setAdjustModalVisible(true)}>
                                    <FontAwesome name="exchange" size={13} color="#fff" />
                                    <Text style={styles.adjustStockBtnText}>Adjust Stock</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.adjustStockBtn, { backgroundColor: '#6366F1', marginTop: 8 }]}
                                    onPress={() => setTransferModalVisible(true)}
                                >
                                    <FontAwesome name="truck" size={13} color="#fff" />
                                    <Text style={styles.adjustStockBtnText}>Transfer Stock</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.adjustStockBtn, { backgroundColor: '#06B6D4', marginTop: 8 }]}
                                    onPress={() => setReturnType('customer_return')}
                                >
                                    <FontAwesome name="undo" size={13} color="#fff" />
                                    <Text style={styles.adjustStockBtnText}>Customer Return</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.adjustStockBtn, { backgroundColor: '#F97316', marginTop: 8 }]}
                                    onPress={() => setReturnType('supplier_return')}
                                >
                                    <FontAwesome name="reply" size={13} color="#fff" />
                                    <Text style={styles.adjustStockBtnText}>Supplier Return</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>

                {/* ─── Branch Stock Breakdown ─── */}
                {branchBreakdown.length > 1 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Stock by Branch</Text>
                        {branchBreakdown.map((b, i) => {
                            const cfg = b.status === 'out'
                                ? { bg: colors.danger + '20', color: colors.danger, label: 'OUT' }
                                : b.status === 'low'
                                    ? { bg: colors.warning + '20', color: colors.warning, label: 'LOW' }
                                    : { bg: colors.success + '20', color: colors.success, label: 'OK' };
                            return (
                                <View key={b.branch_id} style={[styles.branchRow, i % 2 === 0 && { backgroundColor: Object.keys(colors.background).length ? colors.background : '#FAFBFC' }]}>
                                    <View style={styles.branchLeft}>
                                        <View style={[styles.branchDot, { backgroundColor: cfg.color }]} />
                                        <Text style={styles.branchName}>{b.branch_name}</Text>
                                    </View>
                                    <View style={styles.branchRight}>
                                        <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                                            <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                                        </View>
                                        <Text style={styles.branchStock}>{b.stock} {unit}</Text>
                                        <Text style={styles.branchMin}>Min: {b.min_stock_level}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Variants Section */}
                {variants.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Variants ({variants.length})</Text>
                        {variants.map(v => (
                            <View key={v.id} style={styles.variantCard}>
                                <View>
                                    <Text style={styles.variantName}>{v.sku}</Text>
                                    <Text style={styles.variantDetails}>
                                        {Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(', ')}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.variantPrice}>${v.price_override?.toFixed(2)}</Text>
                                    <Text style={[styles.variantStock, v.stock < 5 && { color: colors.danger }]}>{v.stock} {unit}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* ─── Stock History ─── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Stock History</Text>
                        {historyLoading && <ActivityIndicator size="small" color={colors.primary} />}
                    </View>
                    {isWeb ? <StockHistoryTable /> : <StockHistoryCards />}
                    <Pagination />
                </View>
            </ScrollView>

            {/* Floating Edit Button */}
            {isAdmin && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => router.push({ pathname: '/(tabs)/products/add', params: { id: product.id } })}
                    activeOpacity={0.8}
                >
                    <FontAwesome name="pencil" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.fabText}>Edit</Text>
                </TouchableOpacity>
            )}

            {/* Adjust Stock Modal */}
            <AdjustStockModal
                visible={adjustModalVisible}
                onClose={() => {
                    setAdjustModalVisible(false);
                    fetchProductDetails();
                }}
                productId={id as string}
                productName={product.name}
                currentStock={stockQty}
                unit={unit}
            />

            {/* Stock Transfer Modal */}
            <StockTransferModal
                visible={transferModalVisible}
                onClose={() => {
                    setTransferModalVisible(false);
                    fetchProductDetails();
                }}
                productId={id as string}
                productName={product.name}
            />

            {/* Return Modal */}
            {returnType && (
                <ReturnModal
                    visible={!!returnType}
                    type={returnType}
                    productId={id as string}
                    productName={product.name}
                    onClose={() => {
                        setReturnType(null);
                        fetchProductDetails();
                    }}
                />
            )}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Image
    imageContainer: { height: 280, width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', position: 'relative' },
    image: { width: '100%', height: '100%' },
    placeholderImage: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
    imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, justifyContent: 'flex-end', padding: 20 },
    backButton: { position: 'absolute', top: 16, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 10, backdropFilter: 'blur(10px)' },
    headerContent: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
    headerName: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    headerSku: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', backgroundColor: 'rgba(0,0,0,0.3)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },

    // Stock pill on header
    stockPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 4 },
    stockPillGreen: { backgroundColor: 'rgba(5,150,105,0.9)' },
    stockPillYellow: { backgroundColor: 'rgba(183,110,0,0.9)' },
    stockPillRed: { backgroundColor: 'rgba(220,38,38,0.9)' },
    stockPillText: { fontSize: 14, fontWeight: '800', color: '#fff' },

    // Cards Row
    cardsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: -24 },
    cardsColumn: { flexDirection: 'column', marginTop: 12 },

    infoCard: { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 14, padding: 16, ...Layout.shadows.small },
    infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    infoCardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
    infoLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    infoValue: { fontSize: 15, fontWeight: '700', color: colors.text },
    infoDivider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },

    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
    statusActive: { backgroundColor: colors.success + '20' },
    statusInactive: { backgroundColor: colors.danger + '20' },
    statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

    adjustStockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, marginTop: 8 },
    adjustStockBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    // Variants
    variantCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
    variantName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
    variantDetails: { fontSize: 12, color: colors.textSecondary },
    variantPrice: { fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: 2 },
    variantStock: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },

    // Section
    section: { paddingHorizontal: 16, marginTop: 20 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    // History Table (Web)
    historyTable: { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 12, overflow: 'hidden', ...Layout.shadows.small },
    historyHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: colors.border },
    historyTh: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    historyThRight: { textAlign: 'right' },
    historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    historyDate: { fontSize: 12, fontWeight: '600', color: colors.text },
    historyTime: { fontSize: 10, color: colors.textSecondary },
    historyChange: { fontSize: 13, fontWeight: '700' },
    historyCell: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    historyRef: { fontSize: 11, color: colors.textSecondary },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start' },
    typeBadgeText: { fontSize: 10, fontWeight: '700' },
    historyEmpty: { padding: 24, alignItems: 'center' },
    historyEmptyText: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },

    // History Card (Mobile)
    historyCard: { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
    historyCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    historyCardDate: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
    historyCardBody: { flexDirection: 'row', gap: 16 },
    historyCardStat: { flex: 1 },
    historyCardLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
    historyCardValue: { fontSize: 15, fontWeight: '700', color: colors.text },
    historyCardNote: { fontSize: 11, color: colors.textSecondary, marginTop: 8, fontStyle: 'italic' },

    // Pagination
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 12 },
    pageBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
    pageBtnDisabled: { opacity: 0.4 },
    pageText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

    // FAB
    fab: { position: 'absolute', bottom: 28, left: 20, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, ...Layout.shadows.medium, zIndex: 100 },
    fabText: {
        color: '#FFFFFF', fontWeight: '700', fontSize: 15,
    },
    branchRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 18, paddingVertical: 12,
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 8,
        
    },
    branchLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    branchDot: { width: 8, height: 8, borderRadius: 4 },
    branchName: { fontSize: 13, fontWeight: '500', color: colors.text },
    branchRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    branchStock: { fontSize: 14, fontWeight: '700', color: colors.text },
    branchMin: { fontSize: 11, color: colors.textSecondary },
    statusPill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
    statusPillText: { fontSize: 10, fontWeight: '700' },
});
