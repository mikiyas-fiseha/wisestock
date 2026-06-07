import { CustomerListItem } from '@/components/CustomerListItem';
import { SearchFilterHeader } from '@/components/SearchFilterHeader';
import { AppButton } from '@/components/ui/AppButton';
import { Gradients, Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useCustomers } from '@/hooks/useSupabaseQuery';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';


export default function CustomersScreen() {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({});

    // Pass search and filters to the hook
    const { data: customers, isLoading: loading } = useCustomers(searchQuery, filters);
    const statusBarPadding = 0;

    const handleSearch = (text: string) => setSearchQuery(text);
    const handleFilter = (newFilters: Record<string, string>) => setFilters(newFilters);

    const filterGroups = [
        {
            key: 'balance',
            title: t('customers.account_status'),
            options: [
                { label: t('customers.outstanding_balance'), value: 'outstanding' }
            ]
        },
        {
            key: 'customer_type',
            title: t('customers.customer_type'),
            options: [
                { label: t('customers.retail'), value: 'retail' },
                { label: t('customers.wholesale'), value: 'wholesale' }
            ]
        },
        {
            key: 'status',
            title: t('reports.status'),
            options: [
                { label: t('common.active'), value: 'active' },
                { label: t('common.blocked'), value: 'blocked' },
                { label: t('common.inactive'), value: 'inactive' }
            ]
        }
    ];

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
                    <Text style={styles.headerTitle}>{t('customers.customer_list')}</Text>
                    <Text style={styles.headerSubtitle}>{t('customers.manage_subtitle')}</Text>
                </View>
                <AppButton
                    title={t('common.add')}
                    onPress={() => router.push('/(tabs)/customers/add')}
                    style={{ paddingHorizontal: 20, marginVertical: 0, height: 40, borderRadius: 24 }}
                    textStyle={styles.newButtonText}
                />
            </View>

            <SearchFilterHeader
                onSearch={handleSearch}
                onFilter={handleFilter}
                filterGroups={filterGroups}
                activeFilters={filters}
                placeholder={t('customers.search_placeholder')}
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
                            <Text style={styles.emptyText}>{t('customers.no_customers')}</Text>
                            <Text style={styles.emptySubtext}>{t('customers.empty_subtitle')}</Text>
                            <AppButton
                                title={t('customers.add_customer')}
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
        paddingTop: Layout.spacing.lg,
        paddingBottom: Layout.spacing.md,
        marginTop: 8,
        backgroundColor: 'transparent',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    newButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        height: 40,
        width: 80,
        borderRadius: 20,
    },
    newButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
    list: {
        padding: Layout.spacing.lg,
        paddingTop: Layout.spacing.xs,
        paddingBottom: 20,
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
        backgroundColor: 'transparent',
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
