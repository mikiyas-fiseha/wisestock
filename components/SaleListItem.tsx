import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
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
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
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
                    <FontAwesome name="user" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.customerName}>{customerName || 'Cash Customer'}</Text>
                </View>
                <Text style={styles.amount}>${total.toFixed(2)}</Text>
            </View>
        </TouchableOpacity>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        backgroundColor: (colors.card + 'E0'),
        borderRadius: Layout.borderRadius.lg,
        marginBottom: Layout.spacing.md,
        padding: Layout.spacing.md,
        ...Layout.shadows.small,
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
        backgroundColor: colors.primary,
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
        color: colors.text,
    },
    date: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: Layout.borderRadius.sm,
    },
    badgeSuccess: {
        backgroundColor: '#E3FCEF',
    },
    badgeWarning: {
        backgroundColor: '#FFFAE6',
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
        backgroundColor: colors.border,
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
        color: colors.textSecondary,
        fontWeight: '500',
    },
    amount: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
    },
});
