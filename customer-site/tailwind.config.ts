import type { Config } from 'tailwindcss';

// HALL — dark brutalist editorial system for the customer site.
// Lime accent (oklch(0.95 0.16 118.89)) used surgically on key headline
// words and primary CTAs. Dark across all 7 routes.

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surface tiers (dark)
        background: 'oklch(0.06 0 0 / <alpha-value>)',
        surface: {
          DEFAULT: 'oklch(0.10 0 0 / <alpha-value>)',
          2: 'oklch(0.14 0 0 / <alpha-value>)',
        },
        // Foreground tiers
        foreground: 'oklch(0.96 0 0 / <alpha-value>)',
        muted: {
          DEFAULT: 'oklch(0.14 0 0 / <alpha-value>)',
          foreground: 'oklch(0.62 0 0 / <alpha-value>)',
        },
        subtle: 'oklch(0.42 0 0 / <alpha-value>)',
        // Brand — lime (pattern signature)
        primary: {
          DEFAULT: 'oklch(0.95 0.16 118.89 / <alpha-value>)',
          foreground: 'oklch(0.10 0 0 / <alpha-value>)',
        },
        // Card / popover surfaces (radix-style API for ported components)
        card: {
          DEFAULT: 'oklch(0.10 0 0 / <alpha-value>)',
          foreground: 'oklch(0.96 0 0 / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'oklch(0.14 0 0 / <alpha-value>)',
          foreground: 'oklch(0.96 0 0 / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'oklch(0.14 0 0 / <alpha-value>)',
          foreground: 'oklch(0.96 0 0 / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'oklch(0.18 0 0 / <alpha-value>)',
          foreground: 'oklch(0.96 0 0 / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'oklch(0.62 0.21 25 / <alpha-value>)',
          foreground: 'oklch(0.96 0 0 / <alpha-value>)',
        },
        border: 'rgba(255, 255, 255, 0.10)',
        'border-strong': 'rgba(255, 255, 255, 0.20)',
        input: 'rgba(255, 255, 255, 0.06)',
        ring: 'oklch(0.95 0.16 118.89 / <alpha-value>)',
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
