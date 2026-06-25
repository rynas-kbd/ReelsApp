/**
 * Ré-export pratique des design tokens partagés + hook de thème.
 * Source de vérité : @reelvault/design-tokens.
 */
export {
  makeTheme,
  lightColors,
  darkColors,
  radius,
  spacing,
  typography,
  type Theme,
  type Colors,
} from '@reelvault/design-tokens';

// Compat: exporter colors et gradients (pointent vers dark — migration progressive)
export { colors, gradients } from '@reelvault/design-tokens';

export { useTheme, useThemeControl, ThemeProvider } from './theme-context';

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
