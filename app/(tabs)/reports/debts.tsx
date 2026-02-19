import { DateRange } from '@/components/reports/DateFilter';
import { ReportChart } from '@/components/reports/ReportChart';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { ReportColumn, ReportTable } from '@/components/reports/ReportTable';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

export default function DebtsReport() {
    const [range, setRange] = useState<DateRange>({
        start: new Date(),
        end: new Date()
    });

    const { data, isLoading } = useAdvancedReports(range);
    const receivables = data?.financials?.receivables || [];

    // Columns
    const columns: ReportColumn[] = [
        { key: 'name', title: 'Customer', width: 140 },
        { key: 'phone', title: 'Phone', width: 100 },
        { key: 'current_balance', title: 'Balance', width: 100, align: 'right', isCurrency: true },
    ];

    // Totals
    const totals = useMemo(() => {
        return receivables.reduce((acc, curr) => ({
            current_balance: (acc.current_balance || 0) + (curr.current_balance || 0)
        }), { current_balance: 0 });
    }, [receivables]);

    // Export Data
    const exportData = receivables.map(c => ({
        Customer: c.name,
        Phone: c.phone,
        Balance: c.current_balance
    }));

    // Chart Data: Top 5 Debtors
    const chartData = receivables.slice(0, 5).map(c => ({
        value: c.current_balance,
        label: c.name.split(' ')[0],
    }));

    return (
        <ReportLayout
            title="Customer Debts"
            subtitle="Outstanding Balances"
            showDateFilter={false} // Debts are current state
            isLoading={isLoading}
            exportData={exportData}
            exportFilename="customer_debts"
            chartContent={
                <View>
                    <ReportChart type="bar" data={chartData} yAxisLabelPrefix="$" color="#EF4444" />
                </View>
            }
        >
            <ReportTable
                data={receivables}
                columns={columns}
                totals={totals}
            />
        </ReportLayout>
    );
}
