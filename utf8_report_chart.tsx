import { Colors } from '@/constants/Colors';
import React, { useState } from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';

interface ReportChartProps {
    type: 'line' | 'bar';
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
    color = Colors.light.primary
}: ReportChartProps) {
    const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width - 48);
    const [isLayoutReady, setIsLayoutReady] = useState(false);

    const onLayout = (event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        if (width > 0) {
            setContainerWidth(width);
            setIsLayoutReady(true);
        }
    };

    // Transform data if needed or ensure it matches Gifted Charts format
    // Gifted Charts expects: { value: number, label?: string, ... }
    const chartData = data.map(item => ({
        ...item,
        frontColor: item.frontColor || color,
        // Ensure value is a number
        value: Number(item.value) || 0
    }));

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
        color: color,
        hideDataPoints: false,
        dataPointsColor: color,
        textColor: Colors.light.textSecondary,
        yAxisTextStyle: { color: Colors.light.textSecondary, fontSize: 10 },
        xAxisLabelTextStyle: { color: Colors.light.textSecondary, fontSize: 10, width: spacing + 10 }, // Prevent overlap
        rulesColor: '#f0f0f0',
        yAxisColor: '#f0f0f0',
        xAxisColor: '#f0f0f0',
        showYAxisIndices,
        yAxisLabelPrefix,
        yAxisLabelSuffix,
        isAnimated: true,
        animationDuration: 1000,
        pointerConfig: {
            pointerStripUptoDataPoint: true,
            pointerStripColor: 'lightgray',
            pointerStripWidth: 2,
            strokeDashArray: [2, 5],
            pointerColor: 'lightgray',
            radius: 4,
            pointerLabelWidth: 100,
            pointerLabelHeight: 120,
            pointerLabelComponent: (items: any) => {
                return (
                    <View
                        style={{
                            height: 100,
                            width: 100,
                            backgroundColor: '#282C3E',
                            borderRadius: 4,
                            justifyContent: 'center',
                            paddingLeft: 16,
                        }}>
                        <Text style={{ color: 'white', fontSize: 12 }}>{items[0].label}</Text>
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>{yAxisLabelPrefix}{items[0].value}{yAxisLabelSuffix}</Text>
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

    // While layout is calculating on web, we render a placeholder to effectively 'measure' the container
    // Or we render with default width but update immediately

    return (
        <View style={styles.container} onLayout={onLayout}>
            {isLayoutReady || width ? (
                type === 'line' ? (
                    <LineChart
                        {...commonProps}
                        curved
                        startFillColor={color}
                        endFillColor={color}
                        startOpacity={0.2}
                        endOpacity={0.05}
                        areaChart
                    />
                ) : (
                    <BarChart
                        {...commonProps}
                        barWidth={barWidth}
                        noOfSections={4}
                        barBorderRadius={4}
                        frontColor={color}
                    />
                )
            ) : (
                <View style={{ height, width: '100%' }} /> // Placeholder for measurement
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden', // Clip content if needed
        width: '100%',
        minHeight: 300,
    },
    emptyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        width: '100%'
    },
    emptyText: {
        color: '#999',
        fontStyle: 'italic'
    }
});
