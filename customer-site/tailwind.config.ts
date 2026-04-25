import type { Config } from 'tailwindcss';

// "HOURS" — dark editorial design system for the customer booking site.
// Time is the protagonist. Vermillion is reserved for decision moments.

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Foundation — warm-leaning blacks and bones.
        ink: {
          DEFAULT: '#0E0D0B',
          2: '#171511',
          3: '#26221C',
          4: '#3A352D',
        },
        bone: {
          DEFAULT: '#F4ECDB',
          muted: '#B8AE9D',
          subtle: '#7A7367',
          dim: '#544E45',
        },
        // Single shock accent. Used surgically.
        vermillion: {
          DEFAULT: '#E8482D',
          dim: '#8B2D1B',
          glow: 'rgba(232,72,45,0.18)',
        },
        // Hairlines on dark — alpha bone.
        hairline: 'rgba(244,236,219,0.10)',
        'hairline-strong': 'rgba(244,236,219,0.20)',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-inter-tight)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        eyebrow: '0.22em',
      },
      maxWidth: {
        editorial: '1320px',
        narrow: '780px',
      },
      borderRadius: {
        DEFAULT: '2px',
      },
      // Custom easing matching the rest of the system.
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        snap: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'marquee': 'marquee 40s linear infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
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
      },
    },
  },
  plugins: [],
};

export default config;
