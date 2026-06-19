/**
 * ReelVault — Design Tokens
 * Source de vérité unique du thème (dark mode par défaut), partagée par le web et le mobile.
 * Web : consommé via Tailwind (tailwind.config) + variables CSS.
 * Mobile : consommé directement en JS (StyleSheet / thème React Native).
 */

export const colors = {
  // Fonds
  bg: '#0B0B0F',
  surface: '#16161D',
  surface2: '#1F1F29',
  surface3: '#272733',
  border: '#2A2A36',
  borderStrong: '#3A3A48',

  // Texte
  text: '#F4F4F5',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',

  // Accent (dégradé violet → fuchsia)
  accent: '#7C3AED',
  accentTo: '#D946EF',
  accentSoft: 'rgba(124, 58, 237, 0.16)',

  // États
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Dégradé d'accent réutilisable (CTA, highlights). */
export const gradients = {
  accent: ['#7C3AED', '#D946EF'] as [string, string],
  accentCss: 'linear-gradient(135deg, #7C3AED 0%, #D946EF 100%)',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const typography = {
  fontFamily: 'Inter, "Geist", system-ui, -apple-system, sans-serif',
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const motion = {
  fast: 150,
  base: 200,
  slow: 250,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export const shadows = {
  card: '0 4px 24px rgba(0, 0, 0, 0.35)',
  glow: '0 0 0 1px rgba(124,58,237,0.35), 0 8px 32px rgba(124,58,237,0.25)',
} as const;

export const theme = {
  colors,
  gradients,
  radius,
  spacing,
  typography,
  motion,
  shadows,
} as const;

export type Theme = typeof theme;
