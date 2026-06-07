import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme as useDeviceColorScheme, View } from 'react-native';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: 'light' | 'dark';
    systemTheme: ThemeType;
    colors: typeof Colors.light;
    setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const deviceTheme = useDeviceColorScheme() ?? 'light';
    const [systemTheme, setSystemThemeState] = useState<ThemeType>('system');
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            if (savedTheme) {
                setSystemThemeState(savedTheme as ThemeType);
            }
        } catch (e) {
            console.error('Failed to load theme preference', e);
        } finally {
            setIsReady(true);
        }
    };

    const setTheme = async (newTheme: ThemeType) => {
        try {
            setSystemThemeState(newTheme);
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
        } catch (e) {
            console.error('Failed to save theme preference', e);
        }
    };

    const activeTheme = systemTheme === 'system' ? deviceTheme : systemTheme;
    const colors = Colors[activeTheme];

    if (!isReady) {
        return (
            <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#fff" />
            </View>
        );
    }

    return (
        <ThemeContext.Provider value={{ theme: activeTheme, systemTheme, colors, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
