'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, GitMerge, Trash2, FolderTree } from 'lucide-react';
import { toast } from 'sonner';
import {
  STRINGS,
  fetchCategories,
  fetchCategoryCounts,
  type Category,
} from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CategoryIcon } from '@/components/category-icon';
import { EmptyState } from '@/components/empty-state';
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

export function CategoryManager() {
  const supabase = useMemo(() => createClient(), []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [renaming, setRenaming] = useState<Category | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [merging, setMerging] = useState<Category | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string>('');
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [cats, c] = await Promise.all([
        fetchCategories(supabase),
        fetchCategoryCounts(supabase),
      ]);
      setCategories(cats);
      setCounts(c);
    } catch {
      toast.error(STRINGS.common.error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doRename() {
    if (!renaming || !renameValue.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: renameValue.trim() })
        .eq('id', renaming.id);
      if (error) throw error;
      toast.success(STRINGS.settings.saved);
      setRenaming(null);
      await load();
    } catch {
      toast.error(STRINGS.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function doMerge() {
    if (!merging || !mergeTarget) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('merge_categories', {
        p_src: merging.id,
        p_dst: mergeTarget,
      });
      if (error) throw error;
      toast.success(STRINGS.settings.saved);
      setMerging(null);
      setMergeTarget('');
      await load();
    } catch {
      toast.error(STRINGS.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', deleting.id);
      if (error) throw error;
      toast.success(STRINGS.settings.saved);
      setDeleting(null);
      await load();
    } catch {
      toast.error(STRINGS.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{STRINGS.categories.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-2" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState icon={FolderTree} title={STRINGS.categories.title} />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {categories.map((cat) => (
              <li key={cat.id} className="flex items-center gap-3 py-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${cat.color}22` }}
                >
                  <CategoryIcon icon={cat.icon} className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{cat.name}</p>
                  <p className="text-xs text-text-muted">
                    {STRINGS.categories.reelCount(counts[cat.id] ?? 0)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={STRINGS.categories.rename}
                    onClick={() => {
                      setRenaming(cat);
                      setRenameValue(cat.name);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={STRINGS.categories.merge}
                    disabled={categories.length < 2}
                    onClick={() => {
                      setMerging(cat);
                      setMergeTarget('');
                    }}
                  >
                    <GitMerge />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={STRINGS.categories.delete}
                    className="text-danger hover:text-danger"
                    onClick={() => setDeleting(cat)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {/* Renommer */}
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{STRINGS.categories.rename}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename">{STRINGS.categories.title}</Label>
            <Input
              id="rename"
              value={renameValue}
              autoFocus
              onChange={(e) => setRenameValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              {STRINGS.common.cancel}
            </Button>
            <Button onClick={doRename} disabled={busy || !renameValue.trim()}>
              {busy && <Loader2 className="animate-spin" />}
              {STRINGS.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fusionner */}
      <Dialog open={!!merging} onOpenChange={(o) => !o && setMerging(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{STRINGS.categories.merge}</DialogTitle>
            <DialogDescription>
              « {merging?.name} » → {STRINGS.categories.mergeInto}
            </DialogDescription>
          </DialogHeader>
          <Select value={mergeTarget} onValueChange={setMergeTarget}>
            <SelectTrigger>
              <SelectValue placeholder={STRINGS.categories.mergeInto} />
            </SelectTrigger>
            <SelectContent>
              {categories
                .filter((c) => c.id !== merging?.id)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMerging(null)}>
              {STRINGS.common.cancel}
            </Button>
            <Button onClick={doMerge} disabled={busy || !mergeTarget}>
              {busy && <Loader2 className="animate-spin" />}
              {STRINGS.categories.merge}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supprimer */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{STRINGS.categories.delete}</DialogTitle>
            <DialogDescription>{STRINGS.categories.deleteConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {STRINGS.common.cancel}
            </Button>
            <Button variant="destructive" onClick={doDelete} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {STRINGS.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
