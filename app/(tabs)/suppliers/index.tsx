
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Colors } from '@/constants/Colors';
import { useSuppliers } from '@/hooks/useSuppliers';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SuppliersScreen() {
    const router = useRouter();
    const { suppliers, isLoading, error, isDeleting } = useSuppliers();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSuppliers = suppliers?.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handlePress = (id: string) => {
        router.push({ pathname: '/(tabs)/suppliers/[id]', params: { id } });
    };

    if (isLoading && !suppliers) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ResponsiveContainer>
                {/* Header Section */}
                <View style={styles.header}>
                    <Text style={styles.title}>Suppliers</Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => router.push('/(tabs)/suppliers/add')}
                    >
                        <FontAwesome name="plus" size={16} color="#fff" />
                        <Text style={styles.addButtonText}>Add Supplier</Text>
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <FontAwesome name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search suppliers..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* List */}
                <FlatList
                    data={filteredSuppliers}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={isLoading} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <FontAwesome name="truck" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>No suppliers found.</Text>
                            <Text style={styles.emptySubText}>Add your first supplier to track purchases.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card} onPress={() => handlePress(item.id)}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{item.name}</Text>
                                <View style={[
                                    styles.balanceBadge,
                                    { backgroundColor: (item.current_balance || 0) > 0 ? '#FFE6E6' : '#E6FFFA' }
                                ]}>
                                    <Text style={[
                                        styles.balanceText,
                                        { color: (item.current_balance || 0) > 0 ? '#C53030' : '#276749' }
                                    ]}>
                                        {(item.current_balance || 0) > 0 ? `Owe: $${item.current_balance?.toFixed(2)}` : 'Paid'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.cardDetails}>
                                {item.contact_person && (
                                    <View style={styles.detailRow}>
                                        <FontAwesome name="user" size={14} color="#666" style={styles.detailIcon} />
                                        <Text style={styles.detailText}>{item.contact_person}</Text>
                                    </View>
                                )}
                                {item.phone && (
                                    <View style={styles.detailRow}>
                                        <FontAwesome name="phone" size={14} color="#666" style={styles.detailIcon} />
                                        <Text style={styles.detailText}>{item.phone}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    )}
                />
            </ResponsiveContainer>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        elevation: 2,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#eee',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: Colors.light.text,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.light.text,
    },
    balanceBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    balanceText: {
        fontSize: 12,
        fontWeight: '700',
    },
    cardDetails: {
        flexDirection: 'row',
        gap: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailIcon: {
        marginRight: 6,
        width: 16,
    },
    detailText: {
        color: Colors.light.textSecondary,
        fontSize: 14,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.light.textSecondary,
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    }
});
