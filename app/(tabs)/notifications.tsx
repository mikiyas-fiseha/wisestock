
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

interface NotificationRecord {
    id: string;
    type: string;
    title: string;
    body: string;
    read: boolean;
    created_at: string;
}

export default function NotificationsScreen() {
    const { colors, theme } = useTheme();
    const { company } = useAuth();
    const { markAllRead } = useNotifications();
    const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!company?.id) return;
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false })
                .limit(100);

            if (data) setNotifications(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [company?.id]);

    // Fetch when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchNotifications();
            markAllRead(); // When opening screen, mark everything read in context Context

            // Also mark as read in DB so next fetch they are greyed out
            if (company?.id) {
                supabase.from('notifications').update({ read: true }).eq('company_id', company.id).eq('read', false).then();
            }
        }, [fetchNotifications, markAllRead, company?.id])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotifications();
    }, [fetchNotifications]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'low_stock': return 'exclamation-triangle';
            case 'out_of_stock': return 'times-circle';
            case 'new_sale': return 'shopping-cart';
            case 'new_purchase': return 'shopping-bag';
            case 'daily_summary': return 'bar-chart';
            case 'overdue_debt': return 'money';
            default: return 'bell';
        }
    };

    const getIconColor = (type: string) => {
        switch (type) {
            case 'low_stock': return '#F59E0B'; // Amber
            case 'out_of_stock': return '#EF4444'; // Red
            case 'new_sale': return '#10B981'; // Green
            case 'new_purchase': return '#3B82F6'; // Blue
            case 'daily_summary': return '#8B5CF6'; // Purple
            case 'overdue_debt': return '#EF4444'; // Red
            default: return colors.primary;
        }
    };

    const renderItem = ({ item }: { item: NotificationRecord }) => (
        <View style={[styles.notificationCard, { backgroundColor: item.read ? colors.card : colors.background, borderBottomColor: colors.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: getIconColor(item.type) + '20' }]}>
                <FontAwesome name={getIcon(item.type) as any} size={20} color={getIconColor(item.type)} />
            </View>
            <View style={styles.contentContainer}>
                <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.body, { color: colors.textSecondary }]}>{item.body}</Text>
                <Text style={[styles.time, { color: colors.textSecondary + '80' }]}>
                    {new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </Text>
            </View>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={notifications.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    <EmptyState
                        icon="bell-o"
                        title="No Notifications Yet"
                        message="You're all caught up! When things happen in your store, they will appear here."
                    />
                }
            />
        </View>
    );
}

function EmptyState({ icon, title, message }: { icon: string, title: string, message: string }) {
    const { colors } = useTheme();
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <FontAwesome name={icon as any} size={48} color={colors.textSecondary} style={{ marginBottom: 16, opacity: 0.5 }} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>{title}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    notificationCard: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contentContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    body: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 6,
    },
    time: {
        fontSize: 12,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
        marginTop: 6,
    },
});
