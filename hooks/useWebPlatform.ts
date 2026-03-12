import { Platform, useWindowDimensions } from 'react-native';

export function useWebPlatform() {
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const isDesktop = isWeb && width >= 768;

    return {
        isWeb,
        isDesktop,
        statusBarPadding: isWeb ? 16 : 50,
        headerTopPadding: isWeb ? 24 : 60,
    };
}
