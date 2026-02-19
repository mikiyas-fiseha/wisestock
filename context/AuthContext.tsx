
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useRouter, useSegments } from 'expo-router';
import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

// Re-exporting types for app compatibility
export interface User {
    id: string;
    companyId: string;
    name: string;
    email: string;
    role: 'Admin' | 'Sales' | 'Manager';
    isSuperAdmin: boolean;
}

export interface Company {
    id: string;
    name: string;
    type?: string;
    contactEmail?: string;
    joinedDate: string;
    // New fields
    tin?: string;
    vatNo?: string;
    vatRegDate?: string;
    address?: string; // Kept generic address if used, or map to street/etc
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
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    company: Company | null;
    branch: Branch | null;
    setBranch: (branch: Branch) => void;
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

export function AuthProvider({ children }: PropsWithChildren) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [branch, setBranch] = useState<Branch | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

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
                setBranch(null);
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
            // Redirect to login if user is not signed in and trying to access tabs
            router.replace('/login');
        } else if (session && (inAuthRoute || segments[0] === undefined)) {
            // Redirect to dashboard if user is signed in and trying to access login/register or root
            router.replace('/(tabs)/dashboard');
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

            // Update local state
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
                setUser({
                    id: profile.id,
                    companyId: profile.company_id,
                    name: profile.full_name,
                    email: session?.user.email || '',
                    role: profile.role,
                    isSuperAdmin: !!superAdmin,
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

                // Fetch Branch
                let branchIdToFetch = profile.branch_id;

                // If not assigned, try to get Main Branch
                if (!branchIdToFetch) {
                    const { data: mainBranch } = await supabase
                        .from('branches')
                        .select('id')
                        .eq('company_id', profile.companies.id)
                        .eq('is_main', true)
                        .single();
                    if (mainBranch) branchIdToFetch = mainBranch.id;
                }

                if (branchIdToFetch) {
                    const { data: branchData } = await supabase
                        .from('branches')
                        .select('*')
                        .eq('id', branchIdToFetch)
                        .single();

                    if (branchData) {
                        setBranch({
                            id: branchData.id,
                            name: branchData.name,
                            isMain: branchData.is_main || false,
                            address: branchData.address || undefined,
                            phone: branchData.phone || undefined
                        });
                    }
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
        if (error) setIsLoading(false); // Auth state change will handle the rest
        return { error };
    };

    const logout = async () => {
        setIsLoading(true);
        const { error } = await supabase.auth.signOut();
        if (!error) {
            setSession(null);
            setUser(null);
            setCompany(null);
            setBranch(null);
        }
        setIsLoading(false);
    };

    const register = async (companyName: string, userName: string, email: string, password: string) => {
        setIsLoading(true);
        // 1. Sign Up
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

        // Checking if we have a session (means auto-confirm is on)
        if (!authData.session) {
            setIsLoading(false);
            return { error: { message: "Please check your email to confirm your account." } };
        }

        try {
            // 2. Call RPC to create Company and Profile atomically
            const { error: rpcError } = await supabase.rpc('create_company_and_user', {
                company_name: companyName,
                user_name: userName,
                contact_email: email
            });

            if (rpcError) throw rpcError;

            // Force fetch profile immediately to update state
            await fetchProfile(authData.user.id);

        } catch (e) {
            console.error("Registration data error:", e);
            setIsLoading(false);
            return { error: e };
        }

        return { error: null };
    };

    const isAdmin = user?.role === 'Admin';
    const isManager = user?.role === 'Manager';
    const isSales = user?.role === 'Sales';
    const isSuperAdmin = user?.isSuperAdmin || false;

    return (
        <AuthContext.Provider value={{ session, user, company, branch, setBranch, login, logout, register, updateCompanyProfile, isLoading, isAdmin, isManager, isSales, isSuperAdmin }}>
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
