
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';

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
            intensity={80}
            style={[styles.card, theme === 'dark' ? styles.cardDark : styles.cardLight, style]}
        >
            {children}
        </BlurView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        overflow: 'hidden',
    },
    cardLight: {
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderColor: 'rgba(255,255,255,0.8)',
        borderWidth: 1,
    },
    cardDark: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
    },
});
