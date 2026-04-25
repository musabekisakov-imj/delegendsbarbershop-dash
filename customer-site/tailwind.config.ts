import type { Config } from 'tailwindcss';

// Customer site — matches the staff dashboard's design system.
// Plus Jakarta Sans, blue primary accent, OKLCH-derived neutrals,
// rounded-xl cards with shadow-sm. Status pills + gradient avatars.
//
// Colors are baked as oklch(...) literals with <alpha-value> placeholder
// so Tailwind opacity modifiers (e.g. bg-primary/10) work correctly.

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        foreground: 'oklch(0.145 0 0 / <alpha-value>)',
        card: {
          DEFAULT: '#ffffff',
          foreground: 'oklch(0.145 0 0 / <alpha-value>)',
        },
        popover: {
          DEFAULT: '#ffffff',
          foreground: 'oklch(0.145 0 0 / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'oklch(0.58 0.22 260 / <alpha-value>)',
          foreground: 'oklch(1 0 0 / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'oklch(0.95 0.0058 264.53 / <alpha-value>)',
          foreground: 'oklch(0.145 0 0 / <alpha-value>)',
        },
        muted: {
          DEFAULT: '#ececf0',
          foreground: '#717182',
        },
        accent: {
          DEFAULT: '#e9ebef',
          foreground: 'oklch(0.145 0 0 / <alpha-value>)',
        },
        destructive: {
          DEFAULT: '#d4183d',
          foreground: '#ffffff',
        },
        border: 'rgba(0, 0, 0, 0.1)',
        input: 'transparent',
        ring: 'oklch(0.58 0.22 260 / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.625rem',
        xl: '0.75rem',
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
        'live-dot': 'live-dot 1.6s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 2.4s ease-in-out infinite',
      },
      keyframes: {
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
