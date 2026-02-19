
import { Gradients, Layout } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface SummaryCardProps {
    title: string;
    value: string;
    type?: 'neutral' | 'success' | 'danger' | 'warning' | 'primary';
    style?: StyleProp<ViewStyle>;
}

export function SummaryCard({ title, value, type = 'neutral', style }: SummaryCardProps) {
    const getGradientColors = () => {
        switch (type) {
            case 'success': return ['#D1FAE5', '#A7F3D0'] as const; // Light Green for success
            case 'danger': return ['#FEE2E2', '#FECACA'] as const; // Light Red for danger
            case 'warning': return ['#FEF3C7', '#FDE68A'] as const; // Light Yellow for warning
            case 'primary': return Gradients.primary;
            default: return ['#FFFFFF', '#F9F9F9'] as const;
        }
    };

    const isNeutral = type === 'neutral';
    // Darker text for light backgrounds
    const textColor = type === 'primary' ? '#FFFFFF' : '#1F2937';
    const subTextColor = type === 'primary' ? 'rgba(255,255,255,0.9)' : '#6B7280';

    return (
        <View style={[styles.container, style]}>
            <LinearGradient
                colors={[...getGradientColors()]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
            >
                <Text style={[styles.value, { color: textColor }]}>{value}</Text>
                <Text style={[styles.title, { color: subTextColor }]}>{title}</Text>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minWidth: '45%',
        margin: Layout.spacing.xs,
        borderRadius: Layout.borderRadius.lg,
        ...Layout.shadows.medium,
        backgroundColor: 'transparent', // Shadow needs background, but gradient handles it
    },
    card: {
        borderRadius: Layout.borderRadius.lg,
        paddingVertical: Layout.spacing.lg,
        paddingHorizontal: Layout.spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 13,
        marginTop: 4,
        textAlign: 'center',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    value: {
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
});
