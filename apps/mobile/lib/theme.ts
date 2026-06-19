/**
 * Ré-export pratique des design tokens partagés.
 * Source de vérité : @reelvault/design-tokens. Ne JAMAIS hardcoder de couleur ici.
 */
export { colors, gradients, radius, spacing, typography } from '@reelvault/design-tokens';

/** Formatte une date ISO en français court (ex. « 12 juin 2026 »). */
export function formatDateFr(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
