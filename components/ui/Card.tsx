
import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    return (
        <BlurView
            tint={theme === 'dark' ? 'dark' : 'light'}
            intensity={90}
            style={[styles.card, theme === 'dark' ? styles.cardDark : styles.cardLight, style]}
        >
            {children}
        </BlurView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        marginVertical: 8,
        overflow: 'hidden',
    },
    cardLight: {
        backgroundColor: 'rgba(240, 249, 250, 0.7)',
    },
    cardDark: {
        backgroundColor: 'rgba(26, 35, 66, 0.7)',
    },
});
