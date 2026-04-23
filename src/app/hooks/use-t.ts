import { useCallback } from 'react';
import { useLanguageStore } from '../store/language-store';
import type { Language } from '../types';
import { translations, type TranslationKey } from '../i18n';
import type { TimeFormat } from '../lib/time';

export function useT(): (key: TranslationKey) => string {
  const language = useLanguageStore(s => s.language);
  return useCallback(
    (key: TranslationKey) => translations[language]?.[key] ?? translations.en[key] ?? key,
    [language],
  );
}

export function useLanguage(): [Language, (lang: Language) => void] {
  const language = useLanguageStore(s => s.language);
  const setLanguage = useLanguageStore(s => s.setLanguage);
  return [language, setLanguage];
}

export function useTimeFormat(): [TimeFormat, (fmt: TimeFormat) => void] {
  const timeFormat = useLanguageStore(s => s.timeFormat);
  const setTimeFormat = useLanguageStore(s => s.setTimeFormat);
  return [timeFormat, setTimeFormat];
}
