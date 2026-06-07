
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { FeedbackProvider } from '@/context/FeedbackContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Font from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../lib/i18n';

import { ThemeProvider as CustomThemeProvider, useTheme } from '@/context/ThemeContext';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import '../lib/i18n';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,  // 2 minutes — data is fresh, no refetch on focus
      gcTime: 1000 * 60 * 10,    // 10 minutes — keep cache alive
      retry: 1,                   // Only retry failed queries once
      refetchOnWindowFocus: false, // Don't refetch every time user switches tabs
    },
  },
});

function ErrorBoundary({ error, source }: { error: any, source: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#711', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>App Crash at {source}</Text>
      <Text style={{ color: '#faa', marginTop: 10, fontSize: 16 }}>{String(error)}</Text>
      <Text style={{ color: '#ccc', marginTop: 20, fontSize: 12 }}>Check console for full stack trace.</Text>
    </View>
  );
}

function RootNavigator() {
  const { theme, colors } = useTheme();
  const { session, user, company, isLoading, subLoading, isSuperAdmin } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Reveal the app only when auth AND subscription are fully resolved.
  // Double-RAF ensures __hideSplash fires AFTER the browser has painted
  // the mounted Stack/dashboard — so #root becomes visible already showing
  // the correct screen, never an intermediate state.
  useEffect(() => {
    if (!isLoading && !subLoading) {
      SplashScreen.hideAsync().catch(() => { });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // RAF 1 → React has committed; RAF 2 → browser has painted
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if ((window as any).__hideSplash) (window as any).__hideSplash();
          });
        });
      }
    }
  }, [isLoading, subLoading]);

  useEffect(() => {
    if (isLoading || subLoading) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthRoute = firstSegment === 'login' || firstSegment === 'register';
    const inSuperAdminGroup = firstSegment === '(super-admin)';
    const isRoot = firstSegment === 'index' || firstSegment === undefined || firstSegment === '';

    if (!session) {
      if (!inAuthRoute) {
        router.replace('/login');
      }
    } else {
      if (inAuthRoute || isRoot) {
        if (isSuperAdmin) {
          router.replace('/(super-admin)/superadminDasboarde');
        } else {
          router.replace('/(tabs)/dashboard');
        }
      } else if (!isSuperAdmin && inSuperAdminGroup) {
        router.replace('/(tabs)/dashboard');
      }
    }
  }, [session, isLoading, subLoading, segments, isSuperAdmin]);

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

  // Block the Stack from mounting until BOTH auth and subscription are resolved.
  // On web the HTML splash (z-index:9999) covers this entire time, so the user
  // never sees any intermediate screen. On native, the native splash covers it.
  if (isLoading || subLoading) {
    // Return null — the HTML #splash div covers everything on web.
    // (If no HTML splash e.g. native, SplashScreen API covers it.)
    return null;
  }

  try {
    return (
      <NavigationThemeProvider value={customNavigationTheme}>
        <NotificationProvider
          userId={user?.id ?? null}
          companyId={company?.id ?? null}
          userName={user?.name ?? 'User'}
          userRole={user?.role ?? 'Admin'}
          currency={(company as any)?.currency ?? '$'}
        >
          <FeedbackProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ animation: 'fade', headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(super-admin)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          </FeedbackProvider>
        </NotificationProvider>
      </NavigationThemeProvider>
    );
  } catch (err) {
    console.error('RootNavigator Render Error:', err);
    return <ErrorBoundary error={err} source="RootNavigator" />;
  }
}

export default function RootLayout() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
        });
      } catch (e) {
        console.warn('Font load error:', e);
      } finally {
        setLoaded(true);
        // NOTE: __hideSplash is NOT called here anymore.
        // It is now called in RootNavigator after auth resolves, so the
        // HTML splash stays visible until the app is truly ready to show content.
      }
    }
    loadFonts();
  }, []);

  // Do NOT call SplashScreen.hideAsync() here.
  // We wait for auth to resolve in RootNavigator so the splash covers full init.

  if (!loaded) {
    // On web: show a branded loading screen so the browser paints something immediately
    // (improves LCP significantly). On native: splash covers this, so null is fine.
    if (Platform.OS === 'web') {
      return (
        <View style={{ flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      );
    }
    return null;
  }

  try {
    return (
      <CustomThemeProvider>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </I18nextProvider>
        </QueryClientProvider>
      </CustomThemeProvider>
    );
  } catch (err) {
    console.error('RootLayout Render Error:', err);
    return <ErrorBoundary error={err} source="RootLayout" />;
  }
}
