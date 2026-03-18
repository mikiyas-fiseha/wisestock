import { DateFilter, DatePeriod, DateRange, getRangeForPeriod } from '@/components/reports/DateFilter';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Gradients, Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { ExportSection, useDataExport } from '@/hooks/useDataExport';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
    reportSections?: ExportSection[];
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
    reportSections,
}: ReportLayoutProps) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
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
        if (format === 'csv') {
            if (!exportData || exportData.length === 0) return;
            await exportToCSV(exportData, `${exportFilename}_${new Date().getTime()}.csv`);
        } else {
            const pdfData = reportSections || exportData;
            if (!pdfData || !pdfData.length) return;
            await exportToPDF(pdfData, title, `${exportFilename}_${new Date().getTime()}.pdf`);
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
                {/* Unified Custom Header */}
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                                <FontAwesome name="chevron-left" size={18} color={colors.text} />
                            </TouchableOpacity>
                            <View style={styles.titleWrapper}>
                                <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                                {subtitle && <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>}
                            </View>
                        </View>

                        <View style={styles.headerRight}>
                            <View style={styles.actions}>
                                {chartContent && (
                                    <View style={styles.toggleContainer}>
                                        <TouchableOpacity
                                            style={[styles.toggleBtn, viewMode === 'table' && styles.toggleBtnActive]}
                                            onPress={() => setViewMode('table')}
                                        >
                                            <FontAwesome name="list" size={14} color={viewMode === 'table' ? colors.primary : colors.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.toggleBtn, viewMode === 'chart' && styles.toggleBtnActive]}
                                            onPress={() => setViewMode('chart')}
                                        >
                                            <FontAwesome name="pie-chart" size={14} color={viewMode === 'chart' ? colors.primary : colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <View style={styles.exportContainer}>
                                    {Platform.OS === 'web' || isExportOpen ? (
                                        <View style={styles.exportGroup}>
                                            <TouchableOpacity
                                                onPress={() => { handleExport('csv'); setIsExportOpen(false); }}
                                                style={[styles.exportBtnIcon, { backgroundColor: '#107C41' }]}
                                            >
                                                <FontAwesome name="file-excel-o" size={12} color="#fff" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => { handleExport('pdf'); setIsExportOpen(false); }}
                                                style={[styles.exportBtnIcon, { backgroundColor: colors.danger }]}
                                            >
                                                <FontAwesome name="file-pdf-o" size={12} color="#fff" />
                                            </TouchableOpacity>
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
                                                <FontAwesome name="cloud-download" size={16} color={colors.primary} />
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>

                    {showDateFilter && (
                        <View style={styles.headerBottomRow}>
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
        paddingTop: Platform.OS !== 'web' ? 44 : 20,
        paddingHorizontal: Layout.spacing.lg,
        paddingBottom: 12,
        backgroundColor: (colors.card),
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerBottomRow: {
        marginTop: 4,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        padding: 8,
        marginRight: 8,
        marginLeft: -8,
    },
    titleWrapper: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
    },
    headerSubtitle: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 1,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
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
        backgroundColor: colors.border + '50',
        borderRadius: 10,
        padding: 3,
        marginRight: 10,
    },
    toggleBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    toggleBtnActive: {
        backgroundColor: colors.card,
    },
    exportGroup: {
        flexDirection: 'row',
        gap: 6,
    },
    exportBtnIcon: {
        width: 32,
        height: 32,
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
