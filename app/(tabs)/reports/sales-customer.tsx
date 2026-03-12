import { DateRange } from '@/components/reports/DateFilter';
import { ReportChart } from '@/components/reports/ReportChart';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { ReportColumn, ReportTable } from '@/components/reports/ReportTable';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

export default function SalesCustomerReport() {
    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date()
    });

    const { data, isLoading } = useAdvancedReports(range);
    const topCustomers: any[] = data?.customers?.top || [];

    // Columns
    const columns: ReportColumn[] = [
        { key: 'name', title: 'Customer', width: 140 },
        { key: 'count', title: 'Orders', width: 80, align: 'center' },
        { key: 'revenue', title: 'Revenue', width: 100, align: 'right', isCurrency: true },
        { key: 'profit', title: 'Profit', width: 100, align: 'right', isCurrency: true },
    ];

    // Totals
    const totals = useMemo(() => {
        return topCustomers.reduce((acc, curr) => ({
            count: (acc.count || 0) + curr.count,
            revenue: (acc.revenue || 0) + curr.revenue,
            profit: (acc.profit || 0) + curr.profit
        }), { count: 0, revenue: 0, profit: 0 });
    }, [topCustomers]);

    // Export Data
    const exportData = topCustomers.map(c => ({
        Customer: c.name,
        Orders: c.count,
        Revenue: c.revenue,
        Profit: c.profit
    }));

    // Chart Data (Top 5)
    const chartData = topCustomers.slice(0, 5).map(c => ({
        value: c.revenue,
        label: c.name.split(' ')[0], // First name only for clearer labels
    }));

    return (
        <ReportLayout
            title="Sales by Customer"
            subtitle="Top Customers by Revenue"
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={exportData}
            exportFilename="sales_by_customer"
            chartContent={
                <View>
                    <ReportChart type="bar" data={chartData} yAxisLabelPrefix="$" color="#8B5CF6" />
                </View>
            }
        >
            <ReportTable
                data={topCustomers}
                columns={columns}
                totals={totals}
            />
        </ReportLayout>
    );
}
