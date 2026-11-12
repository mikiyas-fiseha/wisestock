import React from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * ScreenWrapper
 * Automatically adds correct top and bottom padding on mobile screens
 * (both native mobile and mobile web viewports < 768px).
 * On desktop (width >= 768 on web), padding is 0 since desktop uses a sidebar.
 */
export function ScreenWrapper({
    children,
    style,
    skipHeaderOffset,
    skipBottomOffset,
}: {
    children: React.ReactNode;
    style?: any;
    skipHeaderOffset?: boolean;
    skipBottomOffset?: boolean;
}) {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= 768;

    // The floating header = safe area top + header bar (~56dp on Android/Web, ~44dp on iOS)
    const HEADER_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 56;
    const topPadding = isDesktop ? 0 : (skipHeaderOffset ? 0 : (insets.top + HEADER_BAR_HEIGHT));
    const bottomPadding = isDesktop ? 0 : (skipBottomOffset ? 0 : (64 + Math.max(insets.bottom, 12)));

    return (
        <View style={[styles.container, !isDesktop && { paddingTop: topPadding, paddingBottom: bottomPadding }, style]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});
