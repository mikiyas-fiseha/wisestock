
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';

import { Gradients } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useSuppliers } from '@/hooks/useSuppliers';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SuppliersScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { suppliers, isLoading, error, isDeleting } = useSuppliers();
    const headerTopPadding = 16;
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
            <View style={styles.center}><LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <ResponsiveContainer>
                {/* Header Section */}
                <View style={[styles.header, { paddingTop: headerTopPadding }]}>
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
                    <FontAwesome name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or contact..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <FlatList
                    data={filteredSuppliers}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={isLoading} onRefresh={() => { }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <FontAwesome name="truck" size={60} color={colors.textSecondary} />
                            <Text style={styles.emptyText}>No suppliers found</Text>
                            <Text style={styles.emptySubText}>Add your first supplier to start tracking purchases.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => router.push(`/(tabs)/suppliers/${item.id}`)}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{item.name}</Text>
                                <View style={[
                                    styles.balanceBadge,
                                    { backgroundColor: (item.current_balance || 0) > 0 ? colors.danger + '20' : colors.success + '20' }
                                ]}>
                                    <Text style={[
                                        styles.balanceText,
                                        { color: (item.current_balance || 0) > 0 ? colors.danger : colors.success }
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

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
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
        paddingTop: 24,
        paddingBottom: 20,
        backgroundColor: 'transparent',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card + 'E0',
        marginHorizontal: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 20,

    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 110,
    },
    card: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 16,

        padding: 16,
        marginBottom: 12,
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
        color: colors.text,
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
        color: colors.textSecondary,
        fontSize: 14,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    }
});
