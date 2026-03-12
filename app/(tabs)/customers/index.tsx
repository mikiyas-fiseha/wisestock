import { CustomerListItem } from '@/components/CustomerListItem';
import { SearchFilterHeader } from '@/components/SearchFilterHeader';
import { AppButton } from '@/components/ui/AppButton';
import { Gradients, Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useDataExport } from '@/hooks/useDataExport';
import { useCustomers } from '@/hooks/useSupabaseQuery';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


export default function CustomersScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({});

    // Pass search and filters to the hook
    const { data: customers, isLoading: loading } = useCustomers(searchQuery, filters);
    const { exportToCSV } = useDataExport();
    const statusBarPadding = 0;

    const handleSearch = (text: string) => setSearchQuery(text);
    const handleFilter = (newFilters: Record<string, string>) => setFilters(newFilters);

    const filterGroups = [
        {
            key: 'balance',
            title: 'Account Status',
            options: [
                { label: 'Outstanding Balance', value: 'outstanding' }
            ]
        },
        {
            key: 'customer_type',
            title: 'Customer Type',
            options: [
                { label: 'Retail', value: 'retail' },
                { label: 'Wholesale', value: 'wholesale' }
            ]
        },
        {
            key: 'status',
            title: 'Status',
            options: [
                { label: 'Active', value: 'active' },
                { label: 'Blocked', value: 'blocked' },
                { label: 'Inactive', value: 'inactive' }
            ]
        }
    ];

    const handleExportCustomers = async () => {
        if (!customers || customers.length === 0) {
            alert("No customers to export");
            return;
        }

        const exportData = customers.map((c: any) => ({
            Name: c.name,
            Phone: c.phone || '',
            Email: c.email || '',
            Balance: c.current_balance,
            Address: c.address || ''
        }));

        await exportToCSV(exportData, `customers_export_${new Date().getTime()}.csv`);
    };

    return (
        <View style={[styles.container, { paddingTop: statusBarPadding }]}>
            <LinearGradient
                colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Customers</Text>
                    <Text style={styles.headerSubtitle}>Manage your client base</Text>
                </View>
                <AppButton
                    title="+ Add"
                    onPress={() => router.push('/(tabs)/customers/add')}
                    style={styles.newButton}
                    textStyle={styles.newButtonText}
                />
                <TouchableOpacity onPress={handleExportCustomers} style={[styles.newButton, { width: 40, paddingHorizontal: 0, marginLeft: 8, backgroundColor: 'transparent', }]}>
                    <FontAwesome name="download" size={16} color={colors.text} />
                </TouchableOpacity>
            </View>

            <SearchFilterHeader
                onSearch={handleSearch}
                onFilter={handleFilter}
                filterGroups={filterGroups}
                activeFilters={filters}
                placeholder="Search name or phone..."
            />

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
                <FlatList
                    data={customers}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <CustomerListItem
                            name={item.name}
                            phone={item.phone}
                            balance={item.current_balance}
                            customerType={item.customer_type}
                            status={item.status}
                            onPress={() => router.push({ pathname: '/(tabs)/customers/[id]', params: { id: item.id } })}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <Text style={{ fontSize: 32 }}>👥</Text>
                            </View>
                            <Text style={styles.emptyText}>No customers found</Text>
                            <Text style={styles.emptySubtext}>Add your first customer to track sales and credit history.</Text>
                            <AppButton
                                title="Add Customer"
                                onPress={() => router.push('/(tabs)/customers/add')}
                                style={{ marginTop: 20 }}
                            />
                        </View>
                    }
                />
            )}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Layout.spacing.lg,
        paddingVertical: Layout.spacing.md,
        backgroundColor: 'transparent',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2,
    },
    newButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        height: 40,
        width: 80,
        borderRadius: 20,
        ...Layout.shadows.small,
    },
    newButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
    list: {
        padding: Layout.spacing.lg,
        paddingTop: Layout.spacing.xs,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 16,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.card + 'E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Layout.spacing.md,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: '70%',
        lineHeight: 20,
    },
});
