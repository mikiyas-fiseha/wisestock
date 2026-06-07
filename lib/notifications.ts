/**
 * Notification Service
 * Handles push token registration, permission requests,
 * and sending notifications via Expo Push API.
 */

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications look when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// ─── Token Registration ───────────────────────────────────────────────────────

/**
 * Requests permission and returns an Expo push token.
 * Returns null on emulators or if permission is denied.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    if (!Device.isDevice) {
        console.log('[Notifications] Push notifications only work on physical devices');
        return null;
    }

    // Android: must create a notification channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6366F1',
        });
        await Notifications.setNotificationChannelAsync('stock-alerts', {
            name: 'Stock Alerts',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#EF4444',
        });
        await Notifications.setNotificationChannelAsync('sales', {
            name: 'Sales & Purchases',
            importance: Notifications.AndroidImportance.DEFAULT,
            lightColor: '#10B981',
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted');
        return null;
    }

    try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: '2218f8ed-7f47-4cb6-b73c-823dffb671a5', // From app.json eas.projectId
        });
        return tokenData.data;
    } catch (e) {
        console.error('[Notifications] Failed to get push token:', e);
        return null;
    }
}

// ─── Send via Expo Push API ───────────────────────────────────────────────────

export interface PushMessage {
    to: string | string[];
    title: string;
    body: string;
    data?: Record<string, any>;
    channelId?: string;
    badge?: number;
}

/**
 * Sends a push notification via Expo's push service.
 * Call this from supabase edge functions OR from a trusted client (admin only).
 */
export async function sendExpoPushNotification(message: PushMessage): Promise<void> {
    const recipients = Array.isArray(message.to) ? message.to : [message.to];

    // Filter out empty tokens
    const validRecipients = recipients.filter(t => t && t.startsWith('ExponentPushToken['));
    if (validRecipients.length === 0) return;

    const payload = validRecipients.map(token => ({
        to: token,
        title: message.title,
        body: message.body,
        data: message.data || {},
        channelId: message.channelId || 'default',
        sound: 'default',
        badge: message.badge ?? 1,
    }));

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload.length === 1 ? payload[0] : payload),
        });
        const result = await response.json();
        if (result.errors) {
            console.error('[Push] Errors:', result.errors);
        }
    } catch (e) {
        console.error('[Push] Failed to send:', e);
    }
}

// ─── Local Notifications (for immediate in-app feedback) ──────────────────────

export async function sendLocalNotification(title: string, body: string, data?: Record<string, any>) {
    await Notifications.scheduleNotificationAsync({
        content: { title, body, data: data || {}, sound: true },
        trigger: null, // immediately
    });
}

// ─── Notification Types ───────────────────────────────────────────────────────

export const NotificationTemplates = {
    lowStock: (productName: string, qty: number) => ({
        title: '⚠️ Low Stock Alert',
        body: `${productName} is running low — only ${qty} unit${qty !== 1 ? 's' : ''} left`,
        channelId: 'stock-alerts',
        data: { screen: 'inventory', type: 'low_stock' },
    }),
    outOfStock: (productName: string) => ({
        title: '🔴 Out of Stock',
        body: `${productName} is completely out of stock!`,
        channelId: 'stock-alerts',
        data: { screen: 'inventory', type: 'out_of_stock' },
    }),
    newSale: (amount: number, currency: string, recordedBy: string) => ({
        title: '🛒 New Sale Recorded',
        body: `${recordedBy} recorded a sale of ${currency} ${amount.toLocaleString()}`,
        channelId: 'sales',
        data: { screen: 'sales', type: 'new_sale' },
    }),
    newPurchase: (supplier: string, amount: number, currency: string, recordedBy: string) => ({
        title: '📦 New Purchase Recorded',
        body: `${recordedBy} recorded a purchase from ${supplier} — ${currency} ${amount.toLocaleString()}`,
        channelId: 'sales',
        data: { screen: 'purchases', type: 'new_purchase' },
    }),
    dailySummary: (revenue: number, salesCount: number, currency: string) => ({
        title: '📊 Daily Sales Summary',
        body: `Today: ${salesCount} sale${salesCount !== 1 ? 's' : ''} totaling ${currency} ${revenue.toLocaleString()}`,
        channelId: 'default',
        data: { screen: 'reports', type: 'daily_summary' },
    }),
    overdueDebt: (customerName: string, amount: number, currency: string, days: number) => ({
        title: '💰 Customer Debt Overdue',
        body: `${customerName} owes ${currency} ${amount.toLocaleString()} — ${days} days overdue`,
        channelId: 'default',
        data: { screen: 'customers', type: 'overdue_debt' },
    }),
};
