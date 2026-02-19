import { DateRange } from '@/components/reports/DateFilter';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { ReportColumn, ReportTable } from '@/components/reports/ReportTable';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

export default function InventoryReport() {
    // Inventory is point-in-time usually, but we keep date filter for "movements" if we add them later.
    // For valuation, it's generally "Current".
    const [range, setRange] = useState<DateRange>({
        start: new Date(),
        end: new Date()
    });

    const { data, isLoading } = useAdvancedReports(range);
    const allStock = data?.inventory?.allStock || [];

    // Columns
    const columns: ReportColumn[] = [
        { key: 'name', title: 'Product', width: 140 },
        { key: 'stock', title: 'Stock', width: 60, align: 'center' },
        { key: 'cost_price', title: 'Cost', width: 80, align: 'right', isCurrency: true },
        { key: 'sale_price', title: 'Retail', width: 80, align: 'right', isCurrency: true },
        { key: 'valuation', title: 'Value (Cost)', width: 100, align: 'right', isCurrency: true },
        {
            key: 'status',
            title: 'Status',
            width: 80,
            align: 'center',
            render: (value) => (
                <View style={{
                    backgroundColor: value === 'Out' ? '#FEE2E2' : value === 'Low' ? '#FEF3C7' : '#D1FAE5',
                    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'center'
                }}>
                    <Text style={{
                        color: value === 'Out' ? '#DC2626' : value === 'Low' ? '#D97706' : '#059669',
                        fontWeight: 'bold', fontSize: 10
                    }}>{value}</Text>
                </View>
            )
        },
    ];

    // Totals
    const totals = useMemo(() => {
        return allStock.reduce((acc, curr) => ({
            stock: (acc.stock || 0) + curr.stock,
            valuation: (acc.valuation || 0) + curr.valuation
        }), { stock: 0, valuation: 0 });
    }, [allStock]);

    // Export Data
    const exportData = allStock.map(p => ({
        Product: p.name,
        SKU: p.primary_sku,
        Stock: p.stock,
        Cost: p.cost_price,
        Retail: p.sale_price,
        Value: p.valuation,
        Status: p.status
    }));

    return (
        <ReportLayout
            title="Inventory Valuation"
            subtitle="Current Stock Value"
            showDateFilter={false} // Valuation is current
            isLoading={isLoading}
            exportData={exportData}
            exportFilename="inventory_valuation"
        >
            <ReportTable
                data={allStock}
                columns={columns}
                totals={totals}
            />
        </ReportLayout>
    );
}
