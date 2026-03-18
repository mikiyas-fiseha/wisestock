
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

type IconName = React.ComponentProps<typeof FontAwesome>['name'];

interface SummaryCardProps {
    title: string;
    value: string;
    type?: 'neutral' | 'success' | 'danger' | 'warning' | 'primary';
    icon?: IconName;
    change?: number;      // e.g. +12 or -5 (percentage)
    style?: StyleProp<ViewStyle>;
    compact?: boolean;     // Mobile compact mode
}

export function SummaryCard({ title, value, type = 'neutral', icon, change, style, compact }: SummaryCardProps) {
    const { colors, theme } = useTheme();
    const hasChange = change !== undefined && change !== 0;
    const isPositive = (change || 0) >= 0;

    const gradientMap = {
        neutral: [
            theme === 'dark' ? '#243160' : '#E0F2F4',
            theme === 'dark' ? '#1A2342' : '#F0F9FA'
        ] as const,
        success: [`${colors.success}15`, `${colors.success}25`] as const,
        danger: [`${colors.danger}15`, `${colors.danger}25`] as const,
        warning: [`${colors.warning}15`, `${colors.warning}25`] as const,
        primary: [`${colors.primary}15`, `${colors.primary}25`] as const,
    };

    const iconColorMap = {
        neutral: colors.textSecondary,
        success: colors.success,
        danger: colors.danger,
        warning: colors.warning,
        primary: colors.primary,
    };

    const valueColorMap = {
        neutral: colors.text,
        success: colors.success,
        danger: colors.danger,
        warning: colors.warning,
        primary: colors.primary,
    };

    return (
        <View style={[styles.container, compact && styles.containerCompact, style]}>
            <LinearGradient
                colors={[...gradientMap[type]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, compact && styles.cardCompact]}
            >
                <View style={styles.topRow}>
                    {icon && (
                        <View style={[styles.iconBg, { backgroundColor: `${iconColorMap[type]}14` }]}>
                            <FontAwesome name={icon} size={compact ? 14 : 16} color={iconColorMap[type]} />
                        </View>
                    )}
                    {hasChange && (
                        <View style={[styles.changeBadge, { backgroundColor: isPositive ? `${colors.success}15` : `${colors.danger}15` }]}>
                            <FontAwesome
                                name={isPositive ? 'arrow-up' : 'arrow-down'}
                                size={8}
                                color={isPositive ? colors.success : colors.danger}
                            />
                            <Text style={[styles.changeText, { color: isPositive ? colors.success : colors.danger }]}>
                                {Math.abs(change!)}%
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.value, { color: valueColorMap[type] }, compact && styles.valueCompact]}>{value}</Text>
                <Text style={[styles.title, { color: colors.textSecondary }, compact && styles.titleCompact]}>{title}</Text>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minWidth: '22%',
        margin: 4,
        borderRadius: 14,
        backgroundColor: 'transparent',
    },
    containerCompact: {
        minWidth: '44%',
    },
    card: {
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 14,
        minHeight: 110,
    },
    cardCompact: {
        paddingVertical: 12,
        paddingHorizontal: 12,
        minHeight: 90,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconBg: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    changeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        gap: 3,
    },
    changeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    title: {
        fontSize: 11,
        marginTop: 2,
        fontWeight: '600',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    titleCompact: {
        fontSize: 10,
    },
    value: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -1,
    },
    valueCompact: {
        fontSize: 22,
    },
});
