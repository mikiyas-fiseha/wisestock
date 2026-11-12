import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';

/**
 * Hook to hide the parent tab bar and main tab header when a sub-screen mounts.
 * Restores them when the sub-screen unmounts.
 */
export function useHideTabs() {
    const navigation = useNavigation();

    useLayoutEffect(() => {
        let parent = navigation.getParent();
        while (parent) {
            const state = parent.getState();
            if (state?.type === 'tab') {
                parent.setOptions({
                    headerShown: false,
                    tabBarStyle: { display: 'none' },
                });
                break;
            }
            parent = parent.getParent();
        }

        return () => {
            let p = navigation.getParent();
            while (p) {
                const state = p.getState();
                if (state?.type === 'tab') {
                    p.setOptions({
                        headerShown: true,
                        tabBarStyle: undefined,
                    });
                    break;
                }
                p = p.getParent();
            }
        };
    }, [navigation]);
}

