import React, { useEffect, useState } from 'react';
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
import { ThemeProvider, useTheme } from '../lib/theme';
import { STRINGS, fetchProfile } from '@reelvault/shared';
import { supabase } from '../lib/supabase';

// Enregistre la tâche du widget une seule fois au chargement du bundle (hors composant).
try {
  registerWidgetTaskHandler(widgetTaskHandler);
} catch {
  // Le module natif peut être absent lors du premier démarrage — non bloquant.
}

/** StatusBar dynamique selon le thème courant. */
function ThemedStatusBar() {
  const theme = useTheme();
  return <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />;
}

function RootNavigator() {
  const { session, userId, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const theme = useTheme();
  const [onboardChecked, setOnboardChecked] = useState(false);

  // Redirection selon l'état d'authentification puis onboarding.
  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }
    if (session && inAuthGroup) {
      // L'onboarding sera vérifié après (effet suivant).
      router.replace('/(tabs)/library');
      return;
    }

    // Vérification onboarding (une seule fois après login).
    if (session && userId && !onboardChecked && !inOnboarding && !inAuthGroup) {
      setOnboardChecked(true);
      fetchProfile(supabase, userId).then((profile) => {
        if (profile && !profile.onboarded) {
          router.replace('/onboarding');
        }
      }).catch(() => {/* silencieux */});
    }
  }, [session, userId, loading, segments, router, onboardChecked]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.brand} />
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

  // Tap sur une notification → ouvre la bibliothèque ou le digest.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (screen === 'digest') {
        router.push('/(tabs)/digest');
      } else {
        router.push('/(tabs)/library');
      }
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
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ThemedStatusBar />
              <GlobalEffects />
              <RootNavigator />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
