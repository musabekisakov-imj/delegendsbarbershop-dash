import { useLanguageStore } from '../store/language-store';
import { enUS, ru, lt } from 'date-fns/locale';
import type { Locale } from 'date-fns';

const LOCALE_MAP: Record<string, Locale> = { en: enUS, ru, lt };

/** Returns the date-fns locale matching the active language setting. */
export function useDateLocale(): Locale {
  const language = useLanguageStore(s => s.language);
  return LOCALE_MAP[language] ?? enUS;
}
