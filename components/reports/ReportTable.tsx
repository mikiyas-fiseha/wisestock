import { Colors } from '@/constants/Colors';
import React from 'react';
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
}

export function ReportTable({ data, columns, totals }: ReportTableProps) {
    if (!data || data.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No data available for this report.</Text>
            </View>
        );
    }

    const renderCell = (col: ReportColumn, item: any, isTotal = false) => {
        let value = isTotal ? (totals?.[col.key] ?? '') : item[col.key];

        if (col.render && !isTotal) {
            return col.render(value, item);
        }

        if (col.isCurrency && typeof value === 'number') {
            value = `$${value.toFixed(2)}`;
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
                                        <Text style={styles.totalLabel}>TOTAL</Text>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#eee',
        width: '100%', // Ensure it takes full available width
    },
    headerRow: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderColor: '#ddd',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    headerText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.light.text,
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: '#f0f0f0',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    rowAlt: {
        backgroundColor: '#fcfcfc',
    },
    cell: {
        paddingHorizontal: 4,
    },
    cellText: {
        fontSize: 14,
        color: Colors.light.text,
    },
    textCenter: { textAlign: 'center' },
    textRight: { textAlign: 'right' },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.light.textSecondary,
        fontStyle: 'italic',
    },
    totalRow: {
        flexDirection: 'row',
        backgroundColor: '#edf2f7',
        borderTopWidth: 2,
        borderColor: '#e2e8f0',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: Colors.light.text,
    },
    totalText: {
        fontWeight: '800',
        color: Colors.light.text,
    }
});
