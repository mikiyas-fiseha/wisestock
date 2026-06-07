import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * ScreenWrapper
 * Automatically adds correct top padding on mobile to account for the
 * transparent floating header (BlurView). On Android, the header height
 * is statusBarHeight + ~56px (standard header). On iOS it uses the safe area top.
 * On Web nothing is added since web uses a sidebar, not a floating header.
 */
export function ScreenWrapper({ children, style, skipHeaderOffset }: { children: React.ReactNode; style?: any; skipHeaderOffset?: boolean }) {
    const insets = useSafeAreaInsets();
    const isWeb = Platform.OS === 'web';

    // The floating header = safe area top + header bar (~56dp on Android, ~44dp on iOS)
    const HEADER_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 56;
    const topPadding = isWeb ? 0 : (skipHeaderOffset ? 0 : (insets.top + HEADER_BAR_HEIGHT));
    const bottomPadding = isWeb ? 0 : 90;

    return (
        <View style={[styles.container, !isWeb && { paddingTop: topPadding, paddingBottom: bottomPadding }, style]}>
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
