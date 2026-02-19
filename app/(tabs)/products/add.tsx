
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { usePurchases } from '@/hooks/usePurchases';
import { useAddProduct, useUpdateProduct } from '@/hooks/useSupabaseQuery';
import { useSuppliers } from '@/hooks/useSuppliers';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Picker } from '@react-native-picker/picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

interface Category {
    id: string;
    name: string;
}

interface Attribute {
    id: string;
    name: string;
    code: string;
}

interface Variant {
    id?: string;
    sku: string;
    price: string;
    stock: string;
    attributes: Record<string, string>;
}

import { RoleGuard } from '@/components/auth/RoleGuard';

export default function AddProductScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { company } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const { showFeedback } = useFeedback();

    // Base State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [primarySku, setPrimarySku] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [salePrice, setSalePrice] = useState('');
    const [stock, setStock] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [localLoading, setLocalLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const addProduct = useAddProduct();
    const updateProduct = useUpdateProduct();
    const { suppliers } = useSuppliers();
    const { createPurchase } = usePurchases();
    const loading = addProduct.isPending || updateProduct.isPending || isUploading || localLoading;

    // Scanner State
    const [showScanner, setShowScanner] = useState(false);
    const [scannedData, setScannedData] = useState<string | null>(null);

    // Variable Product State
    const [isVariable, setIsVariable] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [categoryAttributes, setCategoryAttributes] = useState<Attribute[]>([]);
    const [variants, setVariants] = useState<Variant[]>([]);

    // Variant Modal
    const [variantModalVisible, setVariantModalVisible] = useState(false);
    const [newVarSku, setNewVarSku] = useState('');
    const [newVarPrice, setNewVarPrice] = useState('');
    const [newVarStock, setNewVarStock] = useState('');
    const [newVarAttributes, setNewVarAttributes] = useState<Record<string, string>>({});

    // Custom Field Modal
    const [fieldModalVisible, setFieldModalVisible] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState('text');
    const [baseAttributes, setBaseAttributes] = useState<Record<string, string>>({});

    // Purchase / Initial Stock State
    const [supplierId, setSupplierId] = useState('');
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash'); // cash, bank, credit
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [purchaseNotes, setPurchaseNotes] = useState('');

    useEffect(() => {
        if (company) {
            fetchCategories(); // Always fetch categories first to map attributes correctly
        }
    }, [company]);

    useEffect(() => {
        if (id) {
            fetchProductForEdit();
        }
    }, [id, categories]); // Depend on categories to ensure mapping works

    // Auto-select Default Supplier if not selected
    useEffect(() => {
        if (!id && !supplierId && suppliers?.length) {
            // Try to find "Default Supplier" or failover to first one?
            // User requested "automatically assign a Default Supplier"
            const defaultSup = suppliers.find(s => s.name === "Default Supplier");
            if (defaultSup) {
                setSupplierId(defaultSup.id);
            }
        }
    }, [suppliers, id, supplierId]);

    // Payment Logic Effect: Auto-calc Amount Paid based on Method
    useEffect(() => {
        if (!id && !isVariable) {
            const cost = parseFloat(costPrice) || 0;
            const qty = parseFloat(stock) || 0;
            const total = cost * qty;

            if (paymentMethod === 'cash') {
                // If Cash, assume fully paid
                setAmountPaid(total.toFixed(2));
            } else if (paymentMethod === 'credit') {
                // If Credit, default to 0 (pay later) if empty, or leave as is?
                // User said "defaulting to zero".
                // Only reset if it looks like we switched modes or it's empty
                if (!amountPaid || amountPaid === total.toFixed(2)) {
                    setAmountPaid('0');
                }
            }
        }
    }, [paymentMethod, costPrice, stock, isVariable, id]);

    const fetchProductForEdit = async () => {
        if (!id) return;
        setLocalLoading(true);
        try {
            const { data: product, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            setName(product.name);
            setDescription(product.description || '');
            setIsActive(product.status === 'active');
            setImageUri(product.image_url);

            // Map Base Attributes
            if (product.attributes) {
                setBaseAttributes(product.attributes);
            }

            // Variable vs Simple
            const { data: vars } = await supabase.from('product_variants').select('*').eq('product_id', id);

            if (vars && vars.length > 0) {
                setIsVariable(true);
                setVariants(vars.map((v: any) => ({
                    id: v.id,
                    sku: v.sku,
                    price: v.price_override.toString(),
                    stock: v.stock.toString(),
                    attributes: v.attributes
                })));
            } else {
                setIsVariable(false);
                setPrimarySku(product.primary_sku);
                setCostPrice(product.cost_price?.toString() || '');
                setSalePrice(product.sale_price?.toString() || '');
                setStock(product.stock?.toString() || '');
            }

            // Set Category and Attributes
            if (product.category_id) {
                const cat = categories.find(c => c.id === product.category_id);
                if (cat) {
                    handleCategorySelect(cat);
                }
            }

        } catch (e: any) {
            console.error(e);
            showFeedback('error', 'Error', 'Failed to load product details');
        } finally {
            setLocalLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase.from('categories').select('*').order('name');
            if (error) throw error;
            setCategories(data || []);
        } catch (e) {
            console.error("Error fetching categories:", e);
        }
    };

    const handleCategorySelect = async (cat: Category) => {
        setSelectedCategory(cat);
        const { data } = await supabase
            .from('category_attributes')
            .select('attributes(*)')
            .eq('category_id', cat.id);

        // @ts-ignore
        const rawAttrs = data?.map((d: any) => d.attributes) || [];
        const attrs = rawAttrs.flat().filter((a: any) => a && a.id);
        setCategoryAttributes(attrs);
    };

    const createCustomField = async () => {
        if (!newFieldName) return;
        setLocalLoading(true);
        try {
            // 1. Create Attribute
            const { data: attr, error } = await supabase
                .from('attributes')
                .insert([{
                    company_id: company?.id,
                    name: newFieldName,
                    code: newFieldName.toLowerCase().replace(/\s+/g, '_'),
                    type: newFieldType
                }])
                .select()
                .single();

            if (error) throw error;

            // 2. Link to Category (if selected)
            if (selectedCategory) {
                await supabase
                    .from('category_attributes')
                    .insert([{ category_id: selectedCategory.id, attribute_id: attr.id }]);
            }

            // 3. Update Local State
            setCategoryAttributes([...categoryAttributes, attr]);
            setFieldModalVisible(false);
            setNewFieldName('');
            showFeedback('success', 'Success', 'Field created');
        } catch (e: any) {
            showFeedback('error', 'Error', e.message);
        } finally {
            setLocalLoading(false);
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled) {
                setImageUri(result.assets[0].uri);
            }
        } catch (e) {
            showFeedback('error', 'Error', 'Could not pick image');
        }
    };

    const uploadImage = async (uri: string): Promise<string | null> => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();
            const fileName = `${company?.id}/${Date.now()}.jpg`;

            const { error } = await supabase.storage
                .from('product-images')
                // @ts-ignore
                .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

            if (error) return null;

            const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
            return data.publicUrl;
        } catch (e) {
            return null;
        }
    };

    const addVariant = () => {
        if (!newVarSku || !newVarPrice) {
            showFeedback('error', 'Error', 'SKU and Price are required');
            return;
        }
        setVariants([...variants, {
            sku: newVarSku,
            price: newVarPrice,
            stock: newVarStock || '0',
            attributes: { ...newVarAttributes }
        }]);
        setVariantModalVisible(false);
        setNewVarSku('');
        setNewVarStock('');
        setNewVarAttributes({});
    };

    const handleSave = async () => {
        // Validation Updates
        if (!name) { showFeedback('error', 'Error', 'Product Name is required'); return; }

        // Revised Validation: Supplier Required for new simple products
        if (!id && !isVariable && !supplierId) {
            showFeedback('error', 'Error', 'Supplier is required for initial stock');
            return;
        }

        if (!isVariable && (!primarySku || !costPrice || !salePrice || !stock)) {
            showFeedback('error', 'Error', 'Please fill in all required fields');
            return;
        }
        if (isVariable && variants.length === 0) {
            showFeedback('error', 'Error', 'Please add at least one variant');
            return;
        }

        if (!company?.id) {
            showFeedback('error', 'Error', 'Company ID missing. Please re-login.');
            return;
        }

        try {
            setIsUploading(true);
            let publicImageUrl = imageUri;
            if (imageUri && imageUri.startsWith('file://')) {
                publicImageUrl = await uploadImage(imageUri);
            }
            setIsUploading(false);

            const productData = {
                company_id: company?.id,
                name,
                description,
                primary_sku: isVariable ? variants[0].sku : primarySku,
                cost_price: isVariable ? 0 : parseFloat(costPrice),
                sale_price: isVariable ? parseFloat(variants[0].price) : parseFloat(salePrice),
                stock: isVariable ? variants.reduce((acc, v) => acc + parseInt(v.stock, 10), 0) : parseInt(stock, 10),
                status: isActive ? 'active' : 'inactive',
                image_url: publicImageUrl,
                category_id: selectedCategory?.id,
                attributes: baseAttributes
            };

            const onSuccess = () => {
                showFeedback('success', 'Success', id ? 'Product updated' : 'Product saved');
                router.back();
            };

            const onError = (error: any) => {
                showFeedback('error', 'Error', error.message || 'Failed to save');
            };

            if (id) {
                updateProduct.mutate({ id, productData, variants, isVariable }, { onSuccess, onError });
            } else {
                const initialStock = productData.stock || 0;
                // Force initial stock to 0 so purchase adds it
                productData.stock = 0;

                addProduct.mutate({ productData, variants, isVariable }, {
                    onSuccess: async (newProduct) => {
                        if (!isVariable) {
                            try {
                                const cost = parseFloat(costPrice) || 0;
                                const qty = initialStock;
                                const total = cost * qty;

                                await createPurchase({
                                    supplier_id: supplierId,
                                    purchase_date: new Date(),
                                    invoice_number: invoiceNumber || `INIT-${Date.now()}`,
                                    total_amount: total,
                                    amount_paid: parseFloat(amountPaid) || 0,
                                    payment_method: paymentMethod,
                                    notes: purchaseNotes || 'Initial Stock Purchase',
                                    items: [{
                                        product_id: newProduct.id,
                                        quantity: qty,
                                        unit_cost: cost
                                    }]
                                });
                            } catch (err: any) {
                                console.error("Failed to create purchase", err);
                                showFeedback('warning', 'Product Created', 'But failed to record purchase: ' + err.message);
                                router.back();
                                return;
                            }
                        }
                        onSuccess();
                    },
                    onError
                });
            }

        } catch (e: any) {
            setIsUploading(false);
            showFeedback('error', 'Error', e.message || 'Failed to save');
        }
    };

    // Scanner Logic
    const handleScan = () => {
        if (!permission) { requestPermission(); return; }
        if (!permission.granted) { requestPermission(); return; }
        setShowScanner(true);
        setScannedData(null);
    };

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (data && data !== scannedData) {
            setScannedData(data);
            if (variantModalVisible) {
                setNewVarSku(data);
            } else {
                setPrimarySku(data);
            }
        }
        setShowScanner(false);
        showFeedback('success', 'Scanned', `SKU: ${data}`);
    };

    // Collapsible Section Component
    const SectionHeader = ({ title, isOpen, onToggle, rightElement }: { title: string, isOpen: boolean, onToggle: () => void, rightElement?: React.ReactNode }) => (
        <TouchableOpacity onPress={onToggle} style={styles.sectionHeader} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesome name={isOpen ? "chevron-down" : "chevron-right"} size={14} color="#666" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitleText}>{title}</Text>
            </View>
            {rightElement}
        </TouchableOpacity>
    );

    const [showCustomFields, setShowCustomFields] = useState(false);

    return (
        <RoleGuard allowedRoles={['Admin']}>
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Primary Section: Photo + Core Details */}
                    <View style={styles.card}>
                        <View style={styles.paramountRow}>
                            {/* Photo Left */}
                            <TouchableOpacity onPress={pickImage} style={styles.compactImageBtn}>
                                {imageUri ? <Image source={{ uri: imageUri }} style={styles.compactImage} /> :
                                    <View style={styles.imagePlaceholder}><FontAwesome name="camera" size={20} color="#999" /></View>
                                }
                            </TouchableOpacity>

                            {/* Name & SKU Right */}
                            <View style={{ flex: 1 }}>
                                <AppTextInput label="Product Name *" value={name} onChangeText={setName} style={{ marginBottom: 8 }} />
                                <AppTextInput label="Description" value={description} onChangeText={setDescription} multiline numberOfLines={2} style={{ marginBottom: 8, height: 60 }} />
                                {!isVariable && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ flex: 1 }}>
                                            <AppTextInput label="SKU *" value={primarySku} onChangeText={setPrimarySku} placeholder="Scan/Enter" />
                                        </View>
                                        <TouchableOpacity onPress={handleScan} style={styles.miniScanBtn}>
                                            <FontAwesome name="barcode" size={18} color={Colors.light.primary} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Prices Row */}
                        {!isVariable && (
                            <View style={styles.row}>
                                <View style={styles.half}><AppTextInput label="Cost Price *" value={costPrice} onChangeText={setCostPrice} keyboardType="numeric" prefix="$" /></View>
                                <View style={styles.half}><AppTextInput label="Sale Price *" value={salePrice} onChangeText={setSalePrice} keyboardType="numeric" prefix="$" /></View>
                            </View>
                        )}
                    </View>

                    {/* Inventory & Supplier Section */}
                    <View style={styles.card}>

                        {/* Supplier & Purchase (Required for new) */}
                        {!id && !isVariable && (
                            <View style={{ paddingTop: 4 }}>
                                <Text style={styles.label}>Supplier *</Text>
                                <View style={styles.pickerWrapper}>
                                    <Picker
                                        selectedValue={supplierId}
                                        onValueChange={(itemValue) => setSupplierId(itemValue)}
                                        style={styles.picker}
                                    >
                                        <Picker.Item label="Select Supplier..." value="" color="#999" />
                                        {suppliers?.map(s => (
                                            <Picker.Item key={s.id} label={s.name} value={s.id} />
                                        ))}
                                    </Picker>
                                </View>

                                {supplierId ? (
                                    <>
                                        <View style={styles.row}>
                                            <View style={styles.half}>
                                                <AppTextInput
                                                    label="Quantity *"
                                                    value={stock}
                                                    onChangeText={setStock}
                                                    keyboardType="numeric"
                                                    placeholder="0"
                                                />
                                            </View>
                                            <View style={styles.half}>
                                                <Text style={styles.label}>Payment Type *</Text>
                                                <View style={styles.pickerWrapperSmall}>
                                                    <Picker
                                                        selectedValue={paymentMethod}
                                                        onValueChange={(itemValue) => setPaymentMethod(itemValue)}
                                                        style={styles.miniPicker}
                                                    >
                                                        <Picker.Item label="Cash (Fully Paid)" value="cash" style={{ fontSize: 13 }} />
                                                        <Picker.Item label="Credit (Pay Later)" value="credit" style={{ fontSize: 13 }} />
                                                    </Picker>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Show Amount Paid only if Credit */}
                                        {paymentMethod === 'credit' && (
                                            <View style={[styles.row, { marginTop: 12 }]}>
                                                <View style={styles.half}>
                                                    <AppTextInput
                                                        label="Amount Paid Now"
                                                        value={amountPaid}
                                                        onChangeText={setAmountPaid}
                                                        keyboardType="numeric"
                                                        placeholder="0.00"
                                                    />
                                                </View>
                                                <View style={styles.half} />
                                            </View>
                                        )}
                                    </>
                                ) : null}
                            </View>
                        )}

                        {/* For Edit Mode or Variable, we might need different fields, 
                            but user specifically asked to remove "Status" and "Opening Stock".
                            If editing, we usually show current stock. 
                            Let's keep it clean for now as requested. 
                        */}
                    </View>

                    {/* Advanced: Variants (Toggle) */}
                    <View style={styles.card}>
                        <SectionHeader
                            title="Product Variants"
                            isOpen={isVariable}
                            onToggle={() => setIsVariable(!isVariable)}
                            rightElement={<Switch value={isVariable} onValueChange={setIsVariable} trackColor={{ false: '#eee', true: Colors.light.primary }} style={{ transform: [{ scale: 0.7 }] }} />}
                        />

                        {isVariable && (
                            <View style={styles.sectionContent}>
                                {variants.map((v, i) => (
                                    <View key={i} style={styles.variantRow}>
                                        <Text style={{ fontWeight: '500' }}>{v.sku}</Text>
                                        <Text style={{ color: '#666' }}>${v.price}</Text>
                                    </View>
                                ))}
                                <AppButton title="+ Add Variant" onPress={() => setVariantModalVisible(true)} variant="outline" style={{ marginTop: 8 }} />
                            </View>
                        )}
                    </View>

                    {/* Advanced: Custom Fields (Toggle) */}
                    <View style={styles.card}>
                        <SectionHeader
                            title="Custom Fields"
                            isOpen={showCustomFields}
                            onToggle={() => setShowCustomFields(!showCustomFields)}
                        />

                        {showCustomFields && (
                            <View style={styles.sectionContent}>
                                <TouchableOpacity onPress={() => setFieldModalVisible(true)} style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
                                    <Text style={{ color: Colors.light.primary, fontSize: 13, fontWeight: '600' }}>+ Add Field</Text>
                                </TouchableOpacity>

                                {categoryAttributes.map(attr => (
                                    <AppTextInput
                                        key={attr.id}
                                        label={attr.name}
                                        value={baseAttributes[attr.name] || ''}
                                        onChangeText={(text) => setBaseAttributes({ ...baseAttributes, [attr.name]: text })}
                                    />
                                ))}
                                {categoryAttributes.length === 0 && <Text style={{ color: '#999', fontSize: 13, fontStyle: 'italic' }}>No fields configured.</Text>}
                            </View>
                        )}
                    </View>

                </ScrollView>

                {/* Sticky Footer */}
                <View style={styles.footer}>
                    <AppButton title={id ? "Update Product" : "Save Product"} onPress={handleSave} loading={loading} />
                </View>

                {/* Modals */}
                <Modal visible={showScanner} animationType="slide">
                    <View style={styles.scannerContainer}>
                        <CameraView style={StyleSheet.absoluteFillObject} facing="back" onBarcodeScanned={handleBarCodeScanned} />
                        <View style={styles.scannerOverlay}>
                            <Text style={styles.scannerText}>Scan Barcode</Text>
                            <AppButton title="Cancel" onPress={() => setShowScanner(false)} variant="outline" style={{ marginTop: 50, width: 200 }} />
                        </View>
                    </View>
                </Modal>

                <Modal visible={fieldModalVisible} animationType="fade" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>New Custom Field</Text>
                            <AppTextInput label="Field Name" value={newFieldName} onChangeText={setNewFieldName} placeholder="e.g. Color, Size" />
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                                <AppButton title="Cancel" variant="outline" onPress={() => setFieldModalVisible(false)} style={{ flex: 1 }} />
                                <AppButton title="Create" onPress={createCustomField} style={{ flex: 1 }} />
                            </View>
                        </View>
                    </View>
                </Modal>

                <Modal visible={variantModalVisible} animationType="slide">
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}><Text style={styles.modalTitle}>New Variant</Text></View>
                        <ScrollView contentContainerStyle={styles.content}>
                            <View style={styles.skuContainer}>
                                <View style={{ flex: 1 }}>
                                    <AppTextInput label="SKU *" value={newVarSku} onChangeText={setNewVarSku} placeholder="Unique SKU" />
                                </View>
                                <TouchableOpacity style={styles.scanButton} onPress={handleScan}>
                                    <FontAwesome name="camera" size={24} color="white" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 8 }}><AppTextInput label="Price *" value={newVarPrice} onChangeText={setNewVarPrice} keyboardType="numeric" prefix="$" /></View>
                                <View style={{ flex: 1 }}><AppTextInput label="Stock" value={newVarStock} onChangeText={setNewVarStock} keyboardType="numeric" /></View>
                            </View>
                            <Text style={styles.sectionTitle}>Attributes</Text>
                            {categoryAttributes.map(attr => (
                                <AppTextInput
                                    key={attr.id}
                                    label={attr.name}
                                    value={newVarAttributes[attr.name] || ''}
                                    onChangeText={(text) => setNewVarAttributes({ ...newVarAttributes, [attr.name]: text })}
                                />
                            ))}
                        </ScrollView>
                        <View style={styles.footer}>
                            <AppButton title="Cancel" variant="outline" onPress={() => setVariantModalVisible(false)} style={{ marginBottom: 12 }} />
                            <AppButton title="Add Variant" onPress={addVariant} />
                        </View>
                    </View>
                </Modal>
            </View>
        </RoleGuard>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    content: { padding: 12, paddingBottom: 100 },
    card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },

    // Rows
    paramountRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },

    // Components
    compactImageBtn: { width: 70, height: 70, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
    compactImage: { width: '100%', height: '100%' },
    imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },

    miniScanBtn: { padding: 8, justifyContent: 'center' },

    // Switch / Status
    switchContainer: { flexDirection: 'row', alignItems: 'center', height: 48, backgroundColor: '#f9f9f9', borderRadius: 8, paddingHorizontal: 8 },
    switchText: { fontSize: 12, color: '#999', marginHorizontal: 4 },
    activeSwitchText: { color: Colors.light.primary, fontWeight: '600' },

    // Section Headers (Collapsible)
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    sectionTitleText: { fontSize: 14, fontWeight: '600', color: '#333' },
    sectionContent: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: '#eee' },

    // Pickers
    topBorder: { borderTopWidth: 1, borderColor: '#eee', marginTop: 12, paddingTop: 12 },
    pickerWrapper: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', height: 48, justifyContent: 'center', marginBottom: 12 },
    pickerWrapperSmall: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', height: 48, justifyContent: 'center' },
    picker: { height: 48, width: '100%' },
    miniPicker: { height: 48, width: '100%' },

    label: { fontSize: 13, fontWeight: '500', color: '#555', marginBottom: 4 },

    // Variant Row
    variantRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' },

    // Footer
    footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },

    // Modals
    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { padding: 16, paddingTop: 60, borderBottomWidth: 1, borderColor: '#eee' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    scannerContainer: { flex: 1, backgroundColor: 'black' },
    scannerOverlay: { flex: 1, justifyContent: 'flex-end', paddingBottom: 50, alignItems: 'center' },
    scannerText: { color: 'white', fontSize: 24, marginBottom: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
    modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 8 },
    skuContainer: { flexDirection: 'row', gap: 8 },
    scanButton: { backgroundColor: Colors.light.primary, height: 48, width: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 26 },

});
