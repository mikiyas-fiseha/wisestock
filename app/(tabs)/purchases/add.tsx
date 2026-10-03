import { QuickAddSupplierModal } from '@/components/suppliers/QuickAddSupplierModal';
import { AppButton } from '@/components/ui/AppButton';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Gradients, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { usePurchases } from '@/hooks/usePurchases';
import { useSuppliers } from '@/hooks/useSuppliers';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { formatCurrency } from '@/lib/formatters';
import { pickImage } from '@/lib/imagePicker';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FlatList,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PurchaseLineItem {
    product_id: string;
    product_name: string;
    quantity: string;
    unit_cost: string;
    variant_id?: string | null;
    variant_name?: string | null;
    variants?: { id: string; sku: string; price_override: number; stock: number; attributes?: Record<string, string> }[];
}

export default function AddPurchaseScreen() {
    const { colors, theme } = useTheme();
    const insets = useSafeAreaInsets();
    const isWeb = Platform.OS === 'web';
    const styles = React.useMemo(() => createStyles(colors, insets, theme), [colors, insets, theme]);
    const router = useRouter();
    const { company, allBranches } = useAuth();
    const { showFeedback } = useFeedback();
    const { suppliers } = useSuppliers();
    const { createPurchase, isCreating } = usePurchases();
    const { t, i18n } = useTranslation();

    // Form State
    const [branchId, setBranchId] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [amountPaid, setAmountPaid] = useState('');
    const [receiptUri, setReceiptUri] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Line Items
    const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([]);

    // Product Search Modal
    const [showProductModal, setShowProductModal] = useState(false);
    const [showQuickAddSupplier, setShowQuickAddSupplier] = useState(false);
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

    // Auto-set amount paid
    useEffect(() => {
        if (paymentMethod === 'cash') {
            setAmountPaid(totalAmount > 0 ? totalAmount.toFixed(2) : '');
        } else if (paymentMethod === 'credit') {
            setAmountPaid('0');
        }
    }, [totalAmount, paymentMethod]);

    // Search Products
    const searchProducts = async (query: string) => {
        setProductSearch(query);
        if (!company?.id) return;

        setSearchLoading(true);
        try {
            let queryBuilder = supabase
                .from('products')
                .select('id, name, primary_sku, cost_price, unit, product_variants(id, sku, price_override, stock, attributes)')
                .eq('company_id', company.id)
                .limit(20);

            if (query.trim()) {
                queryBuilder = queryBuilder.ilike('name', `%${query}%`);
            } else {
                queryBuilder = queryBuilder.order('created_at', { ascending: false }).limit(15);
            }

            const { data, error } = await queryBuilder;
            if (!error) setProductResults(data || []);
        } catch (e) {
            console.error(e);
        }
        setSearchLoading(false);
    };

    const addLineItem = (product: any) => {
        if (lineItems.find(li => li.product_id === product.id && !li.variant_id)) {
            showFeedback('warning', t('common.warning', 'Warning'), t('purchases.already_added', 'Product already added'));
            setShowProductModal(false);
            return;
        }
        const variants = product.product_variants || [];
        setLineItems(prev => [...prev, {
            product_id: product.id,
            product_name: product.name,
            quantity: '1',
            unit_cost: (product.cost_price || 0).toString(),
            variant_id: variants.length > 0 ? variants[0].id : null,
            variant_name: variants.length > 0 ? `${product.name} — ${variants[0].sku}` : null,
            variants: variants,
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
        if (isCreating || isUploading) return;

        if (!branchId) { showFeedback('error', t('common.error', 'Error'), t('purchases.select_branch', 'Please select a branch')); return; }
        if (!supplierId) { showFeedback('error', t('common.error', 'Error'), t('purchases.select_supplier', 'Please select a supplier')); return; }
        if (lineItems.length === 0) { showFeedback('error', t('common.error', 'Error'), t('purchases.add_at_least_one', 'Please add at least one product')); return; }

        const hasInvalidItems = lineItems.some(li => !parseFloat(li.quantity) || !parseFloat(li.unit_cost));
        if (hasInvalidItems) {
            showFeedback('error', t('common.error', 'Error'), t('purchases.invalid_items', 'Please ensure all items have valid quantity and cost'));
            return;
        }

        const parsedAmountPaid = parseFloat(amountPaid) || 0;
        if (parsedAmountPaid > totalAmount) {
            showFeedback('error', t('common.error', 'Error'), t('purchases.amount_exceeds', 'Amount paid cannot exceed total purchase cost'));
            return;
        }

        try {
            setIsUploading(true);
            let receiptUrl = null;
            if (receiptUri) {
                try {
                    receiptUrl = await uploadImageToCloudinary(receiptUri);
                } catch (e: any) {
                    showFeedback('error', 'Upload Failed', e.message);
                    setIsUploading(false);
                    return;
                }
            }

            const finalInvoiceNumber = invoiceNumber.trim() || `PUR-${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

            await createPurchase({
                branch_id: branchId || undefined,
                supplier_id: supplierId,
                purchase_date: new Date(purchaseDate),
                invoice_number: finalInvoiceNumber,
                total_amount: totalAmount,
                amount_paid: parseFloat(amountPaid) || 0,
                payment_method: paymentMethod,
                notes: notes || '',
                items: lineItems.map(li => ({
                    product_id: li.product_id,
                    variant_id: li.variant_id || null,
                    quantity: parseFloat(li.quantity),
                    unit_cost: parseFloat(li.unit_cost),
                })),
                receipt_url: receiptUrl,
            });

            showFeedback('success', t('common.success', 'Success'), t('purchases.purchase_success', 'Purchase recorded successfully!'));
            setIsUploading(false);
            router.back();
        } catch (err: any) {
            setIsUploading(false);
            showFeedback('error', t('common.error', 'Error'), err.message || t('purchases.purchase_error', 'Failed to record purchase'));
        }
    };

    const calculatedAmountPaid = parseFloat(amountPaid) || 0;
    const remainingAmount = Math.max(0, totalAmount - calculatedAmountPaid);
    const isFullyPaid = calculatedAmountPaid >= totalAmount && totalAmount > 0;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <ResponsiveContainer>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>{t('purchases.new_purchase', 'New Purchase')}</Text>
                        <Text style={styles.headerSub}>{t('purchases.subtitle', 'Record supplier order and restock inventory')}</Text>
                    </View>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Section 1: Order Details */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardIconBadge}>
                                <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                            </View>
                            <Text style={styles.cardTitle}>{t('purchases.purchase_details', 'Order Details')}</Text>
                        </View>

                        <AppSelect
                            label={`${t('inventory.branch', 'Branch')} *`}
                            options={allBranches?.filter((b: any) => b.status === 'active').map((b: any) => ({
                                label: b.name,
                                value: b.id,
                            })) || []}
                            selectedValue={branchId}
                            onValueChange={setBranchId}
                            placeholder={t('common.select_branch', 'Select Destination Branch')}
                            containerStyle={{ zIndex: 100 }}
                        />

                        {/* Supplier Row with Quick Add */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 16, zIndex: 90 }}>
                            <View style={{ flex: 1, marginBottom: 0 }}>
                                <AppSelect
                                    label={`${t('purchases.supplier', 'Supplier')} *`}
                                    options={suppliers?.map((s: any) => ({
                                        label: s.name,
                                        value: s.id,
                                    })) || []}
                                    selectedValue={supplierId}
                                    onValueChange={setSupplierId}
                                    placeholder={t('common.select_supplier', 'Select Supplier')}
                                    containerStyle={{ marginBottom: 0 }}
                                />
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowQuickAddSupplier(true)}
                                style={styles.quickAddBtn}
                            >
                                <Ionicons name="person-add-outline" size={18} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.half}>
                                <AppTextInput
                                    label={t('purchases.purchase_date', 'Purchase Date')}
                                    value={purchaseDate}
                                    onChangeText={setPurchaseDate}
                                    placeholder="YYYY-MM-DD"
                                    icon="calendar"
                                />
                            </View>
                            <View style={styles.half}>
                                <AppTextInput
                                    label={t('purchases.invoice_number', 'Invoice / Bill #')}
                                    value={invoiceNumber}
                                    onChangeText={setInvoiceNumber}
                                    placeholder="e.g. INV-9024"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Section 2: Products Line Items */}
                    <View style={styles.card}>
                        <View style={styles.cardHeaderBetween}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={styles.cardIconBadge}>
                                    <Ionicons name="cube-outline" size={16} color={colors.primary} />
                                </View>
                                <Text style={styles.cardTitle}>{t('inventory.products', 'Purchased Items')}</Text>
                            </View>
                            <AppButton
                                title={`+ ${t('purchases.add_product', 'Add Product')}`}
                                onPress={() => {
                                    setShowProductModal(true);
                                    searchProducts('');
                                }}
                                variant="outline"
                                size="sm"
                            />
                        </View>

                        {lineItems.length === 0 ? (
                            <View style={styles.emptyItemsBox}>
                                <View style={styles.emptyIconCircle}>
                                    <Ionicons name="cart-outline" size={32} color={colors.textSecondary} />
                                </View>
                                <Text style={styles.emptyItemsTitle}>{t('purchases.no_products', 'No items added yet')}</Text>
                                <Text style={styles.emptyItemsSub}>Search your catalog to add restock line items.</Text>
                            </View>
                        ) : (
                            lineItems.map((item, index) => {
                                const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0);
                                return (
                                    <View key={`${item.product_id}-${index}`} style={styles.lineItemCard}>
                                        <View style={styles.lineItemTop}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.lineItemTitle}>{item.product_name}</Text>
                                                {item.variants && item.variants.length > 0 && (
                                                    <View style={styles.variantChipRow}>
                                                        {item.variants.map(v => (
                                                            <TouchableOpacity
                                                                key={v.id}
                                                                onPress={() => setLineItems(prev => prev.map((li, i) =>
                                                                    i === index ? { ...li, variant_id: v.id, unit_cost: v.price_override > 0 ? v.price_override.toString() : li.unit_cost } : li
                                                                ))}
                                                                style={[
                                                                    styles.variantChip,
                                                                    item.variant_id === v.id && styles.variantChipActive,
                                                                ]}
                                                            >
                                                                <Text style={[styles.variantChipText, item.variant_id === v.id && styles.variantChipTextActive]}>
                                                                    {v.sku}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                            <TouchableOpacity onPress={() => removeLineItem(index)} style={styles.removeBtn}>
                                                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.lineInputsRow}>
                                            <View style={{ flex: 1 }}>
                                                <AppTextInput
                                                    label={t('inventory.qty', 'Quantity')}
                                                    value={item.quantity}
                                                    onChangeText={(v) => updateLineItem(index, 'quantity', v)}
                                                    keyboardType="numeric"
                                                    containerStyle={{ marginBottom: 0 }}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <AppTextInput
                                                    label={t('purchases.unit_cost', 'Unit Cost')}
                                                    value={item.unit_cost}
                                                    onChangeText={(v) => updateLineItem(index, 'unit_cost', v)}
                                                    keyboardType="numeric"
                                                    prefix={i18n.language !== 'am' ? (company?.currency || '$') : undefined}
                                                    suffix={i18n.language === 'am' ? 'ብር' : undefined}
                                                    containerStyle={{ marginBottom: 0 }}
                                                />
                                            </View>
                                            <View style={styles.itemTotalBox}>
                                                <Text style={styles.itemTotalLabel}>{t('common.total', 'Total')}</Text>
                                                <Text style={styles.itemTotalValue}>{formatCurrency(itemTotal)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )}

                        {lineItems.length > 0 && (
                            <View style={styles.grandTotalBar}>
                                <Text style={styles.grandTotalLabel}>{t('purchases.subtotal', 'Order Subtotal')}</Text>
                                <Text style={styles.grandTotalValue}>{formatCurrency(totalAmount)}</Text>
                            </View>
                        )}
                    </View>

                    {/* Section 3: Payment & Settlement */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardIconBadge}>
                                <Ionicons name="card-outline" size={16} color={colors.primary} />
                            </View>
                            <Text style={styles.cardTitle}>{t('purchases.payment', 'Payment & Settlement')}</Text>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.half}>
                                <AppSelect
                                    label={t('purchases.payment_method', 'Payment Method')}
                                    options={[
                                        { label: t('common.cash', 'Cash Payment'), value: 'cash' },
                                        { label: t('common.bank', 'Bank Transfer'), value: 'bank' },
                                        { label: t('common.credit', 'Credit (Pay Later)'), value: 'credit' },
                                    ]}
                                    selectedValue={paymentMethod}
                                    onValueChange={setPaymentMethod}
                                />
                            </View>
                            <View style={styles.half}>
                                <AppTextInput
                                    label={t('purchases.amount_paid', 'Amount Paid')}
                                    value={amountPaid}
                                    onChangeText={(text) => {
                                        if (text === '') {
                                            setAmountPaid('');
                                            return;
                                        }
                                        const val = parseFloat(text);
                                        if (!isNaN(val) && val > totalAmount) {
                                            setAmountPaid(totalAmount.toFixed(2));
                                        } else {
                                            setAmountPaid(text);
                                        }
                                    }}
                                    keyboardType="numeric"
                                    prefix={i18n.language !== 'am' ? (company?.currency || '$') : undefined}
                                    suffix={i18n.language === 'am' ? 'ብር' : undefined}
                                    editable={paymentMethod !== 'credit'}
                                />
                            </View>
                        </View>

                        {/* Status / Balance Badges */}
                        <View style={styles.settlementStatusRow}>
                            <View style={styles.settlementBadge}>
                                <Text style={styles.settlementBadgeLabel}>{t('purchases.payment_status', 'Status')}</Text>
                                <View style={[styles.statusIndicatorPill, isFullyPaid ? styles.statusPillPaid : styles.statusPillPartial]}>
                                    <View style={[styles.statusDot, { backgroundColor: isFullyPaid ? colors.success : colors.warning }]} />
                                    <Text style={[styles.statusText, { color: isFullyPaid ? colors.success : colors.warning }]}>
                                        {isFullyPaid ? t('purchases.paid', 'Fully Paid') : t('purchases.partial', 'Partial / Due')}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.settlementBadge}>
                                <Text style={styles.settlementBadgeLabel}>{t('purchases.remaining_balance', 'Balance Due')}</Text>
                                <Text style={[styles.balanceDueValue, { color: remainingAmount > 0 ? colors.danger : colors.text }]}>
                                    {formatCurrency(remainingAmount)}
                                </Text>
                            </View>
                        </View>

                        {/* Receipt Upload Trigger */}
                        <TouchableOpacity
                            style={[styles.receiptTrigger, receiptUri ? styles.receiptTriggerActive : null]}
                            onPress={async () => {
                                const uri = await pickImage();
                                if (uri) setReceiptUri(uri);
                            }}
                        >
                            <Ionicons name="receipt-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                            <Text style={styles.receiptTriggerText}>
                                {receiptUri ? t('purchases.receipt_attached', 'Receipt Attached ✓') : t('purchases.attach_receipt', 'Attach Invoice / Payment Proof')}
                            </Text>
                            {receiptUri && (
                                <TouchableOpacity onPress={() => setReceiptUri(null)} hitSlop={10} style={{ padding: 4 }}>
                                    <Ionicons name="close-circle" size={20} color={colors.danger} />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>

                        <AppTextInput
                            label={t('common.notes', 'Notes & Terms')}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={2}
                            placeholder={t('purchases.notes_placeholder', 'Add optional delivery notes or reference info...')}
                            style={{ height: 60 }}
                        />
                    </View>

                    <View style={{ height: 90 }} />
                </ScrollView>

                {/* Floating Bottom Settlement Bar */}
                <View style={styles.bottomBar}>
                    <View style={styles.bottomTotalGroup}>
                        <Text style={styles.bottomTotalLabel}>{t('purchases.grand_total', 'GRAND TOTAL')}</Text>
                        <Text style={styles.bottomTotalValue}>{formatCurrency(totalAmount)}</Text>
                    </View>
                    <AppButton
                        title={t('purchases.confirm_purchase', 'Confirm & Restock')}
                        onPress={handleSubmit}
                        loading={isCreating || isUploading}
                        style={{ flex: 1 }}
                        size="lg"
                    />
                </View>

                {/* Modern Product Catalog Search Modal */}
                <Modal visible={showProductModal} animationType="fade" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalCard, isWeb && styles.modalCardWeb]}>
                            <View style={styles.modalHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="search-outline" size={20} color={colors.primary} />
                                    <Text style={styles.modalTitle}>{t('purchases.select_product', 'Add Product to Order')}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => { setShowProductModal(false); setProductSearch(''); setProductResults([]); }}
                                    style={styles.modalCloseBtn}
                                >
                                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <AppTextInput
                                placeholder={t('inventory.search_products', 'Search product by name or SKU...')}
                                value={productSearch}
                                onChangeText={searchProducts}
                                autoFocus
                            />

                            <FlatList
                                data={productResults}
                                keyExtractor={(item) => item.id}
                                style={{ maxHeight: 320 }}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.productRow}
                                        onPress={() => addLineItem(item)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.productRowName}>{item.name}</Text>
                                            <Text style={styles.productRowSku}>
                                                SKU: {item.primary_sku || 'N/A'} {item.unit ? `· ${item.unit}` : ''}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end', gap: 2 }}>
                                            <Text style={styles.productRowCost}>{formatCurrency(item.cost_price || 0)}</Text>
                                            <Text style={styles.productRowCostSub}>Cost / unit</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    searchLoading ? (
                                        <View style={{ padding: 24, alignItems: 'center' }}>
                                            <Text style={styles.modalEmptyText}>{t('common.loading', 'Searching products...')}</Text>
                                        </View>
                                    ) : (
                                        <View style={{ padding: 24, alignItems: 'center' }}>
                                            <Text style={styles.modalEmptyText}>{t('purchases.no_products_found', 'No products found matching query.')}</Text>
                                        </View>
                                    )
                                }
                            />
                        </View>
                    </View>
                </Modal>

                {/* Quick Add Supplier Modal */}
                <QuickAddSupplierModal
                    visible={showQuickAddSupplier}
                    onClose={() => setShowQuickAddSupplier(false)}
                    onSuccess={(newSupplier) => {
                        setSupplierId(newSupplier.id);
                        showFeedback('success', 'Supplier Added', `${newSupplier.name} selected`);
                    }}
                />
            </ResponsiveContainer>
        </View>
    );
}

const createStyles = (colors: any, insets: any, theme: string) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? insets.top + 8 : 24,
        paddingBottom: 16,
        gap: 14,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: Layout.borderRadius.md,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
    headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 60 },
    card: {
        backgroundColor: theme === 'dark' ? 'rgba(17, 24, 39, 0.75)' : '#FFFFFF',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
        borderWidth: 1,
        borderRadius: Layout.borderRadius.lg,
        padding: 20,
        marginBottom: 16,
        ...Layout.shadows.small,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    cardHeaderBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardIconBadge: {
        width: 28,
        height: 28,
        borderRadius: Layout.borderRadius.sm,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
    quickAddBtn: {
        width: 46,
        height: 46,
        borderRadius: Layout.borderRadius.md,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
    },
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },
    emptyItemsBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : colors.border,
        borderRadius: Layout.borderRadius.md,
    },
    emptyIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    emptyItemsTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    emptyItemsSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
    lineItemCard: {
        backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.65)' : '#F8FAFC',
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : colors.border,
        borderRadius: Layout.borderRadius.md,
        padding: 14,
        marginBottom: 10,
    },
    lineItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    lineItemTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    variantChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    variantChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: Layout.borderRadius.xs,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: 'transparent',
    },
    variantChipActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    variantChipText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
    variantChipTextActive: { color: colors.primary },
    removeBtn: { padding: 6, borderRadius: 6 },
    lineInputsRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
    itemTotalBox: { alignItems: 'flex-end', justifyContent: 'flex-end', paddingBottom: 10, minWidth: 80 },
    itemTotalLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
    itemTotalValue: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 3, fontVariant: ['tabular-nums'] },
    grandTotalBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        marginTop: 8,
        borderTopWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border,
    },
    grandTotalLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    grandTotalValue: { fontSize: 20, fontWeight: '900', color: colors.primary, fontVariant: ['tabular-nums'] },
    settlementStatusRow: { flexDirection: 'row', gap: 12, marginVertical: 14 },
    settlementBadge: {
        flex: 1,
        backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.65)' : '#F8FAFC',
        borderRadius: Layout.borderRadius.md,
        padding: 12,
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    settlementBadgeLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 6 },
    statusIndicatorPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: Layout.borderRadius.sm,
        alignSelf: 'flex-start',
    },
    statusPillPaid: { backgroundColor: `${colors.success}18` },
    statusPillPartial: { backgroundColor: `${colors.warning}18` },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    balanceDueValue: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
    receiptTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.65)' : '#F8FAFC',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: Layout.borderRadius.md,
        padding: 12,
        marginBottom: 16,
    },
    receiptTriggerActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    receiptTriggerText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: theme === 'dark' ? 'rgba(11, 15, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderTopWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.border,
        ...Layout.shadows.large,
    },
    bottomTotalGroup: { gap: 2 },
    bottomTotalLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 },
    bottomTotalValue: { fontSize: 20, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalCard: {
        backgroundColor: theme === 'dark' ? '#111827' : '#FFFFFF',
        borderRadius: Layout.borderRadius.xl,
        padding: 24,
        width: '100%',
        maxWidth: 500,
        borderWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : colors.border,
        ...Layout.shadows.large,
    },
    modalCardWeb: { maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    modalCloseBtn: { padding: 4, borderRadius: Layout.borderRadius.sm },
    productRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    productRowName: { fontSize: 14, fontWeight: '700', color: colors.text },
    productRowSku: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    productRowCost: { fontSize: 15, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] },
    productRowCostSub: { fontSize: 10, color: colors.textSecondary },
    modalEmptyText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
});
