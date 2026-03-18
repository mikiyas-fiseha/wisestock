
import { SubscriptionGuard } from '@/components/auth/SubscriptionGuard';
import { MobileSidebar } from '@/components/navigation/MobileSidebar';
import { WebSidebar } from '@/components/navigation/WebSidebar';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Gradients } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';

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
                <BlurView tint={theme === 'dark' ? 'dark' : 'light'} intensity={80} style={StyleSheet.absoluteFill} />
              ),
              headerTitle: 'StockManager',
              headerTitleAlign: 'center',
              headerStyle: {
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
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
                <TouchableOpacity style={{ marginRight: 20, padding: 4 }}>
                  <FontAwesome name="bell-o" size={20} color={colors.text} />
                  <View style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1, borderColor: colors.background }} />
                </TouchableOpacity>
              ),
              // Hide tab bar on web
              tabBarBackground: () => (
                !isWeb ? <BlurView tint={theme === 'dark' ? 'dark' : 'light'} intensity={80} style={StyleSheet.absoluteFill} /> : null
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
                title: 'Dashboard',
                tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart" color={color} />,
                tabBarItemStyle: { display: 'flex' },
              }}
            />
            <Tabs.Screen
              name="products"
              options={{
                title: 'Products',
                tabBarIcon: ({ color }) => <TabBarIcon name="cube" color={color} />,
                tabBarItemStyle: { display: 'flex' },
              }}
            />
            <Tabs.Screen
              name="sales"
              options={{
                title: 'Sales',
                tabBarIcon: ({ color }) => <TabBarIcon name="shopping-cart" color={color} />,
                tabBarItemStyle: { display: 'flex' },
              }}
            />
            <Tabs.Screen
              name="purchases"
              options={{
                title: 'Purchases',
                tabBarIcon: ({ color }) => <TabBarIcon name="shopping-bag" color={color} />,
                tabBarItemStyle: { display: 'flex' },
              }}
            />
            <Tabs.Screen
              name="inventory"
              options={{
                title: 'Inventory',
                tabBarIcon: ({ color }) => <TabBarIcon name="archive" color={color} />,
                href: null,
              }}
            />
            <Tabs.Screen
              name="reports"
              options={{
                title: 'Reports',
                tabBarIcon: ({ color }) => <TabBarIcon name="line-chart" color={color} />,
                tabBarItemStyle: { display: 'flex' },
              }}
            />
            <Tabs.Screen
              name="customers"
              options={{
                title: 'Customers',
                tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
                href: null,
                tabBarItemStyle: { display: 'none' }
              }}
            />
            <Tabs.Screen
              name="suppliers"
              options={{
                title: 'Suppliers',
                tabBarIcon: ({ color }) => <TabBarIcon name="truck" color={color} />,
                href: null,
                tabBarItemStyle: { display: 'none' }
              }}
            />
            <Tabs.Screen
              name="expenses"
              options={{
                title: 'Expenses',
                tabBarIcon: ({ color }) => <TabBarIcon name="money" color={color} />,
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
                title: 'Settings',
                tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
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
