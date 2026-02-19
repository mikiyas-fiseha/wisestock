
import { AppButton } from '@/components/ui/AppButton';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface SubscriptionGuardProps {
    children: React.ReactNode;
}

type SubStatus = 'active' | 'on_trial' | 'expired' | 'pending_approval' | 'pending_payment' | 'cancelled' | null;

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
    const { company, isLoading: authLoading, isSuperAdmin } = useAuth();
    const router = useRouter();
    const segments = useSegments();
    const [status, setStatus] = useState<SubStatus>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && company) {
            checkSubscription();
        } else if (!authLoading && !company) {
            setLoading(false);
        }
    }, [authLoading, company]);

    const checkSubscription = async () => {
        try {
            // Fetch the latest subscription
            const { data, error } = await supabase
                .from('subscriptions')
                .select('status, end_date')
                .eq('company_id', company!.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                // No subscription found?
                setStatus(null);
            } else {
                // Check if expired
                const isExpired = new Date(data.end_date) < new Date();
                if (isExpired && (data.status === 'active' || data.status === 'on_trial')) {
                    setStatus('expired');
                } else {
                    setStatus(data.status);
                }
            }
        } catch (e) {
            console.error('Subscription check failed:', e);
            setStatus(null);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
        );
    }

    if (isSuperAdmin) {
        return <>{children}</>;
    }

    // Handle various states
    if (status === 'active' || status === 'on_trial') {
        return <>{children}</>;
    }

    if (status === 'pending_approval') {
        return (
            <View style={styles.center}>
                <FontAwesome name="clock-o" size={60} color={Colors.light.warning} style={{ marginBottom: 20 }} />
                <Text style={styles.text}>Approval Pending</Text>
                <Text style={styles.subText}>Your subscription is waiting for Super Admin approval. You will receive an email once your account is active.</Text>
                <AppButton
                    title="Refresh Status"
                    onPress={checkSubscription}
                    variant="outline"
                    style={{ marginTop: 20, width: 200 }}
                />
            </View>
        );
    }

    // Expired, null (no sub), or other blocking states
    return (
        <View style={styles.center}>
            <FontAwesome name="ban" size={60} color={Colors.light.danger} style={{ marginBottom: 20 }} />
            <Text style={styles.text}>
                {status === 'expired' ? 'Subscription Expired' : 'No Active Subscription'}
            </Text>
            <Text style={styles.subText}>
                {status === 'expired'
                    ? "Your company's subscription has expired. Please renew to continue."
                    : "Please subscribe to a plan to access the platform."}
            </Text>

            <AppButton
                title="View Plans"
                onPress={() => router.push('/subscription/plans')}
                style={{ marginTop: 20, width: 200 }}
            />

            <AppButton
                title="Contact Support"
                variant="outline"
                onPress={() => { }}
                style={{ marginTop: 12, width: 200 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.light.background,
        padding: 30,
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginBottom: 10,
        textAlign: 'center',
    },
    subText: {
        fontSize: 16,
        color: Colors.light.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
    }
});
