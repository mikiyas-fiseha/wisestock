import { AppHeader } from '@/components/AppHeader';
import { SubscriptionGuard } from '@/components/auth/SubscriptionGuard';
import { MobileSidebar } from '@/components/navigation/MobileSidebar';
import { WebSidebar } from '@/components/navigation/WebSidebar';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { colors, theme } = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= 768; // Tablet/Desktop breakpoint
  const [menuVisible, setMenuVisible] = useState(false);
  const { company } = useAuth();
  const { unreadCount, markAllRead } = useNotifications();
  const router = useRouter();
  const { t } = useTranslation();
  const pathname = usePathname();

  return (
    <SubscriptionGuard>
      <LinearGradient
        colors={theme === 'dark' ? Gradients.authDark : Gradients.authLight}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={{ flex: 1, flexDirection: isWeb ? 'row' : 'column' }}>
          {isWeb && <WebSidebar />}
          {!isWeb && <MobileSidebar visible={menuVisible} onClose={() => setMenuVisible(false)} />}
          <Tabs
            screenLayout={({ children }) => <ScreenWrapper>{children}</ScreenWrapper>}
            screenOptions={{
              tabBarActiveTintColor: colors.primary,
              tabBarInactiveTintColor: colors.textSecondary,
              headerShown: !isWeb,
              headerTransparent: true,
              headerBackground: () => (
                <View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }, { backgroundColor: colors.card, opacity: 0.95 }]} />
              ),
              headerTitle: company?.name || 'ብልህStock',
              headerTitleAlign: 'center',
              headerStyle: {
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
              headerTitleStyle: {
                fontSize: 18,
                fontWeight: 'bold',
                color: colors.text,
              },
              headerLeft: () => (
                <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ marginLeft: 20, padding: 4 }}>
                  <FontAwesome name="bars" size={20} color={colors.text} />
                </TouchableOpacity>
              ),
              headerRight: () => (
                <TouchableOpacity
                  onPress={() => { markAllRead(); router.push('/notifications'); }}
                  style={{ marginRight: 20, padding: 4 }}
                >
                  <FontAwesome name={unreadCount > 0 ? 'bell' : 'bell-o'} size={20} color={unreadCount > 0 ? colors.primary : colors.text} />
                  {unreadCount > 0 && (
                    <View style={{
                      position: 'absolute', top: 0, right: 0,
                      minWidth: 16, height: 16, borderRadius: 8,
                      backgroundColor: '#EF4444',
                      borderWidth: 1, borderColor: colors.background,
                      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2
                    }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ),
              tabBarBackground: () => (
                !isWeb ? <View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }, { backgroundColor: colors.card, opacity: 0.95 }]} /> : null
              ),
              tabBarStyle: isWeb ? { display: 'none' } : {
                position: 'absolute',
                backgroundColor: 'transparent',
                borderTopColor: 'transparent',
                borderTopWidth: 0,
                elevation: 0,
                shadowOpacity: 0,
                height: 90,
                paddingBottom: 30,
                paddingTop: 8,
              },
              tabBarLabelStyle: {
                fontSize: 10,
                fontWeight: '600',
              },
              tabBarItemStyle: {
                display: 'none',
              },
            }}>
            <Tabs.Screen
              name="dashboard"
              options={{
                title: t('common.dashboard'),
                tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart" color={color} />,
                tabBarItemStyle: { display: 'flex' },
              }}
            />
            <Tabs.Screen
              name="products"
              options={{
                title: t('common.products'),
                tabBarIcon: ({ color }) => <TabBarIcon name="cube" color={color} />,
                tabBarItemStyle: { display: 'flex' },
              }}
            />
            <Tabs.Screen
              name="sales"
              options={{
                title: t('common.sales'),
                tabBarIcon: ({ color }) => <TabBarIcon name="shopping-cart" color={color} />,
                tabBarItemStyle: { display: 'flex' },
              }}
            />
            <Tabs.Screen
              name="purchases"
              options={{
                title: t('common.purchases') || 'Purchases',
                tabBarIcon: ({ color }) => <TabBarIcon name="shopping-bag" color={color} />,
                tabBarItemStyle: { display: 'flex' },
              }}
            />
            <Tabs.Screen
              name="inventory"
              options={{
                title: t('common.inventory'),
                tabBarIcon: ({ color }) => <TabBarIcon name="archive" color={color} />,
                href: null,
              }}
            />
            <Tabs.Screen
              name="reports"
              options={{
                title: t('common.reports'),
                tabBarIcon: ({ color }) => <TabBarIcon name="line-chart" color={color} />,
                tabBarItemStyle: { display: 'flex' },
              }}
            />
            <Tabs.Screen
              name="customers"
              options={{
                title: t('common.customers'),
                tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
                href: null,
                tabBarItemStyle: { display: 'none' }
              }}
            />
            <Tabs.Screen
              name="suppliers"
              options={{
                title: t('common.suppliers'),
                tabBarIcon: ({ color }) => <TabBarIcon name="truck" color={color} />,
                href: null,
                tabBarItemStyle: { display: 'none' }
              }}
            />
            <Tabs.Screen
              name="expenses"
              options={{
                title: t('common.expenses'),
                tabBarIcon: ({ color }) => <TabBarIcon name="money" color={color} />,
                headerShown: !isWeb,
                header: () => !isWeb ? <AppHeader title={t('common.expenses')} showMenu={true} onMenuPress={() => setMenuVisible(true)} hideThemeToggle={true} /> : undefined,
                href: null,
                tabBarItemStyle: { display: 'none' }
              }}
            />
            <Tabs.Screen
              name="expenses/add"
              options={{
                href: null,
                tabBarItemStyle: { display: 'none' }
              }}
            />
            <Tabs.Screen
              name="settings"
              options={{
                title: t('common.settings'),
                tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
                href: null,
                tabBarItemStyle: { display: 'none' }
              }}
            />
            <Tabs.Screen
              name="reports/activity"
              options={{
                title: t('reports.activity_logs'),
                href: null,
                tabBarItemStyle: { display: 'none' }
              }}
            />
            <Tabs.Screen
              name="notifications"
              options={{
                title: t('common.notifications') || 'Notifications',
                href: null,
                tabBarItemStyle: { display: 'none' }
              }}
            />
          </Tabs>
        </View>
      </LinearGradient>
    </SubscriptionGuard>
  );
}
