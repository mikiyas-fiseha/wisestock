
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface ResponsiveContainerProps {
    children: React.ReactNode;
    style?: ViewStyle;
    maxWidth?: number;
}

export function ResponsiveContainer({ children, style, maxWidth = 1200 }: ResponsiveContainerProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    return (
        <View style={[styles.outerContainer, style]}>
            <View style={[styles.innerContainer, { maxWidth }]}>
                {children}
            </View>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    outerContainer: {
        flex: 1,
        alignItems: 'center', // Center content horizontally
        backgroundColor: 'transparent',
        width: '100%',
    },
    innerContainer: {
        width: '100%',
        flex: 1,
        // On web, this constrains width. On mobile, usually screen width < maxWidth so it fills.
    },
});
