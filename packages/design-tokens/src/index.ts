/**
 * ReelVault — Design Tokens
 * Source de vérité unique du thème, partagée par le web et le mobile.
 * Correspond EXACTEMENT aux variables CSS de apps/web/src/app/globals.css.
 */

/** Palette clair — correspond à :root dans globals.css */
export const lightColors = {
  bg: 'hsl(48, 24%, 96%)',         // fond papier crème
  surface: 'hsl(0, 0%, 100%)',     // blanc cartes
  surface2: 'hsl(48, 22%, 94%)',
  surface3: 'hsl(45, 18%, 90%)',
  border: 'hsl(45, 14%, 88%)',
  borderStrong: 'hsl(45, 12%, 80%)',

  text: 'hsl(240, 13%, 9%)',        // encre
  textSecondary: 'hsl(240, 6%, 32%)',
  textMuted: 'hsl(240, 5%, 50%)',

  brand: 'hsl(11, 95%, 55%)',       // coral
  brand2: 'hsl(33, 100%, 50%)',     // amber
  brandSoft: 'rgba(249, 78, 46, 0.12)',

  success: 'hsl(152, 62%, 38%)',
  warning: 'hsl(33, 100%, 42%)',
  danger: 'hsl(0, 72%, 51%)',
  info: 'hsl(217, 91%, 52%)',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Palette sombre — correspond à .dark dans globals.css */
export const darkColors = {
  bg: 'hsl(240, 8%, 6%)',
  surface: 'hsl(240, 7%, 10%)',
  surface2: 'hsl(240, 6%, 14%)',
  surface3: 'hsl(240, 6%, 17%)',
  border: 'hsl(240, 6%, 18%)',
  borderStrong: 'hsl(240, 6%, 26%)',

  text: 'hsl(48, 12%, 96%)',
  textSecondary: 'hsl(240, 5%, 70%)',
  textMuted: 'hsl(240, 5%, 52%)',

  brand: 'hsl(11, 96%, 62%)',
  brand2: 'hsl(33, 100%, 58%)',
  brandSoft: 'rgba(249, 100, 60, 0.16)',

  success: 'hsl(152, 60%, 45%)',
  warning: 'hsl(33, 100%, 55%)',
  danger: 'hsl(0, 84%, 60%)',
  info: 'hsl(217, 91%, 60%)',

  white: '#FFFFFF',
  black: '#000000',
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
  /** Corps de texte */
  fontFamily: 'Inter_400Regular, Inter, system-ui, sans-serif',
  /** Titres / chiffres (serif expressif comme le web) */
  fontFamilyDisplay: 'Fraunces_700Bold, Fraunces, Georgia, serif',
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
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const motion = {
  fast: 150,
  base: 200,
  slow: 250,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

/** Fabrique un objet thème complet pour le scheme donné. */
export function makeTheme(scheme: 'light' | 'dark') {
  const colors = scheme === 'light' ? lightColors : darkColors;
  return {
    scheme,
    colors,
    gradients: {
      accent: [colors.brand, colors.brand2] as [string, string],
      accentCss: `linear-gradient(135deg, ${colors.brand} 0%, ${colors.brand2} 100%)`,
    },
    radius,
    spacing,
    typography,
    motion,
    shadows: {
      card: scheme === 'light'
        ? '0 4px 24px rgba(0,0,0,0.08)'
        : '0 4px 24px rgba(0,0,0,0.35)',
      glow: `0 0 0 1px ${colors.brandSoft}, 0 8px 32px ${colors.brandSoft}`,
    },
  };
}

export type Theme = ReturnType<typeof makeTheme>;
export type Colors = Theme['colors'];

// Legacy compat — keep `colors` export pointing to dark theme so existing imports don't break immediately
// (will be migrated component by component)
// Also adds old violet-theme aliases (accent/accentTo/accentSoft) so un-migrated screens still compile.
export const colors = {
  ...darkColors,
  // Old violet accent aliases → mapped to new coral/amber brand
  accent: darkColors.brand,
  accentTo: darkColors.brand2,
  accentSoft: darkColors.brandSoft,
} as const;
export const gradients = { accent: [darkColors.brand, darkColors.brand2] as [string, string] };
