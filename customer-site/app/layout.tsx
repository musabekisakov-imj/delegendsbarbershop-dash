import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { MainNav } from '@/components/shared/main-nav';
import { SiteFooter } from '@/components/shared/site-footer';
import { CookieBanner } from '@/components/shared/cookie-banner';

// Plus Jakarta Sans — exact pairing with the staff dashboard.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default: 'Kirpykla Vilnius',
    template: '%s · Kirpykla Vilnius',
  },
  description: 'Du salonai Vilniuje. Patyrę meistrai. Užsisakykite vizitą per minutę.',
  openGraph: {
    type: 'website',
    locale: 'lt_LT',
    siteName: 'Kirpykla Vilnius',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt" className={`${jakarta.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <MainNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  );
}
