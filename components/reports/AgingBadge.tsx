import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AgingBadgeProps {
    days: number;
}

export const AgingBadge: React.FC<AgingBadgeProps> = ({ days }) => {
    const { colors } = useTheme();

    let label = 'Current';
    let badgeColor = colors.success;

    if (days > 60) {
        label = '60+ Days';
        badgeColor = colors.danger;
    } else if (days > 30) {
        label = '31–60 Days';
        badgeColor = colors.warning;
    } else if (days > 0) {
        label = '0–30 Days';
        badgeColor = colors.success; // Or maybe a softer success/primary
    }

    return (
        <View style={[styles.badge, { backgroundColor: badgeColor + '20', borderColor: badgeColor + '40' }]}>
            <View style={[styles.dot, { backgroundColor: badgeColor }]} />
            <Text style={[styles.text, { color: badgeColor }]}>{label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    text: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});
