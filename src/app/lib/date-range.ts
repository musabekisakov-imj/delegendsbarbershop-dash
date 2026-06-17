import {
  startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, subMonths,
  differenceInDays,
} from 'date-fns';

export type RangePreset = 'today' | 'this-week' | 'this-month' | '90d' | '12m' | '365d';

// How the revenue chart buckets the range. Derived from span, not the preset,
// so a custom range would bucket sensibly too.
export type Granularity = 'hour' | 'day' | 'month';

export interface DateRange {
  start: Date;
  end: Date;
  preset: RangePreset;
}

// Weeks start Monday — the shop and both non-English locales (ru, lt) treat
// Monday as the first working day.
const WEEK_OPTS = { weekStartsOn: 1 as const };

export function getPresetRange(preset: RangePreset): DateRange {
  const now = new Date();
  const end = endOfDay(now);
  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end, preset };
    case 'this-week':
      return { start: startOfWeek(now, WEEK_OPTS), end, preset };
    case 'this-month':
      return { start: startOfMonth(now), end, preset };
    case '90d':
      return { start: startOfDay(subDays(now, 89)), end, preset };
    case '12m':
      return { start: startOfMonth(subMonths(now, 11)), end, preset };
    case '365d':
      return { start: startOfDay(subDays(now, 364)), end, preset };
  }
}

// Returns the preceding equal-length window for comparison (delta %).
// Calendar-aligned presets (week, month) compare against the previous
// calendar week/month; rolling windows compare against the prior span.
export function getPreviousRange(range: DateRange): { start: Date; end: Date } {
  const { start, end, preset } = range;
  if (preset === 'this-month') {
    const prevMonthEnd = subDays(start, 1);
    return { start: startOfMonth(prevMonthEnd), end: prevMonthEnd };
  }
  if (preset === 'this-week') {
    const prevWeekEnd = subDays(start, 1);
    return { start: startOfWeek(prevWeekEnd, WEEK_OPTS), end: prevWeekEnd };
  }
  const days = differenceInDays(end, start) + 1;
  return {
    start: startOfDay(subDays(start, days)),
    end: startOfDay(subDays(start, 1)),
  };
}

// Chart bucket size per preset:
//   Today              → hourly
//   This week / month / 90d → daily
//   12 months / 365 days    → monthly
// Driven by preset rather than raw span: early in the week "This week" spans
// only 2–3 days, which a span threshold would misread as hourly.
export function getGranularity(range: DateRange): Granularity {
  switch (range.preset) {
    case 'today':
      return 'hour';
    case '12m':
    case '365d':
      return 'month';
    default:
      return 'day';
  }
}
