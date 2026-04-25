import type { Config } from 'tailwindcss';

// "STUDIO" — modern multi-page design system.
// Mixed-mode (warm cream default + dark inverse panels). Sans-only typography
// (Geist). Forest-moss accent. Vermillion reserved for live/hot states only.

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light surface foundation
        bg: {
          DEFAULT: '#F4F1EA',
          raised: '#EAE5DA',
          surface: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#0E0E10',
          soft: '#1A1A1D',
          muted: '#6A6A6F',
          subtle: '#9A9A9F',
          inverse: '#F4F1EA',
        },
        hairline: {
          DEFAULT: '#E5E1D8',
          strong: '#D2CDC0',
          inverse: 'rgba(244,241,234,0.10)',
          'inverse-strong': 'rgba(244,241,234,0.20)',
        },
        // Primary brand accent — deep moss. Premium, artisan, calm.
        moss: {
          DEFAULT: '#2C4A38',
          dim: '#1F3528',
          light: '#3D6B4F',
          glow: 'rgba(44,74,56,0.12)',
        },
        // Reserved for live/hot states only — now-line, available-now
        live: '#E8482D',
        ok: '#4D7A50',
        warn: '#C5752E',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
        display: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui'],
      },
      letterSpacing: {
        eyebrow: '0.14em',
        tight: '-0.02em',
        tighter: '-0.03em',
        snug: '-0.04em',
      },
      maxWidth: {
        editorial: '1320px',
        narrow: '780px',
      },
      borderRadius: {
        DEFAULT: '8px',
        card: '12px',
        pill: '9999px',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        snap: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bouncy: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        marquee: 'marquee 50s linear infinite',
        'pulse-slow': 'pulse-slow 2.4s ease-in-out infinite',
        'live-dot': 'live-dot 1.6s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'live-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.4)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
