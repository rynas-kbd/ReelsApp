import { useCallback, useEffect, useRef, useState } from 'react';
import { useShareIntent } from 'expo-share-intent';
import { isInstagramUrl } from '@reelvault/shared';
import { addReel } from '../lib/addReel';
import { useAuth } from '../lib/auth';

/**
 * Capte les liens partagés depuis Instagram/Android (menu "Partager").
 * - Extrait un lien Instagram du texte/URL partagé.
 * - Si l'utilisateur est connecté → POST add-reel (source 'share').
 * - Sinon → conserve le lien en attente, traité après connexion.
 *
 * Retourne le statut du dernier traitement pour afficher un feedback (toast).
 */
export type ShareOutcome =
  | { type: 'added' }
  | { type: 'duplicate' }
  | { type: 'invalid' }
  | { type: 'error' }
  | null;

export function usePendingShare() {
  const { userId } = useAuth();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    debug: false,
    resetOnBackground: true,
  });

  const [outcome, setOutcome] = useState<ShareOutcome>(null);
  const [processing, setProcessing] = useState(false);
  const pendingUrl = useRef<string | null>(null);

  // Extrait l'URL Instagram d'un partage (champ text ou webUrl selon le type).
  const extractUrl = useCallback((): string | null => {
    if (!shareIntent) return null;
    const candidates = [shareIntent.webUrl, shareIntent.text].filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );
    for (const c of candidates) {
      // Le texte partagé peut contenir une légende + lien : on cherche un token URL.
      const match = c.match(/https?:\/\/\S+/);
      const url = match ? match[0] : c;
      if (isInstagramUrl(url)) return url;
    }
    return null;
  }, [shareIntent]);

  // Traite l'URL en attente (déclenché à réception ET après login).
  const process = useCallback(
    async (url: string) => {
      setProcessing(true);
      const res = await addReel(url, 'share');
      setProcessing(false);
      pendingUrl.current = null;
      if (res.ok) setOutcome({ type: 'added' });
      else if (res.reason === 'duplicate') setOutcome({ type: 'duplicate' });
      else if (res.reason === 'invalid') setOutcome({ type: 'invalid' });
      else setOutcome({ type: 'error' });
    },
    [],
  );

  // À réception d'un nouveau partage.
  useEffect(() => {
    if (!hasShareIntent) return;
    const url = extractUrl();
    if (!url) {
      setOutcome({ type: 'invalid' });
      resetShareIntent();
      return;
    }
    if (userId) {
      void process(url);
    } else {
      // Garde le lien : sera traité quand userId devient non-null.
      pendingUrl.current = url;
    }
    resetShareIntent();
  }, [hasShareIntent, extractUrl, userId, process, resetShareIntent]);

  // Traite un lien gardé après connexion.
  useEffect(() => {
    if (userId && pendingUrl.current) {
      void process(pendingUrl.current);
    }
  }, [userId, process]);

  const clearOutcome = useCallback(() => setOutcome(null), []);

  return { outcome, processing, clearOutcome, hasPending: pendingUrl.current !== null };
}
