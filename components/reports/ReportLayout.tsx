import { DateFilter, DatePeriod, DateRange, getRangeForPeriod } from '@/components/reports/DateFilter';
import { AppButton } from '@/components/ui/AppButton';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Colors, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useDataExport } from '@/hooks/useDataExport';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ReportLayoutProps {
    title: string;
    subtitle?: string;
    showDateFilter?: boolean;
    children: React.ReactNode;
    isLoading?: boolean;
    onRefresh?: () => void;
    onDateRangeChange?: (range: DateRange) => void;
    exportData?: any[];
    exportFilename?: string;
    chartContent?: React.ReactNode;
}

export function ReportLayout({
    title,
    subtitle,
    showDateFilter = true,
    children,
    isLoading = false,
    onRefresh,
    onDateRangeChange,
    exportData,
    exportFilename = 'report',
    chartContent
}: ReportLayoutProps) {
    const router = useRouter();
    const { company } = useAuth();
    const { exportToCSV, exportToPDF } = useDataExport();

    const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
    const [period, setPeriod] = useState<DatePeriod>('month');
    const [customRange, setCustomRange] = useState<DateRange>({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date()
    });

    // Handle period changes
    const handlePeriodChange = (newPeriod: DatePeriod) => {
        setPeriod(newPeriod);
        const newRange = getRangeForPeriod(newPeriod, customRange);
        if (onDateRangeChange) onDateRangeChange(newRange);
    };

    const handleCustomRangeChange = (newRange: DateRange) => {
        setCustomRange(newRange);
        if (period === 'custom' && onDateRangeChange) {
            onDateRangeChange(newRange);
        }
    };

    const handleExport = async (format: 'csv' | 'pdf') => {
        if (!exportData || exportData.length === 0) return;

        if (format === 'csv') {
            await exportToCSV(exportData, `${exportFilename}_${new Date().getTime()}.csv`);
        } else {
            await exportToPDF(exportData, title, `${exportFilename}_${new Date().getTime()}`);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
            <ResponsiveContainer>
                {/* Common Header */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View style={styles.textContainer}>
                            <Text style={styles.storeName} numberOfLines={1}>{company?.name || 'My Store'}</Text>
                            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
                            {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
                        </View>
                        <View style={styles.actions}>
                            {/* View Mode Toggle */}
                            {chartContent && (
                                <View style={styles.toggleContainer}>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, viewMode === 'table' && styles.toggleBtnActive]}
                                        onPress={() => setViewMode('table')}
                                    >
                                        <FontAwesome name="table" size={14} color={viewMode === 'table' ? Colors.light.primary : '#999'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, viewMode === 'chart' && styles.toggleBtnActive]}
                                        onPress={() => setViewMode('chart')}
                                    >
                                        <FontAwesome name="bar-chart" size={14} color={viewMode === 'chart' ? Colors.light.primary : '#999'} />
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={styles.exportGroup}>
                                <AppButton
                                    title=""
                                    icon={<FontAwesome name="file-excel-o" size={14} color="#fff" />}
                                    onPress={() => handleExport('csv')}
                                    style={styles.exportBtn}
                                    disabled={!exportData?.length}
                                />
                                <AppButton
                                    title=""
                                    icon={<FontAwesome name="file-pdf-o" size={14} color="#fff" />}
                                    onPress={() => handleExport('pdf')}
                                    style={{ ...styles.exportBtn, backgroundColor: Colors.light.danger }}
                                    disabled={!exportData?.length}
                                />
                            </View>
                        </View>
                    </View>

                    {showDateFilter && (
                        <View style={styles.filterContainer}>
                            <DateFilter
                                period={period}
                                onPeriodChange={handlePeriodChange}
                                customRange={customRange}
                                onCustomRangeChange={handleCustomRangeChange}
                            />
                        </View>
                    )}
                </View>

                {/* Content */}
                {isLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={Colors.light.primary} />
                    </View>
                ) : (
                    <View style={styles.content}>
                        {viewMode === 'chart' && chartContent ? (
                            <View style={styles.chartWrapper}>
                                {chartContent}
                            </View>
                        ) : (
                            children
                        )}
                    </View>
                )}
            </ResponsiveContainer>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingTop: Platform.OS === 'web' ? 20 : 50, // Safe area
        paddingHorizontal: Layout.spacing.lg,
        paddingBottom: Layout.spacing.md,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#eee',
        // On web, header stays inside container
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center', // Center vertically
        marginBottom: 16,
        justifyContent: 'space-between'
    },
    textContainer: {
        flex: 1, // Allow text to take available space
        marginRight: 12, // Space between text and actions
    },
    storeName: {
        fontSize: 10,
        color: Colors.light.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 2,
        fontWeight: '600',
    },
    title: {
        fontSize: 20, // Slightly smaller
        fontWeight: '800',
        color: Colors.light.text,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
        color: Colors.light.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0, // Prevent actions from shrinking
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        padding: 3,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    toggleBtn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    toggleBtnActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },
    exportGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    exportBtn: {
        width: 36,
        height: 36, // Slightly smaller
        paddingHorizontal: 0,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterContainer: {
        marginTop: 8,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        // On web, if children scroll, they should take height
    },
    chartWrapper: {
        padding: Layout.spacing.lg,
        flex: 1 // Allow chart to expand
    }
});
