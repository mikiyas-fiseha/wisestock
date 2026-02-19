import { ReportChart } from '@/components/reports/ReportChart';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { ReportColumn, ReportTable } from '@/components/reports/ReportTable';
import { Colors } from '@/constants/Colors';
import { DateRange, useAdvancedReports } from '@/hooks/useAdvancedReports';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

export default function SalesSummaryReport() {
    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date()
    });

    const { data, isLoading } = useAdvancedReports(range);
    const dailySales = data?.sales?.daily || [];
    const trendData = data?.sales?.trend || [];

    // Columns Definition
    const columns: ReportColumn[] = [
        { key: 'date', title: 'Date', width: 100 },
        { key: 'count', title: 'Orders', width: 80, align: 'center' },
        { key: 'revenue', title: 'Sales', width: 100, align: 'right', isCurrency: true },
        { key: 'profit', title: 'Profit', width: 100, align: 'right', isCurrency: true },
    ];

    // Totals Calculation
    const totals = useMemo(() => {
        return dailySales.reduce((acc, curr) => ({
            count: (acc.count || 0) + curr.count,
            revenue: (acc.revenue || 0) + curr.revenue,
            profit: (acc.profit || 0) + curr.profit
        }), { count: 0, revenue: 0, profit: 0 });
    }, [dailySales]);

    // Export Data Prep
    const exportData = dailySales.map(d => ({
        Date: d.date,
        Orders: d.count,
        Revenue: d.revenue,
        Profit: d.profit
    }));

    // Chart Data
    const chartData = trendData.map(d => ({
        value: d.revenue,
        label: (d as any).label || new Date(d.date).getDate().toString(),
        dataPointText: d.revenue.toString()
    }));

    return (
        <ReportLayout
            title="Sales Summary"
            subtitle="Breakdown by Date"
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={exportData}
            exportFilename="sales_summary"
            chartContent={
                <View>
                    <ReportChart type="line" data={chartData} yAxisLabelPrefix="$" color={Colors.light.primary} />
                </View>
            }
        >
            <ReportTable
                data={dailySales}
                columns={columns}
                totals={totals}
            />
        </ReportLayout>
    );
}
