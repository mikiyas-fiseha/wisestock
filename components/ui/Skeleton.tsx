import { Layout } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

export function Skeleton({
    width = '100%',
    height = 20,
    borderRadius = Layout.borderRadius.sm,
    style,
}: SkeletonProps) {
    const { theme } = useTheme();
    const opacityAnim = useRef(new Animated.Value(0.35)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(opacityAnim, {
                    toValue: 0.8,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0.35,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [opacityAnim]);

    const baseColor = theme === 'dark' ? '#1E293B' : '#E2E8F0';

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: baseColor,
                    opacity: opacityAnim,
                },
                style,
            ]}
        />
    );
}

export function SkeletonCard({ height = 120, style }: { height?: number; style?: ViewStyle }) {
    const { colors, theme } = useTheme();
    return (
        <View
            style={[
                styles.cardContainer,
                {
                    backgroundColor: colors.card,
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : colors.border,
                },
                style,
            ]}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <Skeleton width={36} height={36} borderRadius={8} />
                <Skeleton width={50} height={20} borderRadius={10} />
            </View>
            <Skeleton width="60%" height={28} style={{ marginBottom: 8 }} />
            <Skeleton width="40%" height={14} />
        </View>
    );
}

const styles = StyleSheet.create({
    skeleton: {
        overflow: 'hidden',
    },
    cardContainer: {
        flex: 1,
        borderRadius: Layout.borderRadius.md,
        padding: Layout.spacing.md,
        margin: Layout.spacing.xs,
        borderWidth: 1,
    },
});
