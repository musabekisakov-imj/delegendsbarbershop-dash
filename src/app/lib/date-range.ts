import { startOfDay, endOfDay, subDays, startOfMonth, differenceInDays } from 'date-fns';

export type RangePreset = '7d' | '30d' | '90d' | 'this-month';

export interface DateRange {
  start: Date;
  end: Date;
  preset: RangePreset;
}

export function getPresetRange(preset: RangePreset): DateRange {
  const now = new Date();
  const end = endOfDay(now);
  switch (preset) {
    case '7d':
      return { start: startOfDay(subDays(now, 6)), end, preset };
    case '30d':
      return { start: startOfDay(subDays(now, 29)), end, preset };
    case '90d':
      return { start: startOfDay(subDays(now, 89)), end, preset };
    case 'this-month':
      return { start: startOfMonth(now), end, preset };
  }
}

// Returns the preceding equal-length window for comparison (delta %).
export function getPreviousRange(range: DateRange): { start: Date; end: Date } {
  const { start, end } = range;
  if (range.preset === 'this-month') {
    const prevMonthEnd = subDays(start, 1);
    return { start: startOfMonth(prevMonthEnd), end: prevMonthEnd };
  }
  const days = differenceInDays(end, start) + 1;
  return {
    start: startOfDay(subDays(start, days)),
    end: startOfDay(subDays(start, 1)),
  };
}
