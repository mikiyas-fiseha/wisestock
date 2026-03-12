
import { ListItem } from '@/components/ListItem';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';

import { User } from '@/constants/MockData';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients } from '@/constants/Colors';
import React from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function TeamScreen() {
    const { colors, theme } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const { user, company } = useAuth();
    const { showFeedback } = useFeedback();

    // --- State ---
    const [teamMembers, setTeamMembers] = React.useState<User[]>([]);
    const [showInviteModal, setShowInviteModal] = React.useState(false);
    const [inviteEmail, setInviteEmail] = React.useState('');
    const [inviteName, setInviteName] = React.useState('');
    const [invitePassword, setInvitePassword] = React.useState('');
    const [inviteRole, setInviteRole] = React.useState<User['role']>('Sales');
    const [loading, setLoading] = React.useState(false);

    // --- Data Fetching ---
    /* eslint-disable react-hooks/exhaustive-deps */
    const fetchTeam = async () => {
        if (!company?.id) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('company_id', company.id);

            if (error) throw error;

            // Map profiles to User type
            const users: User[] = (data || []).map((p: any) => ({
                id: p.id,
                companyId: p.company_id,
                name: p.full_name,
                email: '...', // Email is in auth.users, not profiles (usually). We might need a view or just show name/role.
                // For MVP without admin view of emails, let's just show name/role or store email in profile?
                // Actually our profile table doesn't have email column based on AuthContext fetch.
                // We'll update profiles table to include contact_email for display? 
                // Wait, AuthContext uses `session.user.email`. 
                // Let's assume we can't easily get other user's emails without a secure view.
                // For now, we show name & role.
                role: p.role || 'Sales',
                isSuperAdmin: false
            }));
            setTeamMembers(users);
        } catch (e) {
            console.error('Error fetching team:', e); // showFeedback might be too noisy on load
        }
    };

    React.useEffect(() => {
        fetchTeam();
    }, [company?.id]);

    const handleInvite = async () => {
        if (!inviteEmail || !inviteName || !invitePassword) {
            showFeedback('error', 'Error', 'Please enter email, name, and temporary password');
            return;
        }

        setLoading(true);

        // 1. Initialize SECONDARY Supabase client to avoid logging out admin
        // We need the URL and ANON KEY. 
        // Assuming they are available via process.env or Constants.
        // For Expo, usually in constants/ExpoConfig or similar.
        // Let's use the existing supabase client's URL/Key properties if accessible, or hardcode/env.
        // Actually, existing `supabase` client has these.

        const supabaseUrl = (supabase as any).supabaseUrl;
        const supabaseKey = (supabase as any).supabaseKey;

        // We need to import createClient from @supabase/supabase-js
        // But we might duplicate dependency. 
        // Let's rely on the existing import if possible? 
        // 'supabase' in lib/supabase is an instance. 
        // We need the CLASS or factory.

        // Dynamic import or use the one from @lib/supabase if it exports createClient?
        // It likely exports 'supabase' instance.
        // We can import `createClient` from `@supabase/supabase-js` directly.

        try {
            const { createClient } = require('@supabase/supabase-js');
            const tempClient = createClient(supabaseUrl, supabaseKey, {
                auth: {
                    persistSession: false, // CRITICAL: Do not persist!
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            });

            // 2. Sign Up New User
            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: inviteEmail,
                password: invitePassword,
            });

            if (authError) throw authError;

            if (authData.user) {
                // 3. Create Profile for New User
                // We use the MAIN client (Admin) because we updated RLS to allow Admins to create profiles for their company.
                // The temp client might not have a session (if email confirm is on) or might be anon, so it can't create the profile.

                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: authData.user.id,
                        company_id: company?.id,
                        full_name: inviteName,
                        role: inviteRole,
                        // email: inviteEmail // If we add email to profiles for display
                    }]);

                if (profileError) {
                    // If profile creation fails, we might want to clean up user?
                    // But we can't delete user easily.
                    throw profileError;
                }

                showFeedback('success', 'Success', 'User created successfully');
                setShowInviteModal(false);
                setInviteEmail('');
                setInviteName('');
                setInvitePassword(''); // clear password
                fetchTeam(); // Refresh list
            } else {
                showFeedback('warning', 'Notice', 'User created but need email confirmation?');
            }

        } catch (e: any) {
            showFeedback('error', 'Error', e.message || 'Failed to invite user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />
            <FlatList
                data={teamMembers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ListItem
                        title={item.name}
                        subtitle={item.email}
                        rightText={item.role}
                        rightSubtitle={item.id === user?.id ? '(You)' : ''}
                    />
                )}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <Text style={styles.headerText}>
                            {teamMembers.length} / 5 Active Users (MVP Limit)
                        </Text>
                    </View>
                }
            />

            {user?.role === 'Admin' && (
                <View style={styles.fabContainer}>
                    <AppButton title="+ Invite User" onPress={() => setShowInviteModal(true)} />
                </View>
            )}

            {/* Invite Modal */}
            <Modal visible={showInviteModal} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Invite Team Member</Text>
                    <AppTextInput
                        label="Name"
                        placeholder="e.g. Jane Doe"
                        value={inviteName}
                        onChangeText={setInviteName}
                    />
                    <AppTextInput
                        label="Email"
                        placeholder="colleague@company.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={inviteEmail}
                        onChangeText={setInviteEmail}
                    />
                    <AppTextInput
                        label="Temporary Password"
                        placeholder="Secret123!"
                        secureTextEntry
                        value={invitePassword}
                        onChangeText={setInvitePassword}
                    />

                    <Text style={styles.label}>Role</Text>
                    <View style={styles.roleContainer}>
                        {(['Admin', 'Manager', 'Sales'] as const).map((r) => (
                            <TouchableOpacity
                                key={r}
                                style={[styles.roleButton, inviteRole === r && styles.roleButtonActive]}
                                onPress={() => setInviteRole(r)}
                            >
                                <Text style={[styles.roleText, inviteRole === r && styles.roleTextActive]}>{r}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.footer}>
                        <AppButton title="Send Invitation" onPress={handleInvite} loading={loading} />
                        <AppButton title="Cancel" variant="outline" onPress={() => setShowInviteModal(false)} />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        padding: 16,
        backgroundColor: '#f0f0f0',
    },
    headerText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    fabContainer: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
    },
    modalContainer: {
        flex: 1,
        padding: 24,
        marginTop: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 6,
        color: colors.text,
    },
    roleContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        gap: 8,
    },
    roleButton: {
        flex: 1,
        paddingVertical: 10,

        borderRadius: 8,
        alignItems: 'center',
    },
    roleButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    roleText: {
        color: colors.text,
    },
    roleTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    footer: {
        marginTop: 'auto',
        gap: 12,
    },
});
