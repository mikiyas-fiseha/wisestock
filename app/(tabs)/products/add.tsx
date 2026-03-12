
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';

import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { useAddProduct, useUpdateProduct } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

const UNIT_TYPES = ['pcs', 'kg', 'liter', 'carton', 'bag'];

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
import { useTheme } from '@/context/ThemeContext';

export default function AddProductScreen() {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
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
    const [minStockLevel, setMinStockLevel] = useState('');
    const [unitType, setUnitType] = useState('pcs');
    const [customUnit, setCustomUnit] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [localLoading, setLocalLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const addProduct = useAddProduct();
    const updateProduct = useUpdateProduct();
    const loading = addProduct.isPending || updateProduct.isPending || isUploading || localLoading;

    // Auto-calculated profit
    const profit = useMemo(() => {
        const cost = parseFloat(costPrice) || 0;
        const sale = parseFloat(salePrice) || 0;
        return sale - cost;
    }, [costPrice, salePrice]);

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

            // Load unit type
            if (product.unit) {
                if (UNIT_TYPES.includes(product.unit)) {
                    setUnitType(product.unit);
                } else {
                    setUnitType('custom');
                    setCustomUnit(product.unit);
                }
            }

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
        // Validation
        if (!name) { showFeedback('error', 'Error', 'Product Name is required'); return; }

        if (!isVariable && (!primarySku || !costPrice || !salePrice)) {
            showFeedback('error', 'Error', 'Please fill in SKU, Cost Price, and Sale Price');
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

            const resolvedUnit = unitType === 'custom' ? (customUnit || 'pcs') : unitType;
            const productData = {
                company_id: company?.id,
                name,
                unit: resolvedUnit,
                description,
                primary_sku: isVariable ? variants[0].sku : primarySku,
                cost_price: isVariable ? 0 : parseFloat(costPrice),
                sale_price: isVariable ? parseFloat(variants[0].price) : parseFloat(salePrice),
                stock: 0, // Stock always starts at 0 — use Purchases to add stock
                status: isActive ? 'active' : 'inactive',
                image_url: publicImageUrl,
                category_id: selectedCategory?.id,
                attributes: baseAttributes
            };

            const minStock = parseInt(minStockLevel) || 0;

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
                // Create product — useAddProduct will auto-create branch_products with stock=0
                addProduct.mutate({ productData, variants, isVariable, minStockLevel: minStock }, {
                    onSuccess,
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
                <FontAwesome name={isOpen ? "chevron-down" : "chevron-right"} size={14} color={colors.textSecondary} style={{ marginRight: 8 }} />
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

                    {/* Inline Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8, marginLeft: -8 }}>
                            <FontAwesome name="arrow-left" size={20} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
                            {id ? 'Edit Product' : 'Add Product'}
                        </Text>
                    </View>

                    {/* Primary Section: Photo + Core Details */}
                    <View style={styles.card}>
                        <View style={styles.paramountRow}>
                            {/* Photo Left */}
                            <TouchableOpacity onPress={pickImage} style={styles.compactImageBtn}>
                                {imageUri ? <Image source={{ uri: imageUri }} style={styles.compactImage} /> :
                                    <View style={styles.imagePlaceholder}><FontAwesome name="camera" size={20} color={colors.textSecondary} /></View>
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
                                            <FontAwesome name="barcode" size={18} color={colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Unit Type */}
                        <Text style={styles.label}>Unit Type *</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                            {UNIT_TYPES.map(u => (
                                <TouchableOpacity
                                    key={u}
                                    onPress={() => setUnitType(u)}
                                    style={{
                                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                                        borderWidth: 1.5,
                                        borderColor: unitType === u ? colors.primary : colors.border,
                                        backgroundColor: unitType === u ? colors.primary + '15' : (colors.card + 'E0'),
                                    }}
                                >
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: unitType === u ? colors.primary : colors.textSecondary }}>{u}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                onPress={() => setUnitType('custom')}
                                style={{
                                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                                    borderWidth: 1.5,
                                    borderColor: unitType === 'custom' ? colors.primary : colors.border,
                                    backgroundColor: unitType === 'custom' ? colors.primary + '15' : (colors.card + 'E0'),
                                }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: unitType === 'custom' ? colors.primary : colors.textSecondary }}>Custom</Text>
                            </TouchableOpacity>
                        </View>
                        {unitType === 'custom' && (
                            <AppTextInput
                                label="Custom Unit"
                                value={customUnit}
                                onChangeText={setCustomUnit}
                                placeholder="e.g. dozen, box, meter"
                                style={{ marginBottom: 8 }}
                            />
                        )}

                        {/* Prices Row */}
                        {!isVariable && (
                            <>
                                <View style={styles.row}>
                                    <View style={styles.half}><AppTextInput label="Cost Price *" value={costPrice} onChangeText={setCostPrice} keyboardType="numeric" prefix="$" /></View>
                                    <View style={styles.half}><AppTextInput label="Sale Price *" value={salePrice} onChangeText={setSalePrice} keyboardType="numeric" prefix="$" /></View>
                                </View>

                                {/* Auto Profit */}
                                {(costPrice || salePrice) && (
                                    <View style={styles.profitRow}>
                                        <Text style={styles.profitLabel}>Profit per unit</Text>
                                        <Text style={[styles.profitValue, profit < 0 && { color: colors.danger }]}>
                                            {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
                                        </Text>
                                    </View>
                                )}
                            </>
                        )}

                        {/* Min Stock Level */}
                        {!isVariable && (
                            <AppTextInput
                                label="Minimum Stock Level"
                                value={minStockLevel}
                                onChangeText={setMinStockLevel}
                                keyboardType="numeric"
                                placeholder="Alert when stock falls below this"
                                style={{ marginTop: 8 }}
                            />
                        )}
                    </View>

                    {/* Advanced: Variants (Toggle) */}
                    <View style={styles.card}>
                        <SectionHeader
                            title="Product Variants"
                            isOpen={isVariable}
                            onToggle={() => setIsVariable(!isVariable)}
                            rightElement={<Switch value={isVariable} onValueChange={setIsVariable} trackColor={{ false: colors.border, true: colors.primary }} style={{ transform: [{ scale: 0.7 }] }} />}
                        />

                        {isVariable && (
                            <View style={styles.sectionContent}>
                                {variants.map((v, i) => (
                                    <View key={i} style={styles.variantRow}>
                                        <Text style={{ fontWeight: '500', color: colors.text }}>{v.sku}</Text>
                                        <Text style={{ color: colors.textSecondary }}>${v.price}</Text>
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
                                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>+ Add Field</Text>
                                </TouchableOpacity>

                                {categoryAttributes.map(attr => (
                                    <AppTextInput
                                        key={attr.id}
                                        label={attr.name}
                                        value={baseAttributes[attr.name] || ''}
                                        onChangeText={(text) => setBaseAttributes({ ...baseAttributes, [attr.name]: text })}
                                    />
                                ))}
                                {categoryAttributes.length === 0 && <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>No fields configured.</Text>}
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

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    content: { padding: 12, paddingBottom: 100 },
    card: { backgroundColor: colors.card + 'E0', borderRadius: 10, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: colors.border },

    // Rows
    paramountRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },

    // Components
    compactImageBtn: { width: 70, height: 70, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    compactImage: { width: '100%', height: '100%' },
    imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },

    miniScanBtn: { padding: 8, justifyContent: 'center' },

    // Switch / Status
    switchContainer: { flexDirection: 'row', alignItems: 'center', height: 48, backgroundColor: colors.card + 'E0', borderRadius: 8, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.border },
    switchText: { fontSize: 12, color: colors.textSecondary, marginHorizontal: 4 },
    activeSwitchText: { color: colors.primary, fontWeight: '600' },

    // Section Headers (Collapsible)
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    sectionTitleText: { fontSize: 14, fontWeight: '600', color: colors.text },
    sectionContent: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: colors.border },

    // Pickers
    topBorder: { borderTopWidth: 1, borderColor: colors.border, marginTop: 12, paddingTop: 12 },
    pickerWrapper: { borderRadius: 8, backgroundColor: colors.card + 'E0', height: 48, justifyContent: 'center', marginBottom: 12 },
    pickerWrapperSmall: { borderRadius: 8, backgroundColor: colors.card + 'E0', height: 48, justifyContent: 'center' },
    picker: { height: 48, width: '100%' },
    miniPicker: { height: 48, width: '100%' },

    label: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 4 },

    // Variant Row
    variantRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, borderBottomWidth: 1, borderColor: colors.border },

    // Footer
    footer: { padding: 16, backgroundColor: colors.card + 'E0', borderTopWidth: 1, borderColor: colors.border },

    // Modals
    modalContainer: { flex: 1, backgroundColor: 'transparent' },
    modalHeader: { padding: 16, paddingTop: 16, borderBottomWidth: 1, borderColor: colors.border },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    scannerContainer: { flex: 1, backgroundColor: 'black' },
    scannerOverlay: { flex: 1, justifyContent: 'flex-end', paddingBottom: 50, alignItems: 'center' },
    scannerText: { color: 'white', fontSize: 24, marginBottom: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 16 },
    modalContent: { backgroundColor: colors.card + 'E0', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: colors.border },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 8, color: colors.text },
    skuContainer: { flexDirection: 'row', gap: 8 },
    scanButton: { backgroundColor: colors.primary, height: 48, width: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 26 },

    // Profit Display
    profitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.success + '15', borderRadius: 8, padding: 10, marginTop: 8 },
    profitLabel: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
    profitValue: { fontSize: 15, fontWeight: '700', color: colors.success },
});
