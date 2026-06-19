import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { updateProfile } from '@reelvault/shared';

export const ANDROID_CHANNEL_ID = 'reelvault-captures';

// Affiche les notifications même quand l'app est au premier plan.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Crée le canal de notification Android dédié aux captures de réels. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Captures ReelVault',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: '#7C3AED',
  });
}

/**
 * Demande la permission, récupère le token Expo push et le persiste dans
 * profiles.expo_push_token. Retourne le token, ou null si refusé/échec.
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId: string | undefined =
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenData.data;
    await updateProfile(supabase, userId, { expo_push_token: token });
    return token;
  } catch {
    return null;
  }
}

/** Retire le token push du profil (lors de la désactivation des notifs). */
export async function unregisterPushToken(userId: string): Promise<void> {
  await updateProfile(supabase, userId, { expo_push_token: null });
}
