import { BranchSelector } from '@/components/BranchSelector';
import { Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

interface MobileSidebarProps {
    visible: boolean;
    onClose: () => void;
}

const MENU_ITEMS = [
    { name: 'Dashboard', icon: 'bar-chart', route: '/(tabs)/dashboard' },
    { name: 'Products', icon: 'cube', route: '/(tabs)/products' },
    { name: 'Inventory', icon: 'archive', route: '/(tabs)/inventory' },
    { name: 'Sales', icon: 'shopping-cart', route: '/(tabs)/sales' },
    { name: 'Purchases', icon: 'shopping-bag', route: '/(tabs)/purchases' },
    { name: 'Reports', icon: 'line-chart', route: '/(tabs)/reports' },
    { name: 'Customers', icon: 'users', route: '/(tabs)/customers' },
    { name: 'Suppliers', icon: 'truck', route: '/(tabs)/suppliers' },
    { name: 'Expenses', icon: 'money', route: '/(tabs)/expenses' },
    { name: 'Settings', icon: 'cog', route: '/(tabs)/settings' },
];

export function MobileSidebar({ visible, onClose }: MobileSidebarProps) {
    const { colors, theme, setTheme } = useTheme();
    const { logout, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: -SIDEBAR_WIDTH,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleNavigate = (route: any) => {
        onClose();
        // Give time for modal to close before navigating to avoid stutter
        setTimeout(() => {
            router.push(route);
        }, 150);
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={StyleSheet.absoluteFillObject} />
                </TouchableWithoutFeedback>
                <Animated.View style={[styles.sidebar, { borderRightColor: 'rgba(255,255,255,0.2)', transform: [{ translateX: slideAnim }] }]}>
                    <BlurView intensity={theme === 'dark' ? 80 : 90} tint={theme === 'dark' ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, theme === 'dark' && { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
                    
                    <View style={[styles.header, { borderBottomColor: 'rgba(255,255,255,0.2)' }]}>
                        <View style={styles.userInfo}>
                            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                                <Text style={styles.avatarText}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{user?.name || 'User'}</Text>
                                <Text style={[styles.userRole, { color: colors.textSecondary }]}>{user?.role || 'Admin'}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <FontAwesome name="times" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <View style={{ paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' }}>
                        <BranchSelector />
                    </View>

                    <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
                        {MENU_ITEMS.map((item, index) => {
                            const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`);
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.menuItem, isActive && { backgroundColor: colors.primary + '15', borderRightColor: colors.primary, borderRightWidth: 3 }]}
                                    onPress={() => handleNavigate(item.route)}
                                >
                                    <View style={[styles.iconContainer, isActive && { backgroundColor: colors.primary }]}>
                                        <FontAwesome name={item.icon as any} size={16} color={isActive ? '#fff' : colors.textSecondary} />
                                    </View>
                                    <Text style={[styles.menuText, { color: colors.text }, isActive && { color: colors.primary, fontWeight: '700' }]}>{item.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: 'rgba(255,255,255,0.2)' }]}>
                        <TouchableOpacity style={[styles.themeToggle, { backgroundColor: 'rgba(255,255,255,0.1)' }]} onPress={toggleTheme}>
                            <FontAwesome name={theme === 'dark' ? 'moon-o' : 'sun-o'} size={16} color={colors.text} />
                            <Text style={[styles.themeText, { color: colors.text }]} numberOfLines={1}>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                            <FontAwesome name="sign-out" size={16} color="#DC2626" />
                            <Text style={styles.logoutText}>Log Out</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
    sidebar: { width: SIDEBAR_WIDTH, height: '100%', borderRightWidth: 1, ...Layout.shadows.medium, overflow: 'hidden' },
    header: { padding: 20, paddingTop: 20, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    userName: { fontSize: 16, fontWeight: 'bold' },
    userRole: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
    closeBtn: { padding: 8 },
    menuContainer: { flex: 1, paddingTop: 10 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
    iconContainer: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: 'transparent' },
    menuText: { fontSize: 15, fontWeight: '500' },
    footer: { padding: 20, borderTopWidth: 1, gap: 16 },
    themeToggle: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, gap: 12 },
    themeText: { fontSize: 15, fontWeight: '500', flexShrink: 1 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
    logoutText: { fontSize: 15, fontWeight: '600', color: '#DC2626' },
});
