import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { AuthProvider, useAuth } from '../lib/auth';
import { ToastProvider, useToast } from '../components/Toast';
import { usePendingShare } from '../hooks/usePendingShare';
import { ensureAndroidChannel } from '../lib/notifications';
import { widgetTaskHandler } from '../widgets/widget-task-handler';
import { colors } from '../lib/theme';
import { STRINGS } from '@reelvault/shared';

// Enregistre la tâche du widget une seule fois au chargement du bundle (hors composant).
registerWidgetTaskHandler(widgetTaskHandler);

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Redirection selon l'état d'authentification.
  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/library');
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <Slot />;
}

/** Branche les effets globaux : canal de notif, partage entrant, tap notif. */
function GlobalEffects() {
  const router = useRouter();
  const { show } = useToast();
  const { outcome, clearOutcome } = usePendingShare();

  useEffect(() => {
    void ensureAndroidChannel();
  }, []);

  // Tap sur une notification → ouvre la bibliothèque.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/(tabs)/library');
    });
    return () => sub.remove();
  }, [router]);

  // Feedback du partage entrant.
  useEffect(() => {
    if (!outcome) return;
    if (outcome.type === 'added') show(STRINGS.add.success, 'success');
    else if (outcome.type === 'duplicate') show(STRINGS.add.duplicate, 'info');
    else if (outcome.type === 'invalid') show(STRINGS.add.invalid, 'error');
    else show(STRINGS.common.error, 'error');
    clearOutcome();
  }, [outcome, show, clearOutcome]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ToastProvider>
            <StatusBar style="light" />
            <GlobalEffects />
            <RootNavigator />
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
