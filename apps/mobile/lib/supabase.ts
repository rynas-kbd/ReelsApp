import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/**
 * Adaptateur de stockage de session basé sur expo-secure-store.
 * SecureStore chiffre les valeurs (Keystore Android). Limite : ~2 Ko par clé,
 * ce qui est suffisant pour les tokens de session Supabase.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // detectSessionInUrl doit être désactivé en React Native (pas de window.location).
    detectSessionInUrl: false,
  },
});

/** Indique si on tourne sur Android (utile pour les features natives). */
export const isAndroid = Platform.OS === 'android';
