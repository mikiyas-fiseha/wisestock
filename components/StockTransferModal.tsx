
import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useBranchStock, useStockTransfer } from '@/hooks/useStockTransfer';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';

interface Props {
    visible: boolean;
    onClose: () => void;
    productId?: string;   // Pre-select product
    productName?: string;
}

interface ProductOption {
    id: string;
    name: string;
    primary_sku: string;
}

export function StockTransferModal({ visible, onClose, productId: initialProductId, productName: initialProductName }: Props) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { company, allBranches, branch } = useAuth();
    const { transfer, isTransferring } = useStockTransfer();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width >= 768;

    // Form State
    const [fromBranchId, setFromBranchId] = useState<string>('');
    const [toBranchId, setToBranchId] = useState<string>('');
    const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');
    const [selectedProductName, setSelectedProductName] = useState<string>(initialProductName || '');
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Per-branch stock for selected product
    const { data: branchStock } = useBranchStock(selectedProductId);

    // Initialize defaults
    useEffect(() => {
        if (visible) {
            if (initialProductId) setSelectedProductId(initialProductId);
            if (initialProductName) setSelectedProductName(initialProductName);
            if (branch?.id) setFromBranchId(branch.id);
            // Default "to" branch to first non-selected branch
            const otherBranch = allBranches.find(b => b.id !== branch?.id);
            if (otherBranch) setToBranchId(otherBranch.id);
        }
    }, [visible]);

    // Product search
    useEffect(() => {
        if (!showProductSearch || !company?.id) return;
        const search = async () => {
            setLoadingProducts(true);
            let q = supabase
                .from('products')
                .select('id, name, primary_sku')
                .eq('company_id', company.id)
                .eq('status', 'active')
                .order('name')
                .limit(20);
            if (productSearch) {
                q = q.or(`name.ilike.%${productSearch}%,primary_sku.ilike.%${productSearch}%`);
            }
            const { data } = await q;
            setProducts(data || []);
            setLoadingProducts(false);
        };
        search();
    }, [showProductSearch, productSearch, company?.id]);

    const sourceStock = branchStock?.find(bs => bs.branchId === fromBranchId)?.stock || 0;
    const destStock = branchStock?.find(bs => bs.branchId === toBranchId)?.stock || 0;
    const qty = parseFloat(quantity) || 0;

    const canSubmit = fromBranchId && toBranchId && selectedProductId && qty > 0 && qty <= sourceStock && fromBranchId !== toBranchId;

    const handleTransfer = async () => {
        if (!canSubmit) return;
        try {
            await transfer({
                productId: selectedProductId,
                fromBranchId,
                toBranchId,
                quantity: qty,
                notes,
            });
            Alert.alert('Success', `Transferred ${qty} units successfully.`);
            resetForm();
            onClose();
        } catch (err: any) {
            Alert.alert('Transfer Failed', err.message || 'Unknown error');
        }
    };

    const resetForm = () => {
        setQuantity('');
        setNotes('');
        if (!initialProductId) {
            setSelectedProductId('');
            setSelectedProductName('');
        }
    };

    const renderBranchPicker = (label: string, value: string, onChange: (id: string) => void, exclude?: string) => (
        <View style={styles.fieldGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.branchRow}>
                {allBranches
                    .filter(b => b.id !== exclude)
                    .map(b => (
                        <Pressable
                            key={b.id}
                            style={[styles.branchChip, value === b.id && styles.branchChipActive]}
                            onPress={() => onChange(b.id)}
                        >
                            <FontAwesome name="building-o" size={12} color={value === b.id ? '#fff' : colors.textSecondary} />
                            <Text style={[styles.branchChipText, value === b.id && styles.branchChipTextActive]} numberOfLines={1}>
                                {b.name}
                            </Text>
                        </Pressable>
                    ))}
            </View>
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="fade">
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={[styles.modal, isWeb && styles.modalWeb, { overflow: 'hidden' }]} onPress={e => e.stopPropagation()}>
                    {/* Background Gradient */}
                    <LinearGradient
                        colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />

                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Transfer Stock</Text>
                            <Text style={styles.subtitle}>Move inventory between branches</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <FontAwesome name="times" size={18} color={colors.textSecondary} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                        {/* Product Selector */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Product</Text>
                            <Pressable
                                style={styles.productSelector}
                                onPress={() => !initialProductId && setShowProductSearch(!showProductSearch)}
                            >
                                <FontAwesome name="cube" size={14} color={colors.textSecondary} />
                                <Text style={[styles.productSelectorText, !selectedProductName && { color: colors.textSecondary }]} numberOfLines={1}>
                                    {selectedProductName || 'Select product...'}
                                </Text>
                                {!initialProductId && <FontAwesome name="chevron-down" size={10} color={colors.textSecondary} />}
                            </Pressable>

                            {showProductSearch && (
                                <View style={styles.searchSection}>
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search product..."
                                        placeholderTextColor={colors.textSecondary}
                                        value={productSearch}
                                        onChangeText={setProductSearch}
                                        autoFocus
                                    />
                                    {loadingProducts ? (
                                        <ActivityIndicator style={{ padding: 12 }} color={colors.primary} />
                                    ) : (
                                        <FlatList
                                            data={products}
                                            keyExtractor={item => item.id}
                                            style={{ maxHeight: 150 }}
                                            renderItem={({ item }) => (
                                                <Pressable
                                                    style={styles.productItem}
                                                    onPress={() => {
                                                        setSelectedProductId(item.id);
                                                        setSelectedProductName(item.name);
                                                        setShowProductSearch(false);
                                                        setProductSearch('');
                                                    }}
                                                >
                                                    <Text style={styles.productItemName}>{item.name}</Text>
                                                    <Text style={styles.productItemSku}>{item.primary_sku}</Text>
                                                </Pressable>
                                            )}
                                        />
                                    )}
                                </View>
                            )}
                        </View>

                        {/* Branch selectors */}
                        {renderBranchPicker('From Branch', fromBranchId, setFromBranchId, toBranchId)}

                        {/* Arrow indicator */}
                        <View style={styles.arrowContainer}>
                            <FontAwesome name="arrow-down" size={16} color={colors.primary} />
                        </View>

                        {renderBranchPicker('To Branch', toBranchId, setToBranchId, fromBranchId)}

                        {/* Stock info */}
                        {selectedProductId && fromBranchId && toBranchId && (
                            <View style={styles.stockInfoRow}>
                                <View style={styles.stockInfoCard}>
                                    <Text style={styles.stockInfoLabel}>Source Stock</Text>
                                    <Text style={[styles.stockInfoValue, sourceStock <= 0 && { color: colors.danger }]}>{sourceStock}</Text>
                                </View>
                                <FontAwesome name="long-arrow-right" size={16} color={colors.textSecondary} />
                                <View style={styles.stockInfoCard}>
                                    <Text style={styles.stockInfoLabel}>Dest Stock</Text>
                                    <Text style={styles.stockInfoValue}>{destStock}</Text>
                                </View>
                            </View>
                        )}

                        {/* Quantity */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Quantity</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter quantity"
                                placeholderTextColor={colors.textSecondary}
                                value={quantity}
                                onChangeText={setQuantity}
                                keyboardType="numeric"
                            />
                            {qty > sourceStock && sourceStock > 0 && (
                                <Text style={styles.errorText}>Exceeds available stock ({sourceStock})</Text>
                            )}
                        </View>

                        {/* Notes */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Notes (optional)</Text>
                            <TextInput
                                style={[styles.input, { minHeight: 60 }]}
                                placeholder="Reason for transfer..."
                                placeholderTextColor={colors.textSecondary}
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                            />
                        </View>

                        {/* Preview */}
                        {canSubmit && (
                            <View style={styles.previewCard}>
                                <Text style={styles.previewTitle}>Preview</Text>
                                <Text style={styles.previewText}>
                                    {allBranches.find(b => b.id === fromBranchId)?.name}: {sourceStock} → {sourceStock - qty}
                                </Text>
                                <Text style={styles.previewText}>
                                    {allBranches.find(b => b.id === toBranchId)?.name}: {destStock} → {destStock + qty}
                                </Text>
                            </View>
                        )}

                        {/* Actions */}
                        <View style={styles.actions}>
                            <Pressable style={styles.cancelBtn} onPress={onClose}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                                onPress={handleTransfer}
                                disabled={!canSubmit || isTransferring}
                            >
                                {isTransferring ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <FontAwesome name="exchange" size={14} color="#fff" />
                                        <Text style={styles.submitBtnText}>Transfer</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        backgroundColor: 'transparent',
        borderRadius: 16,
        width: '100%',
        maxHeight: '90%',
        padding: 20,

    },
    modalWeb: {
        maxWidth: 480,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    subtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    closeBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'transparent',
    },

    // Fields
    fieldGroup: {
        marginBottom: 14,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {

        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: colors.text,
        backgroundColor: 'transparent',
    },

    // Product selector
    productSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,

        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: 'transparent',
    },
    productSelectorText: {
        fontSize: 15,
        color: colors.text,
        flex: 1,
    },
    searchSection: {

        borderRadius: 10,
        marginTop: 6,
        overflow: 'hidden',
    },
    searchInput: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        fontSize: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        color: colors.text,
        backgroundColor: colors.card,
    },
    productItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
    },
    productItemName: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
        flex: 1,
    },
    productItemSku: {
        fontSize: 12,
        color: colors.textSecondary,
    },

    // Branch picker
    branchRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    branchChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: 'transparent',

    },
    branchChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    branchChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    branchChipTextActive: {
        color: '#fff',
    },

    // Arrow
    arrowContainer: {
        alignItems: 'center',
        marginVertical: 4,
    },

    // Stock info
    stockInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 14,
        paddingVertical: 10,
        backgroundColor: 'transparent',
        borderRadius: 10,

    },
    stockInfoCard: {
        alignItems: 'center',
    },
    stockInfoLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    stockInfoValue: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
    },

    // Preview
    previewCard: {
        backgroundColor: colors.primary + '10',
        borderRadius: 10,
        padding: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: colors.primary + '20',
    },
    previewTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    previewText: {
        fontSize: 13,
        color: colors.textSecondary,
    },

    // Error
    errorText: {
        fontSize: 12,
        color: colors.danger,
        marginTop: 4,
    },

    // Actions
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,

        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    submitBtn: {
        flex: 1,
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    submitBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
});
