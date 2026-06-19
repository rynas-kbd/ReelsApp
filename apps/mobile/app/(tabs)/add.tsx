import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { isInstagramUrl, STRINGS } from '@reelvault/shared';
import { Screen, GradientHeader } from '../../components/Screen';
import { GradientButton, OutlineButton } from '../../components/GradientButton';
import { useToast } from '../../components/Toast';
import { addReel } from '../../lib/addReel';
import { colors, radius, spacing, typography } from '../../lib/theme';

export default function AddScreen() {
  const { show } = useToast();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const valid = isInstagramUrl(url.trim());

  async function onPaste() {
    const text = await Clipboard.getStringAsync();
    if (text) setUrl(text.trim());
  }

  async function onSubmit() {
    const clean = url.trim();
    if (!isInstagramUrl(clean)) {
      show(STRINGS.add.invalid, 'error');
      return;
    }
    setLoading(true);
    const res = await addReel(clean, 'manual');
    setLoading(false);
    if (res.ok) {
      show(STRINGS.add.success, 'success');
      setUrl('');
    } else if (res.reason === 'duplicate') {
      show(STRINGS.add.duplicate, 'info');
    } else if (res.reason === 'invalid') {
      show(STRINGS.add.invalid, 'error');
    } else {
      show(STRINGS.common.error, 'error');
    }
  }

  return (
    <Screen>
      <GradientHeader title={STRINGS.add.title} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <View style={styles.iconWrap}>
            <Ionicons name="link" size={28} color={colors.accentTo} />
          </View>

          <Text style={styles.label}>{STRINGS.add.pasteLabel}</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder={STRINGS.add.placeholder}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            multiline
            style={styles.input}
          />

          {url.trim().length > 0 && !valid ? (
            <Text style={styles.hint}>{STRINGS.add.invalid}</Text>
          ) : null}

          <OutlineButton
            label="Coller depuis le presse-papiers"
            onPress={onPaste}
            style={{ marginTop: spacing.md }}
          />

          <GradientButton
            label={loading ? STRINGS.add.adding : STRINGS.add.submit}
            onPress={onSubmit}
            loading={loading}
            disabled={!valid}
            style={{ marginTop: spacing.md }}
          />

          <Text style={styles.tip}>
            Astuce : partage un réel directement depuis Instagram via le menu « Partager »
            et choisis {STRINGS.app.name}.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.md,
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
    minHeight: 56,
  },
  hint: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
  tip: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
});
