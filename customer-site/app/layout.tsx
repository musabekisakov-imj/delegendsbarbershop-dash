import type { Metadata } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// Display — Fraunces variable serif (soft axis adds warmth at large sizes).
const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
});

// Body — Inter as a Geist-adjacent monolinear sans (Geist isn't on Google Fonts).
// Tightened with feature settings in globals.css to avoid the generic "AI Inter" look.
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-geist',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Kirpykla Vilnius — vyriški kirpimai senamiestyje ir naujamiestyje',
    template: '%s · Kirpykla Vilnius',
  },
  description:
    'Du salonai Vilniuje. Patyrę meistrai. Užsisakykite vizitą per minutę — kirpimai, barzdos, skutimai.',
  openGraph: {
    type: 'website',
    locale: 'lt_LT',
    siteName: 'Kirpykla Vilnius',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt" className={`${fraunces.variable} ${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
