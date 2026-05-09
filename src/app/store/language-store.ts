import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '../types';
import type { TranslationKey } from '../i18n';
import { translations } from '../i18n';
import type { TimeFormat } from '../lib/time';

// Minute granularity for the TimePickerField — controls how many cells
// the minute grid renders and the smallest selectable interval.
//   1  → 60 cells (every minute)
//   5  → 12 cells
//   10 → 6 cells
//   15 → 4 cells (default — matches calendar grid)
//   30 → 2 cells
//   60 → 1 cell (top-of-hour only)
export type TimeGranularity = 1 | 5 | 10 | 15 | 30 | 60;

// How the break overlay renders when an appointment overlaps it:
//   'vertical'   — break is cut into top/bottom segments around the appointment
//                  (semantically: "barber paused the break to work this slot")
//   'horizontal' — break renders fully behind the appointment as one continuous
//                  block (the operator sees the break "framing" the appointment)
export type BreakCutMode = 'vertical' | 'horizontal';

// Comfort density — bumps small body copy by one step for arm's-length iPad
// reading. Default 'compact' keeps the editorial density; 'comfortable' nudges
// 10/11/12px → 11/12/13px globally via a body class consumed in CSS.
export type Density = 'compact' | 'comfortable';

// Calendar grid column width — drives the staff column min-width. Owners with
// 8+ barbers want all columns visible at once on iPad without horizontal
// scroll; receptionists with 3-5 active barbers prefer the roomier standard
// width. Default 'standard' (200px); 'compact' (110px) fits ~9 columns on
// iPad-portrait without scroll.
export type CalendarGridDensity = 'standard' | 'compact';

interface PreferencesState {
  language: Language;
  timeFormat: TimeFormat;
  timeGranularity: TimeGranularity;
  breakCutMode: BreakCutMode;
  density: Density;
  calendarGridDensity: CalendarGridDensity;
  // Week-view per-staff selection. Week is a single-staff lens (one barber's
  // whole week at a glance); the picker auto-defaults to alphabetically-first
  // when null or when the selected id is no longer active. Persisted so
  // refreshes keep the operator on the same barber.
  weekViewStaffId: string | null;
  setLanguage: (lang: Language) => void;
  setTimeFormat: (fmt: TimeFormat) => void;
  setTimeGranularity: (g: TimeGranularity) => void;
  setBreakCutMode: (m: BreakCutMode) => void;
  setDensity: (d: Density) => void;
  setCalendarGridDensity: (d: CalendarGridDensity) => void;
  setWeekViewStaffId: (id: string | null) => void;
  t: (key: TranslationKey) => string;
}

export const useLanguageStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      language: 'en',
      timeFormat: '12h',
      timeGranularity: 15,
      breakCutMode: 'vertical',
      density: 'compact',
      calendarGridDensity: 'standard',
      weekViewStaffId: null,

      setLanguage: (lang) => set({ language: lang }),
      setTimeFormat: (fmt) => set({ timeFormat: fmt }),
      setTimeGranularity: (g) => set({ timeGranularity: g }),
      setBreakCutMode: (m) => set({ breakCutMode: m }),
      setDensity: (d) => set({ density: d }),
      setCalendarGridDensity: (d) => set({ calendarGridDensity: d }),
      setWeekViewStaffId: (id) => set({ weekViewStaffId: id }),

      t: (key) => {
        const { language } = get();
        return translations[language]?.[key] ?? translations.en[key] ?? key;
      },
    }),
    {
      name: 'barber-dash-prefs',
      version: 7,
      migrate: (persisted: any, version) => {
        if (!persisted) return persisted;
        if (version < 2 && persisted.language === 'uz') {
          persisted = { ...persisted, language: 'lt' };
        }
        if (version < 3 && persisted.timeGranularity === undefined) {
          persisted = { ...persisted, timeGranularity: 15 };
        }
        if (version < 4 && persisted.breakCutMode === undefined) {
          persisted = { ...persisted, breakCutMode: 'vertical' };
        }
        if (version < 5 && persisted.density === undefined) {
          persisted = { ...persisted, density: 'compact' };
        }
        if (version < 6 && persisted.calendarGridDensity === undefined) {
          persisted = { ...persisted, calendarGridDensity: 'standard' };
        }
        if (version < 7 && persisted.weekViewStaffId === undefined) {
          persisted = { ...persisted, weekViewStaffId: null };
        }
        return persisted;
      },
      partialize: (state) => ({
        language: state.language,
        timeFormat: state.timeFormat,
        timeGranularity: state.timeGranularity,
        breakCutMode: state.breakCutMode,
        density: state.density,
        calendarGridDensity: state.calendarGridDensity,
        weekViewStaffId: state.weekViewStaffId,
      }),
    },
  ),
);
