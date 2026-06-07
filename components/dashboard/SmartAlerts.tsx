
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 6,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    alertCard: {
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 4,
    },
    alertContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertMessage: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    alertDesc: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    warning: {
        backgroundColor: `${colors.warning}15`,
        borderLeftColor: colors.warning,
    },
    warningIcon: {
        backgroundColor: colors.warning,
    },
    danger: {
        backgroundColor: `${colors.danger}15`,
        borderLeftColor: colors.danger,
    },
    dangerIcon: {
        backgroundColor: colors.danger,
    },
    info: {
        backgroundColor: `${colors.primary}15`,
        borderLeftColor: colors.primary,
    },
    infoIcon: {
        backgroundColor: colors.primary,
    },
    dismissBtn: {
        padding: 4,
        marginLeft: 4,
    },
});

interface Alert {
    id: string;
    type: 'warning' | 'danger' | 'info';
    message: string;
    description: string;
}

interface SmartAlertsProps {
    stats: {
        todaySales: number;
        todayExpenses: number;
        monthSales: number;
        monthExpenses: number;
        outOfStockCount: number;
    };
    style?: ViewStyle;
}

export function SmartAlerts({ stats, style }: SmartAlertsProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    const alerts: Alert[] = [];

    // Logic for Income vs Expense
    if (stats.monthSales > 0) {
        const expenseRatio = (stats.monthExpenses / stats.monthSales) * 100;
        if (expenseRatio > 60) {
            alerts.push({
                id: 'high-expenses-month',
                type: 'danger',
                message: 'Critical Expense Ratio',
                description: `Expenses are ${expenseRatio.toFixed(0)}% of your sales this month.`
            });
        } else if (expenseRatio > 30) {
            alerts.push({
                id: 'mod-expenses-month',
                type: 'warning',
                message: 'High Expense Ratio',
                description: `Expenses have reached ${expenseRatio.toFixed(0)}% of sales.`
            });
        }
    }

    // Logic for Out of Stock
    if (stats.outOfStockCount > 0) {
        alerts.push({
            id: 'out-of-stock',
            type: 'danger',
            message: 'Out of Stock Items',
            description: `${stats.outOfStockCount} items are completely out of stock.`
        });
    }

    const filteredAlerts = alerts.filter(a => !dismissedIds.includes(a.id));

    if (filteredAlerts.length === 0) return null;

    const dismissAlert = (id: string) => {
        setDismissedIds(prev => [...prev, id]);
    };

    return (
        <View style={[styles.container, style]}>
            <View style={styles.header}>
                <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                <Text style={styles.headerTitle}>Smart Alerts</Text>
            </View>
            {filteredAlerts.map((alert) => (
                <View key={alert.id} style={[styles.alertCard, styles[alert.type]]}>
                    <View style={styles.alertContent}>
                        <View style={[styles.iconContainer, styles[`${alert.type}Icon`]]}>
                            <Ionicons
                                name={alert.type === 'danger' ? 'alert-circle' : 'warning'}
                                size={20}
                                color="white"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.alertMessage}>{alert.message}</Text>
                            <Text style={styles.alertDesc}>{alert.description}</Text>
                        </View>
                        <TouchableOpacity onPress={() => dismissAlert(alert.id)} style={styles.dismissBtn}>
                            <Ionicons name="close" size={20} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
        </View>
    );
};

