import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://brovmhwffsjfwvfzfgjg.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb3ZtaHdmZnNqZnd2ZnpmZ2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTA5NzcsImV4cCI6MjA4NTc4Njk3N30.QrntOkuCAAE1o8KUs_xMDPgZQADXD_IuYRulqwWeYC0';

// In-memory fallback if AsyncStorage or window.localStorage throws security errors
const memoryFallback: Record<string, string> = {};

const isServer = typeof window === 'undefined' && Platform.OS === 'web';

const ExpoStorage = {
    getItem: async (key: string) => {
        if (isServer) return null;
        try {
            return await AsyncStorage.getItem(key);
        } catch {
            return memoryFallback[key] || null;
        }
    },
    setItem: async (key: string, value: string) => {
        if (isServer) return;
        try {
            await AsyncStorage.setItem(key, value);
        } catch {
            memoryFallback[key] = value;
        }
    },
    removeItem: async (key: string) => {
        if (isServer) return;
        try {
            await AsyncStorage.removeItem(key);
        } catch {
            delete memoryFallback[key];
        }
    },
};

const canPersist = !isServer;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoStorage,
        autoRefreshToken: canPersist,
        persistSession: canPersist,
        detectSessionInUrl: false,
    },
});
