import { BranchSelector } from '@/components/BranchSelector';
import { Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface SidebarItemProps {
    name: string;
    icon: IoniconsName;
    isActive: boolean;
    onPress: () => void;
}

const SidebarItem = ({ name, icon, isActive, onPress }: SidebarItemProps) => {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);
    const [hovered, setHovered] = useState(false);

    return (
        <Pressable
            style={[
                styles.item,
                isActive && styles.activeItem,
                hovered && !isActive && styles.hoveredItem,
            ]}
            onPress={onPress}
            // @ts-ignore — web-only props
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Active luminous indicator bar */}
            {isActive && <View style={styles.activeBar} />}
            <Ionicons
                name={icon}
                size={18}
                color={isActive ? colors.primary : hovered ? colors.text : colors.textSecondary}
                style={{ width: 26, textAlign: 'center' }}
            />
            <Text
                style={[
                    styles.itemText,
                    isActive && styles.activeItemText,
                    hovered && !isActive && styles.hoveredItemText,
                ]}
            >
                {name}
            </Text>
        </Pressable>
    );
};

export function WebSidebar() {
    const { colors, theme, setTheme } = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);
    const router = useRouter();
    const pathname = usePathname();
    const { user, company } = useAuth();

    const routes: { name: string; icon: IoniconsName; route: string }[] = [
        { name: t('common.dashboard'), icon: 'grid-outline', route: '/(tabs)/dashboard' },
        { name: t('common.products'), icon: 'cube-outline', route: '/(tabs)/products' },
        { name: t('common.purchases'), icon: 'bag-handle-outline', route: '/(tabs)/purchases' },
        { name: t('common.inventory'), icon: 'layers-outline', route: '/(tabs)/inventory' },
        { name: t('common.sales'), icon: 'cart-outline', route: '/(tabs)/sales' },
        { name: t('common.reports'), icon: 'bar-chart-outline', route: '/(tabs)/reports' },
        { name: t('common.customers'), icon: 'people-outline', route: '/(tabs)/customers' },
        { name: t('common.suppliers'), icon: 'briefcase-outline', route: '/(tabs)/suppliers' },
        { name: t('common.expenses'), icon: 'wallet-outline', route: '/(tabs)/expenses' },
        { name: t('common.settings'), icon: 'settings-outline', route: '/(tabs)/settings' },
    ];

    const handleNavigate = (route: string) => {
        router.push(route as any);
    };

    return (
        <View style={styles.sidebar}>
            {theme === 'dark' ? (
                <LinearGradient
                    colors={['#0F172A', '#0B0F19', '#08090C']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }]} />
            )}
            <BlurView
                intensity={theme === 'dark' ? 30 : 20}
                tint={theme === 'dark' ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
            />

            {/* Company Header */}
            <View style={styles.header}>
                <View style={styles.companyLogo}>
                    <Text style={styles.companyLogoText}>
                        {(company?.name || 'S').charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.companyInfo}>
                    <Text style={styles.companyName} numberOfLines={1}>
                        {company?.name || 'Wise Shop Tracker'}
                    </Text>
                    <BranchSelector />
                </View>
            </View>

            {/* Navigation */}
            <View style={styles.navigation}>
                <Text style={styles.navLabel}>{t('common.menu') || 'MENU'}</Text>
                {routes.map((item) => {
                    const routeSegment = item.route.replace('/(tabs)', '');
                    const isActive = pathname === routeSegment || pathname.startsWith(routeSegment + '/');

                    return (
                        <SidebarItem
                            key={item.route}
                            name={item.name}
                            icon={item.icon}
                            isActive={isActive}
                            onPress={() => handleNavigate(item.route)}
                        />
                    );
                })}
            </View>

            {/* User Footer */}
            <View style={styles.footer}>
                <View style={styles.userSection}>
                    <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>
                            {(user?.name || 'U').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName} numberOfLines={1}>{user?.name || t('common.user')}</Text>
                        <Text style={styles.userRole} numberOfLines={1}>{t(`common.${(user?.role || 'member').toLowerCase()}`)}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        style={styles.themeToggle}
                    >
                        <Ionicons
                            name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'}
                            size={18}
                            color={colors.textSecondary}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const createStyles = (colors: any, theme: 'light' | 'dark') => StyleSheet.create({
    sidebar: {
        width: 250,
        borderRightWidth: 1,
        borderRightColor: theme === 'dark' ? 'rgba(255,255,255,0.07)' : colors.border,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    themeToggle: {
        padding: 8,
        borderRadius: Layout.borderRadius.sm,
        marginLeft: 'auto',
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : colors.border,
        zIndex: 10,
        // @ts-ignore
        overflow: 'visible',
    },
    companyLogo: {
        width: 36,
        height: 36,
        borderRadius: Layout.borderRadius.md,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        ...Layout.shadows.glow(colors.primary),
    },
    companyLogoText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    companyInfo: {
        flex: 1,
        // @ts-ignore
        overflow: 'visible',
    },
    companyName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: -0.2,
    },
    navigation: {
        flex: 1,
        paddingTop: 16,
        paddingHorizontal: 10,
    },
    navLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 1.2,
        paddingHorizontal: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        paddingHorizontal: 12,
        marginBottom: 2,
        borderRadius: Layout.borderRadius.sm,
        position: 'relative',
        ...(Platform.OS === 'web' ? {
            cursor: 'pointer',
            transition: 'background-color 0.15s ease, color 0.15s ease',
        } as any : {}),
    },
    activeItem: {
        backgroundColor: colors.primaryLight,
    },
    hoveredItem: {
        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
    },
    activeBar: {
        position: 'absolute',
        left: 0,
        top: '20%',
        bottom: '20%',
        width: 3,
        borderRadius: 2,
        backgroundColor: colors.primary,
    },
    itemText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
        marginLeft: 4,
    },
    activeItemText: {
        color: colors.primary,
        fontWeight: '600',
    },
    hoveredItemText: {
        color: colors.text,
    },
    footer: {
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: `${colors.primary}20`,
        borderWidth: 1,
        borderColor: `${colors.primary}40`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    userAvatarText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '700',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    userRole: {
        fontSize: 11,
        color: colors.textSecondary,
        textTransform: 'capitalize',
    },
});
