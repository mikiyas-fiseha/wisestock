import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { ModernModal } from '@/components/ui/ModernModal';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useProcessSale } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function NewSaleScreen() {
    const { company, user } = useAuth();
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();

    // Data
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // State
    const [cart, setCart] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null); // null = Guest
    const [customerModalVisible, setCustomerModalVisible] = useState(false);
    const [productModalVisible, setProductModalVisible] = useState(false);

    // Scanner
    const [showScanner, setShowScanner] = useState(false);

    // Payment
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash'); // cash, card, credit

    const { showFeedback } = useFeedback();

    useEffect(() => {
        if (company) {
            fetchData();
        }
    }, [company]);

    const fetchData = async () => {
        const { data: custData } = await supabase.from('customers').select('*').eq('company_id', company?.id);
        const { data: prodData } = await supabase.from('products').select('*, product_variants(*)').eq('company_id', company?.id).eq('status', 'active');
        setCustomers(custData || []);

        // Flatten products and variants for search
        const flatProds: any[] = [];
        prodData?.forEach(p => {
            // Base product
            flatProds.push({ ...p, isVariant: false });
            // Variants
            p.product_variants?.forEach((v: any) => {
                flatProds.push({
                    ...v,
                    name: `${p.name} - ${v.sku}`,
                    image_url: p.image_url,
                    isVariant: true,
                    base_product_id: p.id
                });
            });
        });
        setProducts(flatProds);
    };

    const addToCart = (product: any) => {
        setProductModalVisible(false);
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id && item.isVariant === product.isVariant);
            if (existing) {
                return prev.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1, price: product.isVariant ? product.price_override : product.sale_price }];
        });
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const updateQuantity = (index: number, newQty: number) => {
        setCart(prev => prev.map((item, i) => {
            if (i === index) {
                const q = Math.max(0, newQty); // Allow 0 to maybe delete? Or keep 1. Let's allow 1 min.
                return q > 0 ? { ...item, quantity: q } : item;
            }
            return item;
        }));
    };

    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);

    const handleScan = ({ data }: { data: string }) => {
        setShowScanner(false);
        const match = products.find(p => p.primary_sku === data || p.sku === data);
        if (match) {
            addToCart(match);
            showFeedback('success', "Added", `${match.name}`);
        } else {
            showFeedback('error', "Not Found", "Product not found");
        }
    };

    const { mutate: processSale, isPending: isProcessing } = useProcessSale();

    const handleCheckout = () => {
        if (cart.length === 0) return;

        if (!company?.id) {
            showFeedback('error', "Error", "Company ID missing. Please re-login.");
            return;
        }

        const paid = parseFloat(amountPaid) || 0;
        const total = cartTotal;

        if (paymentMethod === 'credit' && !selectedCustomer) {
            showFeedback('error', 'Error', "Customer required for credit sales");
            return;
        }

        processSale({
            cart,
            customer: selectedCustomer,
            paymentMethod,
            amountPaid,
            total
        }, {
            onSuccess: () => {
                setPaymentModalVisible(false);
                showFeedback('success', 'Sale Completed', 'The sale has been recorded successfully.');
                router.back();
            },
            onError: (error) => {
                showFeedback('error', 'Sale Failed', error.message);
            }
        });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}><Text style={styles.backButton}>Cancel</Text></TouchableOpacity>
                <Text style={styles.title}>New Sale</Text>
                <TouchableOpacity onPress={() => { }}><Text style={{ color: 'transparent' }}>Save</Text></TouchableOpacity>
            </View>

            {/* Customer Selector */}
            <TouchableOpacity style={styles.selector} onPress={() => setCustomerModalVisible(true)}>
                <View>
                    <Text style={styles.label}>Customer</Text>
                    <Text style={styles.value}>{selectedCustomer ? selectedCustomer.name : 'Walk-in Guest'}</Text>
                </View>
                <FontAwesome name="chevron-down" size={14} color="#666" />
            </TouchableOpacity>

            {/* Cart List */}
            <FlatList
                data={cart}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.list}
                renderItem={({ item, index }) => (
                    <View style={styles.cartItem}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemPrice}>${item.price.toFixed(2)} x {item.quantity}</Text>
                        </View>
                        <View style={styles.qtyControls}>
                            <TouchableOpacity onPress={() => updateQuantity(index, item.quantity - 1)} style={styles.qtyBtn}><FontAwesome name="minus" size={12} /></TouchableOpacity>
                            <TextInput
                                style={styles.qtyInput}
                                value={item.quantity.toString()}
                                onChangeText={(text) => updateQuantity(index, parseInt(text) || 0)}
                                keyboardType="numeric"
                                selectTextOnFocus
                            />
                            <TouchableOpacity onPress={() => updateQuantity(index, item.quantity + 1)} style={styles.qtyBtn}><FontAwesome name="plus" size={12} /></TouchableOpacity>
                        </View>
                        <Text style={styles.itemTotal}>${(item.price * item.quantity).toFixed(2)}</Text>
                        <TouchableOpacity onPress={() => removeFromCart(index)} style={{ marginLeft: 10 }}>
                            <FontAwesome name="trash" size={16} color={Colors.light.danger} />
                        </TouchableOpacity>
                    </View>
                )}
                ListHeaderComponent={
                    <View style={styles.actionsRow}>
                        <AppButton title="+ Add Product" onPress={() => setProductModalVisible(true)} variant="outline" style={{ flex: 1, marginRight: 8 }} />
                        <AppButton title="Scan" onPress={() => {
                            if (!permission?.granted) requestPermission();
                            else setShowScanner(true);
                        }} style={{ width: 80 }} />
                    </View>
                }
            />

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>${cartTotal.toFixed(2)}</Text>
                </View>
                <AppButton title="Checkout" onPress={() => setPaymentModalVisible(true)} disabled={cart.length === 0} />
            </View>

            {/* Modals */}
            <ModernModal visible={customerModalVisible} title="Select Customer" onClose={() => setCustomerModalVisible(false)}>
                <ScrollView contentContainerStyle={{ padding: 16 }} style={{ maxHeight: 400 }}>
                    <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedCustomer(null); setCustomerModalVisible(false); }}>
                        <Text style={styles.modalItemText}>Walk-in Guest</Text>
                    </TouchableOpacity>
                    {customers.map(c => (
                        <TouchableOpacity key={c.id} style={styles.modalItem} onPress={() => { setSelectedCustomer(c); setCustomerModalVisible(false); }}>
                            <Text style={styles.modalItemText}>{c.name}</Text>
                            <Text style={{ color: '#666' }}>{c.phone}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </ModernModal>

            <ModernModal visible={productModalVisible} title="Add Product" onClose={() => setProductModalVisible(false)}>
                <ScrollView contentContainerStyle={{ padding: 16 }} style={{ maxHeight: 400 }}>
                    {products.map((p, i) => (
                        <TouchableOpacity key={i} style={styles.modalItem} onPress={() => addToCart(p)}>
                            <Text style={styles.modalItemText}>{p.name}</Text>
                            <Text>Stock: {p.stock}</Text>
                            <Text style={{ fontWeight: 'bold', color: Colors.light.primary }}>${p.isVariant ? p.price_override : p.sale_price}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </ModernModal>

            <ModernModal visible={paymentModalVisible} title="Payment" onClose={() => setPaymentModalVisible(false)}>
                <View style={{ padding: 24 }}>
                    <Text style={{ fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 }}>${cartTotal.toFixed(2)}</Text>

                    <Text style={styles.label}>Payment Method</Text>
                    <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
                        <AppButton title="Cash" onPress={() => setPaymentMethod('cash')} variant={paymentMethod === 'cash' ? 'primary' : 'outline'} style={{ flex: 1 }} />
                        <AppButton title="Credit" onPress={() => setPaymentMethod('credit')} variant={paymentMethod === 'credit' ? 'primary' : 'outline'} style={{ flex: 1 }} />
                    </View>

                    <AppTextInput
                        label={paymentMethod === 'credit' ? "Initial Deposit (Optional)" : "Amount Tendered"}
                        value={amountPaid}
                        onChangeText={setAmountPaid}
                        keyboardType="numeric"
                        prefix="$"
                    />

                    {paymentMethod !== 'credit' && parseFloat(amountPaid) > cartTotal && (
                        <Text style={{ fontSize: 20, color: Colors.light.success, textAlign: 'center', marginTop: 16 }}>
                            Change: ${(parseFloat(amountPaid) - cartTotal).toFixed(2)}
                        </Text>
                    )}

                    <AppButton title="Complete Sale" onPress={handleCheckout} loading={isProcessing} style={{ marginTop: 32 }} />
                </View>
            </ModernModal>

            <Modal visible={showScanner} animationType="slide">
                <CameraView style={StyleSheet.absoluteFillObject} facing="back" onBarcodeScanned={handleScan} />
                <AppButton title="Cancel" onPress={() => setShowScanner(false)} style={{ position: 'absolute', bottom: 50, alignSelf: 'center', width: 200 }} />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
    title: { fontSize: 18, fontWeight: 'bold' },
    backButton: { color: Colors.light.primary, fontSize: 16 },
    selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' },
    label: { fontSize: 14, color: '#666', marginBottom: 4 },
    value: { fontSize: 16, fontWeight: '600' },
    list: { padding: 16 },
    actionsRow: { flexDirection: 'row', marginBottom: 16 },
    cartItem: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: 8, alignItems: 'center' },
    itemName: { fontSize: 16, fontWeight: '500' },
    itemPrice: { color: '#666' },
    itemTotal: { fontSize: 16, fontWeight: 'bold', marginLeft: 12 },
    qtyControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 4, marginHorizontal: 12 },
    qtyBtn: { padding: 8 },
    qtyInput: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', width: 50, padding: 0 },
    footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', paddingBottom: 32 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    totalLabel: { fontSize: 18, color: '#666' },
    totalValue: { fontSize: 24, fontWeight: 'bold' },
    modalContainer: { flex: 1, backgroundColor: '#fff', marginTop: 50, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    modalHeader: { padding: 16, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    modalItem: { padding: 16, borderBottomWidth: 1, borderColor: '#f0f0f0' },
    modalItemText: { fontSize: 16, fontWeight: '500' },
});
