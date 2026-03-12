import { AppButton } from '@/components/ui/AppButton';
import { Gradients, Layout } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
    const { theme, systemTheme, colors, setTheme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const router = useRouter();
    const { user, company, logout, isSuperAdmin } = useAuth();
    const headerTopPadding = 16;

    const renderSettingItem = (title: string, subtitle: string, icon: string, onPress: () => void, rightElement?: React.ReactNode) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.iconContainer]}>
                <FontAwesome name={icon as any} size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
            {rightElement || <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />
            <LinearGradient
                colors={theme === 'dark' ? ['#0f172a', '#1e293b'] : ['#1e3c72', '#2a5298']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: headerTopPadding }]}
            >
                <View style={styles.profileSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
                    </View>
                    <View>
                        <Text style={styles.userName}>{user?.name || 'User'}</Text>
                        <Text style={styles.userEmail}>{user?.email}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{user?.role || 'Member'}</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>DISPLAY</Text>
                    <View style={styles.themeOptions}>
                        {(['light', 'dark', 'system'] as const).map((mode) => (
                            <TouchableOpacity
                                key={mode}
                                style={[styles.themeOption, systemTheme === mode && styles.themeOptionActive]}
                                onPress={() => setTheme(mode)}
                            >
                                <Text style={[styles.themeOptionText, systemTheme === mode && styles.themeOptionTextActive]}>
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {isSuperAdmin && (
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>ADMINISTRATION</Text>
                        <TouchableOpacity
                            style={styles.adminCard}
                            onPress={() => router.push('/(super-admin)/superadminDasboarde')}
                        >
                            <LinearGradient
                                colors={Gradients.primary}
                                style={styles.adminCardGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <FontAwesome name="shield" size={24} color="white" style={{ marginRight: 12 }} />
                                    <View>
                                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Super Admin Panel</Text>
                                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Manage platform wide settings</Text>
                                    </View>
                                </View>
                                <FontAwesome name="arrow-right" size={16} color="white" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>COMPANY</Text>
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.companyInfo}
                            onPress={() => router.push('/(tabs)/settings/company')}
                            activeOpacity={0.7}
                        >
                            <View style={styles.companyIcon}>
                                <FontAwesome name="building" size={24} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.companyName}>{company?.name || 'My Company'}</Text>
                                <Text style={styles.companyMeta}>{company?.city ? `${company.city} • ` : ''}{company?.type || 'Business'}</Text>
                            </View>
                            <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <View style={styles.separator} />
                        {renderSettingItem('Branches', 'Manage store locations', 'code-fork', () => router.push('/(tabs)/settings/branches'))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>PRODUCTS & INVENTORY</Text>
                    <View style={styles.card}>
                        {renderSettingItem('Categories', 'Manage product categories', 'tags', () => router.push('/(tabs)/settings/categories'))}
                        <View style={styles.separator} />
                        {renderSettingItem('Attributes', 'Custom fields (Size, Color, etc.)', 'list-alt', () => router.push('/(tabs)/settings/attributes'))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>FINANCIALS</Text>
                    <View style={styles.card}>
                        {renderSettingItem('Expense Categories', 'Manage types of spending', 'money', () => router.push('/(tabs)/settings/expense-categories'))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>TEAM & SECURITY</Text>
                    <View style={styles.card}>
                        {renderSettingItem('Team Management', 'Invite users and manage access', 'users', () => router.push('/(tabs)/settings/team'))}
                        <View style={styles.separator} />
                        {renderSettingItem('Change Password', 'Update your login password', 'lock', () => { })}
                    </View>
                </View>

                <View style={styles.section}>
                    <AppButton
                        title="Log Out"
                        onPress={logout}
                        variant="danger"
                        style={styles.logoutButton}
                    />
                    <Text style={styles.version}>Version 1.0.0 (MVP)</Text>
                </View>

            </ScrollView>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        paddingTop: 24,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        ...Layout.shadows.small,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 6,
    },
    roleBadge: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    roleText: {
        color: '#FFD700',
        fontSize: 12,
        fontWeight: 'bold',
    },
    content: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 8,
        marginLeft: 12,
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: colors.card + 'E0',
        borderRadius: 12,
        overflow: 'hidden',
        ...Layout.shadows.small,

    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.card + 'E0',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    settingSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border,
        marginLeft: 64,
    },
    adminCard: {
        borderRadius: 12,
        ...Layout.shadows.medium,
        overflow: 'hidden',
    },
    adminCardGradient: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    companyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    companyIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    companyName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    companyMeta: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    logoutButton: {
        marginTop: 8,
    },
    version: {
        textAlign: 'center',
        marginTop: 16,
        color: colors.textSecondary,
        fontSize: 12,
    },
    themeOptions: {
        flexDirection: 'row',
        backgroundColor: colors.card + 'E0',
        borderRadius: 12,
        padding: 4,

        ...Layout.shadows.small,
    },
    themeOption: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    themeOptionActive: {
        backgroundColor: colors.primary,
    },
    themeOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    themeOptionTextActive: {
        color: '#fff',
    },
});
