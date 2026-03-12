import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useBranches } from '@/hooks/useBranches';
import { useCreateReturn } from '@/hooks/useInventory';
import { useProducts } from '@/hooks/useProducts';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const isWeb = Platform.OS === 'web';

interface ReturnModalProps {
    visible: boolean;
    type: 'customer_return' | 'supplier_return';
    /** Pre-fill if opened from a specific product detail */
    productId?: string;
    productName?: string;
    referenceId?: string;
    onClose: () => void;
}

const RETURN_REASONS = {
    customer_return: ['Defective item', 'Wrong item', 'Customer changed mind', 'Expired', 'Other'],
    supplier_return: ['Defective batch', 'Wrong item received', 'Overstocked', 'Expired on arrival', 'Other'],
};

export function ReturnModal({
    visible,
    type,
    productId: preProductId,
    productName: preProductName,
    referenceId,
    onClose,
}: ReturnModalProps) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { branch } = useAuth();
    const { branches = [] } = useBranches();
    const { data: products = [] } = useProducts();
    const createReturn = useCreateReturn();

    const [selectedProductId, setSelectedProductId] = useState(preProductId ?? '');
    const [selectedBranchId, setSelectedBranchId] = useState(branch?.id ?? branches[0]?.id ?? '');
    const [quantity, setQuantity] = useState('1');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [productSearch, setProductSearch] = useState(preProductName ?? '');
    const [showProductList, setShowProductList] = useState(!preProductId);
    const [error, setError] = useState('');

    const title = type === 'customer_return' ? 'Customer Return' : 'Supplier Return';
    const icon = type === 'customer_return' ? 'undo' : 'reply';
    const accentColor = type === 'customer_return' ? '#06B6D4' : '#F97316';

    const filteredProducts = products.filter(
        p => p.name.toLowerCase().includes(productSearch.toLowerCase())
    );

    const selectedProduct = products.find(p => p.id === selectedProductId);
    const reasons = RETURN_REASONS[type];

    const handleConfirm = async () => {
        setError('');
        const qty = parseInt(quantity, 10);
        if (!selectedProductId) return setError('Please select a product');
        if (!selectedBranchId) return setError('Please select a branch');
        if (!qty || qty < 1) return setError('Quantity must be at least 1');
        if (!reason) return setError('Please select a reason');

        try {
            await createReturn.mutateAsync({
                type,
                productId: selectedProductId,
                branchId: selectedBranchId,
                quantity: qty,
                reason,
                referenceId,
                notes,
            });
            Alert.alert('Success', `${title} recorded. Stock has been updated.`);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to record return');
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={[styles.modal, { overflow: 'hidden' }]} onPress={() => { }}>
                    {/* Background Gradient */}
                    <LinearGradient
                        colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />

                    {/* Header */}
                    <View style={[styles.modalHeader, { borderBottomColor: `${accentColor}30` }]}>
                        <View style={[styles.headerIcon, { backgroundColor: `${accentColor}18` }]}>
                            <FontAwesome name={icon as any} size={18} color={accentColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.modalTitle}>{title}</Text>
                            <Text style={styles.modalSub}>
                                {type === 'customer_return'
                                    ? 'Stock will increase at the selected branch'
                                    : 'Returned stock will be added back to inventory'}
                            </Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <FontAwesome name="times" size={16} color={colors.textSecondary} />
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                        {/* Product Selector */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Product</Text>
                            {selectedProduct && !showProductList ? (
                                <Pressable
                                    style={styles.selectedChip}
                                    onPress={() => { setShowProductList(true); setSelectedProductId(''); setProductSearch(''); }}
                                >
                                    <Text style={styles.selectedChipText} numberOfLines={1}>{selectedProduct.name}</Text>
                                    <FontAwesome name="times-circle" size={14} color={colors.textSecondary} />
                                </Pressable>
                            ) : (
                                <>
                                    <View style={styles.searchBox}>
                                        <FontAwesome name="search" size={13} color={colors.textSecondary} />
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search products…"
                                            value={productSearch}
                                            onChangeText={setProductSearch}
                                            placeholderTextColor={colors.textSecondary}
                                        />
                                    </View>
                                    <View style={styles.productList}>
                                        {filteredProducts.slice(0, 5).map(p => (
                                            <Pressable
                                                key={p.id}
                                                style={styles.productOption}
                                                onPress={() => {
                                                    setSelectedProductId(p.id);
                                                    setProductSearch(p.name);
                                                    setShowProductList(false);
                                                }}
                                            >
                                                <Text style={styles.productOptionName}>{p.name}</Text>
                                                <Text style={styles.productOptionStock}>
                                                    Stock: {p.stock}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Branch Selector */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Return to Branch</Text>
                            <View style={styles.branchRow}>
                                {branches.map(b => (
                                    <TouchableOpacity
                                        key={b.id}
                                        style={[
                                            styles.branchChip,
                                            selectedBranchId === b.id && {
                                                backgroundColor: `${accentColor}18`,
                                                borderColor: accentColor,
                                            },
                                        ]}
                                        onPress={() => setSelectedBranchId(b.id)}
                                    >
                                        <Text style={[
                                            styles.branchChipText,
                                            selectedBranchId === b.id && { color: accentColor, fontWeight: '700' },
                                        ]}>
                                            {b.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Quantity */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Quantity</Text>
                            <View style={styles.qtyRow}>
                                <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => setQuantity(q => String(Math.max(1, parseInt(q || '1') - 1)))}
                                >
                                    <Text style={styles.qtyBtnText}>−</Text>
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.qtyInput}
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    keyboardType="number-pad"
                                    selectTextOnFocus
                                    placeholderTextColor={colors.textSecondary}
                                />
                                <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => setQuantity(q => String(parseInt(q || '0') + 1))}
                                >
                                    <Text style={styles.qtyBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Reason */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Reason</Text>
                            <View style={styles.reasonGrid}>
                                {reasons.map(r => (
                                    <TouchableOpacity
                                        key={r}
                                        style={[
                                            styles.reasonChip,
                                            reason === r && {
                                                backgroundColor: `${accentColor}18`,
                                                borderColor: accentColor,
                                            },
                                        ]}
                                        onPress={() => setReason(r)}
                                    >
                                        <Text style={[
                                            styles.reasonChipText,
                                            reason === r && { color: accentColor, fontWeight: '700' },
                                        ]}>
                                            {r}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Notes */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Notes (optional)</Text>
                            <TextInput
                                style={styles.notesInput}
                                placeholder="Additional details…"
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                numberOfLines={2}
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>

                        {error ? (
                            <View style={styles.errorBox}>
                                <FontAwesome name="exclamation-circle" size={14} color={colors.danger} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Pressable style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.confirmBtn, { backgroundColor: accentColor }]}
                            onPress={handleConfirm}
                            disabled={createReturn.isPending}
                        >
                            {createReturn.isPending
                                ? <ActivityIndicator size="small" color="#FFFFFF" />
                                : <Text style={styles.confirmBtnText}>Record Return</Text>
                            }
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        backgroundColor: 'transparent',
        borderRadius: 20,
        width: isWeb ? 480 : '100%',
        maxHeight: '90%',
        overflow: 'hidden',

        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 20,
        borderBottomWidth: 1,
        gap: 12,
    },
    headerIcon: { borderRadius: 12, padding: 10 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    modalSub: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
    closeBtn: { padding: 4 },
    body: { padding: 20, gap: 18 },
    field: { gap: 8 },
    label: { fontSize: 13, fontWeight: '600', color: colors.text },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,

        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: 'transparent',
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.text, outlineWidth: 0 } as any,
    productList: { borderRadius: 10, overflow: 'hidden' },
    productOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
        cursor: 'pointer' as any,
    },
    productOptionName: { fontSize: 13, fontWeight: '500', color: colors.text },
    productOptionStock: { fontSize: 12, color: colors.textSecondary },
    selectedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: colors.primary + '30',
        backgroundColor: colors.primary + '10',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    selectedChipText: { fontSize: 14, fontWeight: '600', color: colors.primary, flex: 1, marginRight: 8 },
    branchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    branchChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,

        backgroundColor: 'transparent',
    },
    branchChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,

        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyBtnText: { fontSize: 20, color: colors.text, fontWeight: '700', lineHeight: 22 },
    qtyInput: {
        width: 80,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,

        borderRadius: 10,
        paddingVertical: 8,
        outlineWidth: 0,
        backgroundColor: colors.card,
    } as any,
    reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    reasonChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,

        backgroundColor: 'transparent',
    },
    reasonChipText: { fontSize: 12, color: colors.textSecondary },
    notesInput: {

        borderRadius: 10,
        padding: 12,
        fontSize: 13,
        color: colors.text,
        minHeight: 60,
        backgroundColor: 'transparent',
        outlineWidth: 0,
    } as any,
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.danger + '15',
        borderWidth: 1,
        borderColor: colors.danger + '40',
        borderRadius: 8,
        padding: 12,
    },
    errorText: { fontSize: 13, color: colors.danger, flex: 1 },
    footer: {
        flexDirection: 'row',
        gap: 10,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,

        backgroundColor: 'transparent',
        alignItems: 'center',
    },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    confirmBtn: {
        flex: 2,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
