import type { Language } from '../types';

const LOCALE_MAP: Record<Language, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  lt: 'lt-LT',
};

const rulesCache = new Map<string, Intl.PluralRules>();

function getRules(locale: string): Intl.PluralRules {
  let r = rulesCache.get(locale);
  if (!r) {
    r = new Intl.PluralRules(locale);
    rulesCache.set(locale, r);
  }
  return r;
}

/** Returns the CLDR plural category for `count` in `language`. */
export function pluralKey(count: number, language: Language): 'one' | 'few' | 'many' | 'other' {
  const locale = LOCALE_MAP[language] ?? 'en-US';
  const form = getRules(locale).select(count);
  if (form === 'one' || form === 'few' || form === 'many') return form;
  return 'other';
}
