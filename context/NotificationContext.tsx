/**
 * NotificationContext
 * 
 * Wraps the app with push notification functionality:
 * - Registers device token and saves to Supabase on login
 * - Subscribes to Supabase Realtime for new sales & purchases
 * - Polls for low/out-of-stock products when app becomes active
 * - Runs a daily summary at 8PM
 * - Checks for 30+ day overdue debts
 */

import {
    NotificationTemplates,
    registerForPushNotificationsAsync,
    sendExpoPushNotification,
    sendLocalNotification,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

interface NotificationContextType {
    pushToken: string | null;
    unreadCount: number;
    markAllRead: () => void;
    permissionGranted: boolean;
}

const NotificationContext = createContext<NotificationContextType>({
    pushToken: null,
    unreadCount: 0,
    markAllRead: () => { },
    permissionGranted: false,
});

export const useNotifications = () => useContext(NotificationContext);

const DAILY_SUMMARY_KEY = 'last_daily_summary';
const OVERDUE_CHECK_KEY = 'last_overdue_check';

export function NotificationProvider({ children, userId, companyId, userName, userRole, currency }: PropsWithChildren<{
    userId: string | null;
    companyId: string | null;
    userName: string;
    userRole: string;
    currency?: string;
}>) {
    const router = useRouter();
    const [pushToken, setPushToken] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const appState = useRef(AppState.currentState);
    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    const fmt = (n: number) => `${currency || 'ETB'} ${n.toLocaleString()}`;

    // ── Register token ─────────────────────────────────────────────────────────
    const registerToken = useCallback(async () => {
        if (!userId || !companyId) return;
        const token = await registerForPushNotificationsAsync();
        if (!token) return;

        setPushToken(token);
        setPermissionGranted(true);

        // Upsert token in DB
        await supabase.from('user_push_tokens').upsert({
            user_id: userId,
            company_id: companyId,
            token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    }, [userId, companyId]);

    // ── Fetch all other company tokens (excluding current user) ────────────────
    const getOtherUserTokens = useCallback(async (): Promise<string[]> => {
        if (!companyId || !userId) return [];
        const { data } = await supabase
            .from('user_push_tokens')
            .select('token')
            .eq('company_id', companyId)
            .neq('user_id', userId);
        return (data || []).map((r: any) => r.token).filter(Boolean);
    }, [companyId, userId]);

    const getAllCompanyTokens = useCallback(async (): Promise<string[]> => {
        if (!companyId) return [];
        const { data } = await supabase
            .from('user_push_tokens')
            .select('token')
            .eq('company_id', companyId);
        return (data || []).map((r: any) => r.token).filter(Boolean);
    }, [companyId]);

    // ── Stock Alerts ────────────────────────────────────────────────────────────
    const checkStockAlerts = useCallback(async () => {
        if (!companyId) return;

        const lastSent = await AsyncStorage.getItem('last_stock_alert');
        const now = new Date();
        // Run once per day max
        if (lastSent && (now.getTime() - parseInt(lastSent)) < 23 * 3600 * 1000) return;
        await AsyncStorage.setItem('last_stock_alert', now.getTime().toString());

        const { data: products } = await supabase
            .from('branch_products')
            .select('stock, min_stock_level, products!inner(id, name, company_id)')
            .eq('products.company_id', companyId);

        if (!products) return;
        const allTokens = await getAllCompanyTokens();
        if (allTokens.length === 0) return;

        for (const bp of products) {
            const product = (bp as any).products;
            const stock = Number(bp.stock || 0);
            const minLevel = Number((bp as any).min_stock_level || 5);

            if (stock === 0) {
                // Log & send out-of-stock
                const msg = NotificationTemplates.outOfStock(product.name);
                await sendExpoPushNotification({ to: allTokens, ...msg });
                await logNotification(companyId, 'out_of_stock', msg.title, msg.body);
            } else if (stock <= minLevel) {
                // Log & send low-stock
                const msg = NotificationTemplates.lowStock(product.name, stock);
                await sendExpoPushNotification({ to: allTokens, ...msg });
                await logNotification(companyId, 'low_stock', msg.title, msg.body);
            }
        }
    }, [companyId, getAllCompanyTokens]);

    // ── Daily Summary ──────────────────────────────────────────────────────────
    const checkDailySummary = useCallback(async () => {
        if (!companyId) return;

        const lastSent = await AsyncStorage.getItem(DAILY_SUMMARY_KEY);
        const now = new Date();

        // Only send once per day, after 7PM
        if (now.getHours() < 19) return;
        if (lastSent) {
            const diff = now.getTime() - parseInt(lastSent);
            if (diff < 23 * 3600 * 1000) return; // Already sent today
        }

        // Fetch today's sales
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: sales } = await supabase
            .from('sales')
            .select('total_amount')
            .eq('company_id', companyId)
            .gte('created_at', today.toISOString());

        if (!sales) return;

        const revenue = sales.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
        const count = sales.length;

        await AsyncStorage.setItem(DAILY_SUMMARY_KEY, now.getTime().toString());

        const allTokens = await getAllCompanyTokens();
        const msg = NotificationTemplates.dailySummary(revenue, count, currency || 'ETB');
        await sendExpoPushNotification({ to: allTokens, ...msg });
        await logNotification(companyId, 'daily_summary', msg.title, msg.body);
    }, [companyId, currency, getAllCompanyTokens]);

    // ── Overdue Debt Check ─────────────────────────────────────────────────────
    const checkOverdueDebts = useCallback(async () => {
        if (!companyId || userRole !== 'Admin') return;

        const lastChecked = await AsyncStorage.getItem(OVERDUE_CHECK_KEY);
        const now = new Date();

        // Run once per day max
        if (lastChecked && (now.getTime() - parseInt(lastChecked)) < 23 * 3600 * 1000) return;
        await AsyncStorage.setItem(OVERDUE_CHECK_KEY, now.getTime().toString());

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: overdueInvoices } = await supabase
            .from('sales')
            .select('customers(name), balance_due, created_at')
            .eq('company_id', companyId)
            .gt('balance_due', 0)
            .lte('created_at', thirtyDaysAgo.toISOString());

        if (!overdueInvoices || overdueInvoices.length === 0) return;

        // Get admin-only tokens
        const { data: adminUsers } = await supabase
            .from('user_push_tokens')
            .select('token, profiles!inner(role, company_id)')
            .eq('profiles.company_id', companyId)
            .eq('profiles.role', 'Admin');

        const adminTokens = (adminUsers || []).map((u: any) => u.token).filter(Boolean);
        if (adminTokens.length === 0) return;

        // Group by customer
        const byCustomer = new Map<string, { name: string; total: number; oldest: Date }>();
        overdueInvoices.forEach((inv: any) => {
            const name = inv.customers?.name || 'Unknown Customer';
            const cur = byCustomer.get(name) || { name, total: 0, oldest: new Date() };
            cur.total += Number(inv.balance_due || 0);
            const invDate = new Date(inv.created_at);
            if (invDate < cur.oldest) cur.oldest = invDate;
            byCustomer.set(name, cur);
        });

        for (const [, cust] of byCustomer) {
            const days = Math.floor((now.getTime() - cust.oldest.getTime()) / (1000 * 3600 * 24));
            const msg = NotificationTemplates.overdueDebt(cust.name, cust.total, currency || 'ETB', days);
            await sendExpoPushNotification({ to: adminTokens, ...msg });
            await logNotification(companyId, 'overdue_debt', msg.title, msg.body);
        }
    }, [companyId, userRole, currency]);

    // ── Supabase Realtime Subscriptions ────────────────────────────────────────
    useEffect(() => {
        if (!companyId || !userId) return;

        let salesChannel: any;
        let purchasesChannel: any;

        const setupSubscriptions = async () => {
            // Subscribe to new sales
            salesChannel = supabase
                .channel(`sales-notify-${companyId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'sales',
                    filter: `company_id=eq.${companyId}`,
                }, async (payload) => {
                    const sale = payload.new as any;
                    // Only notify if this sale was made by ANOTHER user
                    if (sale.created_by === userId) return;

                    const otherTokens = await getOtherUserTokens();
                    if (otherTokens.length === 0) return;

                    const amount = Number(sale.total_amount || 0);
                    const msg = NotificationTemplates.newSale(amount, currency || 'ETB', userName);

                    // Also show local notification to current user if they should see it
                    await sendLocalNotification(msg.title, msg.body, msg.data);
                    setUnreadCount(c => c + 1);

                    await sendExpoPushNotification({ to: otherTokens, ...msg });
                    await logNotification(companyId, 'new_sale', msg.title, msg.body);
                })
                .subscribe();

            // Subscribe to new purchases
            purchasesChannel = supabase
                .channel(`purchases-notify-${companyId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'purchases',
                    filter: `company_id=eq.${companyId}`,
                }, async (payload) => {
                    const purchase = payload.new as any;
                    if (purchase.created_by === userId) return;

                    // Fetch supplier name
                    const { data: supplierData } = await supabase
                        .from('suppliers')
                        .select('name')
                        .eq('id', purchase.supplier_id)
                        .single();

                    const otherTokens = await getOtherUserTokens();
                    const amount = Number(purchase.total_amount || 0);
                    const supplier = supplierData?.name || 'Supplier';
                    const msg = NotificationTemplates.newPurchase(supplier, amount, currency || 'ETB', userName);

                    await sendLocalNotification(msg.title, msg.body, msg.data);
                    setUnreadCount(c => c + 1);

                    await sendExpoPushNotification({ to: otherTokens, ...msg });
                    await logNotification(companyId, 'new_purchase', msg.title, msg.body);
                })
                .subscribe();
        };

        setupSubscriptions();

        return () => {
            if (salesChannel) supabase.removeChannel(salesChannel);
            if (purchasesChannel) supabase.removeChannel(purchasesChannel);
        };
    }, [companyId, userId, userName, currency, getOtherUserTokens]);

    // ── App state change → run checks on app foregrounded ─────────────────────
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && nextState === 'active') {
                checkStockAlerts();
                checkDailySummary();
                checkOverdueDebts();
            }
            appState.current = nextState;
        });

        // Also run on initial load
        if (companyId && userId) {
            checkStockAlerts();
            checkDailySummary();
            checkOverdueDebts();
        }

        return () => subscription.remove();
    }, [checkStockAlerts, checkDailySummary, checkOverdueDebts, companyId, userId]);

    // ── Token registration when user logs in ───────────────────────────────────
    useEffect(() => {
        if (userId && companyId) {
            registerToken();
        }
    }, [userId, companyId, registerToken]);

    // ── Notification tap handler → navigate to right screen ───────────────────
    useEffect(() => {
        notificationListener.current = Notifications.addNotificationReceivedListener(() => {
            setUnreadCount(c => c + 1);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data as any;
            if (data?.screen) {
                setUnreadCount(0);
                router.push(`/(tabs)/${data.screen}` as any);
            }
        });

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [router]);

    const markAllRead = useCallback(() => setUnreadCount(0), []);

    return (
        <NotificationContext.Provider value={{ pushToken, unreadCount, markAllRead, permissionGranted }}>
            {children}
        </NotificationContext.Provider>
    );
}

// ── Helper: log notification to Supabase for in-app inbox ─────────────────────
async function logNotification(companyId: string, type: string, title: string, body: string) {
    await supabase.from('notifications').insert({
        company_id: companyId,
        type,
        title,
        body,
        created_at: new Date().toISOString(),
        read: false,
    });
}
