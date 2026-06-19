import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { STRINGS } from '@reelvault/shared';
import { Screen } from '../../components/Screen';
import { GradientButton } from '../../components/GradientButton';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../lib/auth';
import { colors, gradients, radius, spacing, typography } from '../../lib/theme';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const { show } = useToast();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isSignup = mode === 'signup';

  async function onSubmit() {
    if (!email.trim() || !password) return;
    setLoading(true);
    if (isSignup) {
      const { error, needsConfirm } = await signUp(email.trim(), password);
      setLoading(false);
      if (error) {
        show(STRINGS.auth.loginError, 'error');
        return;
      }
      if (needsConfirm) show(STRINGS.auth.signupSuccess, 'success');
      // Sinon : session créée → redirection auto par RootNavigator.
    } else {
      const { error } = await signIn(email.trim(), password);
      setLoading(false);
      if (error) show(STRINGS.auth.loginError, 'error');
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandWrap}>
            <LinearGradient colors={gradients.accent} style={styles.logo}>
              <Ionicons name="bookmark" size={30} color={colors.white} />
            </LinearGradient>
            <Text style={styles.brand}>{STRINGS.app.name}</Text>
            <Text style={styles.tagline}>{STRINGS.app.tagline}</Text>
          </View>

          <Text style={styles.title}>
            {isSignup ? STRINGS.auth.signupTitle : STRINGS.auth.loginTitle}
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>{STRINGS.auth.email}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="toi@exemple.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{STRINGS.auth.password}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <GradientButton
            label={isSignup ? STRINGS.auth.signup : STRINGS.auth.login}
            onPress={onSubmit}
            loading={loading}
            disabled={!email.trim() || !password}
            style={{ marginTop: spacing.md }}
          />

          <Pressable
            onPress={() => setMode(isSignup ? 'login' : 'signup')}
            style={styles.switch}
          >
            <Text style={styles.switchText}>
              {isSignup ? STRINGS.auth.hasAccount : STRINGS.auth.noAccount}{' '}
              <Text style={styles.switchLink}>
                {isSignup ? STRINGS.auth.login : STRINGS.auth.signup}
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  brand: {
    color: colors.text,
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.lg,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    color: colors.text,
    fontSize: typography.sizes.base,
  },
  switch: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  switchText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  switchLink: {
    color: colors.accentTo,
    fontWeight: typography.weights.semibold,
  },
});
