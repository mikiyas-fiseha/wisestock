import { useTheme } from '@/context/ThemeContext';
import React, { useState } from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

interface ReportChartProps {
    type: 'line' | 'bar' | 'pie';
    data: any[];
    height?: number;
    width?: number; // Optional override
    showYAxisIndices?: boolean;
    yAxisLabelPrefix?: string;
    yAxisLabelSuffix?: string;
    color?: string;
}

export function ReportChart({
    type,
    data,
    height = 300,
    width,
    showYAxisIndices = true,
    yAxisLabelPrefix = '',
    yAxisLabelSuffix = '',
    color
}: ReportChartProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    // Default color if none provided
    const primaryColor = color || colors.primary;

    const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width - 48);
    const [isLayoutReady, setIsLayoutReady] = useState(false);
    const [selectedSector, setSelectedSector] = useState<any>(null);

    const onLayout = (event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        if (width > 0) {
            setContainerWidth(width);
            setIsLayoutReady(true);
        }
    };

    // Transform data if needed or ensure it matches Gifted Charts format
    const chartData = data.map(item => ({
        ...item,
        frontColor: item.frontColor || primaryColor,
        // For PieCharts, we want distinct colors if not provided
        color: item.color || item.frontColor || primaryColor,
        // Ensure value is a number
        value: Number(item.value) || 0
    }));

    const totalValue = chartData.reduce((acc, curr) => acc + curr.value, 0);

    // Calculate dynamic properties
    const calculatedWidth = width || containerWidth;
    // On web/desktop, we might want slightly different spacing
    const isBigScreen = calculatedWidth > 600;
    const spacing = isBigScreen ? 60 : 30;
    const barWidth = isBigScreen ? 40 : 22;

    const commonProps = {
        data: chartData,
        height,
        width: calculatedWidth,
        initialSpacing: 20,
        spacing: spacing,
        thickness: 4,
        color: primaryColor,
        hideDataPoints: false,
        dataPointsColor: primaryColor,
        textColor: colors.textSecondary,
        yAxisTextStyle: { color: colors.textSecondary, fontSize: 10 },
        xAxisLabelTextStyle: { color: colors.textSecondary, fontSize: 10, width: spacing + 10 },
        rulesColor: colors.border,
        yAxisColor: colors.border,
        xAxisColor: colors.border,
        showYAxisIndices,
        yAxisLabelPrefix,
        yAxisLabelSuffix,
        isAnimated: true,
        animationDuration: 1000,
        pointerConfig: {
            pointerStripUptoDataPoint: true,
            pointerStripColor: colors.border,
            pointerStripWidth: 2,
            strokeDashArray: [2, 5],
            pointerColor: colors.border,
            radius: 4,
            pointerLabelWidth: 100,
            pointerLabelHeight: 120,
            pointerLabelComponent: (items: any) => {
                return (
                    <View
                        style={{
                            height: 100,
                            width: 100,
                            backgroundColor: (colors.card + 'E0'),
                            borderRadius: 4,
                            justifyContent: 'center',
                            paddingLeft: 16,
                        }}>
                        <Text style={{ color: colors.text, fontSize: 12 }}>{items[0].label}</Text>
                        <Text style={{ color: colors.text, fontWeight: 'bold' }}>{yAxisLabelPrefix}{items[0].value}{yAxisLabelSuffix}</Text>
                    </View>
                );
            },
        }
    };

    if (!data || data.length === 0) {
        return (
            <View style={[styles.emptyContainer, { height }]}>
                <Text style={styles.emptyText}>No data to chart.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container} onLayout={onLayout}>
            {isLayoutReady || width ? (
                type === 'line' ? (
                    <LineChart
                        {...commonProps}
                        curved
                        startFillColor={primaryColor}
                        endFillColor={primaryColor}
                        startOpacity={0.2}
                        endOpacity={0.05}
                        areaChart
                    />
                ) : type === 'bar' ? (
                    <BarChart
                        {...commonProps}
                        barWidth={barWidth}
                        noOfSections={4}
                        barBorderRadius={4}
                        frontColor={primaryColor}
                    />
                ) : (
                    <PieChart
                        data={chartData}
                        donut
                        radius={height / 2.5}
                        innerRadius={height / 5}
                        innerCircleColor={colors.card}
                        centerLabelComponent={() => (
                            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600' }}>
                                    {selectedSector ? selectedSector.label : 'TOTAL'}
                                </Text>
                                <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginTop: 2 }}>
                                    {selectedSector
                                        ? (selectedSector.value > 1000 ? `${(selectedSector.value / 1000).toFixed(1)}k` : selectedSector.value.toFixed(0))
                                        : (totalValue > 1000 ? `${(totalValue / 1000).toFixed(1)}k` : totalValue.toFixed(0))
                                    }
                                </Text>
                            </View>
                        )}
                        onPress={(item: any) => setSelectedSector(item)}
                        focusOnPress
                        sectionAutoFocus
                        paddingVertical={10}
                    />
                )
            ) : (
                <View style={{ height, width: '100%' }} /> // Placeholder for measurement
            )}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        backgroundColor: (colors.card + 'E0'),
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        width: '100%',
        minHeight: 300,
    },
    emptyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: 12,
        width: '100%'
    },
    emptyText: {
        color: colors.textSecondary,
        fontStyle: 'italic'
    }
});

