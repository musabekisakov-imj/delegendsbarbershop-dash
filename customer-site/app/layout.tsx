import type { Metadata, Viewport } from 'next';
import { Fraunces } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { MainNav } from '@/components/shared/main-nav';
import { SiteFooter } from '@/components/shared/site-footer';

// Fraunces — display serif (Murdock / Hawthorne pairing).
// SOFT axis pushed at large sizes for warmth.
const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
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
  themeColor: '#F4EFE5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt" className={`${fraunces.variable} ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <MainNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
