import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { MainNav } from '@/components/shared/main-nav';
import { SiteFooter } from '@/components/shared/site-footer';

export const metadata: Metadata = {
  title: {
    default: 'Kirpykla Vilnius — vyriški kirpimai',
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
  themeColor: '#F4F1EA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <MainNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
