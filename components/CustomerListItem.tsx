import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CustomerListItemProps {
    name: string;
    phone?: string;
    balance: number;
    customerType?: string;
    status?: string;
    onPress: () => void;
}

export const CustomerListItem = ({ name, phone, balance, customerType, status, onPress }: CustomerListItemProps) => {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                {status && status !== 'active' && (
                    <View style={[styles.statusDot, { backgroundColor: status === 'blocked' ? colors.danger : colors.textSecondary }]} />
                )}
            </View>
            <View style={styles.content}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title} numberOfLines={1}>{name}</Text>
                    {customerType === 'wholesale' && (
                        <View style={styles.wholesaleBadge}>
                            <Text style={styles.wholesaleText}>WHOLESALE</Text>
                        </View>
                    )}
                </View>
                {phone && (
                    <View style={styles.phoneContainer}>
                        <FontAwesome name="phone" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.subtitle}>{phone}</Text>
                    </View>
                )}
            </View>
            <View style={styles.right}>
                <Text style={[
                    styles.balance,
                    balance > 0 ? { color: colors.danger } : { color: colors.success }
                ]}>
                    ${balance.toFixed(2)}
                </Text>
                <Text style={styles.caption}>Balance</Text>
            </View>
            <View style={styles.arrow}>
                <FontAwesome name="chevron-right" size={12} color={colors.textSecondary} />
            </View>
        </TouchableOpacity>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Layout.spacing.md,
        backgroundColor: (colors.card + 'E0'),
        borderRadius: Layout.borderRadius.lg,
        marginBottom: Layout.spacing.sm,
        ...Layout.shadows.small,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Layout.spacing.md,
    },
    avatarText: {
        color: colors.primary,
        fontSize: 20,
        fontWeight: '700',
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: (colors.card + 'E0'),
    },
    content: {
        flex: 1,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    wholesaleBadge: {
        backgroundColor: colors.primaryLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    wholesaleText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.primary,
    },
    phoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    right: {
        alignItems: 'flex-end',
        marginRight: Layout.spacing.sm,
    },
    balance: {
        fontSize: 16,
        fontWeight: '700',
    },
    caption: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    arrow: {
        marginLeft: Layout.spacing.xs,
    }
});
