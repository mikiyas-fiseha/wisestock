import { DateRange } from '@/components/reports/DateFilter';
import { ReportChart } from '@/components/reports/ReportChart';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { ReportColumn, ReportTable } from '@/components/reports/ReportTable';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

export default function SalesItemReport() {
    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date()
    });

    const { data, isLoading } = useAdvancedReports(range);
    const topProducts = data?.sales?.topProducts || [];

    // Columns
    const columns: ReportColumn[] = [
        { key: 'name', title: 'Product', width: 140 },
        { key: 'quantity', title: 'Qty Sold', width: 80, align: 'center' },
        { key: 'revenue', title: 'Revenue', width: 100, align: 'right', isCurrency: true },
        { key: 'profit', title: 'Profit', width: 100, align: 'right', isCurrency: true },
    ];

    // Totals
    const totals = useMemo(() => {
        return topProducts.reduce((acc, curr) => ({
            quantity: (acc.quantity || 0) + curr.quantity,
            revenue: (acc.revenue || 0) + curr.revenue,
            profit: (acc.profit || 0) + curr.profit
        }), { quantity: 0, revenue: 0, profit: 0 });
    }, [topProducts]);

    // Export Data
    const exportData = topProducts.map(p => ({
        Product: p.name,
        Quantity: p.quantity,
        Revenue: p.revenue,
        Profit: p.profit
    }));

    // Chart Data (Top 5)
    // Truncate name if too long
    const chartData = topProducts.slice(0, 5).map(p => ({
        value: p.revenue,
        label: p.name.length > 10 ? p.name.substring(0, 8) + '..' : p.name,
    }));

    return (
        <ReportLayout
            title="Sales by Item"
            subtitle="Top Selling Products"
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={exportData}
            exportFilename="sales_by_item"
            chartContent={
                <View>
                    <ReportChart type="bar" data={chartData} yAxisLabelPrefix="$" color="#EC4899" />
                </View>
            }
        >
            <ReportTable
                data={topProducts}
                columns={columns}
                totals={totals}
            />
        </ReportLayout>
    );
}
