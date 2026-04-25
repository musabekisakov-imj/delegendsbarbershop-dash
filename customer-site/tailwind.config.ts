import type { Config } from 'tailwindcss';

// "PARLOUR" — boutique heritage-modern.
// Researched against Murdock London, Hawthorne NYC, Ruffians Edinburgh,
// Pall Mall Barbers, Persons of Interest, Pankhurst London. Palette and
// type pairing draws from leather-chair-and-mahogany barbershop tradition.

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces — warm cream, slight peach undertone
        bg: {
          DEFAULT: '#F4EFE5',
          raised: '#EAE3D4',
          surface: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#1A1714',
          soft: '#2A2522',
          muted: '#5A5147',
          subtle: '#8A8073',
          inverse: '#F4EFE5',
        },
        hairline: {
          DEFAULT: '#D7D0C3',
          strong: '#B8B0A0',
          inverse: 'rgba(244,239,229,0.10)',
          'inverse-strong': 'rgba(244,239,229,0.20)',
        },
        // Primary action — oxblood (leather chair / stained mahogany)
        oxblood: {
          DEFAULT: '#7C2630',
          dim: '#5A1A22',
          light: '#9C3340',
        },
        // Secondary detail — brass (vintage hardware)
        brass: {
          DEFAULT: '#A87E3A',
          dim: '#826230',
          light: '#C39955',
        },
        // Reserved for live/hot states
        live: '#E8482D',
        ok: '#4D7A50',
        warn: '#C5752E',
      },
      fontFamily: {
        // Display = Fraunces serif (warmth, heritage)
        // Body = Geist sans (modern, balanced)
        display: ['var(--font-fraunces)', 'Tiempos', 'Georgia', 'serif'],
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        eyebrow: '0.18em',
        tight: '-0.015em',
        tighter: '-0.025em',
        snug: '-0.035em',
      },
      maxWidth: {
        editorial: '1320px',
        narrow: '780px',
        prose: '64ch',
      },
      borderRadius: {
        DEFAULT: '4px',
        card: '6px',
        pill: '9999px',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        snap: 'cubic-bezier(0.4, 0, 0.2, 1)',
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
