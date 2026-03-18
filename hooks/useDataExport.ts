import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const { StorageAccessFramework } = FileSystem;

export interface ExportSection {
    title: string;
    type: 'table' | 'chart' | 'summary';
    data?: any[];
    columns?: { key: string; title: string; isCurrency?: boolean }[];
    totals?: Record<string, any>;
    chartData?: { label: string; value: number }[];
    accentColor?: string;
}

export const useDataExport = () => {

    const exportToCSV = async (data: any[], filename: string) => {
        if (!data || data.length === 0) {
            alert("No data to export");
            return;
        }

        try {
            // Sanitize filename
            const cleanFilename = filename.trim();
            const finalFilename = cleanFilename.endsWith('.csv') ? cleanFilename : `${cleanFilename}.csv`;

            const keys = Object.keys(data[0]);
            const header = keys.join(',');
            const rows = data.map(item =>
                keys.map(key => `"${String(item[key] || '').replace(/"/g, '""')}"`).join(',')
            );
            const csvString = `${header}\n${rows.join('\n')}`;

            if (Platform.OS === 'web') {
                const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = finalFilename;
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);
            } else {
                const fileUri = FileSystem.documentDirectory + finalFilename;
                await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

                // Android Direct Download Support
                if (Platform.OS === 'android') {
                    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                        const uri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, finalFilename, 'text/csv');
                        await FileSystem.writeAsStringAsync(uri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
                        alert('Report saved successfully');
                        return;
                    }
                }

                await Sharing.shareAsync(fileUri);
            }
        } catch (error) {
            console.error('CSV Export Error:', error);
            alert("Failed to export CSV");
        }
    };

    const exportToPDF = async (data: any[] | ExportSection[], title: string, filename: string) => {
        if (!data || data.length === 0) {
            alert("No data to export");
            return;
        }

        try {
            // Sanitize filename
            const cleanFilename = filename.trim();
            const finalFilename = cleanFilename.endsWith('.pdf') ? cleanFilename : `${cleanFilename}.pdf`;

            // Normalize sections
            let rawSections: ExportSection[] = [];
            if (Array.isArray(data) && data.length > 0 && 'type' in data[0]) {
                rawSections = data as ExportSection[];
            } else {
                rawSections = [{
                    title: 'Data Report',
                    type: 'table',
                    data: data as any[],
                    columns: Object.keys((data as any[])[0] || {}).map(k => ({ key: k, title: k.replace(/_/g, ' ').toUpperCase() }))
                }];
            }

            // FILTER empty sections to avoid page consistency issues
            const sections = rawSections.filter(s => {
                if (s.type === 'table') return s.data && s.data.length > 0;
                if (s.type === 'chart') return s.chartData && s.chartData.length > 0;
                return true;
            });

            if (sections.length === 0) {
                alert("No non-empty data found to export");
                return;
            }

            const renderTable = (section: ExportSection) => {
                const columns = section.columns || [];
                const tableData = section.data || [];
                const totals = section.totals || {};

                return `
                    <div class="card">
                        <h3 class="section-title" style="border-left: 4px solid ${section.accentColor || '#6366f1'}">${section.title}</h3>
                        <table>
                            <thead>
                                <tr>
                                    ${columns.map(col => `<th>${col.title}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${tableData.map(row => `
                                    <tr>
                                        ${columns.map(col => {
                    const val = row[col.key];
                    const isNum = typeof val === 'number' || col.isCurrency;
                    return `<td class="${isNum ? 'currency' : ''}">${val ?? '-'}</td>`;
                }).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                            ${Object.keys(totals).length > 0 ? `
                                <tfoot>
                                    <tr class="total-row">
                                        ${columns.map((col, idx) => {
                    const val = totals[col.key];
                    const isNum = typeof val === 'number' || col.isCurrency;
                    return `<td class="${isNum ? 'currency' : ''}">${idx === 0 ? 'TOTAL' : (val ?? '')}</td>`;
                }).join('')}
                                    </tr>
                                </tfoot>
                            ` : ''}
                        </table>
                    </div>
                `;
            };

            const renderSummary = (section: ExportSection) => {
                const summaryData = section.data || [];
                return `
                    <div class="card">
                        <h3 class="section-title" style="border-left: 4px solid ${section.accentColor || '#10b981'}">${section.title}</h3>
                        <div class="summary-container">
                            ${summaryData.map(item => `
                                <div class="summary-row">
                                    <span class="summary-label">${item.label}</span>
                                    <span class="summary-value ${item.value < 0 ? 'negative' : ''}">
                                        ${item.isPercentage ? `${item.value}%` : `$${item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            };

            const renderChart = (section: ExportSection) => {
                const chartData = section.chartData || [];
                const maxVal = Math.max(...chartData.map(d => d.value), 1);

                return `
                    <div class="card">
                        <h3 class="section-title" style="border-left: 4px solid ${section.accentColor || '#ec4899'}">${section.title}</h3>
                        <div class="chart-container">
                            ${chartData.map(item => `
                                <div class="bar-group">
                                    <div class="bar-label">${item.label}</div>
                                    <div class="bar-wrapper">
                                        <div class="bar-bg">
                                            <div class="bar-fill" style="width: ${(item.value / maxVal) * 100}%; background: ${section.accentColor || '#ec4899'}"></div>
                                        </div>
                                        <div class="bar-value">${item.value.toLocaleString()}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            };

            const html = `<!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="utf-8">
                        <title>${title}</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                        <style>
                            @page { margin: 15mm; size: A4; }
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #f8fafc; padding: 0; margin: 0; line-height: 1.5; font-size: 10pt; }
                            .page { page-break-after: always; padding: 20px; min-height: 270mm; position: relative; }
                            .page:last-child { page-break-after: auto; }
                            
                            .header-banner { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 40px 30px; border-radius: 16px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3); }
                            .header-info h1 { margin: 0; font-size: 24pt; font-weight: 800; letter-spacing: -0.5px; }
                            .header-info p { margin: 5px 0 0; font-size: 10pt; opacity: 0.9; font-weight: 500; }
                            .header-meta { text-align: right; }
                            .header-meta .date { font-size: 11pt; font-weight: 700; opacity: 0.95; }
                            .header-meta .app-name { font-size: 9pt; opacity: 0.8; margin-top: 4px; font-weight: 600; text-transform: uppercase; }

                            .card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 20px; }
                            .section-title { font-size: 14pt; font-weight: 800; color: #0f172a; margin: 0 0 20px 0; padding-left: 12px; }

                            table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden; }
                            th { background-color: #f8fafc; color: #475569; font-size: 8.5pt; font-weight: 700; text-align: left; padding: 12px 10px; border-bottom: 1.5px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.5px; }
                            td { padding: 10px; font-size: 9pt; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
                            tr:last-child td { border-bottom: none; }
                            tr:nth-child(even) { background-color: #f9fafb; }
                            
                            .total-row { background-color: #f1f5f9 !important; }
                            .total-row td { font-weight: 800; color: #0f172a; border-top: 2px solid #e2e8f0; padding: 12px 10px; }
                            .currency { text-align: right; font-family: "SF Mono", "Monaco", "Inconsolata", monospace; font-weight: 600; }
                            .negative { color: #dc2626 !important; }

                            .summary-container { display: flex; flex-direction: column; gap: 8px; }
                            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
                            .summary-row:last-child { border-bottom: none; }
                            .summary-label { font-size: 10pt; color: #475569; font-weight: 500; }
                            .summary-value { font-size: 11pt; font-weight: 700; color: #0f172a; }

                            .chart-container { margin-top: 10px; display: flex; flex-direction: column; gap: 12px; }
                            .bar-group { display: flex; align-items: center; gap: 15px; }
                            .bar-label { width: 100px; font-size: 9pt; font-weight: 600; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                            .bar-wrapper { flex: 1; display: flex; align-items: center; gap: 12px; }
                            .bar-bg { flex: 1; height: 12px; background: #f1f5f9; border-radius: 6px; overflow: hidden; }
                            .bar-fill { height: 100%; border-radius: 6px; transition: width 0.3s ease; }
                            .bar-value { font-size: 9pt; font-weight: 700; color: #1e293b; min-width: 60px; text-align: right; }

                            .footer { border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 30px; display: flex; justify-content: space-between; align-items: center; font-size: 8.5pt; color: #94a3b8; }
                            .footer b { color: #64748b; }

                            @media print {
                                body { background: white; }
                                .header-banner { box-shadow: none; border: 1px solid #e2e8f0; }
                                .card { box-shadow: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="page">
                            <div class="header-banner">
                                <div class="header-info">
                                    <h1>${title}</h1>
                                    <p>StockManager Executive Business Report</p>
                                </div>
                                <div class="header-meta">
                                    <div class="date">${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                                    <div class="app-name">Stock Management System</div>
                                </div>
                            </div>

                            ${sections.map((s) => `
                                <div style="page-break-inside: avoid; margin-bottom: 20px;">
                                    ${s.type === 'table' ? renderTable(s) : (s.type === 'summary' ? renderSummary(s) : renderChart(s))}
                                </div>
                            `).join('')}

                            <div class="footer" style="margin-top: auto; padding-top: 20px;">
                                <div>Report: <b>${title}</b></div>
                                <div>Generated on ${new Date().toLocaleString()}</div>
                            </div>
                        </div>
                    </body>
                </html>
            `;

            if (Platform.OS === 'web') {
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed';
                iframe.style.right = '0';
                iframe.style.bottom = '0';
                iframe.style.width = '0';
                iframe.style.height = '0';
                iframe.style.border = '0';
                document.body.appendChild(iframe);

                const doc = iframe.contentWindow?.document;
                if (doc) {
                    doc.open();
                    doc.write(html);
                    doc.close();

                    iframe.contentWindow?.focus();
                    setTimeout(() => {
                        iframe.contentWindow?.print();
                        setTimeout(() => {
                            document.body.removeChild(iframe);
                        }, 500);
                    }, 500);
                } else {
                    await Print.printAsync({ html });
                }
            } else {
                const { uri } = await Print.printToFileAsync({ html, base64: false });
                const newFileUri = FileSystem.documentDirectory + finalFilename;

                await FileSystem.moveAsync({ from: uri, to: newFileUri });

                if (Platform.OS === 'android') {
                    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                        const content = await FileSystem.readAsStringAsync(newFileUri, { encoding: FileSystem.EncodingType.Base64 });
                        const createdUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, finalFilename, 'application/pdf');
                        await FileSystem.writeAsStringAsync(createdUri, content, { encoding: FileSystem.EncodingType.Base64 });
                        alert('Report saved successfully');
                        return;
                    }
                }

                await Sharing.shareAsync(newFileUri);
            }
        } catch (error) {
            console.error('PDF Export Error:', error);
            alert("Failed to export PDF");
        }
    };

    return { exportToCSV, exportToPDF };
};
