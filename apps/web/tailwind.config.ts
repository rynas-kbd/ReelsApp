import type { Config } from 'tailwindcss';
import { colors, radius } from '@reelvault/design-tokens';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tokens ReelVault (source de vérité : @reelvault/design-tokens)
        bg: colors.bg,
        surface: colors.surface,
        'surface-2': colors.surface2,
        'surface-3': colors.surface3,
        'border-subtle': colors.border,
        'border-strong': colors.borderStrong,
        text: colors.text,
        'text-secondary': colors.textSecondary,
        'text-muted': colors.textMuted,
        accent: {
          DEFAULT: colors.accent,
          to: colors.accentTo,
          soft: colors.accentSoft,
        },
        success: colors.success,
        warning: colors.warning,
        danger: colors.danger,
        info: colors.info,

        // Alias shadcn (mappés sur variables CSS de globals.css)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      borderRadius: {
        sm: `${radius.sm}px`,
        md: `${radius.md}px`,
        lg: `${radius.lg}px`,
        xl: `${radius.xl}px`,
        '2xl': `${radius['2xl']}px`,
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(0, 0, 0, 0.35)',
        glow: '0 0 0 1px rgba(124,58,237,0.35), 0 8px 32px rgba(124,58,237,0.25)',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #7C3AED 0%, #D946EF 100%)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-up': 'fade-up 250ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
