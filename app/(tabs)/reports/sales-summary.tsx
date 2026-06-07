import { ReportChart } from '@/components/reports/ReportChart';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { ReportColumn, ReportTable } from '@/components/reports/ReportTable';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { DateRange, useAdvancedReports } from '@/hooks/useAdvancedReports';
import i18n from '@/lib/i18n';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

export default function SalesSummaryReport() {
    const { colors } = useTheme();
    const { company } = useAuth();
    const { t } = useTranslation();
    const [range, setRange] = useState<DateRange>({
        start: new Date(new Date().setDate(new Date().getDate() - 7)),
        end: new Date()
    });

    const { data, isLoading } = useAdvancedReports(range);
    const dailySales: any[] = data?.sales?.trend || [];
    const trendData = data?.sales?.trend || [];

    // Columns Definition
    const columns: ReportColumn[] = [
        { key: 'date', title: t('inventory.date'), width: 100 },
        { key: 'count', title: t('reports.orders'), width: 80, align: 'center' },
        { key: 'revenue', title: t('reports.revenue'), width: 100, align: 'right', isCurrency: true },
        { key: 'profit', title: t('reports.gross_profit'), width: 100, align: 'right', isCurrency: true },
    ];

    // Totals Calculation
    const totals = useMemo(() => {
        return dailySales.reduce((acc: any, curr: any) => ({
            count: (acc.count || 0) + (curr.count || 0),
            revenue: (acc.revenue || 0) + curr.revenue,
            profit: (acc.profit || 0) + curr.profit
        }), { count: 0, revenue: 0, profit: 0 });
    }, [dailySales]);

    // Export Data Prep
    const exportData = dailySales.map(d => ({
        [t('inventory.date')]: d.date,
        [t('reports.orders')]: d.count,
        [t('reports.revenue')]: d.revenue,
        [t('reports.gross_profit')]: d.profit
    }));

    // Chart Data
    const chartData = trendData.map(d => ({
        value: d.revenue,
        label: (d as any).label || new Date(d.date).getDate().toString(),
        dataPointText: d.revenue.toString()
    }));

    return (
        <ReportLayout
            title={t('reports.sales_summary')}
            subtitle={t('reports.breakdown_by_date')}
            onDateRangeChange={setRange}
            isLoading={isLoading}
            exportData={exportData}
            exportFilename="sales_summary"
            chartContent={
                <View>
                    <ReportChart
                        type="line"
                        data={chartData}
                        yAxisLabelPrefix={i18n.language === 'en' ? (company?.currency || '$') : ''}
                        yAxisLabelSuffix={i18n.language === 'am' ? ' ብር' : ''}
                        color={colors.primary}
                    />
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
