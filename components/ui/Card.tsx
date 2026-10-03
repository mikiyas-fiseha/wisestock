import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    onPress?: () => void;
    hoverable?: boolean;
}

export function Card({ children, style, onPress, hoverable = false }: CardProps) {
    const { colors, theme } = useTheme();
    const [isHovered, setIsHovered] = useState(false);
    const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);

    const cardContent = (
        <BlurView
            tint={theme === 'dark' ? 'dark' : 'light'}
            intensity={theme === 'dark' ? 40 : 60}
            style={[
                styles.card,
                theme === 'dark' ? styles.cardDark : styles.cardLight,
                isHovered && styles.cardHovered,
                style,
            ]}
        >
            {children}
        </BlurView>
    );

    if (onPress || hoverable) {
        return (
            <Pressable
                onPress={onPress}
                // @ts-ignore Web hover props
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={styles.pressable}
            >
                {cardContent}
            </Pressable>
        );
    }

    return cardContent;
}

const createStyles = (colors: any, theme: 'light' | 'dark') => StyleSheet.create({
    pressable: {
        width: '100%',
    },
    card: {
        borderRadius: Layout.borderRadius.lg,
        padding: Layout.spacing.md,
        marginVertical: Layout.spacing.xs,
        overflow: 'hidden',
        borderWidth: 1,
        transitionDuration: '200ms',
        ...Layout.shadows.small,
    } as any,
    cardLight: {
        backgroundColor: colors.glass || 'rgba(255, 255, 255, 0.9)',
        borderColor: colors.border,
    },
    cardDark: {
        backgroundColor: colors.glass || 'rgba(17, 24, 39, 0.75)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    cardHovered: {
        borderColor: colors.primary,
        ...(Platform.OS === 'web' ? {
            transform: 'translateY(-2px)',
            boxShadow: theme === 'dark'
                ? '0 12px 28px rgba(0, 0, 0, 0.45)'
                : '0 12px 24px rgba(15, 23, 42, 0.08)',
            cursor: 'pointer',
        } as any : {}),
    },
});
