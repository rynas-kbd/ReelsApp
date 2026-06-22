import Constants from 'expo-constants';

/**
 * Lecture des variables d'environnement injectées par app.config.ts (extra).
 * On garde un fallback sur process.env pour les contextes hors-runtime Expo
 * (tâche widget headless qui n'a pas toujours accès à Constants.expoConfig).
 */
type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const manifest2Extra = (
  Constants as unknown as {
    manifest2?: { extra?: { expoClient?: { extra?: Extra } } };
  }
).manifest2?.extra?.expoClient?.extra;

const extra: Extra =
  (Constants.expoConfig?.extra as Extra | undefined) ?? manifest2Extra ?? {};

export const SUPABASE_URL: string =
  extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export const SUPABASE_ANON_KEY: string =
  extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** URL publique du site web ReelVault (sert le flux de connexion Instagram). */
export const SITE_URL: string =
  process.env.EXPO_PUBLIC_SITE_URL ?? 'https://reels-web-app.vercel.app';

if (__DEV__ && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  // eslint-disable-next-line no-console
  console.warn(
    '[ReelVault] SUPABASE_URL / SUPABASE_ANON_KEY manquants. ' +
      'Crée un fichier .env (voir .env.example).',
  );
}
