import { DateFilter, DatePeriod, DateRange, getRangeForPeriod } from '@/components/reports/DateFilter';
import { AppButton } from '@/components/ui/AppButton';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Gradients, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useDataExport } from '@/hooks/useDataExport';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

export { DatePeriod, DateRange } from '@/components/reports/DateFilter';

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
    chartContent,
}: ReportLayoutProps) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { company } = useAuth();
    const { exportToCSV, exportToPDF } = useDataExport();

    const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
    const [isExportOpen, setIsExportOpen] = useState(false);
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
            await exportToPDF(exportData, title, `${exportFilename}_${new Date().getTime()} `);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <LinearGradient
                colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <ResponsiveContainer>
                {/* Common Header */}
                <View style={styles.header}>
                    <View style={styles.compactHeader}>
                        {showDateFilter && (
                            <View style={styles.filterWrapper}>
                                <DateFilter
                                    period={period}
                                    onPeriodChange={handlePeriodChange}
                                    customRange={customRange}
                                    onCustomRangeChange={handleCustomRangeChange}
                                />
                            </View>
                        )}

                        <View style={styles.actions}>
                            {/* View Mode Toggle */}
                            {chartContent && (
                                <View style={styles.toggleContainer}>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, viewMode === 'table' && styles.toggleBtnActive]}
                                        onPress={() => setViewMode('table')}
                                    >
                                        <FontAwesome name="table" size={14} color={viewMode === 'table' ? colors.primary : colors.textSecondary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, viewMode === 'chart' && styles.toggleBtnActive]}
                                        onPress={() => setViewMode('chart')}
                                    >
                                        <FontAwesome name="bar-chart" size={14} color={viewMode === 'chart' ? colors.primary : colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={styles.exportContainer}>
                                {Platform.OS === 'web' || isExportOpen ? (
                                    <View style={styles.exportGroup}>
                                        <AppButton
                                            title=""
                                            icon={<FontAwesome name="file-excel-o" size={14} color="#fff" />}
                                            onPress={() => { handleExport('csv'); setIsExportOpen(false); }}
                                            style={styles.exportBtn}
                                            disabled={!exportData?.length}
                                        />
                                        <AppButton
                                            title=""
                                            icon={<FontAwesome name="file-pdf-o" size={14} color="#fff" />}
                                            onPress={() => { handleExport('pdf'); setIsExportOpen(false); }}
                                            style={{ ...styles.exportBtn, backgroundColor: colors.danger }}
                                            disabled={!exportData?.length}
                                        />
                                        {Platform.OS !== 'web' && (
                                            <TouchableOpacity onPress={() => setIsExportOpen(false)} style={styles.closeExport}>
                                                <FontAwesome name="times" size={14} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => setIsExportOpen(true)}
                                        style={styles.downloadIconBtn}
                                    >
                                        <View style={styles.downloadCircle}>
                                            <FontAwesome name="download" size={16} color={colors.primary} />
                                        </View>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Content */}
                {isLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={colors.primary} />
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

const createStyles = (colors: any) => StyleSheet.create({
    header: {
        paddingTop: Platform.OS !== 'web' ? 12 : 16,
        paddingHorizontal: Layout.spacing.lg,
        paddingBottom: 4,
        backgroundColor: (colors.card + 'E0'),
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    compactHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 44,
    },
    filterWrapper: {
        flex: 1,
        marginRight: 12,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0, // Prevent actions from shrinking
    },
    exportContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    downloadIconBtn: {
        padding: 4,
    },
    downloadCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    closeExport: {
        padding: 8,
        marginLeft: 4,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
        borderRadius: 8,
        padding: 3,
        marginRight: 12,

    },
    toggleBtn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    toggleBtnActive: {
        backgroundColor: (colors.card + 'E0'),
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
    },
});
