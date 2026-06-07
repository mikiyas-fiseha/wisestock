import { DateRange } from '@/components/reports/DateFilter';
import { ReportChart } from '@/components/reports/ReportChart';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { ReportColumn, ReportTable } from '@/components/reports/ReportTable';
import { useAuth } from '@/context/AuthContext';
import { useAdvancedReports } from '@/hooks/useAdvancedReports';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

export default function SalesItemReport() {
    const { t, i18n } = useTranslation();
    const { company } = useAuth();
    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().setDate(new Date().getDate() - 7)),
        end: new Date()
    });

    const { data, isLoading } = useAdvancedReports(range);
    const topProducts: any[] = data?.sales?.byProduct || [];

    // Columns
    const columns: ReportColumn[] = [
        { key: 'name', title: t('reports.product'), width: 140 },
        { key: 'qty', title: t('reports.qty_sold'), width: 80, align: 'center' },
        { key: 'revenue', title: t('reports.revenue'), width: 100, align: 'right', isCurrency: true },
        { key: 'profit', title: t('reports.gross_profit'), width: 100, align: 'right', isCurrency: true },
    ];

    // Totals
    const totals = useMemo(() => {
        return topProducts.reduce((acc: any, curr: any) => ({
            qty: (acc.qty || 0) + (curr.qty || 0),
            revenue: (acc.revenue || 0) + curr.revenue,
            profit: (acc.profit || 0) + curr.profit
        }), { qty: 0, revenue: 0, profit: 0 });
    }, [topProducts]);

    // Export Data
    const exportData = topProducts.map(p => ({
        [t('reports.product')]: p.name,
        [t('reports.qty_sold')]: p.qty,
        [t('reports.revenue')]: p.revenue,
        [t('reports.gross_profit')]: p.profit
    }));

    // Chart Data (Top 5)
    const chartData = topProducts.slice(0, 5).map(p => ({
        value: p.revenue,
        label: p.name.length > 10 ? p.name.substring(0, 8) + '..' : p.name,
    }));

    return (
        <ReportLayout
            title={t('reports.sales_by_item')}
            subtitle={t('reports.top_selling_products')}
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={exportData}
            exportFilename="sales_by_item"
            chartContent={
                <View>
                    <ReportChart
                        type="bar"
                        data={chartData}
                        yAxisLabelPrefix={i18n.language === 'en' ? (company?.currency || '$') : ''}
                        yAxisLabelSuffix={i18n.language === 'am' ? ' ብር' : ''}
                        color="#EC4899"
                    />
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
