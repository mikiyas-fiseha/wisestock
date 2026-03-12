import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const { StorageAccessFramework } = FileSystem;

export const useDataExport = () => {

    const exportToCSV = async (data: any[], filename: string) => {
        if (!data || data.length === 0) {
            alert("No data to export");
            return;
        }

        try {
            const keys = Object.keys(data[0]);
            const header = keys.join(',');
            const rows = data.map(item =>
                keys.map(key => `"${String(item[key] || '').replace(/"/g, '""')}"`).join(',')
            );
            const csvString = `${header}\n${rows.join('\n')}`;

            if (Platform.OS === 'web') {
                const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                const fileUri = FileSystem.documentDirectory + filename;
                await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

                // Android Direct Download Support
                if (Platform.OS === 'android') {
                    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                        const uri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, 'text/csv');
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

    const exportToPDF = async (data: any[], title: string, filename: string) => {
        if (!data || data.length === 0) {
            alert("No data to export");
            return;
        }

        try {
            const keys = Object.keys(data[0]);
            const headers = keys.map(k => k.replace(/_/g, ' ').toUpperCase());

            const html = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                        <style>
                            @page { margin: 20mm; }
                            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1a202c; padding: 0; margin: 0; line-height: 1.5; }
                            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #edf2f7; padding-bottom: 20px; }
                            .company-info h1 { margin: 0; font-size: 24px; color: #2d3748; }
                            .company-info p { margin: 2px 0; font-size: 12px; color: #718096; }
                            .report-meta { text-align: right; }
                            .report-meta h2 { margin: 0; font-size: 18px; color: #4a5568; }
                            .report-meta p { margin: 2px 0; font-size: 11px; color: #a0aec0; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: auto; }
                            th { background-color: #f7fafc; color: #4a5568; font-size: 10px; font-weight: bold; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; }
                            td { padding: 10px; font-size: 10px; border-bottom: 1px solid #edf2f7; color: #2d3748; }
                            tr:nth-child(even) { background-color: #fcfcfc; }
                            .footer { margin-top: 30px; border-top: 1px solid #edf2f7; padding-top: 10px; text-align: center; font-size: 9px; color: #a0aec0; }
                            .currency { font-family: monospace; text-align: right; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="company-info">
                                <h1>Business Report</h1>
                                <p>Generated for Stock Management System</p>
                            </div>
                            <div class="report-meta">
                                <h2>${title}</h2>
                                <p>Date: ${new Date().toLocaleDateString()}</p>
                                <p>Time: ${new Date().toLocaleTimeString()}</p>
                            </div>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    ${headers.map(h => `<th>${h}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map(row => `
                                    <tr>
                                        ${keys.map(k => {
                const val = row[k];
                const isNum = typeof val === 'number';
                return `<td class="${isNum ? 'currency' : ''}">${val ?? '-'}</td>`;
            }).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="footer">
                            <p>This report is confidential and intended for internal business use only.</p>
                            <p>Page 1 of 1</p>
                        </div>
                    </body>
                </html>
            `;

            if (Platform.OS === 'web') {
                await Print.printAsync({ html });
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                const pdfFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
                const newFileUri = FileSystem.documentDirectory + pdfFilename;

                await FileSystem.moveAsync({
                    from: uri,
                    to: newFileUri,
                });

                if (Platform.OS === 'android') {
                    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                        const content = await FileSystem.readAsStringAsync(newFileUri, { encoding: FileSystem.EncodingType.Base64 });
                        const createdUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, pdfFilename, 'application/pdf');
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
