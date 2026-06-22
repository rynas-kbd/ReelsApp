import type { ExpoConfig, ConfigContext } from 'expo/config';
import { withGradleProperties } from '@expo/config-plugins';

/**
 * Configuration Expo de ReelVault Mobile (Android).
 * Les variables d'environnement sont exposées via `extra` puis lues avec expo-constants.
 *
 * newArchEnabled : laissé à FALSE par défaut.
 * Raison : react-native-android-widget et expo-share-intent sont stables sur l'ancienne
 * architecture pour Expo SDK 51 ; la New Architecture n'est pas garantie compatible
 * avec toutes ces libs natives sur cette version. Voir README "Limites / hypothèses".
 */
const withHighMemoryGradle = (cfg: ExpoConfig): ExpoConfig =>
  withGradleProperties(cfg, config => {
    const props = config.modResults;
    const key = 'org.gradle.jvmargs';
    const value = '-Xmx4096m -XX:MaxMetaspaceSize=512m';
    const idx = props.findIndex(p => p.type === 'property' && p.key === key);
    if (idx !== -1) {
      (props[idx] as { type: 'property'; key: string; value: string }).value = value;
    } else {
      props.push({ type: 'property', key, value });
    }
    return config;
  });

export default ({ config }: ConfigContext): ExpoConfig => withHighMemoryGradle({
  ...config,
  name: 'ReelVault',
  slug: 'reelvault',
  owner: 'sayniir',
  scheme: 'reelvault',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  // newArchEnabled est un champ valide à l'exécution mais absent du type ExpoConfig
  // du SDK 51 ; on le passe via un champ libre toléré par le manifeste.
  ...({ newArchEnabled: false } as Record<string, unknown>),
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0B0B0F',
  },
  assetBundlePatterns: ['**/*'],
  android: {
    package: 'com.reelvault.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0B0B0F',
    },
    permissions: ['POST_NOTIFICATIONS'],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#7C3AED',
      },
    ],
    [
      'expo-share-intent',
      {
        // Réception des partages Android : texte simple (liens collés depuis Instagram)
        // et URLs. Ouvre l'app via le menu "Partager".
        androidIntentFilters: ['text/*'],
        // App Android-only : on désactive la config iOS du plugin (sinon il tente
        // de lire ios.bundleIdentifier et échoue).
        disableIOS: true,
      },
    ],
    [
      'react-native-android-widget',
      {
        widgets: [
          {
            name: 'ReelVaultWidget',
            label: 'ReelVault — 3 derniers réels',
            minWidth: '180dp',
            minHeight: '110dp',
            targetCellWidth: 4,
            targetCellHeight: 2,
            description: 'Affiche tes 3 derniers réels sauvegardés.',
            previewImage: './assets/widget-preview.png',
            // Rafraîchissement périodique géré par le système (minimum Android = 30 min).
            updatePeriodMillis: 1800000,
          },
        ],
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    eas: {
      projectId: 'a2053878-37ef-493c-9079-f028c63224f3',
    },
  },
});
