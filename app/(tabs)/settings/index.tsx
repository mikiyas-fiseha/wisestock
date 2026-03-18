import { AppButton } from '@/components/ui/AppButton';
import { Gradients } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
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
    container: { flex: 1, backgroundColor: 'transparent' },
    header: { paddingHorizontal: 20, paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    profileSection: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    userName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    userEmail: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
    roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 4 },
    roleText: { fontSize: 10, fontWeight: 'bold', color: '#fff', textTransform: 'uppercase' },
    content: { padding: 20, paddingBottom: 40 },
    section: { marginBottom: 25 },
    sectionHeader: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 10, marginLeft: 5, letterSpacing: 1 },
    themeOptions: { flexDirection: 'row', gap: 10 },
    themeOption: { flex: 1, height: 40, borderRadius: 12, backgroundColor: colors.card + '80', justifyContent: 'center', alignItems: 'center' },
    themeOptionActive: { backgroundColor: colors.primary },
    themeOptionText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    themeOptionTextActive: { color: '#fff' },
    adminCard: { borderRadius: 16, overflow: 'hidden' },
    adminCardGradient: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    card: { backgroundColor: colors.card + 'E0', borderRadius: 20, overflow: 'hidden' },
    companyInfo: { padding: 16, flexDirection: 'row', alignItems: 'center' },
    companyIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    companyName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    companyMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    separator: { height: 1, backgroundColor: colors.border + '40', marginHorizontal: 16 },
    settingItem: { padding: 16, flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    settingContent: { flex: 1 },
    settingTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    settingSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    logoutButton: { marginTop: 10 },
    version: { textAlign: 'center', fontSize: 12, color: colors.textSecondary, marginTop: 20 },
});
