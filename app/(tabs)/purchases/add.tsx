import { AppButton } from '@/components/ui/AppButton';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { usePurchases } from '@/hooks/usePurchases';
import { useSuppliers } from '@/hooks/useSuppliers';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PurchaseLineItem {
    product_id: string;
    product_name: string;
    quantity: string;
    unit_cost: string;
}

export default function AddPurchaseScreen() {
    const { colors, theme } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = React.useMemo(() => createStyles(colors, insets), [colors, insets]);
    const router = useRouter();
    const { company, allBranches } = useAuth();
    const { showFeedback } = useFeedback();
    const { suppliers } = useSuppliers();
    const { createPurchase, isCreating } = usePurchases();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web' && width >= 768;

    // Form State
    const [branchId, setBranchId] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [amountPaid, setAmountPaid] = useState('');

    // Line Items
    const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([]);

    // Product Search Modal
    const [showProductModal, setShowProductModal] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Auto-select first branch
    useEffect(() => {
        if (!branchId && allBranches?.length) {
            setBranchId(allBranches[0].id);
        }
    }, [allBranches]);

    // Calculate total
    const totalAmount = useMemo(() => {
        return lineItems.reduce((sum, item) => {
            const qty = parseFloat(item.quantity) || 0;
            const cost = parseFloat(item.unit_cost) || 0;
            return sum + qty * cost;
        }, 0);
    }, [lineItems]);

    // Auto-set amount paid for cash
    useEffect(() => {
        if (paymentMethod === 'cash') {
            setAmountPaid(totalAmount.toFixed(2));
        }
    }, [totalAmount, paymentMethod]);

    // Search Products
    const searchProducts = async (query: string) => {
        setProductSearch(query);
        if (!query || query.length < 2 || !company?.id) {
            setProductResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('id, name, primary_sku, cost_price, unit')
                .eq('company_id', company.id)
                .ilike('name', `%${query}%`)
                .limit(20);
            if (!error) setProductResults(data || []);
        } catch (e) {
            console.error(e);
        }
        setSearchLoading(false);
    };

    const addLineItem = (product: any) => {
        // Don't add duplicates
        if (lineItems.find(li => li.product_id === product.id)) {
            showFeedback('warning', 'Already Added', 'This product is already in the list');
            setShowProductModal(false);
            return;
        }
        setLineItems(prev => [...prev, {
            product_id: product.id,
            product_name: product.name,
            quantity: '1',
            unit_cost: (product.cost_price || 0).toString(),
        }]);
        setShowProductModal(false);
        setProductSearch('');
        setProductResults([]);
    };

    const updateLineItem = (index: number, field: 'quantity' | 'unit_cost', value: string) => {
        setLineItems(prev => prev.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ));
    };

    const removeLineItem = (index: number) => {
        setLineItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!branchId) { showFeedback('error', 'Error', 'Please select a branch'); return; }
        if (!supplierId) { showFeedback('error', 'Error', 'Please select a supplier'); return; }
        if (lineItems.length === 0) { showFeedback('error', 'Error', 'Please add at least one product'); return; }

        const hasInvalidItems = lineItems.some(li => !parseFloat(li.quantity) || !parseFloat(li.unit_cost));
        if (hasInvalidItems) {
            showFeedback('error', 'Error', 'All items must have quantity and cost');
            return;
        }

        try {
            await createPurchase({
                supplier_id: supplierId,
                purchase_date: new Date(purchaseDate),
                invoice_number: invoiceNumber,
                total_amount: totalAmount,
                amount_paid: parseFloat(amountPaid) || 0,
                payment_method: paymentMethod,
                notes: notes || '',
                items: lineItems.map(li => ({
                    product_id: li.product_id,
                    quantity: parseFloat(li.quantity),
                    unit_cost: parseFloat(li.unit_cost),
                })),
            });
            showFeedback('success', 'Success', 'Purchase recorded successfully');
            router.back();
        } catch (err: any) {
            showFeedback('error', 'Error', err.message || 'Failed to create purchase');
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={theme === "dark" ? Gradients.authDark : Gradients.authLight}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            {/* Header */}
            <View style={[styles.header, isWeb && styles.headerWeb]}>
                <View style={styles.headerLeft}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <FontAwesome name="arrow-left" size={18} color={theme === 'dark' ? '#fff' : '#1E293B'} />
                    </Pressable>
                    <Text style={styles.headerTitle}>New Purchase</Text>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, isWeb && styles.contentWeb]} showsVerticalScrollIndicator={false}>
                {/* Branch & Supplier */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Purchase Details</Text>

                    <AppSelect
                        label="Branch *"
                        options={allBranches?.filter((b: any) => b.status === 'active').map((b: any) => ({
                            label: b.name,
                            value: b.id
                        })) || []}
                        selectedValue={branchId}
                        onValueChange={setBranchId}
                        placeholder="Select Branch..."
                    />

                    <AppSelect
                        label="Supplier *"
                        options={suppliers?.map((s: any) => ({
                            label: s.name,
                            value: s.id
                        })) || []}
                        selectedValue={supplierId}
                        onValueChange={setSupplierId}
                        placeholder="Select Supplier..."
                    />

                    <View style={styles.row}>
                        <View style={styles.half}>
                            <AppTextInput
                                label="Purchase Date"
                                value={purchaseDate}
                                onChangeText={setPurchaseDate}
                                placeholder="YYYY-MM-DD"
                            />
                        </View>
                        <View style={styles.half}>
                            <AppTextInput
                                label="Invoice Number"
                                value={invoiceNumber}
                                onChangeText={setInvoiceNumber}
                                placeholder="Optional"
                            />
                        </View>
                    </View>
                </View>

                {/* Products */}
                <View style={styles.card}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Products</Text>
                        <AppButton
                            title="+ Add Product"
                            onPress={() => setShowProductModal(true)}
                            variant="outline"
                            style={{ paddingHorizontal: 14, paddingVertical: 6 }}
                        />
                    </View>

                    {lineItems.length === 0 ? (
                        <View style={styles.emptyItems}>
                            <FontAwesome name="cube" size={24} color={colors.textSecondary} />
                            <Text style={styles.emptyItemsText}>No products added yet</Text>
                        </View>
                    ) : (
                        lineItems.map((item, index) => (
                            <View key={item.product_id} style={styles.lineItem}>
                                <View style={styles.lineItemHeader}>
                                    <Text style={styles.lineItemName} numberOfLines={1}>{item.product_name}</Text>
                                    <Pressable onPress={() => removeLineItem(index)} hitSlop={8}>
                                        <FontAwesome name="times-circle" size={18} color="#EF4444" />
                                    </Pressable>
                                </View>
                                <View style={styles.lineItemFields}>
                                    <View style={{ flex: 1 }}>
                                        <AppTextInput
                                            label="Qty"
                                            value={item.quantity}
                                            onChangeText={(v) => updateLineItem(index, 'quantity', v)}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <AppTextInput
                                            label="Unit Cost"
                                            value={item.unit_cost}
                                            onChangeText={(v) => updateLineItem(index, 'unit_cost', v)}
                                            keyboardType="numeric"
                                            prefix="$"
                                        />
                                    </View>
                                    <View style={styles.lineTotal}>
                                        <Text style={styles.lineTotalLabel}>Total</Text>
                                        <Text style={styles.lineTotalValue}>
                                            ${((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}

                    {/* Grand Total */}
                    {lineItems.length > 0 && (
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total Amount</Text>
                            <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
                        </View>
                    )}
                </View>

                {/* Payment */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Payment</Text>
                    <View style={[styles.row, { zIndex: 10 }]}>
                        <View style={[styles.half, { zIndex: 11 }]}>
                            <AppSelect
                                label="Payment Method"
                                options={[
                                    { label: 'Cash (Full)', value: 'cash' },
                                    { label: 'Credit (Pay Later)', value: 'credit' },
                                    { label: 'Bank Transfer', value: 'bank' }
                                ]}
                                selectedValue={paymentMethod}
                                onValueChange={(v) => {
                                    setPaymentMethod(v);
                                    if (v === 'credit') setAmountPaid('0');
                                }}
                            />
                        </View>
                        <View style={styles.half}>
                            <AppTextInput
                                label="Amount Paid"
                                value={amountPaid}
                                onChangeText={setAmountPaid}
                                keyboardType="numeric"
                                prefix="$"
                            />
                        </View>
                    </View>

                    <AppTextInput
                        label="Notes"
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={2}
                        placeholder="Optional notes about this purchase"
                        style={{ height: 60 }}
                    />
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Sticky Footer */}
            <View style={styles.footer}>
                <View style={styles.footerTotal}>
                    <Text style={styles.footerTotalLabel}>Total</Text>
                    <Text style={styles.footerTotalValue}>${totalAmount.toFixed(2)}</Text>
                </View>
                <AppButton
                    title="Confirm Purchase"
                    onPress={handleSubmit}
                    loading={isCreating}
                    style={{ flex: 1 }}
                />
            </View>

            {/* Product Search Modal */}
            <Modal visible={showProductModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isWeb && styles.modalContentWeb]}>
                        <LinearGradient
                            colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Product</Text>
                            <Pressable onPress={() => { setShowProductModal(false); setProductSearch(''); setProductResults([]); }}>
                                <FontAwesome name="times" size={20} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <AppTextInput
                            placeholder="Search products..."
                            value={productSearch}
                            onChangeText={searchProducts}
                            autoFocus
                            icon="search"
                        />

                        <FlatList
                            data={productResults}
                            keyExtractor={(item) => item.id}
                            style={{ maxHeight: 300 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.productResult}
                                    onPress={() => addLineItem(item)}
                                >
                                    <View>
                                        <Text style={styles.productResultName}>{item.name}</Text>
                                        <Text style={styles.productResultSku}>{item.primary_sku} · {item.unit}</Text>
                                    </View>
                                    <Text style={styles.productResultCost}>${(item.cost_price || 0).toFixed(2)}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                productSearch.length >= 2 ? (
                                    <Text style={styles.noResults}>{searchLoading ? 'Searching...' : 'No products found'}</Text>
                                ) : (
                                    <Text style={styles.noResults}>Type at least 2 characters to search</Text>
                                )
                            }
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 16,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    headerWeb: { paddingTop: 20 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },

    // Content
    content: { padding: 16 },
    contentWeb: { maxWidth: 800, alignSelf: 'center', width: '100%' },

    // Card
    card: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

    // Form
    label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
    pickerWrapper: {

        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        height: 52,
        justifyContent: 'center',
        marginBottom: 16
    },
    picker: { height: 52, width: '100%' },
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },

    // Line Items
    lineItem: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
    },
    lineItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    lineItemName: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
    lineItemFields: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
    lineTotal: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
    lineTotalLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
    lineTotalValue: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 2 },

    emptyItems: { alignItems: 'center', paddingVertical: 32, gap: 10 },
    emptyItemsText: { fontSize: 14, color: colors.textSecondary },

    // Total
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingTop: 16,
        marginTop: 6
    },
    totalLabel: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
    totalValue: { fontSize: 24, fontWeight: '900', color: colors.text },

    // Footer
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingBottom: Platform.OS === 'web' ? 16 : Math.max(insets.bottom, 16) + 110,
    },
    footerTotal: { alignItems: 'center' },
    footerTotalLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
    footerTotalValue: { fontSize: 20, fontWeight: '900', color: colors.text },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: 'transparent',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    modalContentWeb: {
        maxWidth: 500,
        alignSelf: 'center',
        width: '95%',
        borderRadius: 24,
        marginBottom: 'auto',
        marginTop: 'auto'
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    productResult: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    productResultName: { fontSize: 15, fontWeight: '700', color: colors.text },
    productResultSku: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    productResultCost: { fontSize: 16, fontWeight: '800', color: colors.primary },
    noResults: { textAlign: 'center', color: colors.textSecondary, paddingVertical: 32, fontSize: 14, fontWeight: '600' },
});
