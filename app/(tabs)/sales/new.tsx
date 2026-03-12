import { Gradients, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useTheme } from '@/context/ThemeContext';
import { useProcessSale } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator, FlatList, Image, Keyboard, Modal,
    Platform, ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View, useWindowDimensions,
} from 'react-native';

const isWeb = Platform.OS === 'web';

// ─── Types ─────────────────────────────────────────────────────────────────
interface CartItem {
    id: string; name: string; price: number; cost_price?: number;
    quantity: number; stock: number; image_url?: string;
    isVariant: boolean; discount: number; base_product_id?: string;
}
interface Product {
    id: string; name: string; sale_price: number; cost_price?: number;
    price_override?: number; stock: number; image_url?: string;
    isVariant: boolean; primary_sku?: string; sku?: string;
    category?: string; categories?: { name: string }; status?: string;
    base_product_id?: string;
}

const PAYMENT_METHODS = [
    { key: 'cash', label: 'Cash', icon: 'money' },
    { key: 'credit', label: 'Credit', icon: 'user' },
    { key: 'bank', label: 'Bank', icon: 'bank' },
    { key: 'mobile_money', label: 'Mobile', icon: 'mobile' },
] as const;

function getStockColor(s: number) {
    if (s <= 0) return '#DC2626';
    if (s < 5) return '#D97706';
    return '#059669';
}

// ─── Success Screen ─────────────────────────────────────────────────────────
function SuccessScreen({ invoiceId, total, onNewSale, onPrint, colors }: { invoiceId: string; total: number; onNewSale: () => void; onPrint?: () => void; colors: any }) {
    const { theme } = useTheme();
    const styles = React.useMemo(() => createSuccessStyles(colors), [colors]);
    return (
        <View style={styles.overlay}>
            <View style={[styles.card, { overflow: 'hidden' }]}>
                <LinearGradient
                    colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.circle}>
                    <FontAwesome name="check" size={40} color="#059669" />
                </View>
                <Text style={styles.title}>Sale Complete!</Text>
                <Text style={styles.inv}>INV-{String(invoiceId).split('-')[0].toUpperCase()}</Text>
                <Text style={styles.total}>${total.toFixed(2)}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    {onPrint && (
                        <TouchableOpacity style={styles.printBtn} onPress={onPrint}>
                            <FontAwesome name="print" size={14} color={colors.primary} />
                            <Text style={styles.printText}>Print</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.newBtn} onPress={onNewSale}>
                        <FontAwesome name="plus" size={14} color="#fff" />
                        <Text style={styles.newText}>New Sale</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
const createSuccessStyles = (colors: any) => StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
    card: { backgroundColor: 'transparent', borderRadius: 28, padding: 40, alignItems: 'center', width: '85%', maxWidth: 380, ...Layout.shadows.large, borderWidth: 1, borderColor: colors.border },
    circle: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 4 },
    inv: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginBottom: 6 },
    total: { fontSize: 42, fontWeight: '900', color: colors.primary, marginBottom: 28 },
    printBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
    printText: { color: colors.primary, fontWeight: '700' },
    newBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
    newText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─── Product Card ───────────────────────────────────────────────────────────
function ProductCard({ product, onAdd, cartQty, colors }: { product: Product; onAdd: (p: Product) => void; cartQty: number; colors: any }) {
    const styles = React.useMemo(() => createProductCardStyles(colors), [colors]);
    const price = product.isVariant ? (product.price_override || 0) : (product.sale_price || 0);
    const out = product.stock <= 0;
    const low = !out && product.stock < 5;
    const stockColor = getStockColor(product.stock);

    return (
        <TouchableOpacity
            style={[styles.card, out && styles.cardDisabled]}
            onPress={() => !out && onAdd(product)}
            activeOpacity={out ? 1 : 0.75}
        >
            {product.image_url
                ? <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />
                : <View style={styles.imagePlaceholder}><FontAwesome name="cube" size={26} color={colors.border} /></View>
            }
            <View style={[styles.stockBadge, { backgroundColor: stockColor + '18' }]}>
                <View style={[styles.stockDot, { backgroundColor: stockColor }]} />
                <Text style={[styles.stockText, { color: stockColor }]}>
                    {out ? 'Out of stock' : low ? `Low: ${product.stock}` : `${product.stock}`}
                </Text>
            </View>
            <View style={styles.body}>
                <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.price}>${price.toFixed(2)}</Text>
            </View>
            {!out && (
                <TouchableOpacity style={styles.addBtn} onPress={() => onAdd(product)}>
                    {cartQty > 0
                        ? <Text style={styles.addBtnQty}>{cartQty}</Text>
                        : <FontAwesome name="plus" size={13} color="#fff" />
                    }
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
}
const createProductCardStyles = (colors: any) => StyleSheet.create({
    card: { backgroundColor: colors.card + 'E0', borderRadius: 16, overflow: 'hidden', ...Layout.shadows.small, marginBottom: 2 },
    cardDisabled: { opacity: 0.45 },
    image: { width: '100%', height: 100 },
    imagePlaceholder: { width: '100%', height: 100, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
    stockBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
    stockDot: { width: 5, height: 5, borderRadius: 3 },
    stockText: { fontSize: 9, fontWeight: '700' },
    body: { padding: 10, paddingBottom: 8 },
    name: { fontSize: 13, fontWeight: '600', color: colors.text, lineHeight: 18, marginBottom: 4 },
    price: { fontSize: 17, fontWeight: '800', color: colors.primary },
    addBtn: { position: 'absolute', bottom: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    addBtnQty: { color: '#fff', fontSize: 12, fontWeight: '800' },
});

// ─── Cart Row ───────────────────────────────────────────────────────────────
function CartRow({ item, isAdmin, onIncrease, onDecrease, onRemove, onEditPrice, colors }: {
    item: CartItem; isAdmin: boolean;
    onIncrease: () => void; onDecrease: () => void; onRemove: () => void;
    onEditPrice: (p: number) => void;
    colors: any;
}) {
    const styles = React.useMemo(() => createCartRowStyles(colors), [colors]);
    const [editing, setEditing] = useState(false);
    const [priceText, setPriceText] = useState(item.price.toFixed(2));
    const over = item.quantity > item.stock;

    return (
        <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    {editing && isAdmin
                        ? <TextInput
                            style={styles.priceInput}
                            value={priceText}
                            onChangeText={setPriceText}
                            keyboardType="numeric"
                            autoFocus
                            onBlur={() => {
                                const v = parseFloat(priceText);
                                if (!isNaN(v) && v >= 0) onEditPrice(v);
                                setEditing(false);
                            }}
                        />
                        : <Text style={styles.price} onLongPress={() => isAdmin && setEditing(true)}>${item.price.toFixed(2)}</Text>
                    }
                    {isAdmin && !editing && (
                        <TouchableOpacity onPress={() => setEditing(true)}>
                            <FontAwesome name="pencil" size={9} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                    {over && <View style={styles.warn}><Text style={styles.warnText}>Over stock</Text></View>}
                </View>
            </View>
            <View style={styles.qtyBox}>
                <TouchableOpacity style={styles.qBtn} onPress={onDecrease}>
                    <FontAwesome name="minus" size={9} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.qty}>{item.quantity}</Text>
                <TouchableOpacity style={[styles.qBtn]} onPress={onIncrease}>
                    <FontAwesome name="plus" size={9} color={over ? colors.danger : colors.textSecondary} />
                </TouchableOpacity>
            </View>
            <Text style={styles.total}>${(item.price * item.quantity).toFixed(2)}</Text>
            <TouchableOpacity onPress={onRemove} style={styles.del}>
                <FontAwesome name="trash-o" size={14} color={colors.danger} />
            </TouchableOpacity>
        </View>
    );
}
const createCartRowStyles = (colors: any) => StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    name: { fontSize: 13, fontWeight: '600', color: colors.text },
    price: { fontSize: 12, color: colors.textSecondary },
    priceInput: { fontSize: 13, fontWeight: '700', color: colors.primary, borderBottomWidth: 1, borderBottomColor: colors.primary, minWidth: 50 },
    warn: { backgroundColor: colors.danger + '18', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
    warnText: { fontSize: 9, color: colors.danger, fontWeight: '700' },
    qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', borderRadius: 10, marginRight: 10 },
    qBtn: { paddingHorizontal: 9, paddingVertical: 7 },
    qty: { fontSize: 13, fontWeight: '800', color: colors.text, minWidth: 22, textAlign: 'center' },
    total: { fontSize: 14, fontWeight: '800', color: colors.text, minWidth: 56, textAlign: 'right' },
    del: { marginLeft: 10, padding: 4 },
});

// ─── Checkout Modal ─────────────────────────────────────────────────────────
function CheckoutModal({ visible, subtotal, discount, tax, onDiscountChange, onTaxChange, onConfirm, onClose, isProcessing, customer, onSelectCustomer, colors }: {
    visible: boolean; subtotal: number; discount: number; tax: number;
    onDiscountChange: (v: number) => void; onTaxChange: (v: number) => void;
    onConfirm: (method: string, amountPaid: number, note: string) => void;
    onClose: () => void; isProcessing: boolean; customer: any; onSelectCustomer: () => void;
    colors: any;
}) {
    const { theme } = useTheme();
    const styles = React.useMemo(() => createCheckoutStyles(colors), [colors]);
    const [method, setMethod] = useState<string>('cash');
    const [amountPaid, setAmountPaid] = useState('');
    const [note, setNote] = useState('');

    const discountAmt = subtotal * discount / 100;
    const taxAmt = (subtotal - discountAmt) * tax / 100;
    const grand = subtotal - discountAmt + taxAmt;
    const paid = parseFloat(amountPaid) || 0;
    const change = method === 'cash' && paid > grand ? paid - grand : 0;

    useEffect(() => {
        if (visible) {
            if (method === 'cash' || method === 'bank' || method === 'mobile_money') {
                setAmountPaid(grand.toFixed(2));
            } else if (method === 'credit') {
                setAmountPaid('0');
            }
        }
    }, [method, visible, grand]);

    const canSubmit = paid >= 0 && (
        (method === 'credit' && !!customer) ||
        (method !== 'credit' && (paid >= grand || (paid > 0 && !!customer)))
    );

    if (!visible) return null;

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.sheet, { overflow: 'hidden' }]}>
                    <LinearGradient
                        colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <View style={styles.drag} />
                    <View style={styles.hdr}>
                        <View>
                            <Text style={styles.hdrSub}>Payment</Text>
                            <Text style={styles.hdrTotal}>${grand.toFixed(2)}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <FontAwesome name="times" size={15} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.body}>
                        <View style={styles.summaryBox}>
                            <View style={styles.row}><Text style={styles.rowLabel}>Subtotal</Text><Text style={styles.rowVal}>${subtotal.toFixed(2)}</Text></View>
                            {discount > 0 && <View style={styles.row}><Text style={[styles.rowLabel, { color: '#059669' }]}>Discount {discount}%</Text><Text style={[styles.rowVal, { color: '#059669' }]}>−${discountAmt.toFixed(2)}</Text></View>}
                            {tax > 0 && <View style={styles.row}><Text style={styles.rowLabel}>Tax {tax}%</Text><Text style={styles.rowVal}>+${taxAmt.toFixed(2)}</Text></View>}
                            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 6 }]}>
                                <Text style={styles.grandLabel}>Total</Text>
                                <Text style={styles.grandVal}>${grand.toFixed(2)}</Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Discount %</Text>
                                <TextInput style={styles.input} value={discount > 0 ? discount.toString() : ''} onChangeText={t => onDiscountChange(Math.min(100, parseFloat(t) || 0))} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textSecondary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Tax %</Text>
                                <TextInput style={styles.input} value={tax > 0 ? tax.toString() : ''} onChangeText={t => onTaxChange(Math.min(100, parseFloat(t) || 0))} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textSecondary} />
                            </View>
                        </View>

                        <Text style={styles.label}>Payment Method</Text>
                        <View style={styles.methods}>
                            {PAYMENT_METHODS.map(m => (
                                <TouchableOpacity key={m.key} style={[styles.mBtn, method === m.key && styles.mBtnActive]} onPress={() => setMethod(m.key)}>
                                    <FontAwesome name={m.icon as any} size={16} color={method === m.key ? '#fff' : colors.textSecondary} />
                                    <Text style={[styles.mLabel, method === m.key && styles.mLabelActive]}>{m.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {method === 'credit' && (
                            <TouchableOpacity style={styles.custChip} onPress={onSelectCustomer}>
                                <FontAwesome name="user" size={13} color={colors.primary} />
                                <Text style={styles.custChipText}>{customer ? customer.name : 'Select customer (required)'}</Text>
                                <FontAwesome name="chevron-right" size={10} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}

                        <View style={{ marginBottom: 14 }}>
                            <Text style={styles.label}>{method === 'credit' ? 'Down Payment (Optional)' : 'Amount Received'}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={styles.curr}>$</Text>
                                <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={amountPaid} onChangeText={setAmountPaid} keyboardType="numeric" placeholder={grand.toFixed(2)} placeholderTextColor={colors.textSecondary} selectTextOnFocus />
                            </View>
                            {change > 0 && <View style={styles.changeBanner}><Text style={styles.changeLabel}>Change Due</Text><Text style={styles.changeVal}>${change.toFixed(2)}</Text></View>}
                        </View>

                        <Text style={styles.label}>Note (optional)</Text>
                        <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]} value={note} onChangeText={setNote} placeholder="Order note..." placeholderTextColor={colors.textSecondary} multiline />

                        <TouchableOpacity style={[styles.confirmBtn, (!canSubmit || isProcessing) && styles.confirmBtnOff]} onPress={() => onConfirm(method, paid, note)} disabled={!canSubmit || isProcessing}>
                            {isProcessing ? <ActivityIndicator color="#fff" /> : <><FontAwesome name="check-circle" size={18} color="#fff" /><Text style={styles.confirmText}>Complete Sale · ${grand.toFixed(2)}</Text></>}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
const createCheckoutStyles = (colors: any) => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { backgroundColor: 'transparent', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
    drag: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
    hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 10, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    hdrSub: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
    hdrTotal: { fontSize: 32, fontWeight: '900', color: colors.text },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
    body: { padding: 22, paddingBottom: 48 },
    summaryBox: { backgroundColor: 'transparent', borderRadius: 16, padding: 16, marginBottom: 18 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    rowLabel: { fontSize: 14, color: colors.textSecondary },
    rowVal: { fontSize: 14, fontWeight: '600', color: colors.text },
    grandLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
    grandVal: { fontSize: 24, fontWeight: '800', color: colors.primary },
    label: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 },
    input: { backgroundColor: 'transparent', borderRadius: 12, padding: 13, fontSize: 15, color: colors.text, marginBottom: 14 },
    methods: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
    mBtn: { flex: 1, minWidth: '22%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: 'transparent' },
    mBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    mLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    mLabelActive: { color: '#fff' },
    custChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary + '18', borderRadius: 12, padding: 13, marginBottom: 14 },
    custChipText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.primary },
    curr: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
    changeBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#D1FAE5', padding: 12, borderRadius: 10, marginTop: 4 },
    changeLabel: { fontSize: 13, fontWeight: '700', color: '#065F46' },
    changeVal: { fontSize: 16, fontWeight: '800', color: '#065F46' },
    confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 16, marginTop: 10, ...Layout.shadows.medium },
    confirmBtnOff: { opacity: 0.6, backgroundColor: colors.textSecondary },
    confirmText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function NewSaleScreen() {
    const { colors, theme } = useTheme();
    const s = React.useMemo(() => createStyles(colors), [colors]);
    const { company, user, branch, isAdmin } = useAuth();
    const router = useRouter();
    const { showFeedback } = useFeedback();
    const [permission, requestPermission] = useCameraPermissions();
    const { width } = useWindowDimensions();
    const isWebSplit = isWeb && width >= 860;
    const searchRef = useRef<TextInput>(null);

    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);

    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [discount, setDiscount] = useState(0);
    const [tax, setTax] = useState(0);

    const [productSearch, setProductSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [checkoutVisible, setCheckoutVisible] = useState(false);
    const [customerModalVisible, setCustomerModalVisible] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [successInvoice, setSuccessInvoice] = useState<string | null>(null);
    const [successTotal, setSuccessTotal] = useState(0);
    const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
    const [creditWarning, setCreditWarning] = useState({ visible: false, pendingMethod: '', pendingPaid: 0, pendingNote: '', message: '' });

    const { mutate: processSale, isPending: isProcessing } = useProcessSale();

    useEffect(() => { if (company) fetchData(); }, [company]);
    useEffect(() => { setTimeout(() => searchRef.current?.focus(), 300); }, []);

    const fetchData = async () => {
        setLoadingProducts(true);
        try {
            const [custRes, prodRes] = await Promise.all([
                supabase.from('customers').select('*').eq('company_id', company?.id),
                supabase.from('products').select('*, product_variants(*), categories(name), branch_products(stock, branch_id)').eq('company_id', company?.id).eq('status', 'active'),
            ]);
            setCustomers(custRes.data || []);
            const flat: Product[] = [];
            (prodRes.data || []).forEach((p: any) => {
                const branchStock = branch?.id ? p.branch_products?.find((bp: any) => bp.branch_id === branch.id)?.stock ?? p.stock ?? 0 : p.branch_products?.reduce((s: number, bp: any) => s + (bp.stock || 0), 0) ?? p.stock ?? 0;
                flat.push({ ...p, isVariant: false, stock: branchStock, category: p.categories?.name || 'Uncategorized' });
                (p.product_variants || []).forEach((v: any) => flat.push({ ...v, name: `${p.name} — ${v.sku}`, image_url: p.image_url, isVariant: true, base_product_id: p.id, cost_price: p.cost_price, stock: v.stock ?? 0, category: p.categories?.name || 'Uncategorized' }));
            });
            setAllProducts(flat);
        } finally { setLoadingProducts(false); }
    };

    const categories = useMemo(() => {
        const cats = new Set<string>();
        allProducts.forEach(p => cats.add(p.category || 'Uncategorized'));
        return ['all', ...Array.from(cats).sort()];
    }, [allProducts]);

    const filteredProducts = useMemo(() => {
        let list = allProducts;
        if (selectedCategory !== 'all') list = list.filter(p => p.category === selectedCategory);
        if (productSearch.trim()) {
            const q = productSearch.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q) || p.primary_sku?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
        }
        return list;
    }, [allProducts, selectedCategory, productSearch]);

    const filteredCustomers = useMemo(() => customers.filter(c => !customerSearch || c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch)), [customers, customerSearch]);
    const cartMap = useMemo(() => { const m: Record<string, number> = {}; cart.forEach(i => { m[i.id] = (m[i.id] || 0) + i.quantity; }); return m; }, [cart]);
    const addToCart = useCallback((product: Product) => {
        Keyboard.dismiss();
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id && i.isVariant === product.isVariant);
            if (existing) return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { ...product, price: product.isVariant ? (product.price_override || 0) : (product.sale_price || 0), quantity: 1, discount: 0 }];
        });
    }, []);
    const removeFromCart = (i: number) => setCart(prev => prev.filter((_, idx) => idx !== i));
    const increaseQty = (i: number) => setCart(prev => prev.map((item, idx) => idx === i ? { ...item, quantity: item.quantity + 1 } : item));
    const decreaseQty = (i: number) => setCart(prev => prev.map((item, idx) => idx === i && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item));
    const editPrice = (i: number, price: number) => setCart(prev => prev.map((item, idx) => idx === i ? { ...item, price } : item));
    const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
    const discountAmt = subtotal * discount / 100;
    const taxAmt = (subtotal - discountAmt) * tax / 100;
    const grandTotal = subtotal - discountAmt + taxAmt;

    const doProcessSale = (method: string, amountPaid: number, note: string) => {
        processSale({ cart: cart.map(i => ({ ...i, tax_rate: tax / 100, discount_rate: discount / 100 })), customer: selectedCustomer, paymentMethod: method, amountPaid: amountPaid.toString(), total: grandTotal }, {
            onSuccess: (data: any) => { setCheckoutVisible(false); setSuccessTotal(grandTotal); setSuccessInvoice(data || 'new'); },
            onError: (e: any) => showFeedback('error', 'Sale Failed', e.message),
        });
    };
    const handleConfirmSale = (method: string, amountPaid: number, note: string) => {
        if (!company?.id) return;
        if (method === 'credit' && !selectedCustomer) { showFeedback('error', 'Customer Required', 'Select a customer for credit sales.'); return; }
        if (method === 'credit' && selectedCustomer) {
            const creditLimit = Number(selectedCustomer.credit_limit || 0);
            const currentBalance = Number(selectedCustomer.current_balance || 0);
            if (creditLimit > 0 && (currentBalance + grandTotal) > creditLimit) {
                if (isAdmin) { setCreditWarning({ visible: true, pendingMethod: method, pendingPaid: amountPaid, pendingNote: note, message: `Credit limit exceeded. Proceed anyway?` }); return; }
                else { showFeedback('error', 'Credit Limit Exceeded', `Customer credit limit reached.`); return; }
            }
        }
        doProcessSale(method, amountPaid, note);
    };
    const handleNewSale = () => { setCart([]); setSelectedCustomer(null); setDiscount(0); setTax(0); setSuccessInvoice(null); setCartDrawerOpen(false); setTimeout(() => searchRef.current?.focus(), 300); };
    const handleScan = ({ data }: { data: string }) => {
        setShowScanner(false);
        const match = allProducts.find(p => p.primary_sku === data || p.sku === data);
        if (match) { addToCart(match); showFeedback('success', 'Scanned', match.name); } else showFeedback('error', 'Not Found', `No product: ${data}`);
    };
    const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

    const TopBar = () => (
        <View style={s.topBar}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}><FontAwesome name="arrow-left" size={14} color={colors.text} /></TouchableOpacity>
            <View style={s.topCenter}><Text style={s.topHeading}>New Sale</Text>{branch?.name && <View style={s.branchBadge}><Text style={s.branchText}>{branch.name}</Text></View>}</View>
            <TouchableOpacity style={s.custBtn} onPress={() => setCustomerModalVisible(true)}>
                <FontAwesome name="user" size={12} color={selectedCustomer ? colors.primary : colors.textSecondary} />
                <View style={{ flex: 1 }}><Text style={[s.custBtnText, selectedCustomer && { color: colors.primary }]} numberOfLines={1}>{selectedCustomer ? selectedCustomer.name : 'Walk-in'}</Text></View>
                <FontAwesome name="caret-down" size={10} color={colors.textSecondary} />
            </TouchableOpacity>
        </View>
    );

    const SearchBar = () => (
        <View style={s.searchRow}>
            <View style={s.searchBox}>
                <FontAwesome name="search" size={14} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput ref={searchRef} style={s.searchInput} placeholder="Search products..." placeholderTextColor={colors.textSecondary} value={productSearch} onChangeText={setProductSearch} returnKeyType="search" />
                {productSearch.length > 0 && <TouchableOpacity onPress={() => setProductSearch('')}><FontAwesome name="times-circle" size={14} color={colors.border} /></TouchableOpacity>}
            </View>
            <TouchableOpacity style={s.scanBtn} onPress={() => { if (!permission?.granted) requestPermission(); else setShowScanner(true); }}><FontAwesome name="barcode" size={19} color={colors.primary} /></TouchableOpacity>
        </View>
    );

    const CategoryTabs = () => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
            {categories.map(cat => (
                <TouchableOpacity key={cat} style={[s.catChip, selectedCategory === cat && s.catChipActive]} onPress={() => setSelectedCategory(cat)}>
                    <Text style={[s.catText, selectedCategory === cat && s.catTextActive]}>{cat === 'all' ? 'All Products' : cat}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const CartContent = () => (
        <>
            <View style={{ flex: 1 }}>
                {cart.length === 0 ? (
                    <View style={s.emptyCart}><View style={s.emptyCartIcon}><FontAwesome name="shopping-cart" size={28} color={colors.textSecondary} /></View><Text style={s.emptyCartTitle}>Cart is empty</Text></View>
                ) : (
                    <ScrollView style={{ flex: 1 }}>{cart.map((item, i) => <CartRow key={`${item.id}-${i}`} item={item} isAdmin={isAdmin} onIncrease={() => increaseQty(i)} onDecrease={() => decreaseQty(i)} onRemove={() => removeFromCart(i)} onEditPrice={p => editPrice(i, p)} colors={colors} />)}</ScrollView>
                )}
            </View>
            <View style={s.summaryBox}>
                <View style={s.summaryRow}><Text style={s.summaryLabel}>Subtotal</Text><Text style={s.summaryVal}>${subtotal.toFixed(2)}</Text></View>
                {discount > 0 && <View style={s.summaryRow}><Text style={[s.summaryLabel, { color: '#059669' }]}>Discount {discount}%</Text><Text style={[s.summaryVal, { color: '#059669' }]}>−${discountAmt.toFixed(2)}</Text></View>}
                <View style={s.totalRow}><Text style={s.totalLabel}>Total</Text><Text style={s.totalVal}>${grandTotal.toFixed(2)}</Text></View>
                <TouchableOpacity style={[s.checkoutBtn, cart.length === 0 && s.checkoutBtnOff]} onPress={() => cart.length > 0 && setCheckoutVisible(true)} disabled={cart.length === 0}>
                    <FontAwesome name="credit-card" size={15} color="#fff" /><Text style={s.checkoutText}>Checkout · ${grandTotal.toFixed(2)}</Text>
                </TouchableOpacity>
            </View>
        </>
    );

    return (
        <View style={s.screen}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <TopBar />
            {isWebSplit ? (
                <View style={s.splitRoot}>
                    <View style={s.leftPane}>
                        <SearchBar /><CategoryTabs />
                        {loadingProducts ? <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
                            <FlatList data={filteredProducts} keyExtractor={(item, i) => `${item.id}-${i}`} numColumns={3} columnWrapperStyle={{ gap: 12, paddingHorizontal: 16, marginBottom: 12 }} renderItem={({ item }) => <ProductCard product={item} onAdd={addToCart} cartQty={cartMap[item.id] || 0} colors={colors} />} ListEmptyComponent={<View style={s.center}><Text style={{ color: colors.textSecondary }}>No products found</Text></View>} />
                        )}
                    </View>
                    <View style={s.rightPane}><View style={s.cartHeader}><Text style={s.cartTitle}>Cart</Text>{itemCount > 0 && <View style={s.cartBadge}><Text style={s.cartBadgeText}>{itemCount}</Text></View>}</View><CartContent /></View>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <SearchBar /><CategoryTabs />
                    <FlatList data={filteredProducts} keyExtractor={(item, i) => `${item.id}-${i}`} numColumns={2} columnWrapperStyle={{ gap: 10, paddingHorizontal: 14, marginBottom: 10 }} contentContainerStyle={{ paddingBottom: 100 }} renderItem={({ item }) => <ProductCard product={item} onAdd={addToCart} cartQty={cartMap[item.id] || 0} colors={colors} />} />
                    <TouchableOpacity style={[s.mobileBar, cart.length === 0 && { backgroundColor: colors.border }]} onPress={() => cart.length > 0 && setCartDrawerOpen(true)} disabled={cart.length === 0}><View style={s.mobileBarLeft}><View style={s.mobileBarBadge}><Text style={s.mobileBarBadgeText}>{itemCount}</Text></View><Text style={s.mobileBarText}>{itemCount} items</Text></View><Text style={s.mobileBarTotal}>${grandTotal.toFixed(2)}</Text></TouchableOpacity>
                    <Modal visible={cartDrawerOpen} transparent animationType="slide" onRequestClose={() => setCartDrawerOpen(false)}>
                        <View style={s.drawerOverlay}><TouchableOpacity style={{ flex: 1 }} onPress={() => setCartDrawerOpen(false)} /><View style={s.drawer}><View style={s.drawerHandle} /><View style={s.drawerHeader}><Text style={s.drawerTitle}>Cart</Text><TouchableOpacity onPress={() => setCartDrawerOpen(false)}><FontAwesome name="times" size={14} color={colors.textSecondary} /></TouchableOpacity></View><CartContent /></View></View>
                    </Modal>
                </View>
            )}
            <Modal visible={customerModalVisible} transparent animationType="slide">
                <View style={s.custOverlay}>
                    <View style={s.custSheet}>
                        <View style={s.custHeader}><Text style={s.custTitle}>Select Customer</Text><TouchableOpacity onPress={() => setCustomerModalVisible(false)}><FontAwesome name="times" size={15} color={colors.textSecondary} /></TouchableOpacity></View>
                        <FlatList data={filteredCustomers} keyExtractor={c => c.id} renderItem={({ item }) => (
                            <TouchableOpacity style={s.custRow} onPress={() => { setSelectedCustomer(item); setCustomerModalVisible(false); }}>
                                <View style={s.custAvatar}><Text style={s.custAvatarText}>{item.name?.[0]}</Text></View>
                                <View style={{ flex: 1 }}><Text style={s.custName}>{item.name}</Text><Text style={s.custPhone}>{item.phone}</Text></View>
                            </TouchableOpacity>
                        )} />
                    </View>
                </View>
            </Modal>
            <CheckoutModal visible={checkoutVisible} subtotal={subtotal} discount={discount} tax={tax} onDiscountChange={setDiscount} onTaxChange={setTax} onConfirm={handleConfirmSale} onClose={() => setCheckoutVisible(false)} isProcessing={isProcessing} customer={selectedCustomer} onSelectCustomer={() => { setCheckoutVisible(false); setCustomerModalVisible(true); }} colors={colors} />
            {successInvoice && <SuccessScreen invoiceId={successInvoice} total={successTotal} onNewSale={handleNewSale} colors={colors} />}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: 'transparent' },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 16, paddingBottom: 10, backgroundColor: colors.card + 'E0', borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
    topCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    topHeading: { fontSize: 17, fontWeight: '800', color: colors.text },
    branchBadge: { backgroundColor: colors.primary + '18', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    branchText: { fontSize: 11, fontWeight: '700', color: colors.primary },
    custBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'transparent', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, maxWidth: 140 },
    custBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, flex: 1 },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card + 'E0', borderRadius: 14, paddingHorizontal: 14, height: 46, ...Layout.shadows.small },
    searchInput: { flex: 1, fontSize: 14, color: colors.text, outlineStyle: 'none' } as any,
    scanBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.primary + '18', justifyContent: 'center', alignItems: 'center' },
    catRow: { paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
    catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.card + 'E0', borderWidth: 1.5, borderColor: colors.border },
    catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    catTextActive: { color: '#fff' },
    splitRoot: { flex: 1, flexDirection: 'row' },
    leftPane: { flex: 7 },
    rightPane: { flex: 3, backgroundColor: colors.card + 'E0', borderLeftWidth: 1, borderLeftColor: colors.border },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
    cartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    cartTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    cartBadge: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    cartBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
    emptyCartIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
    emptyCartTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
    summaryBox: { borderTopWidth: 1, borderTopColor: colors.border, padding: 14, backgroundColor: colors.card + 'E0' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    summaryLabel: { fontSize: 13, color: colors.textSecondary },
    summaryVal: { fontSize: 13, fontWeight: '600', color: colors.text },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border, marginBottom: 12 },
    totalLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    totalVal: { fontSize: 28, fontWeight: '900', color: colors.primary },
    checkoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#059669', borderRadius: 16, paddingVertical: 15 },
    checkoutBtnOff: { backgroundColor: colors.border },
    checkoutText: { fontSize: 15, fontWeight: '800', color: '#fff' },
    mobileBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 14, paddingBottom: Platform.OS === 'ios' ? 28 : 14 },
    mobileBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    mobileBarBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
    mobileBarBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    mobileBarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    mobileBarTotal: { color: '#fff', fontSize: 17, fontWeight: '800' },
    drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    drawer: { backgroundColor: colors.card + 'E0', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%', flexDirection: 'column' },
    drawerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
    drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    drawerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    custOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    custSheet: { backgroundColor: colors.card + 'E0', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
    custHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: colors.border },
    custTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
    custRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
    custAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
    custAvatarText: { fontSize: 14, fontWeight: '700', color: colors.primary },
    custName: { fontSize: 14, fontWeight: '600', color: colors.text },
    custPhone: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    scanClose: { position: 'absolute', top: 50, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
});
