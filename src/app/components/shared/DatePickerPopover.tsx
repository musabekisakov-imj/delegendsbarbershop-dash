import { useState } from 'react';
import { startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '../ui/utils';
import { useT } from '../../hooks/use-t';

interface DatePickerPopoverProps {
  value: Date;
  onChange: (date: Date) => void;
  locale: string;
  // 'week' highlights the whole Mon–Sun week containing `value` as one bar;
  // clicking any day still reports that day (the caller snaps it to a week).
  selectionMode?: 'day' | 'week';
}

const WEEK_OPTS = { weekStartsOn: 1 } as const;

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
function isSameCalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DatePickerPopover({ value, onChange, locale, selectionMode = 'day' }: DatePickerPopoverProps) {
  const t = useT();
  const [cursor, setCursor] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const today = new Date();

  // Mon–Sun bounds of the selected week (only used in 'week' mode).
  const weekStart = startOfWeek(value, WEEK_OPTS);
  const weekEnd = endOfWeek(value, WEEK_OPTS);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  // Localized month + year heading
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(cursor);

  // Mon-start day-of-week labels (3-letter, localized)
  const dowLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i); // 2024-01-01 is Monday
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
  });

  // Leading empty cells (Mon = 0 week start)
  const firstDow = startOfMonth(cursor).getDay(); // 0=Sun
  const leadingEmpty = (firstDow + 6) % 7;        // shift Sun→Mon

  const totalDays = daysInMonth(cursor);

  const cells: (number | null)[] = [
    ...Array(leadingEmpty).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));

  return (
    <div className="w-[272px] select-none">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          aria-label={t('common.previousMonth')}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground capitalize">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          aria-label={t('common.nextMonth')}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 mb-1">
        {dowLabels.map(label => (
          <div key={label} className="h-8 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {label.slice(0, 2)}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} />;

          const cellDate = new Date(year, month, day);
          const isTodayCell = isSameCalDay(cellDate, today);

          // In week mode every day of the selected week lights up as one
          // contiguous bar — rounded only at the Mon and Sun ends.
          const inWeek = selectionMode === 'week' && cellDate >= weekStart && cellDate <= weekEnd;
          const isSelected = selectionMode === 'week'
            ? inWeek
            : isSameCalDay(cellDate, value);
          const isWeekStart = inWeek && isSameCalDay(cellDate, weekStart);
          const isWeekEnd = inWeek && isSameCalDay(cellDate, weekEnd);

          return (
            <button
              key={day}
              type="button"
              onClick={() => onChange(cellDate)}
              className={cn(
                'relative h-8 w-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                selectionMode === 'week'
                  ? cn(
                      'rounded-none',
                      isWeekStart && 'rounded-l-md',
                      isWeekEnd && 'rounded-r-md',
                      inWeek ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent rounded-md',
                    )
                  : cn(
                      'rounded-md',
                      isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent',
                    ),
              )}
              aria-pressed={isSelected}
              aria-label={cellDate.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
            >
              {day}
              {/* Today dot */}
              {isTodayCell && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
