import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createCategory,
  deleteCategory,
  fetchCategoryCounts,
  fetchCategoryTree,
  mergeCategories,
  updateCategory,
  STRINGS,
  type Category,
  type CategoryWithChildren,
} from '@reelvault/shared';
import { Screen, GradientHeader } from '../components/Screen';
import { GradientButton } from '../components/GradientButton';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing, typography } from '../lib/theme';

type InputModalState = {
  title: string;
  placeholder: string;
  value: string;
  onSubmit: (value: string) => void;
};

type MergeModalState = {
  srcId: string;
  srcName: string;
};

export default function CategoriesScreen() {
  const router = useRouter();

  const [tree, setTree] = useState<CategoryWithChildren[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal saisie texte (créer / renommer)
  const [inputModal, setInputModal] = useState<InputModalState | null>(null);

  // Modal fusion (sélection catégorie cible)
  const [mergeModal, setMergeModal] = useState<MergeModalState | null>(null);

  const load = useCallback(async () => {
    const [t, c] = await Promise.all([
      fetchCategoryTree(supabase),
      fetchCategoryCounts(supabase),
    ]);
    setTree(t);
    setCounts(c);
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openInput(title: string, placeholder: string, initial: string, onSubmit: (v: string) => void) {
    setInputModal({ title, placeholder, value: initial, onSubmit });
  }

  async function runSave(fn: () => Promise<unknown>) {
    setSaving(true);
    try {
      await fn();
      await load();
    } catch {
      Alert.alert(STRINGS.common.error);
    } finally {
      setSaving(false);
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  function createRoot() {
    openInput(STRINGS.categories.create, STRINGS.categories.create, '', (name) => {
      if (!name.trim()) return;
      void runSave(() => createCategory(supabase, name.trim()));
    });
  }

  function createSub(parentId: string) {
    openInput(STRINGS.categories.createSub, STRINGS.categories.createSub, '', (name) => {
      if (!name.trim()) return;
      void runSave(() => createCategory(supabase, name.trim(), { parentId }));
    });
  }

  function rename(id: string, current: string) {
    openInput(STRINGS.categories.rename, current, current, (name) => {
      if (!name.trim() || name.trim() === current) return;
      void runSave(() => updateCategory(supabase, id, { name: name.trim() }));
    });
  }

  function confirmDelete(id: string, name: string, isSub: boolean) {
    Alert.alert(
      STRINGS.categories.delete,
      isSub ? STRINGS.categories.deleteSubConfirm : STRINGS.categories.deleteConfirm,
      [
        { text: STRINGS.common.cancel, style: 'cancel' },
        {
          text: STRINGS.categories.delete,
          style: 'destructive',
          onPress: () => void runSave(() => deleteCategory(supabase, id)),
        },
      ],
    );
  }

  function startMerge(srcId: string, srcName: string) {
    setMergeModal({ srcId, srcName });
  }

  async function doMerge(dstId: string) {
    if (!mergeModal) return;
    setMergeModal(null);
    await runSave(() => mergeCategories(supabase, mergeModal.srcId, dstId));
  }

  // ── All categories flat (for merge target list) ──────────────────────────
  const allCategories: Category[] = tree.flatMap((r) => [r, ...r.children]);

  // ── Render ────────────────────────────────────────────────────────────────

  function renderRoot({ item: root }: { item: CategoryWithChildren }) {
    const isOpen = expanded.has(root.id);
    const count = counts[root.id] ?? 0;
    return (
      <View style={styles.rootBlock}>
        {/* Ligne racine */}
        <Pressable style={styles.catRow} onPress={() => toggleExpand(root.id)}>
          <View style={[styles.colorDot, { backgroundColor: root.color ?? colors.accent }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.catName}>{root.name}</Text>
            <Text style={styles.catMeta}>
              {STRINGS.categories.reelCount(count)}
              {root.children.length > 0
                ? ` · ${STRINGS.categories.subcategories(root.children.length)}`
                : ''}
            </Text>
          </View>
          <View style={styles.rowActions}>
            <Pressable style={styles.iconBtn} onPress={() => createSub(root.id)}>
              <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => rename(root.id, root.name)}>
              <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => startMerge(root.id, root.name)}>
              <Ionicons name="git-merge-outline" size={16} color={colors.textMuted} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => confirmDelete(root.id, root.name, false)}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
            <Ionicons
              name={isOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textMuted}
            />
          </View>
        </Pressable>

        {/* Sous-catégories (déployées) */}
        {isOpen &&
          root.children.map((sub) => (
            <View key={sub.id} style={styles.subRow}>
              <View style={styles.subIndent} />
              <View style={[styles.colorDot, { backgroundColor: sub.color ?? colors.accentSoft }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.subName}>{sub.name}</Text>
                <Text style={styles.catMeta}>
                  {STRINGS.categories.reelCount(counts[sub.id] ?? 0)}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <Pressable style={styles.iconBtn} onPress={() => rename(sub.id, sub.name)}>
                  <Ionicons name="pencil-outline" size={15} color={colors.textMuted} />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => startMerge(sub.id, sub.name)}>
                  <Ionicons name="git-merge-outline" size={15} color={colors.textMuted} />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => confirmDelete(sub.id, sub.name, true)}>
                  <Ionicons name="trash-outline" size={15} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))}
      </View>
    );
  }

  const createBtn = (
    <Pressable onPress={createRoot} style={styles.headerAdd}>
      <Ionicons name="add" size={24} color={colors.text} />
    </Pressable>
  );

  return (
    <Screen>
      <GradientHeader title={STRINGS.categories.title} right={createBtn} />

      {/* Back button */}
      <Pressable style={styles.backRow} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={colors.accentTo} />
        <Text style={styles.backText}>{STRINGS.settings.title}</Text>
      </Pressable>

      {loading ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Chargement…</Text>
        </View>
      ) : tree.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{STRINGS.library.empty.title}</Text>
          <GradientButton
            label={STRINGS.categories.create}
            onPress={createRoot}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      ) : (
        <FlatList
          data={tree}
          keyExtractor={(item) => item.id}
          renderItem={renderRoot}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Modal saisie texte ──────────────────────────────────────────── */}
      <Modal
        visible={inputModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setInputModal(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setInputModal(null)}>
          <Pressable style={styles.dialog} onPress={() => { /* stop propagation */ }}>
            <Text style={styles.dialogTitle}>{inputModal?.title}</Text>
            <TextInput
              value={inputModal?.value ?? ''}
              onChangeText={(v) => setInputModal((m) => (m ? { ...m, value: v } : m))}
              placeholder={inputModal?.placeholder}
              placeholderTextColor={colors.textMuted}
              autoFocus
              style={styles.dialogInput}
              onSubmitEditing={() => {
                inputModal?.onSubmit(inputModal.value);
                setInputModal(null);
              }}
            />
            <View style={styles.dialogBtns}>
              <Pressable style={styles.dialogCancel} onPress={() => setInputModal(null)}>
                <Text style={styles.dialogCancelText}>{STRINGS.common.cancel}</Text>
              </Pressable>
              <GradientButton
                label={STRINGS.settings.save}
                loading={saving}
                onPress={() => {
                  inputModal?.onSubmit(inputModal.value);
                  setInputModal(null);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal fusion ───────────────────────────────────────────────── */}
      <Modal
        visible={mergeModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setMergeModal(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setMergeModal(null)}>
          <Pressable style={styles.mergeSheet} onPress={() => { /* stop propagation */ }}>
            <Text style={styles.dialogTitle}>
              {STRINGS.categories.mergeInto}
            </Text>
            <Text style={styles.mergeSrc}>
              « {mergeModal?.srcName} » →
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {allCategories
                .filter((c) => c.id !== mergeModal?.srcId)
                .map((c) => (
                  <Pressable
                    key={c.id}
                    style={styles.mergeTarget}
                    onPress={() => void doMerge(c.id)}
                  >
                    <View style={[styles.colorDot, { backgroundColor: c.color ?? colors.accent }]} />
                    <Text style={styles.catName}>{c.name}</Text>
                  </Pressable>
                ))}
            </ScrollView>
            <Pressable style={styles.dialogCancel} onPress={() => setMergeModal(null)}>
              <Text style={styles.dialogCancelText}>{STRINGS.common.cancel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  backText: {
    color: colors.accentTo,
    fontSize: typography.sizes.sm,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  rootBlock: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    backgroundColor: colors.surface2,
  },
  subIndent: {
    width: spacing.md,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  catName: {
    color: colors.text,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  subName: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  catMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: 1,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  headerAdd: {
    padding: spacing.xs,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.base,
    textAlign: 'center',
  },
  // Modals
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  dialogTitle: {
    color: colors.text,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  dialogInput: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: typography.sizes.base,
  },
  dialogBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dialogCancel: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogCancelText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  mergeSheet: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  mergeSrc: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontStyle: 'italic',
  },
  mergeTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
