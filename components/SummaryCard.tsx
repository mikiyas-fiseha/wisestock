import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

type IconName = React.ComponentProps<typeof FontAwesome>['name'];

interface SummaryCardProps {
    title: string;
    value: string;
    type?: 'neutral' | 'success' | 'danger' | 'warning' | 'primary';
    icon?: IconName;
    change?: number;      // e.g. +12 or -5 (percentage)
    style?: StyleProp<ViewStyle>;
    compact?: boolean;     // Mobile compact mode
    onPress?: () => void;
}

export function SummaryCard({
    title,
    value,
    type = 'neutral',
    icon,
    change,
    style,
    compact,
    onPress,
}: SummaryCardProps) {
    const { colors, theme } = useTheme();
    const [isHovered, setIsHovered] = useState(false);
    const hasChange = change !== undefined && change !== 0;
    const isPositive = (change || 0) >= 0;

    const surfaceGradients = {
        neutral: theme === 'dark'
            ? ['rgba(17, 24, 39, 0.9)', 'rgba(15, 23, 42, 0.75)'] as const
            : ['#FFFFFF', '#F8FAFC'] as const,
        primary: theme === 'dark'
            ? ['rgba(15, 39, 74, 0.55)', 'rgba(17, 24, 39, 0.85)'] as const
            : ['#EFF6FF', '#FFFFFF'] as const,
        success: theme === 'dark'
            ? ['rgba(6, 78, 59, 0.35)', 'rgba(17, 24, 39, 0.85)'] as const
            : ['#ECFDF5', '#FFFFFF'] as const,
        danger: theme === 'dark'
            ? ['rgba(127, 29, 29, 0.35)', 'rgba(17, 24, 39, 0.85)'] as const
            : ['#FEF2F2', '#FFFFFF'] as const,
        warning: theme === 'dark'
            ? ['rgba(120, 53, 15, 0.35)', 'rgba(17, 24, 39, 0.85)'] as const
            : ['#FFFBEB', '#FFFFFF'] as const,
    };

    const accentColor = {
        neutral: colors.textSecondary,
        primary: colors.primary,
        success: colors.success,
        danger: colors.danger,
        warning: colors.warning,
    }[type];

    const valueColor = {
        neutral: colors.text,
        primary: theme === 'dark' ? '#93C5FD' : colors.primary,
        success: colors.success,
        danger: colors.danger,
        warning: colors.warning,
    }[type];

    return (
        <Pressable
            onPress={onPress}
            // @ts-ignore Web hover
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={[
                styles.container,
                compact && styles.containerCompact,
                isHovered && styles.containerHovered,
                style,
            ]}
        >
            <LinearGradient
                colors={[...surfaceGradients[type]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                    styles.card,
                    compact && styles.cardCompact,
                    {
                        borderColor: isHovered
                            ? accentColor
                            : theme === 'dark'
                                ? 'rgba(255, 255, 255, 0.08)'
                                : colors.border,
                    },
                ]}
            >
                <View style={styles.topRow}>
                    {icon && (
                        <View style={[styles.iconBg, { backgroundColor: `${accentColor}18` }]}>
                            <FontAwesome name={icon} size={compact ? 13 : 15} color={accentColor} />
                        </View>
                    )}
                    {hasChange && (
                        <View
                            style={[
                                styles.changeBadge,
                                {
                                    backgroundColor: isPositive
                                        ? `${colors.success}18`
                                        : `${colors.danger}18`,
                                    borderColor: isPositive
                                        ? `${colors.success}30`
                                        : `${colors.danger}30`,
                                },
                            ]}
                        >
                            <FontAwesome
                                name={isPositive ? 'arrow-up' : 'arrow-down'}
                                size={8}
                                color={isPositive ? colors.success : colors.danger}
                            />
                            <Text
                                style={[
                                    styles.changeText,
                                    { color: isPositive ? colors.success : colors.danger },
                                ]}
                            >
                                {Math.abs(change!).toFixed(1)}%
                            </Text>
                        </View>
                    )}
                </View>

                <Text
                    style={[
                        styles.value,
                        { color: valueColor },
                        compact && styles.valueCompact,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                >
                    {value}
                </Text>

                <Text
                    style={[
                        styles.title,
                        { color: colors.textSecondary },
                        compact && styles.titleCompact,
                    ]}
                >
                    {title}
                </Text>
            </LinearGradient>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minWidth: '22%',
        margin: 6,
        borderRadius: Layout.borderRadius.lg,
        backgroundColor: 'transparent',
        ...(Platform.OS === 'web' ? {
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        } as any : {}),
    },
    containerCompact: {
        minWidth: '44%',
        margin: 4,
    },
    containerHovered: {
        ...(Platform.OS === 'web' ? {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            cursor: 'pointer',
        } as any : {}),
    },
    card: {
        borderRadius: Layout.borderRadius.lg,
        paddingVertical: 18,
        paddingHorizontal: 16,
        minHeight: 116,
        borderWidth: 1,
        justifyContent: 'space-between',
        ...Layout.shadows.small,
    },
    cardCompact: {
        paddingVertical: 12,
        paddingHorizontal: 12,
        minHeight: 92,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconBg: {
        width: 32,
        height: 32,
        borderRadius: Layout.borderRadius.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    changeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 12,
        borderWidth: 1,
        gap: 4,
    },
    changeText: {
        fontSize: 10,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    title: {
        fontSize: 11,
        marginTop: 4,
        fontWeight: '600',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    titleCompact: {
        fontSize: 10,
    },
    value: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
        fontVariant: ['tabular-nums'],
    },
    valueCompact: {
        fontSize: 20,
    },
});
