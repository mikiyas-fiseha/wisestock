import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { Platform } from 'react-native';

const { StorageAccessFramework } = FileSystem;

export const useDataExport = () => {

    const exportToCSV = async (data: any[], filename: string) => {
        if (!data || data.length === 0) {
            alert("No data to export");
            return;
        }

        try {
            // 1. Get headers
            const headers = Object.keys(data[0]);

            // 2. Convert to CSV string
            const csvRows = [];
            csvRows.push(headers.join(',')); // Header row

            for (const row of data) {
                const values = headers.map(header => {
                    const escaped = ('' + (row[header] ?? '')).replace(/"/g, '\\"');
                    return `"${escaped}"`;
                });
                csvRows.push(values.join(','));
            }

            const csvString = csvRows.join('\n');

            // 3. Save to file
            const fileUri = FileSystem.documentDirectory + filename;
            await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: 'utf8' });

            if (Platform.OS === 'android') {
                // Android: Save "Directly"
                const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (permissions.granted) {
                    const uri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, 'text/csv');
                    await FileSystem.writeAsStringAsync(uri, csvString, { encoding: 'utf8' });
                    alert('Saved to ' + uri);
                } else {
                    // Fallback if permission denied
                    await shareAsync(fileUri, { UTI: '.csv', mimeType: 'text/csv' });
                }
            } else {
                // iOS: Use Share Sheet (Save to Files)
                await shareAsync(fileUri, { UTI: '.csv', mimeType: 'text/csv' });
            }

        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    };


    // ... imports

    const exportToPDF = async (data: any[], title: string, filename: string) => {
        if (!data || data.length === 0) {
            alert("No data to export");
            return;
        }

        try {
            const headers = Object.keys(data[0]);

            // Generate HTML
            const html = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; }
                            h1 { text-align: center; color: #333; margin-bottom: 5px; }
                            p { text-align: center; color: #666; margin-top: 0; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                            th { background-color: #f2f2f2; color: #333; }
                            tr:nth-child(even) { background-color: #f9f9f9; }
                        </style>
                    </head>
                    <body>
                        <h1>${title}</h1>
                        <p>Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
                        <table>
                            <thead>
                                <tr>
                                    ${headers.map(h => `<th>${h}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map(row => `
                                    <tr>
                                        ${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </body>
                </html>
            `;

            // Print to File
            const { uri } = await Print.printToFileAsync({ html });
            const newFileUri = FileSystem.documentDirectory + filename + '.pdf';

            // Move to document directory (Print saves to cache)
            await FileSystem.moveAsync({
                from: uri,
                to: newFileUri
            });

            if (Platform.OS === 'android') {
                // Android: Save "Directly"
                const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (permissions.granted) {
                    const content = await FileSystem.readAsStringAsync(newFileUri, { encoding: FileSystem.EncodingType.Base64 });
                    const createdUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, 'application/pdf');
                    await FileSystem.writeAsStringAsync(createdUri, content, { encoding: FileSystem.EncodingType.Base64 });
                    alert('Saved to ' + createdUri);
                } else {
                    await shareAsync(newFileUri, { UTI: '.pdf', mimeType: 'application/pdf' });
                }
            } else {
                await shareAsync(newFileUri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }

        } catch (error) {
            console.error('PDF Export failed:', error);
            throw error;
        }
    };

    return { exportToCSV, exportToPDF };
};
