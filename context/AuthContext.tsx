
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { useRouter, useSegments } from 'expo-router';
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';

// Re-exporting types for app compatibility
export interface User {
    id: string;
    companyId: string;
    name: string;
    email: string;
    role: 'Admin' | 'Sales' | 'Manager';
    isSuperAdmin: boolean;
    branchId?: string; // assigned branch from profile
}

export interface Company {
    id: string;
    name: string;
    type?: string;
    contactEmail?: string;
    joinedDate: string;
    tin?: string;
    vatNo?: string;
    vatRegDate?: string;
    address?: string;
    city?: string;
    subCity?: string;
    woreda?: string;
}

export interface Branch {
    id: string;
    name: string;
    isMain: boolean;
    address?: string;
    phone?: string;
    status?: string;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    company: Company | null;
    // Branch state
    branch: Branch | null;           // Current selected branch (null = All Branches)
    allBranches: Branch[];           // All company branches (for admins)
    isAllBranches: boolean;          // true when viewing all branches
    switchBranch: (branch: Branch | null) => void; // null = All Branches
    setBranch: (branch: Branch) => void; // backward compat
    // Auth
    login: (email: string, password: string) => Promise<{ error: any }>;
    logout: () => void;
    register: (companyName: string, userName: string, email: string, password: string) => Promise<{ error: any }>;
    updateCompanyProfile: (data: Partial<Company>) => Promise<{ error: any }>;
    isLoading: boolean;
    isAdmin: boolean;
    isManager: boolean;
    isSales: boolean;
    isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BRANCH_STORAGE_KEY = 'selected_branch_id';

export function AuthProvider({ children }: PropsWithChildren) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [branch, setBranchState] = useState<Branch | null>(null);
    const [allBranches, setAllBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    // Computed
    const isAdmin = user?.role === 'Admin';
    const isManager = user?.role === 'Manager';
    const isSales = user?.role === 'Sales';
    const isSuperAdmin = user?.isSuperAdmin || false;
    const isAllBranches = branch === null && (isAdmin || isSuperAdmin);

    // Switch branch (null = All Branches for admins)
    const switchBranch = useCallback(async (newBranch: Branch | null) => {
        setBranchState(newBranch);
        try {
            if (newBranch) {
                await AsyncStorage.setItem(BRANCH_STORAGE_KEY, newBranch.id);
            } else {
                await AsyncStorage.setItem(BRANCH_STORAGE_KEY, 'all');
            }
        } catch (e) {
            console.warn('Could not persist branch selection', e);
        }
    }, []);

    // backward compat
    const setBranch = useCallback((b: Branch) => {
        switchBranch(b);
    }, [switchBranch]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
            else setIsLoading(false);
        }).catch(err => {
            console.error("Auth initialization error:", err);
            setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
            else {
                setUser(null);
                setCompany(null);
                setBranchState(null);
                setAllBranches([]);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Navigation Protection
    useEffect(() => {
        if (isLoading) return;

        const inTabsGroup = segments[0] === '(tabs)';
        const inAuthRoute = segments[0] === 'login' || segments[0] === 'register';

        if (!session && inTabsGroup) {
            router.replace('/login');
        } else if (session && (inAuthRoute || segments[0] === undefined)) {
            if (isSuperAdmin) {
                router.replace('/(super-admin)/superadminDasboarde');
            } else {
                router.replace('/(tabs)/dashboard');
            }
        }
    }, [session, segments, isLoading]);

    const updateCompanyProfile = async (updates: Partial<Company>) => {
        if (!company?.id) return { error: { message: "No company found" } };

        try {
            const dbUpdates: any = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.type !== undefined) dbUpdates.type = updates.type;
            if (updates.tin !== undefined) dbUpdates.tin = updates.tin;
            if (updates.vatNo !== undefined) dbUpdates.vat_no = updates.vatNo;
            if (updates.vatRegDate !== undefined) dbUpdates.vat_reg_date = updates.vatRegDate;
            if (updates.city !== undefined) dbUpdates.city = updates.city;
            if (updates.subCity !== undefined) dbUpdates.sub_city = updates.subCity;
            if (updates.woreda !== undefined) dbUpdates.woreda = updates.woreda;
            if (updates.address !== undefined) dbUpdates.address = updates.address;

            const { error } = await supabase
                .from('companies')
                .update(dbUpdates)
                .eq('id', company.id);

            if (error) throw error;

            setCompany(prev => prev ? { ...prev, ...updates } : null);
            return { error: null };
        } catch (e) {
            console.error("Error updating company:", e);
            return { error: e };
        }
    };

    const fetchProfile = async (userId: string) => {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select(`*, companies(*)`)
                .eq('id', userId)
                .single();

            const { data: superAdmin } = await supabase
                .from('super_admins')
                .select('id')
                .eq('id', userId)
                .single();

            if (error) throw error;

            if (profile && profile.companies) {
                const userRole = profile.role;
                const userIsSuperAdmin = !!superAdmin;
                const userIsAdmin = userRole === 'Admin' || userIsSuperAdmin;

                setUser({
                    id: profile.id,
                    companyId: profile.company_id,
                    name: profile.full_name,
                    email: session?.user.email || '',
                    role: profile.role,
                    isSuperAdmin: userIsSuperAdmin,
                    branchId: profile.branch_id || undefined,
                });
                setCompany({
                    id: profile.companies.id,
                    name: profile.companies.name,
                    type: profile.companies.type,
                    contactEmail: profile.companies.contact_email,
                    joinedDate: profile.companies.created_at,
                    tin: profile.companies.tin,
                    vatNo: profile.companies.vat_no,
                    vatRegDate: profile.companies.vat_reg_date,
                    city: profile.companies.city,
                    subCity: profile.companies.sub_city,
                    woreda: profile.companies.woreda,
                    address: profile.companies.address,
                });

                // Fetch all branches for this company
                const { data: branchesData } = await supabase
                    .from('branches')
                    .select('*')
                    .eq('company_id', profile.companies.id)
                    .eq('status', 'active')
                    .order('is_main', { ascending: false })
                    .order('name');

                const mappedBranches: Branch[] = (branchesData || []).map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    isMain: b.is_main || false,
                    address: b.address || undefined,
                    phone: b.phone || undefined,
                    status: b.status,
                }));

                setAllBranches(mappedBranches);

                // Determine which branch to select
                let savedBranchId: string | null = null;
                try {
                    savedBranchId = await AsyncStorage.getItem(BRANCH_STORAGE_KEY);
                } catch (e) { /* ignore */ }

                if (userIsAdmin && savedBranchId === 'all') {
                    // Admin had "All Branches" selected
                    setBranchState(null);
                } else if (savedBranchId && savedBranchId !== 'all') {
                    // Previously selected branch
                    const savedBranch = mappedBranches.find(b => b.id === savedBranchId);
                    if (savedBranch) {
                        setBranchState(savedBranch);
                    } else {
                        // Saved branch no longer valid, fall back
                        setBranchState(mappedBranches.find(b => b.id === profile.branch_id) || mappedBranches[0] || null);
                    }
                } else if (profile.branch_id) {
                    // User has assigned branch
                    const assignedBranch = mappedBranches.find(b => b.id === profile.branch_id);
                    setBranchState(assignedBranch || mappedBranches[0] || null);
                } else {
                    // Default to main branch or first branch
                    setBranchState(mappedBranches.find(b => b.isMain) || mappedBranches[0] || null);
                }
            }
        } catch (e) {
            console.error('Error fetching profile:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setIsLoading(false);
        return { error };
    };

    const logout = async () => {
        setIsLoading(true);
        const { error } = await supabase.auth.signOut();
        if (!error) {
            setSession(null);
            setUser(null);
            setCompany(null);
            setBranchState(null);
            setAllBranches([]);
            try { await AsyncStorage.removeItem(BRANCH_STORAGE_KEY); } catch (e) { /* ignore */ }
        }
        setIsLoading(false);
    };

    const register = async (companyName: string, userName: string, email: string, password: string) => {
        setIsLoading(true);
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            setIsLoading(false);
            return { error: authError };
        }

        if (!authData.user) {
            setIsLoading(false);
            return { error: { message: "No user created. Please check your email for confirmation link if enabled." } };
        }

        if (!authData.session) {
            setIsLoading(false);
            return { error: { message: "Please check your email to confirm your account." } };
        }

        try {
            const { error: rpcError } = await supabase.rpc('create_company_and_user', {
                company_name: companyName,
                user_name: userName,
                contact_email: email
            });

            if (rpcError) throw rpcError;

            await fetchProfile(authData.user.id);

        } catch (e) {
            console.error("Registration data error:", e);
            setIsLoading(false);
            return { error: e };
        }

        return { error: null };
    };

    return (
        <AuthContext.Provider value={{
            session, user, company,
            branch, allBranches, isAllBranches, switchBranch, setBranch,
            login, logout, register, updateCompanyProfile,
            isLoading,
            isAdmin, isManager, isSales, isSuperAdmin,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
