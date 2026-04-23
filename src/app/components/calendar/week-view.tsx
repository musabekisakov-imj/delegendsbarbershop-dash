import { useEffect, useMemo, useRef } from 'react';
import {
  addDays, differenceInMinutes, format, isSameDay, isToday, parseISO, startOfDay, startOfWeek,
} from 'date-fns';
import { cn } from '../ui/utils';
import { formatTime, formatHourLabel } from '../../lib/time';
import { assignLanes } from '../../lib/calendar-lanes';
import { useT, useTimeFormat } from '../../hooks/use-t';
import { useLanguageStore } from '../../store/language-store';
import type { AppointmentWithDetails } from '../../types';
import type { TranslationKey } from '../../i18n';

interface WeekViewProps {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  appointments: AppointmentWithDetails[];
  staffColorMap: Map<string, number>;
  staffColors: {
    light: string;
    label: string;
    dot: string;
    border: string;
    bg: string;
    text: string;
    sub: string;
    ring: string;
  }[];
  onSelectApt: (a: AppointmentWithDetails) => void;
  dayStartHour: number;
  dayEndHour: number;
  slotHeight: number;
}

const SHORT_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export function WeekView({
  selectedDate, onSelectDate, appointments, staffColorMap, staffColors,
  onSelectApt, dayStartHour, dayEndHour, slotHeight,
}: WeekViewProps) {
  const t = useT();
  const [timeFormat] = useTimeFormat();
  const language = useLanguageStore(s => s.language);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);

  // English = Sunday start, RU/LT = Monday (ISO)
  const weekStartsOn: 0 | 1 = language === 'en' ? 0 : 1;
  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn }),
    [selectedDate, weekStartsOn],
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const totalSlots = dayEndHour - dayStartHour;
  const hours = Array.from({ length: totalSlots + 1 }, (_, i) => dayStartHour + i);
  const gridH = totalSlots * slotHeight;
  const minutesPerSlot = 60;

  // Group appointments per day + lane assignment
  const perDay = useMemo(() => {
    const map = new Map<string, { appts: AppointmentWithDetails[]; lanes: ReturnType<typeof assignLanes> }>();
    for (const d of days) {
      const key = format(d, 'yyyy-MM-dd');
      const dayAppts = appointments.filter(a => format(parseISO(a.startTime), 'yyyy-MM-dd') === key);
      map.set(key, { appts: dayAppts, lanes: assignLanes(dayAppts) });
    }
    return map;
  }, [appointments, days]);

  const now = new Date();
  const nowMin = (now.getHours() - dayStartHour) * 60 + now.getMinutes();
  const showNow = nowMin >= 0 && nowMin <= totalSlots * 60;
  const todayIdx = days.findIndex(d => isToday(d));

  // Reset manual-scroll flag on week change
  useEffect(() => { userScrolledRef.current = false; }, [weekStart.toISOString()]);

  // Auto-scroll to current time when the week contains today
  useEffect(() => {
    if (!scrollRef.current || todayIdx === -1 || userScrolledRef.current) return;
    const targetTop = (nowMin / minutesPerSlot) * slotHeight - scrollRef.current.clientHeight / 3;
    scrollRef.current.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }, [weekStart.toISOString(), todayIdx, nowMin, slotHeight]);

  const TIME_GUTTER_W = 56;
  const DAY_COL_MIN_W = 120;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={() => { userScrolledRef.current = true; }}
        className="overflow-auto"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {/* Sticky day header */}
        <div className="sticky top-0 z-20 flex border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="shrink-0 border-r border-border" style={{ width: `${TIME_GUTTER_W}px` }} />
          {days.map((d, i) => {
            const td = isToday(d);
            const sel = isSameDay(d, selectedDate);
            const shortKey = SHORT_KEYS[d.getDay()];
            const dayLabel = t(`days.short.${shortKey}` as TranslationKey);
            return (
              <button
                key={d.toISOString()}
                onClick={() => onSelectDate(startOfDay(d))}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 px-2 py-2.5 transition-colors',
                  i < 6 && 'border-r border-border',
                  sel ? 'bg-accent' : 'hover:bg-accent/40',
                )}
                style={{ minWidth: `${DAY_COL_MIN_W}px` }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {dayLabel}
                </span>
                <span className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold tabular-nums',
                  td ? 'bg-blue-600 text-white'
                    : sel ? 'bg-foreground text-background'
                    : 'text-foreground',
                )}>
                  {format(d, 'd')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grid body */}
        <div className="relative flex" style={{ height: `${gridH}px` }}>
          {/* Time gutter */}
          <div
            className="sticky left-0 z-10 shrink-0 border-r border-border bg-card"
            style={{ width: `${TIME_GUTTER_W}px` }}
          >
            {hours.map((hr, i) => (
              <div
                key={hr}
                className="absolute left-0 right-0 pr-2 flex justify-end"
                style={{ top: `${i * slotHeight}px` }}
              >
                <span className="relative -top-2 text-[10px] font-medium text-muted-foreground tabular-nums select-none leading-none">
                  {formatHourLabel(hr, timeFormat)}
                </span>
              </div>
            ))}

            {showNow && todayIdx !== -1 && (
              <div
                className="absolute left-0 right-0 z-20 flex justify-end pr-0.5"
                style={{ top: `${(nowMin / minutesPerSlot) * slotHeight}px` }}
              >
                <span className="relative -top-[7px] rounded bg-red-500 px-1 py-px text-[9px] font-bold text-white tabular-nums leading-none">
                  {formatTime(now, timeFormat)}
                </span>
              </div>
            )}
          </div>

          {/* Day columns */}
          {days.map((d, ci) => {
            const key = format(d, 'yyyy-MM-dd');
            const bucket = perDay.get(key);
            const td = isToday(d);
            return (
              <div
                key={key}
                className={cn('relative flex-1', ci < 6 && 'border-r border-border')}
                style={{ minWidth: `${DAY_COL_MIN_W}px` }}
              >
                {/* Hour grid lines */}
                {hours.map((hr, i) => (
                  <div
                    key={hr}
                    className="absolute left-0 right-0 border-t border-border/50"
                    style={{ top: `${i * slotHeight}px` }}
                  />
                ))}

                {/* Appointments */}
                {bucket?.appts.map(apt => {
                  const start = parseISO(apt.startTime);
                  const end = parseISO(apt.endTime);
                  const sMin = (start.getHours() - dayStartHour) * 60 + start.getMinutes();
                  const dur = differenceInMinutes(end, start);
                  const top = (sMin / minutesPerSlot) * slotHeight;
                  const h = Math.max((dur / minutesPerSlot) * slotHeight - 2, 32);
                  const lane = bucket.lanes.get(apt.id);
                  const laneCount = lane?.laneCount ?? 1;
                  const laneIdx = lane?.lane ?? 0;
                  const lanePct = 100 / laneCount;
                  const c = staffColors[(staffColorMap.get(apt.staffId) ?? 0) % staffColors.length];
                  const timeStr = `${formatTime(start, timeFormat)}–${formatTime(end, timeFormat)}`;
                  const tiny = h < 40;

                  return (
                    <button
                      key={apt.id}
                      onClick={ev => { ev.stopPropagation(); onSelectApt(apt); }}
                      className={cn(
                        'absolute rounded-md border-l-[3px] text-left transition-all duration-150 hover:shadow-md hover:-translate-y-px cursor-pointer overflow-hidden z-10',
                        c.bg, c.border,
                        apt.status === 'cancelled' && 'opacity-40',
                      )}
                      style={{
                        top: `${top}px`,
                        height: `${h}px`,
                        left: `calc(${laneIdx * lanePct}% + 2px)`,
                        width: `calc(${lanePct}% - 4px)`,
                      }}
                    >
                      {tiny ? (
                        <div className="flex items-center h-full px-1.5 gap-1">
                          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', c.dot)} />
                          <span className={cn('text-[11px] font-bold truncate', c.text)}>
                            {apt.client.firstName}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full px-1.5 py-1 gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', c.dot)} />
                            <span className={cn('text-[11px] font-bold truncate', c.text)}>
                              {apt.client.firstName} {apt.client.lastName[0]}.
                            </span>
                          </div>
                          <span className={cn('text-[10px] tabular-nums truncate', c.sub)}>{timeStr}</span>
                          <span className={cn('text-[10px] truncate', c.sub)}>{apt.service.name}</span>
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Now line on today's column */}
                {td && showNow && (
                  <div
                    className="pointer-events-none absolute z-30 flex items-center left-0 right-0"
                    style={{ top: `${(nowMin / minutesPerSlot) * slotHeight}px` }}
                  >
                    <div className="h-2 w-2 -translate-x-1 rounded-full bg-red-500 ring-[3px] ring-red-500/15" />
                    <div className="h-[2px] flex-1 bg-red-500/70" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
