import { useMemo, useState } from 'react';
import type React from 'react';
import { parseISO, differenceInMinutes } from 'date-fns';
import {
  PlusIcon, CalendarIcon, WrenchScrewdriverIcon,
  CheckCircleIcon, XCircleIcon, EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { cn } from '../ui/utils';
import { formatTime } from '../../lib/time';
import { formatDuration } from '../../lib/format';
import { useT, useTimeFormat, useLanguage } from '../../hooks/use-t';
import { StatusPill, type DerivedStatus } from '../shared/status-pill';
import { formatPrice } from '../../lib/format';
import type { AppointmentWithDetails, Break } from '../../types';

interface StaffMeta {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface DayAgendaProps {
  appointments: AppointmentWithDetails[];
  activeStaff: StaffMeta[];
  breaksByStaff: Map<string, Break[]>;
  staffColorMap: Map<string, number>;
  staffColors: {
    light: string; label: string; dot: string;
    border: string; bg: string; text: string; sub: string; ring: string;
  }[];
  statusMap: Record<string, { label: string; cls: string }>;
  forcedStaffId?: string | null;
  onSelect: (a: AppointmentWithDetails) => void;
  onCreate?: () => void;
  onQuickAction?: (aptId: string, action: 'complete' | 'no_show' | 'cancel') => void;
  renderTileHoverCard?: (apt: AppointmentWithDetails) => React.ReactNode;
}

type Bucket = 'morning' | 'afternoon' | 'evening';
const BUCKET_FOR_HOUR = (h: number): Bucket => (h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening');

const DAY_FILTER_KEY = 'calendar.dayView.staffFilter';
function readDayFilter(): string | null {
  try { return localStorage.getItem(DAY_FILTER_KEY); } catch { return null; }
}
function writeDayFilter(v: string | null) {
  try {
    if (v === null) localStorage.removeItem(DAY_FILTER_KEY);
    else localStorage.setItem(DAY_FILTER_KEY, v);
  } catch {}
}

function getDerivedStatus(apt: AppointmentWithDetails, now: Date): DerivedStatus {
  if (apt.status !== 'scheduled' && apt.status !== 'confirmed') return apt.status;
  if (parseISO(apt.endTime) < now) return 'missed';
  return apt.status;
}

// Boundaries for each section transition: [windowStart, windowEnd, fallbackLabel]
const BREAK_WINDOWS: Record<string, [string, string]> = {
  morning:   ['10:30', '14:00'], // lunch — between morning and afternoon
  afternoon: ['15:30', '19:00'], // dinner/rest — between afternoon and evening
};

// Find a shared break window where ≥50% of visible staff have a break
// in the given time range. Returns the representative time label + count.
function findBreakWindow(
  breaksByStaff: Map<string, Break[]>,
  visibleIds: string[],
  afterBucket: 'morning' | 'afternoon',
): { timeLabel: string; staffCount: number } | null {
  if (visibleIds.length === 0) return null;
  const [winStart, winEnd] = BREAK_WINDOWS[afterBucket];
  const staffWithBreak: string[] = [];
  const timeLabels: string[] = [];
  for (const id of visibleIds) {
    const brks = breaksByStaff.get(id) ?? [];
    const brk = brks.find(b => b.startTime >= winStart && b.startTime <= winEnd);
    if (brk) {
      staffWithBreak.push(id);
      timeLabels.push(`${brk.startTime}–${brk.endTime}`);
    }
  }
  if (staffWithBreak.length === 0) return null;
  return { timeLabel: timeLabels[0] ?? winStart, staffCount: staffWithBreak.length };
}

export function DayAgenda({
  appointments, activeStaff, breaksByStaff, staffColorMap, staffColors,
  statusMap, forcedStaffId, onSelect, onCreate, onQuickAction, renderTileHoverCard,
}: DayAgendaProps) {
  const t = useT();
  const [timeFormat] = useTimeFormat();
  const [language] = useLanguage();
  const now = useMemo(() => new Date(), []);
  void statusMap;

  // Staff filter — locked to forcedStaffId when set (grid focus mode).
  const [dayFilter, setDayFilter] = useState<string | null>(() => {
    if (forcedStaffId) return forcedStaffId;
    return readDayFilter();
  });

  const activeFilter = forcedStaffId ?? dayFilter;

  function setFilter(id: string | null) {
    setDayFilter(id);
    writeDayFilter(id);
  }

  // Per-staff count for the chip badges.
  const countByStaff = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of appointments) m.set(a.staffId, (m.get(a.staffId) ?? 0) + 1);
    return m;
  }, [appointments]);

  // Filtered appointments.
  const filtered = useMemo(() =>
    activeFilter ? appointments.filter(a => a.staffId === activeFilter) : appointments,
    [appointments, activeFilter],
  );

  const grouped = useMemo(() => {
    const byBucket: Record<Bucket, AppointmentWithDetails[]> = {
      morning: [], afternoon: [], evening: [],
    };
    const sorted = [...filtered].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (const a of sorted) {
      byBucket[BUCKET_FOR_HOUR(parseISO(a.startTime).getHours())].push(a);
    }
    return byBucket;
  }, [filtered]);

  const visibleIds = activeFilter ? [activeFilter] : activeStaff.map(s => s.id);
  const visibleIdsKey = visibleIds.join(',');
  const breakWindows = useMemo(() => ({
    morning:   findBreakWindow(breaksByStaff, visibleIds, 'morning'),
    afternoon: findBreakWindow(breaksByStaff, visibleIds, 'afternoon'),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [breaksByStaff, visibleIdsKey]);

  // Empty state — no apts at all.
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <CalendarIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">{t('calendar.noAppointments')}</p>
        <p className="mt-1 text-xs text-muted-foreground">Your day is clear — create the first booking below</p>
        {onCreate && (
          <Button size="sm" className="mt-4" onClick={onCreate}>
            <PlusIcon className="mr-1.5 h-4 w-4" />
            New appointment
          </Button>
        )}
      </div>
    );
  }

  const buckets: { key: Bucket; label: string }[] = [
    { key: 'morning', label: t('calendar.morning') },
    { key: 'afternoon', label: t('calendar.afternoon') },
    { key: 'evening', label: t('calendar.evening') },
  ];

  const staffChips = activeStaff.filter(s => (countByStaff.get(s.id) ?? 0) > 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Staff filter chips — hidden when focus mode locks to one staff */}
      {!forcedStaffId && staffChips.length > 1 && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border overflow-x-auto">
          {/* All chip */}
          <button
            type="button"
            onClick={() => setFilter(null)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold whitespace-nowrap transition-colors',
              activeFilter === null
                ? 'bg-foreground text-background'
                : 'border border-border text-foreground hover:bg-accent',
            )}
          >
            All
            <span className={cn(
              'tabular-nums',
              activeFilter === null ? 'text-background/60' : 'text-muted-foreground',
            )}>
              {appointments.length}
            </span>
          </button>

          {staffChips.map(s => {
            const colorIdx = staffColorMap.get(s.id) ?? 0;
            const c = staffColors[colorIdx % staffColors.length];
            const cnt = countByStaff.get(s.id) ?? 0;
            const active = activeFilter === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setFilter(active ? null : s.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-foreground text-background'
                    : 'border border-border text-foreground hover:bg-accent',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full shrink-0', active ? 'bg-background/70' : c.dot)} />
                {s.firstName}
                <span className={cn(
                  'tabular-nums',
                  active ? 'text-background/60' : 'text-muted-foreground',
                )}>
                  {cnt}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sections */}
      <div className="divide-y divide-border">
        {buckets.map((b, bi) => {
          const items = grouped[b.key];
          void bi;
          const sep = (b.key === 'morning' || b.key === 'afternoon')
            ? breakWindows[b.key]
            : null;
          const showSep = sep !== null && items.length > 0;

          if (items.length === 0 && !showSep) return null;

          return (
            <section key={b.key} className="px-4 py-3">
              {items.length > 0 && (
                <h3 className="mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {b.label}
                  <span className="ml-2 font-normal normal-case text-muted-foreground/60">{items.length}</span>
                </h3>
              )}

              <ul className="space-y-1">
                {items.map(apt => {
                  const colorIdx = staffColorMap.get(apt.staffId) ?? 0;
                  const c = staffColors[colorIdx % staffColors.length];
                  const start = parseISO(apt.startTime);
                  const end = parseISO(apt.endTime);
                  const dur = differenceInMinutes(end, start);
                  const derived = getDerivedStatus(apt, now);
                  const isPast = end < now;
                  const isMissed = derived === 'missed';
                  const isCancelled = apt.status === 'cancelled';

                  const rowContent = (
                    <div className={cn(
                      'flex w-full items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5 text-left transition-colors hover:bg-accent/30',
                      (isPast || isCancelled) && 'opacity-50',
                    )}>
                        {/* Time — 60px fixed */}
                        <button
                          onClick={() => onSelect(apt)}
                          className="w-[60px] shrink-0 tabular-nums text-[12px] font-semibold text-foreground text-left focus-visible:outline-none"
                        >
                          {formatTime(start, timeFormat)}
                        </button>

                        {/* Staff avatar */}
                        <button onClick={() => onSelect(apt)} className="shrink-0 focus-visible:outline-none">
                          <Avatar className="h-7 w-7">
                            {apt.staff.avatarUrl && <AvatarImage src={apt.staff.avatarUrl} alt={apt.staff.firstName} />}
                            <AvatarFallback className={cn('text-[9px] font-bold', c.light, c.label)}>
                              {apt.staff.firstName[0]}{apt.staff.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                        </button>

                        {/* Client name + service */}
                        <button
                          onClick={() => onSelect(apt)}
                          className="flex-1 min-w-0 text-left focus-visible:outline-none"
                        >
                          <p className={cn(
                            'text-sm font-semibold text-foreground truncate',
                            isCancelled && 'line-through',
                          )}>
                            {apt.client.firstName} {apt.client.lastName}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {apt.service.name} · {formatDuration(dur)}
                          </p>
                        </button>

                        {/* Status pill — full opacity even on past rows */}
                        <div className="shrink-0 opacity-100" style={{ opacity: 1 }}>
                          {isMissed && onQuickAction ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="focus-visible:outline-none"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <StatusPill status="missed" size="sm" className="cursor-pointer hover:opacity-80 transition-opacity" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-[200px] p-1.5">
                                <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  Close this booking
                                </p>
                                <button
                                  type="button"
                                  onClick={() => onQuickAction(apt.id, 'complete')}
                                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                                >
                                  <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                                  Mark as completed
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onQuickAction(apt.id, 'no_show')}
                                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                                >
                                  <EllipsisHorizontalIcon className="h-4 w-4 text-amber-500" />
                                  Mark as no-show
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onQuickAction(apt.id, 'cancel')}
                                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                >
                                  <XCircleIcon className="h-4 w-4" />
                                  Cancel
                                </button>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <button onClick={() => onSelect(apt)} className="focus-visible:outline-none">
                              <StatusPill status={derived} size="sm" />
                            </button>
                          )}
                        </div>

                        {/* Price */}
                        <button
                          onClick={() => onSelect(apt)}
                          className="hidden sm:block shrink-0 w-[42px] text-right text-[13px] font-medium tabular-nums text-foreground focus-visible:outline-none"
                        >
                          {formatPrice(apt.service.price, language)}
                        </button>
                      </div>
                  );

                  return (
                    <li key={apt.id}>
                      {renderTileHoverCard ? (
                        <HoverCard openDelay={320} closeDelay={120}>
                          <HoverCardTrigger asChild>
                            {rowContent}
                          </HoverCardTrigger>
                          {renderTileHoverCard(apt)}
                        </HoverCard>
                      ) : rowContent}
                    </li>
                  );
                })}
              </ul>

              {/* Break separator — lunch after morning, dinner/rest after afternoon */}
              {showSep && (
                <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-orange-200 dark:border-orange-900/50 px-3 py-2.5"
                  style={{
                    background: 'repeating-linear-gradient(135deg, transparent, transparent 6px, rgb(255 237 213 / 0.5) 6px, rgb(255 237 213 / 0.5) 12px)',
                  }}
                >
                  <WrenchScrewdriverIcon className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
                  <span className="flex-1 text-[11px] font-medium text-orange-700 dark:text-orange-300">
                    {sep!.timeLabel} · {b.key === 'morning' ? 'Lunch break' : 'Dinner break'}
                  </span>
                  <span className="text-[11px] font-medium text-orange-600 dark:text-orange-400 tabular-nums shrink-0">
                    {sep!.staffCount} staff
                  </span>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
