import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://brovmhwffsjfwvfzfgjg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb3ZtaHdmZnNqZnd2ZnpmZ2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTA5NzcsImV4cCI6MjA4NTc4Njk3N30.QrntOkuCAAE1o8KUs_xMDPgZQADXD_IuYRulqwWeYC0';

// Custom storage implementation to avoid errors in SSR/Web
const ExpoStorage = {
    getItem: (key: string) => {
        if (typeof window === 'undefined') {
            return Promise.resolve(null);
        }
        return AsyncStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
        if (typeof window === 'undefined') {
            return Promise.resolve();
        }
        return AsyncStorage.setItem(key, value);
    },
    removeItem: (key: string) => {
        if (typeof window === 'undefined') {
            return Promise.resolve();
        }
        return AsyncStorage.removeItem(key);
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
