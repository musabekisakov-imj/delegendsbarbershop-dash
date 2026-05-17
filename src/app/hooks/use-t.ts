import { useCallback } from 'react';
import { useLanguageStore } from '../store/language-store';
import type { Language } from '../types';
import { translations, type TranslationKey } from '../i18n';
import type { TimeFormat } from '../lib/time';

export function useT(): (key: TranslationKey, vars?: Record<string, string | number>) => string {
  const language = useLanguageStore(s => s.language);
  return useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const base = translations[language]?.[key] ?? translations.en[key] ?? key;
      if (!vars) return base;
      return base.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
    },
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

import type { TimeGranularity, BreakCutMode, Density } from '../store/language-store';
export function useTimeGranularity(): [TimeGranularity, (g: TimeGranularity) => void] {
  const timeGranularity = useLanguageStore(s => s.timeGranularity);
  const setTimeGranularity = useLanguageStore(s => s.setTimeGranularity);
  return [timeGranularity, setTimeGranularity];
}

export function useBreakCutMode(): [BreakCutMode, (m: BreakCutMode) => void] {
  const breakCutMode = useLanguageStore(s => s.breakCutMode);
  const setBreakCutMode = useLanguageStore(s => s.setBreakCutMode);
  return [breakCutMode, setBreakCutMode];
}

export function useDensity(): [Density, (d: Density) => void] {
  const density = useLanguageStore(s => s.density);
  const setDensity = useLanguageStore(s => s.setDensity);
  return [density, setDensity];
}

import type { CalendarGridDensity } from '../store/language-store';
export function useCalendarGridDensity(): [CalendarGridDensity, (d: CalendarGridDensity) => void] {
  const v = useLanguageStore(s => s.calendarGridDensity);
  const set = useLanguageStore(s => s.setCalendarGridDensity);
  return [v, set];
}

export function useWeekViewStaffId(): [string | null, (id: string | null) => void] {
  const v = useLanguageStore(s => s.weekViewStaffId);
  const set = useLanguageStore(s => s.setWeekViewStaffId);
  return [v, set];
}
