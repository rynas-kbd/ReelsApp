'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FolderTree, GitMerge, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  STRINGS,
  fetchCategoryTree,
  fetchCategoryCounts,
  createCategory,
  updateCategory,
  deleteCategory,
  mergeCategories,
  type Category,
  type CategoryWithChildren,
} from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CategoryIcon } from '@/components/category-icon';
import { EmptyState } from '@/components/empty-state';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DialogMode =
  | { type: 'rename'; cat: Category }
  | { type: 'merge'; cat: Category }
  | { type: 'delete'; cat: Category }
  | { type: 'create-sub'; parent: CategoryWithChildren }
  | null;

export function CategoryManager() {
  const supabase = useMemo(() => createClient(), []);
  const [tree, setTree] = useState<CategoryWithChildren[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [inputValue, setInputValue] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const [busy, setBusy] = useState(false);

  // Liste plate pour merge select
  const allCats: Category[] = useMemo(
    () => tree.flatMap((r) => [r, ...r.children]),
    [tree],
  );

  async function load() {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([fetchCategoryTree(supabase), fetchCategoryCounts(supabase)]);
      setTree(t);
      setCounts(c);
      // Auto-expand racines qui ont des enfants
      setExpanded(new Set(t.filter((r) => r.children.length > 0).map((r) => r.id)));
    } catch {
      toast.error(STRINGS.common.error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [supabase]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openDialog(mode: DialogMode) {
    setDialog(mode);
    setInputValue(mode?.type === 'rename' ? mode.cat.name : '');
    setMergeTarget('');
  }

  async function doRename() {
    if (dialog?.type !== 'rename' || !inputValue.trim()) return;
    setBusy(true);
    try {
      await updateCategory(supabase, dialog.cat.id, { name: inputValue.trim() });
      toast.success(STRINGS.settings.saved);
      setDialog(null);
      await load();
    } catch { toast.error(STRINGS.common.error); }
    finally { setBusy(false); }
  }

  async function doMerge() {
    if (dialog?.type !== 'merge' || !mergeTarget) return;
    setBusy(true);
    try {
      await mergeCategories(supabase, dialog.cat.id, mergeTarget);
      toast.success(STRINGS.settings.saved);
      setDialog(null);
      await load();
    } catch { toast.error(STRINGS.common.error); }
    finally { setBusy(false); }
  }

  async function doDelete() {
    if (dialog?.type !== 'delete') return;
    setBusy(true);
    try {
      await deleteCategory(supabase, dialog.cat.id);
      toast.success(STRINGS.settings.saved);
      setDialog(null);
      await load();
    } catch { toast.error(STRINGS.common.error); }
    finally { setBusy(false); }
  }

  async function doCreateSub() {
    if (dialog?.type !== 'create-sub' || !inputValue.trim()) return;
    setBusy(true);
    try {
      await createCategory(supabase, inputValue.trim(), {
        parentId: dialog.parent.id,
        color: dialog.parent.color,
      });
      toast.success(STRINGS.settings.saved);
      setDialog(null);
      setExpanded((prev) => new Set([...prev, dialog.parent.id]));
      await load();
    } catch { toast.error(STRINGS.common.error); }
    finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-accent" />
          {STRINGS.categories.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-2" />
            ))}
          </div>
        ) : tree.length === 0 ? (
          <EmptyState icon={FolderTree} title={STRINGS.categories.title} />
        ) : (
          <ul className="space-y-1">
            {tree.map((root) => {
              const open = expanded.has(root.id);
              return (
                <li key={root.id}>
                  {/* Racine */}
                  <div className="flex items-center gap-2 rounded-xl px-2 py-2.5 hover:bg-surface-2">
                    <button
                      type="button"
                      onClick={() => toggleExpand(root.id)}
                      className="text-text-muted hover:text-text"
                      aria-label={open ? 'Réduire' : 'Développer'}
                    >
                      {root.children.length > 0 ? (
                        open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                      ) : (
                        <span className="h-4 w-4 block" />
                      )}
                    </button>

                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                      style={{ backgroundColor: `${root.color}22` }}
                    >
                      <CategoryIcon icon={root.icon} className="h-3.5 w-3.5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-semibold text-text">{root.name}</span>
                      {root.children.length > 0 && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          {root.children.length} sous-cat.
                        </Badge>
                      )}
                    </div>

                    <span className="text-xs text-text-muted mr-1">
                      {STRINGS.categories.reelCount(counts[root.id] ?? 0)}
                    </span>

                    {/* Actions racine */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        title={STRINGS.categories.createSub ?? 'Créer sous-catégorie'}
                        onClick={() => openDialog({ type: 'create-sub', parent: root })}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        title={STRINGS.categories.rename}
                        onClick={() => openDialog({ type: 'rename', cat: root })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        title={STRINGS.categories.merge}
                        disabled={allCats.length < 2}
                        onClick={() => openDialog({ type: 'merge', cat: root })}
                      >
                        <GitMerge className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-danger hover:text-danger"
                        title={STRINGS.categories.delete}
                        onClick={() => openDialog({ type: 'delete', cat: root })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Sous-catégories */}
                  {open && root.children.length > 0 && (
                    <ul className="ml-10 mt-0.5 space-y-0.5 border-l border-border-subtle pl-4">
                      {root.children.map((child) => (
                        <li key={child.id} className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-surface-2">
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-md shrink-0"
                            style={{ backgroundColor: `${child.color}22` }}
                          >
                            <CategoryIcon icon={child.icon} className="h-3 w-3" />
                          </span>
                          <span className="min-w-0 flex-1 text-sm text-text truncate">{child.name}</span>
                          <span className="text-[10px] text-text-muted mr-1">
                            {STRINGS.categories.reelCount(counts[child.id] ?? 0)}
                          </span>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6"
                              title={STRINGS.categories.rename}
                              onClick={() => openDialog({ type: 'rename', cat: child })}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className={cn('h-6 w-6 text-danger hover:text-danger')}
                              title={STRINGS.categories.delete}
                              onClick={() => openDialog({ type: 'delete', cat: child })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      {/* Renommer */}
      <Dialog open={dialog?.type === 'rename'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{STRINGS.categories.rename}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename">{STRINGS.categories.title}</Label>
            <Input
              id="rename"
              value={inputValue}
              autoFocus
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>{STRINGS.common.cancel}</Button>
            <Button onClick={doRename} disabled={busy || !inputValue.trim()}>
              {busy && <Loader2 className="animate-spin" />} {STRINGS.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Créer sous-catégorie */}
      <Dialog open={dialog?.type === 'create-sub'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {STRINGS.categories.createSub ?? 'Nouvelle sous-catégorie'}
            </DialogTitle>
            {dialog?.type === 'create-sub' && (
              <DialogDescription>
                {STRINGS.categories.parentLabel ?? 'Catégorie parente'} : {dialog.parent.name}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sub-name">Nom</Label>
            <Input
              id="sub-name"
              value={inputValue}
              autoFocus
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doCreateSub()}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>{STRINGS.common.cancel}</Button>
            <Button onClick={doCreateSub} disabled={busy || !inputValue.trim()}>
              {busy && <Loader2 className="animate-spin" />} {STRINGS.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fusionner */}
      <Dialog open={dialog?.type === 'merge'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{STRINGS.categories.merge}</DialogTitle>
            <DialogDescription>
              « {dialog?.type === 'merge' ? dialog.cat.name : ''} » → {STRINGS.categories.mergeInto}
            </DialogDescription>
          </DialogHeader>
          <Select value={mergeTarget} onValueChange={setMergeTarget}>
            <SelectTrigger>
              <SelectValue placeholder={STRINGS.categories.mergeInto} />
            </SelectTrigger>
            <SelectContent>
              {allCats
                .filter((c) => c.id !== (dialog?.type === 'merge' ? dialog.cat.id : ''))
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>{STRINGS.common.cancel}</Button>
            <Button onClick={doMerge} disabled={busy || !mergeTarget}>
              {busy && <Loader2 className="animate-spin" />} {STRINGS.categories.merge}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supprimer */}
      <Dialog open={dialog?.type === 'delete'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{STRINGS.categories.delete}</DialogTitle>
            <DialogDescription>
              {dialog?.type === 'delete' && dialog.cat.parent_id
                ? STRINGS.categories.deleteSubConfirm ?? STRINGS.categories.deleteConfirm
                : STRINGS.categories.deleteConfirm}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>{STRINGS.common.cancel}</Button>
            <Button variant="destructive" onClick={doDelete} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} {STRINGS.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
