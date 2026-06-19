import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { fetchReels } from '@reelvault/shared';
import { supabase } from '../lib/supabase';
import { ReelVaultWidget, type WidgetReel } from './ReelVaultWidget';

const WIDGET_NAME = 'ReelVaultWidget';

/**
 * Tâche headless de mise à jour du widget.
 * Lit les 3 derniers réels via Supabase (la session est restaurée depuis
 * SecureStore par le client supabase). Si aucune session n'est disponible
 * (utilisateur déconnecté), on rend un widget « vide ».
 *
 * Déclencheurs : ajout du widget, redimensionnement, et rafraîchissement
 * périodique (updatePeriodMillis dans app.config.ts ; min Android = ~30 min).
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  if (widgetInfo.widgetName !== WIDGET_NAME) return;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const reels = await loadLatestReels();
      props.renderWidget(<ReelVaultWidget reels={reels} />);
      break;
    }
    case 'WIDGET_CLICK':
      // L'ouverture de l'app est gérée par clickAction="OPEN_APP".
      break;
    case 'WIDGET_DELETED':
    default:
      break;
  }
}

async function loadLatestReels(): Promise<WidgetReel[]> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return [];

    const reels = await fetchReels(supabase, { sort: 'recent' }, { limit: 3, offset: 0 });
    return reels.map((r) => ({
      id: r.id,
      title: r.title ?? r.caption ?? 'Réel',
      thumbnail_url: r.thumbnail_url,
    }));
  } catch {
    return [];
  }
}
