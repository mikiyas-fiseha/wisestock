import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useBranches } from '@/hooks/useBranches';
import {
    useCreatePurchaseReturn,
    useCreateSaleReturn,
    type ReturnItemInput,
} from '@/hooks/useReturns';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceItem {
    product_id: string;
    variant_id?: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;   // for sale items
    unit_cost: number;    // for purchase items
}

interface ReturnItemState extends InvoiceItem {
    returnQty: number;
    selected: boolean;
    currentStock: number; // physically in branch
}

export interface ReturnModalProps {
    visible: boolean;
    /** 'customer_return' = opened from sales, 'supplier_return' = opened from purchases */
    type: 'customer_return' | 'supplier_return';
    /** UUID of the original sale or purchase */
    referenceId?: string;
    /** Human-readable label like "Sale #ABC — John — $150.00" */
    referenceLabel?: string;
    onClose: () => void;
    /** Called after a successful return is recorded */
    onSuccess?: () => void;
}

const REASONS = {
    customer_return: ['Defective item', 'Wrong item', 'Customer changed mind', 'Expired', 'Other'],
    supplier_return: ['Defective batch', 'Wrong item received', 'Overstocked', 'Expired on arrival', 'Other'],
};

const REFUND_METHODS_CUSTOMER: { value: 'cash' | 'ar_adjustment' | 'store_credit'; label: string; desc: string; icon: string }[] = [
    { value: 'cash',         label: 'Cash Refund',       desc: 'Refund cash to customer',            icon: 'money' },
    { value: 'ar_adjustment',label: 'Reduce Balance',    desc: 'Customer owed less on account',      icon: 'minus-circle' },
    { value: 'store_credit', label: 'Store Credit',      desc: 'Issue credit for future purchases',  icon: 'gift' },
];

const REFUND_METHODS_SUPPLIER: { value: 'cash' | 'ap_adjustment'; label: string; desc: string; icon: string }[] = [
    { value: 'cash',         label: 'Cash Back',         desc: 'Supplier refunds cash',              icon: 'money' },
    { value: 'ap_adjustment',label: 'Reduce Payable',    desc: 'Reduce amount owed to supplier',     icon: 'minus-circle' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ReturnModal({
    visible,
    type,
    referenceId,
    referenceLabel,
    onClose,
    onSuccess,
}: ReturnModalProps) {
    const { colors, theme } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { branch } = useAuth();
    const { branches = [] } = useBranches();

    const createSaleReturn     = useCreateSaleReturn();
    const createPurchaseReturn = useCreatePurchaseReturn();

    const isPending   = createSaleReturn.isPending || createPurchaseReturn.isPending;
    const accentColor = type === 'customer_return' ? '#06B6D4' : '#F97316';

    // ── State ────────────────────────────────────────────────────────────────
    const [invoiceItems, setInvoiceItems]       = useState<ReturnItemState[]>([]);
    const [loadingItems, setLoadingItems]       = useState(false);
    const [selectedBranchId, setSelectedBranchId] = useState(branch?.id ?? '');
    const [reason, setReason]                   = useState('');
    const [notes, setNotes]                     = useState('');
    const [refundMethod, setRefundMethod]       = useState<string>(
        type === 'customer_return' ? 'cash' : 'cash'
    );
    const [customAmount, setCustomAmount]       = useState('');
    const [useCustomAmount, setUseCustomAmount] = useState(false);
    const [error, setError]                     = useState('');
    const initialized = useRef(false);

    // ── Load invoice items when modal opens ──────────────────────────────────
    useEffect(() => {
        if (!visible || !referenceId) { initialized.current = false; return; }
        if (initialized.current) return;
        initialized.current = true;
        loadInvoiceItems();
    }, [visible, referenceId]);

    // Reset on close
    useEffect(() => {
        if (!visible) {
            setInvoiceItems([]);
            setReason('');
            setNotes('');
            setRefundMethod('cash');
            setCustomAmount('');
            setUseCustomAmount(false);
            setError('');
            initialized.current = false;
        }
    }, [visible]);

    const loadInvoiceItems = async () => {
        if (!referenceId) return;
        setLoadingItems(true);
        try {
            if (type === 'customer_return') {
                const { data, error } = await supabase
                    .from('sale_items')
                    .select('product_id, variant_id, product_name, quantity, unit_price, cost_price')
                    .eq('sale_id', referenceId);
                if (error) throw error;
                
                // For customer returns, branch stock is usually irrelevant as we are taking items BACK, 
                // but we initialize currentStock to 9999 or actual for consistency.
                setInvoiceItems((data || []).map((item: any) => ({
                    product_id:   item.product_id,
                    variant_id:   item.variant_id ?? null,
                    product_name: item.product_name || 'Unknown',
                    quantity:     item.quantity,
                    unit_price:   Number(item.unit_price || 0),
                    unit_cost:    Number(item.cost_price || 0),
                    returnQty:    item.quantity,
                    selected:     true,
                    currentStock: 9999, 
                })));
            } else {
                // Supplier Return: MUST check branch stock
                const { data: items, error: itemErr } = await supabase
                    .from('purchase_items')
                    .select('product_id, quantity, unit_cost, products(name)')
                    .eq('purchase_id', referenceId);
                if (itemErr) throw itemErr;

                // Fetch current stock for these products in this branch
                const productIds = (items || []).map(i => i.product_id);
                const { data: stockData } = await supabase
                    .from('branch_products')
                    .select('product_id, stock')
                    .in('product_id', productIds)
                    .eq('branch_id', selectedBranchId);

                const stockMap = new Map((stockData || []).map(s => [s.product_id, Number(s.stock)]));

                setInvoiceItems((items || []).map((item: any) => {
                    const avail = stockMap.get(item.product_id) || 0;
                    return {
                        product_id:   item.product_id,
                        variant_id:   null,
                        product_name: (item.products as any)?.name || 'Unknown',
                        quantity:     item.quantity,
                        unit_price:   Number(item.unit_cost || 0),
                        unit_cost:    Number(item.unit_cost || 0),
                        returnQty:    Math.min(Number(item.quantity), avail), // default to max available
                        selected:     avail > 0,
                        currentStock: avail,
                    };
                }));
            }
        } catch (e) {
            console.error(e);
            setError('Failed to load invoice items or stock');
        } finally {
            setLoadingItems(false);
        }
    };

    // ── Computed values ───────────────────────────────────────────────────────
    const selectedItems = invoiceItems.filter(i => i.selected && i.returnQty > 0);

    const autoRefundAmount = useMemo(
        () => selectedItems.reduce((sum, i) => sum + i.returnQty * i.unit_price, 0),
        [selectedItems]
    );

    const effectiveRefundAmount = useCustomAmount
        ? parseFloat(customAmount) || 0
        : autoRefundAmount;

    const overStockError = type === 'supplier_return' && selectedItems.some(i => i.returnQty > i.currentStock);
    
    const refundMethods = type === 'customer_return' ? REFUND_METHODS_CUSTOMER : REFUND_METHODS_SUPPLIER;

    // ── Handlers ─────────────────────────────────────────────────────────────
    const toggleItem = (idx: number) => {
        setInvoiceItems(prev => prev.map((item, i) =>
            i === idx ? { ...item, selected: !item.selected } : item
        ));
    };

    const updateQty = (idx: number, delta: number) => {
        setInvoiceItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const newQty = Math.max(0, Math.min(item.quantity, item.returnQty + delta));
            return { ...item, returnQty: newQty, selected: newQty > 0 };
        }));
    };

    const handleConfirm = async () => {
        if (isPending) return;
        setError('');

        if (selectedItems.length === 0) return setError('Select at least one item to return');
        if (overStockError) return setError('Cannot return more than physically available in stock');
        if (!reason) return setError('Please select a reason');
        if (effectiveRefundAmount < 0) return setError('Refund amount cannot be negative');

        const items: ReturnItemInput[] = selectedItems.map(i => ({
            product_id:   i.product_id,
            variant_id:   i.variant_id ?? undefined,
            product_name: i.product_name,
            quantity:     i.returnQty,
            unit_price:   i.unit_price,
            unit_cost:    i.unit_cost,
        }));

        try {
            if (type === 'customer_return') {
                await createSaleReturn.mutateAsync({
                    saleId:        referenceId!,
                    items,
                    refundMethod:  refundMethod as any,
                    refundAmount:  effectiveRefundAmount,
                    reason,
                    notes:         notes || undefined,
                    branchId:      selectedBranchId || undefined,
                });
            } else {
                await createPurchaseReturn.mutateAsync({
                    purchaseId:    referenceId!,
                    items,
                    refundMethod:  refundMethod as any,
                    refundAmount:  effectiveRefundAmount,
                    reason,
                    notes:         notes || undefined,
                    branchId:      selectedBranchId || undefined,
                });
            }
            Alert.alert('Success', 'Return recorded. Inventory and accounts updated.');
            onSuccess?.();
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to record return');
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const title      = type === 'customer_return' ? 'Customer Return' : 'Supplier Return';
    const iconName   = type === 'customer_return' ? 'undo' : 'reply';

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={[styles.modal, { overflow: 'hidden' }]} onPress={() => {}}>
                    {/* Gradient Background */}
                    <LinearGradient
                        colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    />

                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: `${accentColor}30` }]}>
                        <View style={[styles.headerIcon, { backgroundColor: `${accentColor}20` }]}>
                            <FontAwesome name={iconName as any} size={18} color={accentColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerTitle}>{title}</Text>
                            {referenceLabel && (
                                <Text style={styles.headerSub} numberOfLines={1}>{referenceLabel}</Text>
                            )}
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <FontAwesome name="times" size={16} color={colors.textSecondary} />
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

                        {/* ── Items Section ── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Return Items</Text>
                            {loadingItems ? (
                                <ActivityIndicator color={accentColor} style={{ padding: 16 }} />
                            ) : invoiceItems.length === 0 ? (
                                <Text style={styles.emptyText}>No items found in original invoice</Text>
                            ) : (
                                invoiceItems.map((item, idx) => (
                                    <View key={idx} style={[
                                        styles.itemRow,
                                        !item.selected && { opacity: 0.4 },
                                    ]}>
                                        {/* Checkbox */}
                                        <Pressable
                                            onPress={() => toggleItem(idx)}
                                            style={[styles.checkbox, item.selected && { backgroundColor: accentColor, borderColor: accentColor }]}
                                        >
                                            {item.selected && <FontAwesome name="check" size={10} color="#fff" />}
                                        </Pressable>

                                        {/* Product info */}
                                        <View style={{ flex: 1, marginHorizontal: 10 }}>
                                            <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
                                            <Text style={styles.itemMeta}>
                                                ${item.unit_price.toFixed(2)} ea · {type === 'supplier_return' ? `Stock: ${item.currentStock}` : `Max: ${item.quantity}`}
                                            </Text>
                                        </View>

                                        {/* Qty stepper */}
                                        <View style={styles.stepper}>
                                            <TouchableOpacity
                                                style={styles.stepBtn}
                                                onPress={() => updateQty(idx, -1)}
                                            >
                                                <Text style={[styles.stepTxt, { color: accentColor }]}>−</Text>
                                            </TouchableOpacity>
                                            <Text style={[
                                                styles.qtyTxt,
                                                type === 'supplier_return' && item.returnQty > item.currentStock && { color: colors.danger }
                                            ]}>
                                                {item.returnQty}
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.stepBtn}
                                                onPress={() => updateQty(idx, +1)}
                                            >
                                                <Text style={[styles.stepTxt, { color: accentColor }]}>+</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Line total */}
                                        <Text style={[styles.lineTotal, { color: accentColor }]}>
                                            ${(item.returnQty * item.unit_price).toFixed(2)}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* ── Reason ── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Reason</Text>
                            <View style={styles.chipRow}>
                                {REASONS[type].map(r => (
                                    <TouchableOpacity
                                        key={r}
                                        style={[styles.chip, reason === r && { backgroundColor: `${accentColor}20`, borderColor: accentColor }]}
                                        onPress={() => setReason(r)}
                                    >
                                        <Text style={[styles.chipText, reason === r && { color: accentColor, fontWeight: '700' }]}>
                                            {r}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* ── Refund Method ── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Refund Method</Text>
                            {refundMethods.map(m => (
                                <TouchableOpacity
                                    key={m.value}
                                    style={[styles.methodRow, refundMethod === m.value && { borderColor: accentColor, backgroundColor: `${accentColor}12` }]}
                                    onPress={() => setRefundMethod(m.value)}
                                >
                                    <View style={[styles.methodIcon, refundMethod === m.value && { backgroundColor: `${accentColor}25` }]}>
                                        <FontAwesome name={m.icon as any} size={14} color={accentColor} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.methodLabel, refundMethod === m.value && { color: accentColor }]}>
                                            {m.label}
                                        </Text>
                                        <Text style={styles.methodDesc}>{m.desc}</Text>
                                    </View>
                                    {refundMethod === m.value && (
                                        <FontAwesome name="check-circle" size={18} color={accentColor} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* ── Branch ── */}
                        {branches.length > 1 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Branch</Text>
                                <View style={styles.chipRow}>
                                    {branches.map(b => (
                                        <TouchableOpacity
                                            key={b.id}
                                            style={[styles.chip, selectedBranchId === b.id && { backgroundColor: `${accentColor}20`, borderColor: accentColor }]}
                                            onPress={() => setSelectedBranchId(b.id)}
                                        >
                                            <Text style={[styles.chipText, selectedBranchId === b.id && { color: accentColor, fontWeight: '700' }]}>
                                                {b.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* ── Accounting Summary ── */}
                        <View style={[styles.section, styles.summaryBox]}>
                            <Text style={[styles.sectionTitle, { color: accentColor }]}>Accounting Impact</Text>

                            <View style={styles.summaryRow}>
                                <FontAwesome name="cubes" size={13} color={colors.textSecondary} />
                                <Text style={styles.summaryText}>
                                    {selectedItems.length} product{selectedItems.length !== 1 ? 's' : ''} returned to inventory
                                </Text>
                            </View>

                            <View style={styles.summaryRow}>
                                <FontAwesome name="bar-chart" size={13} color={colors.textSecondary} />
                                <Text style={styles.summaryText}>
                                    {type === 'customer_return' ? 'COGS reversed ·' : 'Cost reversed ·'} Revenue / cost adjusted
                                </Text>
                            </View>

                            <View style={styles.summaryRow}>
                                <FontAwesome name="money" size={13} color={colors.textSecondary} />
                                <Text style={styles.summaryText}>
                                    {refundMethods.find(m => m.value === refundMethod)?.desc}
                                </Text>
                            </View>

                            {/* Refund amount */}
                            <View style={[styles.summaryRow, { marginTop: 8 }]}>
                                <Text style={[styles.summaryLabel, { flex: 1 }]}>Refund Amount</Text>
                                <TouchableOpacity onPress={() => setUseCustomAmount(v => !v)}>
                                    <Text style={{ color: accentColor, fontSize: 12 }}>
                                        {useCustomAmount ? 'Use auto' : 'Edit'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {useCustomAmount ? (
                                <TextInput
                                    style={[styles.amountInput, { borderColor: accentColor }]}
                                    value={customAmount}
                                    onChangeText={setCustomAmount}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            ) : (
                                <Text style={[styles.amountDisplay, { color: accentColor }]}>
                                    ${effectiveRefundAmount.toFixed(2)}
                                </Text>
                            )}
                        </View>

                        {/* ── Notes ── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Notes (optional)</Text>
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

                        {/* ── Error ── */}
                        {!!error && (
                            <View style={styles.errorBox}>
                                <FontAwesome name="exclamation-circle" size={14} color={colors.danger} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Pressable style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.confirmBtn, 
                                { backgroundColor: accentColor }, 
                                (isPending || overStockError) && { opacity: 0.7 }
                            ]}
                            onPress={handleConfirm}
                            disabled={isPending || overStockError}
                        >
                            {isPending
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Text style={styles.confirmText}>Record Return</Text>
                            }
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modal: {
        backgroundColor: 'transparent',
        borderRadius: 22,
        width: isWeb ? 520 : '100%',
        maxHeight: '92%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 20,
        borderBottomWidth: 1,
    },
    headerIcon: { borderRadius: 12, padding: 10 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    closeBtn: { padding: 4, marginLeft: 4 },
    body: { padding: 16, gap: 12, paddingBottom: 8 },

    // Section card
    section: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: 14,
        gap: 10,
    },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },

    // Item rows
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border + '30',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemName: { fontSize: 14, fontWeight: '600', color: colors.text },
    itemMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepBtn: {
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: colors.card,
        justifyContent: 'center', alignItems: 'center',
    },
    stepTxt: { fontSize: 18, fontWeight: '700', lineHeight: 20 },
    qtyTxt: { fontSize: 15, fontWeight: '700', color: colors.text, minWidth: 24, textAlign: 'center' },
    lineTotal: { fontSize: 13, fontWeight: '700', minWidth: 56, textAlign: 'right' },
    emptyText: { textAlign: 'center', color: colors.textSecondary, fontStyle: 'italic', paddingVertical: 8 },

    // Chips
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    },
    chipText: { fontSize: 12, color: colors.textSecondary },

    // Refund method
    methodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.card + '40',
    },
    methodIcon: {
        width: 36, height: 36, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: colors.card,
    },
    methodLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
    methodDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },

    // Summary
    summaryBox: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    summaryText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    summaryLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
    amountInput: {
        borderWidth: 1.5, borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10,
        fontSize: 18, fontWeight: '700', color: colors.text,
        backgroundColor: colors.card + '60',
        outlineWidth: 0,
    } as any,
    amountDisplay: { fontSize: 26, fontWeight: '800', textAlign: 'center', paddingVertical: 4 },

    // Notes
    notesInput: {
        borderRadius: 10, padding: 12,
        fontSize: 13, color: colors.text,
        minHeight: 56, backgroundColor: colors.card + '40',
        outlineWidth: 0,
    } as any,

    // Error
    errorBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: colors.danger + '18',
        borderWidth: 1, borderColor: colors.danger + '40',
        borderRadius: 8, padding: 12,
    },
    errorText: { fontSize: 13, color: colors.danger, flex: 1 },

    // Footer
    footer: {
        flexDirection: 'row', gap: 10, padding: 16,
        borderTopWidth: 1, borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
    cancelBtn: {
        flex: 1, padding: 14, borderRadius: 12,
        alignItems: 'center', backgroundColor: colors.card + '60',
    },
    cancelText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    confirmBtn: { flex: 2, padding: 14, borderRadius: 12, alignItems: 'center' },
    confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
