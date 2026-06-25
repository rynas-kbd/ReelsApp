'use client';

import { useEffect, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface UseReelsRealtimeOptions {
  supabase: SupabaseClient;
  /** Appelé quand un réel est inséré. Reçoit l'id du nouveau réel. */
  onInsert?: (id: string) => void;
  /** Appelé quand un réel est mis à jour (ex : status change). Reçoit l'id. */
  onUpdate?: (id: string) => void;
  /** Appelé quand un réel est supprimé. Reçoit l'id. */
  onDelete?: (id: string) => void;
}

/**
 * Ouvre un canal Supabase Realtime filtré sur les réels de l'utilisateur courant.
 * Les callbacks sont toujours appelés dans leur dernière version (refs) — pas
 * de problème de stale closure même si les dépendances changent.
 *
 * Pré-requis Supabase :
 *   ALTER TABLE reels REPLICA IDENTITY FULL;
 *   ALTER PUBLICATION supabase_realtime ADD TABLE reels;
 * (migration 0015_realtime_reels.sql)
 */
export function useReelsRealtime({ supabase, onInsert, onUpdate, onDelete }: UseReelsRealtimeOptions) {
  // Refs pour toujours appeler la dernière version des callbacks
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);

  // Mise à jour sans re-render
  useEffect(() => {
    onInsertRef.current = onInsert;
    onUpdateRef.current = onUpdate;
    onDeleteRef.current = onDelete;
  });

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`reels-${user.id}`)
        .on(
          // @ts-expect-error — les surcharges TS de supabase-js exigent un type générique précis ;
          // 'postgres_changes' + wildcard '*' fonctionnent parfaitement en runtime.
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reels',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: {
            eventType: 'INSERT' | 'UPDATE' | 'DELETE';
            new: Record<string, unknown>;
            old: Record<string, unknown>;
          }) => {
            const record = payload.new ?? payload.old;
            const id = record?.id as string | undefined;
            if (!id) return;

            if (payload.eventType === 'INSERT') onInsertRef.current?.(id);
            else if (payload.eventType === 'UPDATE') onUpdateRef.current?.(id);
            else if (payload.eventType === 'DELETE') onDeleteRef.current?.(id);
          },
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]); // supabase est mémoïsé → effect se monte une seule fois
}
