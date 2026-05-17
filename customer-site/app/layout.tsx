import type { Metadata, Viewport } from 'next';
import { Manrope, Cormorant_Garamond } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { MainNav } from '@/components/shared/main-nav';
import { SiteFooter } from '@/components/shared/site-footer';
import { CookieBanner } from '@/components/shared/cookie-banner';
import { LocalBusinessJsonLd } from '@/components/shared/local-business-json-ld';
import { Providers } from './providers';
import { getServerLang, getServerT } from '@/lib/i18n';

// Manrope ships Cyrillic so RU readers get the same display register as LT/EN
// (Plus Jakarta Sans had no Cyrillic subset and silently fell back to system).
const manrope = Manrope({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-display',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://delegendsbarbershop.lt';

export async function generateMetadata(): Promise<Metadata> {
  const t = getServerT();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.title, template: `%s · ${t.meta.title}` },
    description: t.meta.description,
    openGraph: {
      type: 'website',
      locale: getServerLang() === 'en' ? 'en_US' : getServerLang() === 'ru' ? 'ru_RU' : 'lt_LT',
      siteName: t.meta.title,
    },
    twitter: { card: 'summary_large_image' },
    icons: {
      icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = getServerLang();
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const plausibleSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? 'https://plausible.io/js/script.js';
  return (
    <html lang={lang} className={`${manrope.variable} ${cormorant.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        {/* Skip-to-content — invisible until keyboard-focused, then a lime
            chip the user can hit Enter on to jump past the nav. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:font-semibold focus:text-sm"
        >
          {lang === 'ru' ? 'К содержимому' : lang === 'en' ? 'Skip to content' : 'Į turinį'}
        </a>
        <Providers initialLang={lang}>
          <MainNav />
          <main id="main" className="flex-1">{children}</main>
          <SiteFooter />
          <CookieBanner />
        </Providers>
        <LocalBusinessJsonLd />
        {plausibleDomain && (
          <script
            defer
            data-domain={plausibleDomain}
            src={plausibleSrc}
          />
        )}
      </body>
    </html>
  );
}
