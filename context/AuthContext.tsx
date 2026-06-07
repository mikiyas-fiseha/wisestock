
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
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
    woreda?: string;
    address?: string;
    city?: string;
    subCity?: string;
    defaultTaxRate?: number;
    currency?: string;
}

export interface Branch {
    id: string;
    name: string;
    isMain: boolean;
    address?: string;
    phone?: string;
    status?: string;
}

export type SubStatus = 'active' | 'on_trial' | 'expired' | 'pending_approval' | 'pending_payment' | 'cancelled' | null;

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
    refreshProfile: () => Promise<void>;
    // Subscription — pre-fetched alongside profile to avoid SubscriptionGuard flash
    subStatus: SubStatus;
    subLoading: boolean;
    subReceiptUrl: string | null;
    subAmount: number | null;
    recheckSubscription: () => Promise<void>;
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
    // Subscription state — cached here so SubscriptionGuard has it instantly
    const [subStatus, setSubStatus] = useState<SubStatus>(null);
    const [subLoading, setSubLoading] = useState(true);
    const [subReceiptUrl, setSubReceiptUrl] = useState<string | null>(null);
    const [subAmount, setSubAmount] = useState<number | null>(null);

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

    // Use a ref to track the last fetched user ID to avoid redundant fetches
    const lastFetchedUserId = React.useRef<string | null>(null);
    const isFetchingProfile = React.useRef(false);

    useEffect(() => {
        // Initial session check + hanging prevention
        let mounted = true;
        
        // Safety timeout: If auth takes more than 10 seconds, force hide splash
        // This ensures the app doesn't stay stuck on the logo if the network is broken
        // or a Supabase promise hangs indefinitely.
        const safetyTimeout = setTimeout(() => {
            if (mounted && (isLoading || subLoading)) {
                console.warn('Auth initialization timed out, forcing loading to false');
                setIsLoading(false);
                setSubLoading(false);
            }
        }, 10000);

        const initAuth = async () => {
            try {
                // Explicitly get session first to avoid waiting for event listener
                const { data: { session: initialSession }, error } = await supabase.auth.getSession();
                if (!mounted) return;

                if (initialSession) {
                    setSession(initialSession);
                    if (initialSession.user.id) {
                        if (lastFetchedUserId.current !== initialSession.user.id) {
                            lastFetchedUserId.current = initialSession.user.id;
                            await fetchProfile(initialSession.user.id);
                        }
                    } else {
                        setIsLoading(false);
                        setSubLoading(false);
                    }
                } else if (error) {
                    console.error('Session get error:', error);
                    setIsLoading(false);
                    setSubLoading(false);
                } else {
                    // No session
                    setIsLoading(false);
                    setSubLoading(false);
                }
            } catch (e) {
                console.error('Auth initialization error:', e);
                if (mounted) {
                    setIsLoading(false);
                    setSubLoading(false);
                }
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            
            setSession(session);

            if (session?.user.id) {
                if (lastFetchedUserId.current !== session.user.id) {
                    lastFetchedUserId.current = session.user.id;
                    await fetchProfile(session.user.id);
                } else {
                    // Already have this user's data, skip fetch but ensure loading is false
                    // only if we are not currently fetching the profile in the background.
                    if (!isFetchingProfile.current) {
                        setIsLoading(false);
                        setSubLoading(false);
                    }
                }
            } else {
                lastFetchedUserId.current = null;
                setUser(null);
                setCompany(null);
                setBranchState(null);
                setAllBranches([]);
                setSubStatus(null);
                setSubReceiptUrl(null);
                setSubAmount(null);
                setSubLoading(false);
                setIsLoading(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, []);


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
            if (updates.defaultTaxRate !== undefined) dbUpdates.default_tax_rate = updates.defaultTaxRate;
            if (updates.currency !== undefined) dbUpdates.currency = updates.currency;

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

    const fetchSubscription = async (companyId: string) => {
        setSubLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('status, end_date, receipt_url, plan_id, subscription_plans(price)')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                if (error.code === 'PGRST116') setSubStatus(null); // no subscription row
                // else leave previous state — network error
            } else {
                const now = new Date();
                const expiry = data.end_date ? new Date(data.end_date) : null;
                const resolvedStatus: SubStatus = (expiry && expiry < now) ? 'expired' : (data.status as SubStatus);
                setSubStatus(resolvedStatus);
                setSubReceiptUrl(data.receipt_url || null);
                if (data.subscription_plans) setSubAmount((data.subscription_plans as any).price);
            }
        } catch (e) {
            // ignore — leave existing state
        } finally {
            setSubLoading(false);
        }
    };

    const recheckSubscription = async () => {
        if (company?.id) await fetchSubscription(company.id);
    };

    const fetchProfile = async (userId: string) => {
        isFetchingProfile.current = true;
        try {
            // Run ALL 3 queries in parallel — profile+company, super_admin check, AND branches
            // This eliminates the sequential waterfall that was causing slow startup
            const [profileRes, adminRes] = await Promise.all([
                supabase.from('profiles').select(`*, companies(*)`).eq('id', userId).single(),
                supabase.from('super_admins').select('id').eq('id', userId).single(),
            ]);

            const profile = profileRes.data;
            const profileError = profileRes.error;
            const superAdmin = adminRes.data;

            if (profileError) throw profileError;

            if (profile && profile.companies) {
                const userRole = profile.role;
                const userIsSuperAdmin = !!superAdmin;
                const userIsAdmin = userRole === 'Admin' || userIsSuperAdmin;

                // Run branches fetch + AsyncStorage + subscription all in parallel
                const [branchesRes, savedBranchId] = await Promise.all([
                    supabase
                        .from('branches')
                        .select('*')
                        .eq('company_id', profile.companies.id)
                        .eq('status', 'active')
                        .order('is_main', { ascending: false })
                        .order('name'),
                    AsyncStorage.getItem(BRANCH_STORAGE_KEY).catch(() => null),
                ]);

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
                    defaultTaxRate: profile.companies.default_tax_rate,
                    currency: profile.companies.currency || '$',
                });

                const mappedBranches: Branch[] = (branchesRes.data || []).map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    isMain: b.is_main || false,
                    address: b.address || undefined,
                    phone: b.phone || undefined,
                    status: b.status,
                }));

                setAllBranches(mappedBranches);

                // Determine which branch to select
                if (userIsAdmin && savedBranchId === 'all') {
                    setBranchState(null);
                } else if (savedBranchId && savedBranchId !== 'all') {
                    const savedBranch = mappedBranches.find(b => b.id === savedBranchId);
                    if (savedBranch) {
                        setBranchState(savedBranch);
                    } else {
                        setBranchState(mappedBranches.find(b => b.id === profile.branch_id) || mappedBranches[0] || null);
                    }
                } else if (profile.branch_id) {
                    const assignedBranch = mappedBranches.find(b => b.id === profile.branch_id);
                    setBranchState(assignedBranch || mappedBranches[0] || null);
                } else {
                    setBranchState(mappedBranches.find(b => b.isMain) || mappedBranches[0] || null);
                }

                // Fetch subscription — wait for it to complete so that both profile and subscription are fully loaded
                await fetchSubscription(profile.companies.id);
            } else {
                // No company — subscription is not applicable
                setSubLoading(false);
            }
        } catch (e) {
            console.error('Error fetching profile:', e);
            setSubLoading(false);
        } finally {
            isFetchingProfile.current = false;
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
            refreshProfile: () => user?.id ? fetchProfile(user.id) : Promise.resolve(),
            subStatus, subLoading, subReceiptUrl, subAmount, recheckSubscription,
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
