import type { Config } from 'tailwindcss';

/** Couleur token → utilitaire Tailwind, pilotée par les variables CSS (globals.css). */
const v = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

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
        // Tokens custom ReelVault (théma-aware via variables CSS)
        bg: v('bg'),
        surface: v('surface'),
        'surface-2': v('surface-2'),
        'surface-3': v('surface-3'),
        'border-subtle': v('border-subtle'),
        'border-strong': v('border-strong'),
        text: {
          DEFAULT: v('text'),
          secondary: v('text-secondary'),
          muted: v('text-muted'),
        },
        'text-secondary': v('text-secondary'),
        'text-muted': v('text-muted'),
        accent: {
          DEFAULT: v('brand'),
          to: v('brand-2'),
          soft: 'hsl(var(--brand) / 0.16)',
          foreground: 'hsl(0 0% 100%)',
        },
        brand: {
          DEFAULT: v('brand'),
          to: v('brand-2'),
        },
        success: v('success'),
        warning: v('warning'),
        danger: v('danger'),
        info: v('info'),

        // Tokens shadcn
        border: v('border'),
        input: v('input'),
        ring: v('ring'),
        background: v('background'),
        foreground: v('foreground'),
        primary: {
          DEFAULT: v('primary'),
          foreground: v('primary-foreground'),
        },
        secondary: {
          DEFAULT: v('secondary'),
          foreground: v('secondary-foreground'),
        },
        destructive: {
          DEFAULT: v('destructive'),
          foreground: v('destructive-foreground'),
        },
        muted: {
          DEFAULT: v('muted'),
          foreground: v('muted-foreground'),
        },
        card: {
          DEFAULT: v('card'),
          foreground: v('card-foreground'),
        },
        popover: {
          DEFAULT: v('popover'),
          foreground: v('popover-foreground'),
        },
        chart: {
          1: v('chart-1'),
          2: v('chart-2'),
          3: v('chart-3'),
          4: v('chart-4'),
          5: v('chart-5'),
        },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: 'var(--radius)',
        xl: '20px',
        '2xl': '24px',
        '3xl': '28px',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
        'soft-dark': '0 1px 2px rgba(0,0,0,0.3), 0 12px 32px rgba(0,0,0,0.35)',
        card: '0 4px 24px rgba(0, 0, 0, 0.08)',
        glow: '0 0 0 1px hsl(var(--brand) / 0.35), 0 8px 32px hsl(var(--brand) / 0.25)',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, hsl(var(--brand)) 0%, hsl(var(--brand-2)) 100%)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-up': 'fade-up 250ms cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in': 'scale-in 200ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
