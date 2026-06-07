
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export interface ReportColumn {
    key: string;
    title: string;
    width?: number; // Flex value or fixed width
    align?: 'left' | 'center' | 'right';
    isCurrency?: boolean;
    render?: (value: any, item: any) => React.ReactNode;
}

interface ReportTableProps {
    data: any[];
    columns: ReportColumn[];
    totals?: Record<string, number>; // Key match column key
    onRowPress?: (item: any) => void;
    emptyMessage?: string;
}

export function ReportTable({ data, columns, totals, emptyMessage }: ReportTableProps) {
    const { colors } = useTheme();
    const { company } = useAuth();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    if (!data || data.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <FontAwesome name="inbox" size={32} color={colors.textSecondary + '40'} />
                </View>
                <Text style={styles.emptyText}>{emptyMessage || t('common.no_data') || 'No data available for this report.'}</Text>
            </View>
        );
    }

    const renderCell = (col: ReportColumn, item: any, isTotal = false) => {
        let value = isTotal ? (totals?.[col.key] ?? '') : item[col.key];

        if (col.render && !isTotal) {
            return col.render(value, item);
        }

        if (col.isCurrency && typeof value === 'number') {
            const currency = company?.currency || '$';
            value = `${currency}${value.toFixed(2)}`;
        }

        return (
            <Text style={[
                styles.cellText,
                col.align === 'center' && styles.textCenter,
                col.align === 'right' && styles.textRight,
                isTotal && styles.totalText
            ]}>
                {value}
            </Text>
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                    {/* Header */}
                    <View style={styles.headerRow}>
                        {columns.map(col => (
                            <View key={col.key} style={[styles.cell, { width: col.width || 100 }]}>
                                <Text style={[
                                    styles.headerText,
                                    col.align === 'center' && styles.textCenter,
                                    col.align === 'right' && styles.textRight,
                                ]}>{col.title}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Body */}
                    <ScrollView style={{ maxHeight: '100%' }}>
                        {data.map((item, index) => (
                            <View key={index} style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
                                {columns.map(col => (
                                    <View key={col.key} style={[styles.cell, { width: col.width || 100 }]}>
                                        {renderCell(col, item)}
                                    </View>
                                ))}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Totals Row */}
                    {totals && (
                        <View style={styles.totalRow}>
                            {columns.map((col, index) => (
                                <View key={col.key} style={[styles.cell, { width: col.width || 100 }]}>
                                    {index === 0 && !totals[col.key] ? (
                                        <Text style={styles.totalLabel}>{t('common.total').toUpperCase()}</Text>
                                    ) : (
                                        renderCell(col, {}, true)
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: (colors.card + 'E0'),
        borderRadius: 8,
        overflow: 'hidden',

        width: '100%', // Ensure it takes full available width
    },
    headerRow: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingVertical: 12,
        paddingHorizontal: 0,
    },
    headerText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.textSecondary,
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingVertical: 12,
        paddingHorizontal: 0,
    },
    rowAlt: {
        backgroundColor: 'transparent',
    },
    cell: {
        paddingHorizontal: 4,
    },
    cellText: {
        fontSize: 14,
        color: colors.text,
    },
    textCenter: { textAlign: 'center' },
    textRight: { textAlign: 'right' },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.border + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        maxWidth: 200,
    },
    totalRow: {
        flexDirection: 'row',
        backgroundColor: colors.primary + '10',
        borderTopWidth: 2,
        borderColor: colors.primary + '30',
        paddingVertical: 12,
        paddingHorizontal: 0,
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.text,
    },
    totalText: {
        fontWeight: '800',
        color: colors.text,
    }
});
