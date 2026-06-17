import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, addDays, addWeeks, addMonths, addYears, isAfter,
} from 'date-fns';

// The owner picks a concrete period and steps through it — not a rolling
// window. Granularity decides the unit; `anchor` is any date inside the
// chosen day / week / month / year (including past periods).
export type Granularity = 'day' | 'week' | 'month' | 'year';

// Weeks run Monday→Sunday — the LT/EU convention this shop uses.
const WEEK_OPTS = { weekStartsOn: 1 } as const;

export interface DateRange {
  start: Date;
  end: Date;
}

// Resolve the [start, end] for the period that `anchor` falls inside.
export function getPeriodRange(granularity: Granularity, anchor: Date): DateRange {
  switch (granularity) {
    case 'day':
      return { start: startOfDay(anchor), end: endOfDay(anchor) };
    case 'week':
      return { start: startOfWeek(anchor, WEEK_OPTS), end: endOfWeek(anchor, WEEK_OPTS) };
    case 'month':
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    case 'year':
      return { start: startOfYear(anchor), end: endOfYear(anchor) };
  }
}

// The preceding period of the same unit — used for the delta % comparison.
export function getPreviousPeriod(granularity: Granularity, anchor: Date): DateRange {
  return getPeriodRange(granularity, shiftAnchor(granularity, anchor, -1));
}

// Move the anchor one unit forward/back (the ‹ › stepper).
export function shiftAnchor(granularity: Granularity, anchor: Date, dir: 1 | -1): Date {
  switch (granularity) {
    case 'day':
      return addDays(anchor, dir);
    case 'week':
      return addWeeks(anchor, dir);
    case 'month':
      return addMonths(anchor, dir);
    case 'year':
      return addYears(anchor, dir);
  }
}

// Block stepping into the future — there's no data past now, and an owner
// reviewing performance never wants an empty forward period.
export function canGoNext(granularity: Granularity, anchor: Date): boolean {
  const next = getPeriodRange(granularity, shiftAnchor(granularity, anchor, 1));
  return !isAfter(next.start, new Date());
}

// Chart bucket size per granularity: a day breaks into hours, a month into
// days, a year into months.
export function bucketUnit(granularity: Granularity): 'hour' | 'day' | 'month' {
  if (granularity === 'day') return 'hour';
  if (granularity === 'week' || granularity === 'month') return 'day';
  return 'month';
}

// Localized label for the period trigger button. A week shows a compact
// range — "12–18 May 2026" — collapsing the parts the two ends share.
export function formatPeriodLabel(granularity: Granularity, anchor: Date, locale: string): string {
  if (granularity === 'week') {
    const start = startOfWeek(anchor, WEEK_OPTS);
    const end = endOfWeek(anchor, WEEK_OPTS);
    const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    return fmt.formatRange(start, end);
  }
  const opts: Intl.DateTimeFormatOptions =
    granularity === 'day' ? { day: 'numeric', month: 'long', year: 'numeric' }
    : granularity === 'month' ? { month: 'long', year: 'numeric' }
    : { year: 'numeric' };
  return new Intl.DateTimeFormat(locale, opts).format(anchor);
}
