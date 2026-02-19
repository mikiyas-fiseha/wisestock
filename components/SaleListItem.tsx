import { Colors, Layout } from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SaleListItemProps {
    date: string;
    total: number;
    customerName?: string;
    status: string;
    onPress: () => void;
}

export const SaleListItem = ({ date, total, customerName, status, onPress }: SaleListItemProps) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <FontAwesome name="shopping-bag" size={16} color="white" />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.saleId}>Sale #{date.split('T')[1]?.substring(0, 5).replace(':', '') || '0000'}</Text>
                    <Text style={styles.date}>{new Date(date).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.badge, status === 'completed' ? styles.badgeSuccess : styles.badgeWarning]}>
                    <Text style={[styles.badgeText, status === 'completed' ? styles.textSuccess : styles.textWarning]}>
                        {status.toUpperCase()}
                    </Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.footer}>
                <View style={styles.customer}>
                    <FontAwesome name="user" size={12} color={Colors.light.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.customerName}>{customerName || 'Cash Customer'}</Text>
                </View>
                <Text style={styles.amount}>${total.toFixed(2)}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.light.card,
        borderRadius: Layout.borderRadius.lg,
        marginBottom: Layout.spacing.md,
        padding: Layout.spacing.md,
        ...Layout.shadows.medium, // Using standardized shadow
        borderWidth: 1,
        borderColor: 'transparent', // Remove border, rely on shadow for depth
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Layout.spacing.sm,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: Layout.borderRadius.sm,
        backgroundColor: Colors.light.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Layout.spacing.sm,
    },
    headerText: {
        flex: 1,
    },
    saleId: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.light.text,
    },
    date: {
        fontSize: 12,
        color: Colors.light.textSecondary,
    },
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: Layout.borderRadius.sm,
    },
    badgeSuccess: {
        backgroundColor: '#E3FCEF', // Light green background
    },
    badgeWarning: {
        backgroundColor: '#FFFAE6', // Light yellow/amber background
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    textSuccess: {
        color: '#006644',
    },
    textWarning: {
        color: '#FF8B00',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.light.border,
        marginVertical: Layout.spacing.sm,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    customer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    customerName: {
        fontSize: 13,
        color: Colors.light.textSecondary,
        fontWeight: '500',
    },
    amount: {
        fontSize: 18,
        fontWeight: '800', // Extra bold for emphasis
        color: Colors.light.text,
    },
});
