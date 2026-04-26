import type { Config } from 'tailwindcss';

// HALL — dark/light system. Colors live as CSS custom properties in
// globals.css so `:root` (light) vs `.dark` (dark) toggles the entire
// palette via next-themes' class swap. Tailwind reads `oklch(var(--…) /
// <alpha-value>)` so opacity modifiers (bg-primary/10) keep working.

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  // Tailwind's JIT scanner can't see dynamically interpolated class names
  // (e.g. `${serviceGradientFor(id)}` → `from-rose-400 via-fuchsia-500 to-purple-600`).
  // Without safelisting, those gradient color stops get purged and the
  // service hero blocks render as invisible boxes.
  safelist: [
    {
      pattern: /^(from|via|to)-(rose|fuchsia|purple|blue|indigo|violet|amber|orange|sky|emerald|teal|cyan|lime|pink|red)-(400|500|600)$/,
    },
    'bg-gradient-to-br',
  ],
  theme: {
    extend: {
      colors: {
        // Surface tiers
        background: 'oklch(var(--bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'oklch(var(--surface) / <alpha-value>)',
          2: 'oklch(var(--surface-2) / <alpha-value>)',
        },
        // Foreground tiers
        foreground: 'oklch(var(--fg) / <alpha-value>)',
        muted: {
          DEFAULT: 'oklch(var(--surface-2) / <alpha-value>)',
          foreground: 'oklch(var(--fg-muted) / <alpha-value>)',
        },
        subtle: 'oklch(var(--fg-subtle) / <alpha-value>)',
        // Brand — lime stays in both modes
        primary: {
          DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
          foreground: 'oklch(var(--primary-fg) / <alpha-value>)',
        },
        // Card / popover surfaces
        card: {
          DEFAULT: 'oklch(var(--surface) / <alpha-value>)',
          foreground: 'oklch(var(--fg) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'oklch(var(--surface-2) / <alpha-value>)',
          foreground: 'oklch(var(--fg) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'oklch(var(--surface-2) / <alpha-value>)',
          foreground: 'oklch(var(--fg) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'oklch(var(--surface-2) / <alpha-value>)',
          foreground: 'oklch(var(--fg) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'oklch(0.62 0.21 25 / <alpha-value>)',
          foreground: 'oklch(0.96 0 0 / <alpha-value>)',
        },
        // Hairline tokens use fixed alpha — `<alpha-value>` placeholder
        // defaults to 1.0 without an opacity modifier, which would render
        // these as solid black/white slabs instead of subtle hairlines.
        border: 'rgb(var(--border-rgb) / 0.10)',
        'border-strong': 'rgb(var(--border-strong-rgb) / 0.20)',
        input: 'rgb(var(--border-rgb) / 0.06)',
        ring: 'oklch(var(--primary) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0',
        sm: '0',
        md: '0.125rem',
        lg: '0.25rem',
        xl: '0.375rem',
        full: '9999px',
      },
      maxWidth: {
        page: '1320px',
        narrow: '780px',
      },
      transitionTimingFunction: {
        snap: 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        marquee: 'marquee var(--duration, 30s) linear infinite',
        'marquee-vertical': 'marquee-vertical var(--duration, 30s) linear infinite',
        'live-dot': 'live-dot 1.6s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 2.4s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(calc(-100% - var(--gap, 2rem)))' },
        },
        'marquee-vertical': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(calc(-100% - var(--gap, 2rem)))' },
        },
        'live-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.4)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
