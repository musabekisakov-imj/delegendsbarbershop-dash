import type { Config } from 'tailwindcss';

// "Atelier" — design system for the customer-facing booking site.
// Carries the dashboard's editorial DNA (display titles, hairline dividers,
// tabular nums) but warms the palette for a customer audience.

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Atelier palette — warm cream, deep ink, terracotta accents.
        bg: {
          DEFAULT: '#FAF7F2',
          raised: '#F4EFE6',
          surface: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#1B1916',
          muted: '#5C5550',
          subtle: '#8A847E',
          inverse: '#FAF7F2',
        },
        accent: {
          DEFAULT: '#C0653A',
          hover: '#A8552F',
        },
        gold: '#A8762F',
        hairline: '#E6DFD3',
        ok: '#5A6B3C',
        warn: '#B5713C',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-geist)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        eyebrow: '0.18em',
      },
      maxWidth: {
        editorial: '1240px',
      },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
};

export default config;
