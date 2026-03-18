import { useFeedback } from '@/context/FeedbackContext';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const { StorageAccessFramework } = FileSystem;

interface ReceiptData {
    companyName: string;
    saleId: string;
    date: string;
    customerName?: string;
    items: { name: string; quantity: number; price: number; total: number }[];
    subtotal: number;
    taxAmount?: number;
    discountAmount?: number;
    total: number;
    amountPaid: number;
    change?: number;
    paymentMethod: string;
    status?: string;
}

export const useReceiptGenerator = () => {
    const { showFeedback } = useFeedback();

    const generateReceiptHtml = (data: ReceiptData) => {
        const isPaid = data.status?.toLowerCase() === 'completed' || data.total <= data.amountPaid;
        const statusColor = isPaid ? '#10b981' : '#f59e0b';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>
                    @page { margin: 15mm; size: A4; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #fff; padding: 0; margin: 0; line-height: 1.5; font-size: 10pt; }
                    .invoice-container { max-width: 800px; margin: 0 auto; padding: 20px; }
                    
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
                    .company-info h1 { margin: 0; font-size: 24pt; font-weight: 800; color: #4f46e5; letter-spacing: -1px; }
                    .company-info p { margin: 5px 0 0; color: #64748b; font-weight: 500; }
                    
                    .invoice-meta { text-align: right; }
                    .invoice-title { font-size: 18pt; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 5px; }
                    .status-badge { display: inline-block; padding: 4px 12px; borderRadius: 20px; font-size: 9pt; font-weight: 700; color: white; background: ${statusColor}; text-transform: uppercase; margin-top: 8px; }

                    .bill-to { display: flex; gap: 40px; margin-bottom: 40px; }
                    .info-group { flex: 1; }
                    .info-group label { display: block; font-size: 8pt; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
                    .info-group p { margin: 0; font-size: 11pt; font-weight: 600; color: #1e293b; }

                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { background: #f8fafc; color: #64748b; font-size: 8.5pt; font-weight: 700; text-align: left; padding: 12px 10px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; }
                    td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; }
                    .text-right { text-align: right; }
                    .font-mono { font-family: "SF Mono", "Monaco", "Inconsolata", monospace; }

                    .totals-section { display: flex; justify-content: flex-end; }
                    .totals-card { width: 250px; }
                    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 10pt; }
                    .total-row.grand-total { border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 12px; font-size: 14pt; font-weight: 800; color: #0f172a; }
                    
                    .footer { text-align: center; margin-top: 60px; padding-top: 20px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 9pt; }
                    
                    @media print {
                        body { background: white; }
                        .invoice-container { padding: 0; max-width: none; }
                    }
                </style>
            </head>
            <body>
                <div class="invoice-container">
                    <div class="header">
                        <div class="company-info">
                            <h1>${data.companyName}</h1>
                            <p>Official VAT Invoice</p>
                        </div>
                        <div class="invoice-meta">
                            <div class="invoice-title">Invoice</div>
                            <div style="font-weight: 700; color: #64748b;"># ${data.saleId}</div>
                            <div class="status-badge">${(data.status || (isPaid ? 'PAID' : 'DUE')).toUpperCase()}</div>
                        </div>
                    </div>

                    <div class="bill-to">
                        <div class="info-group">
                            <label>Customer</label>
                            <p>${data.customerName || 'Walk-in Guest'}</p>
                        </div>
                        <div class="info-group">
                            <label>Date Issued</label>
                            <p>${data.date}</p>
                        </div>
                        <div class="info-group">
                            <label>Payment Method</label>
                            <p style="text-transform: capitalize;">${data.paymentMethod}</p>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 50%;">Item Description</th>
                                <th class="text-right">Price</th>
                                <th class="text-right">Qty</th>
                                <th class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.items.map(item => `
                                <tr>
                                    <td style="font-weight: 600;">${item.name}</td>
                                    <td class="text-right font-mono">$${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td class="text-right">${item.quantity}</td>
                                    <td class="text-right font-mono" style="font-weight: 700;">$${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="totals-section">
                        <div class="totals-card">
                            <div class="total-row">
                                <span style="color: #64748b; font-weight: 500;">Subtotal</span>
                                <span class="font-mono" style="font-weight: 600;">$${data.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            ${data.discountAmount ? `
                                <div class="total-row">
                                    <span style="color: #64748b; font-weight: 500;">Discount</span>
                                    <span class="font-mono" style="color: #ef4444;">-$${data.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            ` : ''}
                            ${data.taxAmount ? `
                                <div class="total-row">
                                    <span style="color: #64748b; font-weight: 500;">Tax</span>
                                    <span class="font-mono" style="color: #64748b;">+$${data.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            ` : ''}
                            <div class="total-row grand-total">
                                <span>Total Due</span>
                                <span class="font-mono">$${data.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div class="total-row" style="margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                                <span style="color: #64748b; font-weight: 500;">Amount Paid</span>
                                <span class="font-mono" style="font-weight: 700; color: #10b981;">$${data.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            ${data.change !== undefined && data.change > 0 ? `
                                <div class="total-row">
                                    <span style="color: #64748b; font-weight: 500;">Change</span>
                                    <span class="font-mono">$${data.change.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="footer">
                        <p>Thank you for choosing <b>${data.companyName}</b>. We appreciate your business!</p>
                        <p style="font-size: 8pt; margin-top: 10px;">Generated from StockManager ERP</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    };

    const generateAndShareReceipt = async (data: ReceiptData) => {
        try {
            const html = generateReceiptHtml(data);

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
                return;
            }

            const result = await Print.printToFileAsync({ html, base64: false });
            if (!result || !result.uri) {
                showFeedback('error', 'Print Error', 'Failed to generate PDF file');
                return;
            }

            const { uri } = result;

            if (Platform.OS === 'android') {
                const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
                const fileName = `Invoice_${data.saleId}_${new Date().getTime()}.pdf`;

                if (permissions.granted) {
                    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                    const createdUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, 'application/pdf');
                    await FileSystem.writeAsStringAsync(createdUri, base64, { encoding: 'base64' });
                    showFeedback('success', 'Saved', 'Invoice saved to your device');
                } else {
                    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
                }
            } else {
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
        } catch (error) {
            console.error('Failed to generate receipt:', error);
            showFeedback('error', 'Print Error', 'An unexpected error occurred while printing');
            throw error;
        }
    };

    return { generateAndShareReceipt };
};
