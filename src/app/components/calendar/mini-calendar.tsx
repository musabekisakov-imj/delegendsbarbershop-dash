import { useEffect, useMemo, useState } from 'react';
import {
  addMonths, eachDayOfInterval, endOfMonth, format, getDay,
  isBefore, isSameDay, isSameMonth, isToday, parseISO, startOfDay,
  startOfMonth, subMonths,
} from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '../ui/utils';
import { useT } from '../../hooks/use-t';
import { useLanguageStore } from '../../store/language-store';
import type { AppointmentWithDetails } from '../../types';
import type { TranslationKey } from '../../i18n';

interface MiniCalendarProps {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  appointments: AppointmentWithDetails[];
}

// Sunday-start: 0..6 = Sun..Sat; Monday-start: 0..6 = Mon..Sun
const DAY_KEYS_SUN = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DAY_KEYS_MON = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export function MiniCalendar({ selectedDate, onSelectDate, appointments }: MiniCalendarProps) {
  const t = useT();
  const language = useLanguageStore(s => s.language);
  // English starts Sunday, RU/UZ start Monday (ISO standard).
  const weekStartsOn: 0 | 1 = language === 'en' ? 0 : 1;

  const [viewMonth, setViewMonth] = useState(startOfMonth(selectedDate));

  useEffect(() => {
    if (!isSameMonth(viewMonth, selectedDate)) {
      setViewMonth(startOfMonth(selectedDate));
    }
  }, [selectedDate, viewMonth]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const rawDay = getDay(monthStart); // 0..6 (Sun..Sat)
  const leadingBlanks = (rawDay - weekStartsOn + 7) % 7;
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const aptDates = useMemo(() => {
    const s = new Set<string>();
    appointments.forEach(a => s.add(format(parseISO(a.startTime), 'yyyy-MM-dd')));
    return s;
  }, [appointments]);

  const weekdayKeys = weekStartsOn === 0 ? DAY_KEYS_SUN : DAY_KEYS_MON;

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <button
          onClick={() => setViewMonth(m => subMonths(m, 1))}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
        </button>
        <span className="text-[13px] font-semibold text-foreground">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Next month"
        >
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-0.5">
        {weekdayKeys.map((k, i) => (
          <div key={`${k}-${i}`} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {t(`days.short.${k}` as TranslationKey)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: leadingBlanks }, (_, i) => <div key={`b-${i}`} className="h-7" />)}
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const sel = isSameDay(day, selectedDate);
          const td = isToday(day);
          const has = aptDates.has(key);
          const past = isBefore(day, startOfDay(new Date())) && !td;

          return (
            <button
              key={key}
              onClick={() => onSelectDate(day)}
              className={cn(
                'relative flex items-center justify-center h-7 w-7 mx-auto rounded-full text-[13px] transition-all',
                sel ? 'bg-foreground text-background font-semibold shadow-sm'
                  : td ? 'bg-blue-600 text-white font-semibold'
                  : past ? 'text-muted-foreground/40'
                  : 'text-foreground hover:bg-accent',
              )}
            >
              {format(day, 'd')}
              {has && !sel && !td && (
                <span className="absolute bottom-0 h-[3px] w-[3px] rounded-full bg-muted-foreground" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
