import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// Display — Fraunces variable serif. Pushed via SOFT axis for italic drama.
// `axes` requires a true variable font load, so we omit `weight` (the variable
// version covers the full weight range automatically).
const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
});

// Body — Inter Tight, more confident than vanilla Inter (less SaaS-template).
const interTight = Inter_Tight({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter-tight',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});

// Tabular numerics — JetBrains Mono. Used in slot times, prices, IDs.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: {
    default: 'Kirpykla Vilnius — vyriški kirpimai senamiestyje ir naujamiestyje',
    template: '%s · Kirpykla Vilnius',
  },
  description:
    'Du salonai Vilniuje. Patyrę meistrai. Užsisakykite vizitą per minutę.',
  openGraph: {
    type: 'website',
    locale: 'lt_LT',
    siteName: 'Kirpykla Vilnius',
  },
};

export const viewport: Viewport = {
  themeColor: '#0E0D0B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="lt"
      className={`${fraunces.variable} ${interTight.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
