import { useFeedback } from '@/context/FeedbackContext';
import * as FileSystem from 'expo-file-system/legacy';
import { printAsync, printToFileAsync } from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { Platform } from 'react-native';

const { StorageAccessFramework } = FileSystem;

interface ReceiptData {
    companyName: string;
    saleId: string;
    date: string;
    customerName?: string;
    items: { name: string; quantity: number; price: number; total: number }[];
    subtotal: number;
    discount?: number;
    total: number;
    amountPaid: number;
    change?: number;
    paymentMethod: string;
}

export const useReceiptGenerator = () => {
    const { showFeedback } = useFeedback();


    const generateReceiptHtml = (data: ReceiptData) => {
        return `
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; margin: 0; }
                    .receipt-content { max-width: 400px; margin: 0 auto; }
                    @media print {
                        body { padding: 0; }
                        .receipt-content { width: 100%; max-width: none; }
                        @page { margin: 0.5cm; }
                    }
                    .header { text-align: center; margin-bottom: 20px; }
                    .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                    .subtitle { font-size: 14px; color: #666; }
                    .divider { border-bottom: 1px dashed #ccc; margin: 15px 0; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
                    .bold { font-weight: bold; }
                    .items-header { font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
                    .item-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #888; }
                </style>
            </head>
            <body>
                <div class="receipt-content">
                    <div class="header">
                    <div class="title">${data.companyName}</div>
                    <div class="subtitle">Sale Receipt</div>
                </div>

                <div class="row">
                    <span>Date:</span>
                    <span>${data.date}</span>
                </div>
                <div class="row">
                    <span>Order #:</span>
                    <span>${data.saleId}</span>
                </div>
                ${data.customerName ? `
                <div class="row">
                    <span>Customer:</span>
                    <span>${data.customerName}</span>
                </div>` : ''}

                <div class="divider"></div>

                <div class="items-header row">
                    <span style="flex: 2">Item</span>
                    <span style="flex: 1; text-align: center">Qty</span>
                    <span style="flex: 1; text-align: right">Total</span>
                </div>

                ${data.items.map(item => `
                    <div class="item-row">
                        <span style="flex: 2">${item.name}</span>
                        <span style="flex: 1; text-align: center">${item.quantity}</span>
                        <span style="flex: 1; text-align: right">$${item.total.toFixed(2)}</span>
                    </div>
                `).join('')}

                <div class="divider"></div>

                <div class="row">
                    <span>Subtotal</span>
                    <span>$${data.subtotal.toFixed(2)}</span>
                </div>
                ${data.discount ? `
                <div class="row">
                    <span>Discount</span>
                    <span>-$${data.discount.toFixed(2)}</span>
                </div>` : ''}
                <div class="row bold" style="font-size: 16px; margin-top: 5px;">
                    <span>Total</span>
                    <span>$${data.total.toFixed(2)}</span>
                </div>

                <div class="divider"></div>

                <div class="row">
                    <span>Payment Method</span>
                    <span style="text-transform: capitalize">${data.paymentMethod}</span>
                </div>
                 <div class="row">
                    <span>Amount Paid</span>
                    <span>$${data.amountPaid.toFixed(2)}</span>
                </div>
                ${data.change !== undefined ? `
                <div class="row">
                    <span>Change</span>
                    <span>$${data.change.toFixed(2)}</span>
                </div>` : ''}

                <div class="footer">
                    Thank you for your business!
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
                await printAsync({ html });
                return;
            }

            const result = await printToFileAsync({ html, base64: false });
            if (!result || !result.uri) {
                showFeedback('error', 'Print Error', 'Failed to generate PDF file');
                return;
            }

            const { uri } = result;

            if (Platform.OS === 'android') {
                const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (permissions.granted) {
                    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                    const fileName = `Receipt_${data.saleId}_${new Date().getTime()}.pdf`;
                    const createdUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, 'application/pdf');
                    await FileSystem.writeAsStringAsync(createdUri, base64, { encoding: 'base64' });
                    alert('Receipt Saved to Device');
                } else {
                    await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
                }
            } else {
                await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
        } catch (error) {
            console.error('Failed to generate receipt:', error);
            showFeedback('error', 'Print Error', 'An unexpected error occurred while printing');
            throw error;
        }
    };

    return { generateAndShareReceipt };
};
