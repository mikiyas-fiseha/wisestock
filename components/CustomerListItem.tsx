import { Colors, Layout } from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CustomerListItemProps {
    name: string;
    phone?: string;
    balance: number;
    onPress: () => void;
}

export const CustomerListItem = ({ name, phone, balance, onPress }: CustomerListItemProps) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>{name}</Text>
                {phone && (
                    <View style={styles.phoneContainer}>
                        <FontAwesome name="phone" size={12} color={Colors.light.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.subtitle}>{phone}</Text>
                    </View>
                )}
            </View>
            <View style={styles.right}>
                <Text style={[
                    styles.balance,
                    balance > 0 ? { color: Colors.light.danger } : { color: Colors.light.success }
                ]}>
                    ${balance.toFixed(2)}
                </Text>
                <Text style={styles.caption}>Balance</Text>
            </View>
            <View style={styles.arrow}>
                <FontAwesome name="chevron-right" size={12} color={Colors.light.textSecondary} />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Layout.spacing.md,
        backgroundColor: Colors.light.card,
        borderRadius: Layout.borderRadius.lg,
        marginBottom: Layout.spacing.sm, // Tighter spacing
        ...Layout.shadows.small, // Softer shadow for lists
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.light.primaryLight, // Softer generic avatar bg
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Layout.spacing.md,
    },
    avatarText: {
        color: Colors.light.primary,
        fontSize: 20,
        fontWeight: '700',
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: 2,
    },
    phoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: Colors.light.textSecondary,
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
        color: Colors.light.textSecondary,
        marginTop: 2,
    },
    arrow: {
        marginLeft: Layout.spacing.xs,
    }
});
