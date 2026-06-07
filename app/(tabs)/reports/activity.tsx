import { AppHeader } from '@/components/AppHeader';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useTheme } from '@/context/ThemeContext';
import { ActivityLog, useActivityLogs } from '@/hooks/useActivityLogs';
import { formatDateTime } from '@/utils/date';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ActivityLogPage() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const styles = React.useMemo(() => createStyles(colors, insets), [colors, insets]);
    const router = useRouter();

    const [filterType, setFilterType] = useState('all');

    // E.g., filters: 'all', 'sale', 'product', 'expense', 'customer', etc.
    const filterOptions = [
        { label: t('common.all'), value: 'all' },
        { label: t('common.sales'), value: 'sale' },
        { label: t('common.products'), value: 'product' },
        { label: t('common.expenses'), value: 'expense' },
        { label: t('common.customers'), value: 'customer' },
        { label: t('common.suppliers'), value: 'supplier' }
    ];

    const { data, isLoading, error } = useActivityLogs({ entityType: filterType, limit: 100 });

    const getIconInfo = (action: string): { name: any, color: string, bg: string } => {
        if (action.includes('created')) return { name: 'plus', color: colors.success, bg: colors.success + '20' };
        if (action.includes('updated')) return { name: 'pencil', color: colors.primary, bg: colors.primary + '20' };
        if (action.includes('deleted') || action.includes('cancelled')) return { name: 'trash', color: colors.danger, bg: colors.danger + '20' };
        if (action.includes('payment')) return { name: 'money', color: colors.success, bg: colors.success + '20' };
        if (action.includes('adjusted')) return { name: 'exchange', color: colors.warning, bg: colors.warning + '20' };
        if (action.includes('return')) return { name: 'undo', color: colors.warning, bg: colors.warning + '20' };

        return { name: 'circle-o', color: colors.textSecondary, bg: colors.border };
    };

    const formatActionText = (action: string) => {
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const renderItem = ({ item }: { item: ActivityLog }) => {
        const { name, color, bg } = getIconInfo(item.action);

        return (
            <View style={styles.logCard}>
                <View style={[styles.iconBox, { backgroundColor: bg }]}>
                    <FontAwesome name={name} size={18} color={color} />
                </View>

                <View style={styles.contentBox}>
                    <Text style={styles.actionText}>{formatActionText(item.action)}</Text>

                    {item.entity_label && (
                        <Text style={styles.entityText}>
                            {item.entity_type.toUpperCase()}: <Text style={styles.entityValue}>{item.entity_label}</Text>
                        </Text>
                    )}

                    <View style={styles.metaRow}>
                        <FontAwesome name="user" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>{item.user_name}</Text>
                        <Text style={styles.metaDot}> • </Text>
                        <FontAwesome name="clock-o" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>{formatDateTime(new Date(item.created_at))}</Text>
                    </View>

                    {item.details && (
                        <View style={styles.detailsBox}>
                            <Text style={styles.detailsText}>
                                {JSON.stringify(item.details)
                                    .replace(/["{}]/g, '')
                                    .replace(/:/g, ': ')
                                    .replace(/,/g, ', ')}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <RoleGuard allowedRoles={['Admin', 'Manager']}>
            <View style={styles.container}>
                <AppHeader title={t('reports.activity_logs')} showBack={true} hideThemeToggle={true} />

                {/* Filters */}
                <View style={styles.filtersContainer}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={filterOptions}
                        keyExtractor={item => item.value}
                        contentContainerStyle={styles.filtersList}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.filterChip,
                                    filterType === item.value && styles.filterChipActive
                                ]}
                                onPress={() => setFilterType(item.value)}
                            >
                                <Text style={[
                                    styles.filterText,
                                    filterType === item.value && styles.filterTextActive
                                ]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                {/* List */}
                {isLoading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : error ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.errorText}>{t('reports.activity_logs_error')}</Text>
                    </View>
                ) : data?.data.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <FontAwesome name="file-text-o" size={48} color={colors.border} />
                        <Text style={styles.emptyText}>{t('reports.no_activity')}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={data?.data}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                    />
                )}
            </View>
        </RoleGuard>
    );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    filtersContainer: {
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: 12,
    },
    filtersList: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#fff',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: colors.danger,
        fontSize: 16,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 16,
        marginTop: 16,
    },
    listContent: {
        padding: 16,
        gap: 12,
        paddingBottom: insets.bottom + 20,
    },
    logCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    contentBox: {
        flex: 1,
    },
    actionText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    entityText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    entityValue: {
        color: colors.text,
        fontWeight: '500',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    metaDot: {
        fontSize: 12,
        color: colors.border,
        marginHorizontal: 4,
    },
    detailsBox: {
        marginTop: 12,
        padding: 12,
        backgroundColor: colors.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    detailsText: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
    }
});
