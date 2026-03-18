
import { AuthProvider } from '@/context/AuthContext';
import { FeedbackProvider } from '@/context/FeedbackContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ThemeProvider as CustomThemeProvider, useTheme } from '@/context/ThemeContext';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Platform } from 'react-native';


SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { theme, colors } = useTheme();

  // Force native elements (like pickers) to respect the theme on Web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'web-theme-override';
      let style = document.getElementById(styleId);
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
      }
      style.textContent = `
        :root { color-scheme: ${theme}; }
        input, textarea, select, *:focus {
          outline: none !important;
        }
        /* Mobile-like picker appearance on web */
        select {
          background-color: transparent !important;
          color: inherit !important;
          border: none !important;
          padding-left: 10px !important;
          cursor: pointer;
        }
        option {
          background-color: ${theme === 'dark' ? '#1E293B' : '#FFFFFF'} !important;
          color: ${theme === 'dark' ? '#FFFFFF' : '#000000'} !important;
        }
      `;
    }
  }, [theme]);

  const customNavigationTheme = {
    ...(theme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationThemeProvider value={customNavigationTheme}>
      <AuthProvider>
        <FeedbackProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ animation: 'fade', headerShown: false }} />
            <Stack.Screen name="register" options={{ presentation: 'modal', title: 'Register Company' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        </FeedbackProvider>
      </AuthProvider>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const queryClient = new QueryClient();

  return (
    <CustomThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
      </QueryClientProvider>
    </CustomThemeProvider>
  );
}
