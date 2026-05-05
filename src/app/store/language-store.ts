import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '../types';
import type { TranslationKey } from '../i18n';
import { translations } from '../i18n';
import type { TimeFormat } from '../lib/time';

interface PreferencesState {
  language: Language;
  timeFormat: TimeFormat;
  setLanguage: (lang: Language) => void;
  setTimeFormat: (fmt: TimeFormat) => void;
  t: (key: TranslationKey) => string;
}

export const useLanguageStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      language: 'en',
      timeFormat: '12h',

      setLanguage: (lang) => set({ language: lang }),
      setTimeFormat: (fmt) => set({ timeFormat: fmt }),

      t: (key) => {
        const { language } = get();
        return translations[language]?.[key] ?? translations.en[key] ?? key;
      },
    }),
    {
      name: 'barber-dash-prefs',
      version: 2,
      migrate: (persisted: any, version) => {
        if (!persisted) return persisted;
        if (version < 2 && persisted.language === 'uz') {
          return { ...persisted, language: 'lt' };
        }
        return persisted;
      },
      partialize: (state) => ({
        language: state.language,
        timeFormat: state.timeFormat,
      }),
    },
  ),
);
