import { BranchSelector } from '@/components/BranchSelector';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type IconName = React.ComponentProps<typeof FontAwesome>['name'];

interface SidebarItemProps {
    name: string;
    icon: IconName;
    isActive: boolean;
    onPress: () => void;
}

const SidebarItem = ({ name, icon, isActive, onPress }: SidebarItemProps) => {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
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
            {/* Active indicator bar */}
            {isActive && <View style={styles.activeBar} />}
            <FontAwesome
                name={icon}
                size={17}
                color={isActive ? colors.primary : hovered ? colors.text : '#94A3B8'}
                style={{ width: 26, textAlign: 'center' }}
            />
            <Text style={[
                styles.itemText,
                isActive && styles.activeItemText,
                hovered && !isActive && styles.hoveredItemText,
            ]}>
                {name}
            </Text>
        </Pressable >
    );
};

export function WebSidebar() {
    const { colors, theme, systemTheme, setTheme } = useTheme();
    const { t } = useTranslation();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const pathname = usePathname();
    const { user, company, branch } = useAuth();

    const routes = [
        { name: t('common.dashboard'), icon: 'th-large' as IconName, route: '/(tabs)/dashboard' },
        { name: t('common.products'), icon: 'cube' as IconName, route: '/(tabs)/products' },
        { name: t('common.purchases'), icon: t('common.purchases') ? 'shopping-bag' : 'shopping-bag' as IconName, route: '/(tabs)/purchases' },
        { name: t('common.inventory'), icon: 'archive' as IconName, route: '/(tabs)/inventory' },
        { name: t('common.sales'), icon: 'shopping-cart' as IconName, route: '/(tabs)/sales' },
        { name: t('common.reports'), icon: 'line-chart' as IconName, route: '/(tabs)/reports' },
        { name: t('common.customers'), icon: 'users' as IconName, route: '/(tabs)/customers' },
        { name: t('common.suppliers'), icon: 'truck' as IconName, route: '/(tabs)/suppliers' },
        { name: t('common.expenses'), icon: 'money' as IconName, route: '/(tabs)/expenses' },
        { name: t('common.settings'), icon: 'cog' as IconName, route: '/(tabs)/settings' },
    ];

    const handleNavigate = (route: string) => {
        router.push(route as any);
    };

    return (
        <View style={styles.sidebar}>
            {theme === 'dark' ? (
                <LinearGradient
                    colors={['#111B3A', '#1A295A', '#0D1426']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#E9FAFB' }]} />
            )}
            <BlurView
                intensity={theme === 'dark' ? 40 : 20}
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
                    <Text style={styles.companyName} numberOfLines={1}>{company?.name || 'My Company'}</Text>
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
                            name={theme === 'dark' ? "sunny" : "moon"}
                            size={20}
                            color={colors.textSecondary}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    sidebar: {
        width: 250,
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    themeToggle: {
        padding: 8,
        borderRadius: 8,
        marginLeft: 'auto',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingTop: 22,
        paddingBottom: 18,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        zIndex: 10,
        // @ts-ignore
        overflow: 'visible',
    },
    companyLogo: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    companyLogoText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
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
    },
    branchName: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 1,
    },
    navigation: {
        flex: 1,
        paddingTop: 18,
        paddingHorizontal: 10,
    },
    navLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 1.2,
        paddingHorizontal: 12,
        marginBottom: 8,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        paddingHorizontal: 12,
        marginBottom: 1,
        borderRadius: 8,
        position: 'relative',
        // @ts-ignore — web cursor
        cursor: 'pointer',
        // @ts-ignore — web transition
        transition: 'background-color 0.15s ease',
    },
    activeItem: {
        backgroundColor: `${colors.primary}12`,
    },
    activeBar: {
        position: 'absolute',
        left: 0,
        top: '20%',
        bottom: '20%',
        width: 3,
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    hoveredItem: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    itemText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
        marginLeft: 12,
    },
    activeItemText: {
        color: colors.primary,
        fontWeight: '700',
    },
    hoveredItemText: {
        color: colors.text,
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    userAvatarText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
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
