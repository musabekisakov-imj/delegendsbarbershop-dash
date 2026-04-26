import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { MainNav } from '@/components/shared/main-nav';
import { SiteFooter } from '@/components/shared/site-footer';
import { CookieBanner } from '@/components/shared/cookie-banner';
import { Providers } from './providers';
import { getServerLang, getServerT } from '@/lib/i18n';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = getServerT();
  return {
    title: { default: t.meta.title, template: `%s · ${t.meta.title}` },
    description: t.meta.description,
    openGraph: {
      type: 'website',
      locale: getServerLang() === 'en' ? 'en_US' : getServerLang() === 'ru' ? 'ru_RU' : 'lt_LT',
      siteName: t.meta.title,
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf6' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = getServerLang();
  return (
    <html
      lang={lang}
      className={`${jakarta.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <Providers initialLang={lang}>
          <MainNav />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
