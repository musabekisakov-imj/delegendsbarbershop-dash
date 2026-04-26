'use client';

// Client-side translation hook + provider.
// Reads the cookie on mount, exposes setLang() that writes the cookie
// and refreshes the route so server components re-render with the new dict.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dict, type Lang, type Translations, LANGS } from '@/i18n';
import { LANG_COOKIE } from './lang-cookie';

interface Ctx {
  lang: Lang;
  t: Translations;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<Ctx | null>(null);

export function LangProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const router = useRouter();

  // Re-sync from the cookie on mount (in case server-side cookie missed it).
  useEffect(() => {
    const cookieValue = readCookie(LANG_COOKIE);
    if (cookieValue && (LANGS as readonly string[]).includes(cookieValue)) {
      setLangState(cookieValue as Lang);
    }
  }, []);

  const setLang = useCallback(
    (l: Lang) => {
      writeCookie(LANG_COOKIE, l);
      setLangState(l);
      // Re-render server components so SSR'd dicts (server pages) update too.
      router.refresh();
    },
    [router],
  );

  return (
    <LangContext.Provider value={{ lang, t: dict(lang), setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useT(): Translations {
  const ctx = useContext(LangContext);
  return ctx?.t ?? dict('lt');
}

export function useLang(): { lang: Lang; setLang: (l: Lang) => void } {
  const ctx = useContext(LangContext);
  return {
    lang: ctx?.lang ?? 'lt',
    setLang: ctx?.setLang ?? (() => {}),
  };
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  // 1-year cookie. Path / so all routes see it.
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}
