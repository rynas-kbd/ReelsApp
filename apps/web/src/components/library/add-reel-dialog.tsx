'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { STRINGS, isInstagramUrl } from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AddReelDialog({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isInstagramUrl(url)) {
      toast.error(STRINGS.add.invalid);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error(STRINGS.common.error);
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/add-reel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ url, source: 'manual' }),
        },
      );

      if (res.status === 200) {
        toast.success(STRINGS.add.success);
        setUrl('');
        setOpen(false);
        onAdded?.();
      } else if (res.status === 409) {
        toast.error(STRINGS.add.duplicate);
      } else {
        let message: string = STRINGS.common.error;
        try {
          const body = await res.json();
          if (body?.error && res.status === 422) message = STRINGS.add.invalid;
        } catch {
          /* ignore */
        }
        toast.error(message);
      }
    } catch {
      toast.error(STRINGS.common.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          {STRINGS.nav.add}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{STRINGS.add.title}</DialogTitle>
          <DialogDescription>{STRINGS.library.empty.subtitle}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reel-url">{STRINGS.add.pasteLabel}</Label>
            <Input
              id="reel-url"
              type="url"
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={STRINGS.add.placeholder}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !url.trim()}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                {STRINGS.add.adding}
              </>
            ) : (
              STRINGS.add.submit
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
