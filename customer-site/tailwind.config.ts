import type { Config } from 'tailwindcss';

// HALL — dark/light system. Colors live as CSS custom properties in
// globals.css so `:root` (light) vs `.dark` (dark) toggles the entire
// palette via next-themes' class swap. Tailwind reads `oklch(var(--…) /
// <alpha-value>)` so opacity modifiers (bg-primary/10) keep working.

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
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
        border: 'rgb(var(--border-rgb) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong-rgb) / <alpha-value>)',
        input: 'rgb(var(--border-rgb) / <alpha-value>)',
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
