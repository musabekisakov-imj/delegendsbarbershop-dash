import { useMemo, useState } from 'react';
import type React from 'react';
import { parseISO, differenceInMinutes } from 'date-fns';
import {
  PlusIcon, CalendarIcon, ClockIcon,
  CheckCircleIcon, XCircleIcon, EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { cn } from '../ui/utils';
import { formatTime } from '../../lib/time';
import type { TimeFormat } from '../../lib/time';
import { formatDuration } from '../../lib/format';
import { useT, useTimeFormat, useLanguage } from '../../hooks/use-t';
import { StatusPill, type DerivedStatus } from '../shared/status-pill';
import { formatPrice } from '../../lib/format';
import type { AppointmentWithDetails, Break, BreakType } from '../../types';

// heroicons has no fork/knife — same inline SVG used in week-view for lunch/dinner breaks
function ForkKnifeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 3v4a3 3 0 0 0 6 0V3" />
      <path d="M8 9v12" />
      <path d="M14 11h3V3c-2 1-3 4-3 8z" fill="currentColor" fillOpacity={0.18} />
      <path d="M17 11v10" />
    </svg>
  );
}

// Format an HH:mm string according to the user's time format preference.
function formatHHMM(hhmm: string | undefined, fmt: TimeFormat): string {
  if (!hhmm || !hhmm.includes(':')) return '–';
  const [h, m] = hhmm.split(':').map(Number);
  return formatTime(new Date(2000, 0, 1, h, m), fmt);
}

// Russian pluralization for staff count.
function pluralizeStaff(n: number, language: string): string {
  if (language === 'ru') {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 19) return `${n} сотрудников`;
    if (mod10 === 1) return `${n} сотрудник`;
    if (mod10 >= 2 && mod10 <= 4) return `${n} сотрудника`;
    return `${n} сотрудников`;
  }
  if (language === 'lt') {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 19) return `${n} darbuotojų`;
    if (mod10 === 1) return `${n} darbuotojas`;
    if (mod10 >= 2 && mod10 <= 9) return `${n} darbuotojai`;
    return `${n} darbuotojų`;
  }
  return `${n} staff`;
}

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

// Section boundaries (local clock hours):
//   Morning   → before 12:00
//   Afternoon → 12:00–17:00
//   Evening   → 17:00 and later
const MORNING_END_HOUR = 12;
const AFTERNOON_END_HOUR = 17;
const BUCKET_FOR_HOUR = (h: number): Bucket =>
  h < MORNING_END_HOUR ? 'morning' : h < AFTERNOON_END_HOUR ? 'afternoon' : 'evening';

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

interface BreakWindow {
  startTime: string;
  endTime: string;
  staffCount: number;
  breakType: BreakType;
  customLabel?: string;
  representativeStaffId: string;
}

// Find a shared break window where at least one visible staff member has a break
// in the given time range. Returns the first matching break's metadata + count.
function findBreakWindow(
  breaksByStaff: Map<string, Break[]>,
  visibleIds: string[],
  afterBucket: 'morning' | 'afternoon',
): BreakWindow | null {
  if (visibleIds.length === 0) return null;
  const [winStart, winEnd] = BREAK_WINDOWS[afterBucket];
  let representative: Break | null = null;
  let staffCount = 0;
  for (const id of visibleIds) {
    const brks = breaksByStaff.get(id) ?? [];
    const brk = brks.find(b => b.startTime >= winStart && b.startTime <= winEnd);
    if (brk) {
      if (!representative) representative = brk;
      staffCount++;
    }
  }
  if (!representative) return null;
  return {
    startTime: representative.startTime,
    endTime: representative.endTime,
    staffCount,
    breakType: representative.type,
    customLabel: representative.customLabel,
    representativeStaffId: representative.staffId,
  };
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

  // "All served" state — every non-cancelled appointment is completed.
  const completedCount = filtered.filter(a => a.status === 'completed').length;
  const activeCount = filtered.filter(a => a.status !== 'cancelled').length;
  const allDone = activeCount > 0 && completedCount === activeCount;

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
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col max-h-[calc(100vh-260px)]">
      {/* Staff filter pills — hidden when focus mode locks to one staff */}
      {!forcedStaffId && staffChips.length > 1 && (
        <div className="relative border-b border-border bg-black/[0.01] dark:bg-white/[0.01]">
          <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-none">

            {/* "All" meta-filter */}
            <button
              type="button"
              onClick={() => setFilter(null)}
              className={cn(
                'inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-bold whitespace-nowrap transition-colors duration-150 cursor-pointer active:scale-[0.97] shrink-0',
                activeFilter === null
                  ? 'bg-foreground text-background shadow-sm'
                  : 'border border-border bg-card text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06]',
              )}
            >
              {t('calendar.filterAll')}
              <span className={cn(
                'rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[11px] tabular-nums font-bold leading-none',
                activeFilter === null ? 'bg-white/25 text-white' : 'bg-black/[0.08] dark:bg-white/10 text-foreground/60',
              )}>
                {appointments.length}
              </span>
            </button>

            <span className="h-5 w-px bg-border shrink-0" aria-hidden />

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
                    'inline-flex h-10 items-center gap-2 rounded-full pl-1.5 pr-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer active:scale-[0.97] shrink-0',
                    active
                      ? cn(c.dot, 'text-white border border-transparent shadow-sm')
                      : 'border border-border bg-card text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06]',
                  )}
                >
                  {/* Avatar — white ring on active so it pops on colored bg */}
                  <div className={cn(
                    'shrink-0 rounded-full p-[2px]',
                    active ? 'bg-white/25' : c.dot,
                  )}>
                    <Avatar className="h-7 w-7 block">
                      {s.avatarUrl && <AvatarImage src={s.avatarUrl} alt={s.firstName} />}
                      <AvatarFallback className={cn('text-[9px] font-bold', c.light, c.label)}>
                        {s.firstName[0]}{s.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span>{s.firstName}</span>
                  <span className={cn(
                    'rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[11px] tabular-nums font-bold leading-none',
                    active ? 'bg-white/25 text-white' : 'bg-black/[0.08] dark:bg-white/10 text-foreground/60',
                  )}>
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-card to-transparent" />
        </div>
      )}

      {/* Sections — scrollable inner zone */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-5">
        {buckets.map((b) => {

          const items = grouped[b.key];
          const sep = (b.key === 'morning' || b.key === 'afternoon')
            ? breakWindows[b.key]
            : null;
          const showSep = sep !== null;

          if (items.length === 0 && !showSep) return null;

          return (
            <section key={b.key}>
              {/* Timeline section divider */}
              {items.length > 0 && (
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">
                    {b.label}
                  </span>
                  <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-border px-1.5 text-[10px] font-bold tabular-nums text-muted-foreground shrink-0">
                    {items.length}
                  </span>
                  <span className="flex-1 h-px bg-border/60" aria-hidden />
                </div>
              )}

              <ul className="space-y-2.5">
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
                  const isCompleted = apt.status === 'completed';

                  const cardInner = (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelect(apt)}
                      onKeyDown={e => e.key === 'Enter' && onSelect(apt)}
                      className={cn(
                        'group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border pl-0 pr-4 py-3.5 text-left cursor-pointer',
                        'shadow-[0_1px_4px_0_rgb(0_0_0/0.05)] hover:shadow-[0_3px_12px_0_rgb(0_0_0/0.09)] dark:hover:shadow-[0_3px_12px_0_rgb(0_0_0/0.25)]',
                        'transition-shadow duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isCompleted
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          : 'bg-card border-border hover:bg-accent/25',
                        (isPast && !isCompleted || isCancelled) && 'opacity-50',
                      )}
                    >
                      {/* Staff-color left accent stripe — green for completed */}
                      <span className={cn('w-1 self-stretch shrink-0 rounded-r-full', isCompleted ? 'bg-emerald-500' : c.dot)} aria-hidden />

                      {/* Staff avatar — wrapper border avoids ring-offset-card artifact */}
                      <div className={cn('shrink-0 rounded-full p-[2px]', isCompleted ? 'bg-emerald-500' : c.dot)}>
                        <Avatar className="h-8 w-8 block">
                          {apt.staff.avatarUrl && <AvatarImage src={apt.staff.avatarUrl} alt={apt.staff.firstName} />}
                          <AvatarFallback className={cn('text-[10px] font-bold', c.light, c.label)}>
                            {apt.staff.firstName[0]}{apt.staff.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Time range column */}
                      <div className="flex w-[72px] shrink-0 flex-col tabular-nums gap-0.5">
                        <span className="text-[12px] font-semibold text-foreground leading-none">
                          {formatTime(start, timeFormat)}
                        </span>
                        <span className="text-[11px] text-muted-foreground leading-none">
                          {formatTime(end, timeFormat)}
                        </span>
                        <span className="mt-0.5 inline-flex w-fit items-center rounded-sm bg-black/[0.08] dark:bg-white/[0.10] px-1.5 py-px text-[9px] font-bold text-foreground/60 tabular-nums">
                          {formatDuration(dur)}
                        </span>
                      </div>

                      {/* Client name + service + staff badge */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-[14px] font-semibold text-foreground truncate leading-tight',
                          isCancelled && 'line-through',
                        )}>
                          {apt.client.firstName} {apt.client.lastName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[11px] text-muted-foreground truncate leading-tight">
                            {apt.service.name}
                          </p>
                          {!activeFilter && (
                            <span className={cn('shrink-0 rounded-md px-1.5 py-px text-[10px] font-semibold leading-tight', c.light, c.label)}>
                              {apt.staff.firstName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status pill — full opacity even on past rows */}
                      <div className="shrink-0" style={{ opacity: 1 }} onClick={e => e.stopPropagation()}>
                        {isMissed && onQuickAction ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className="focus-visible:outline-none">
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
                          <StatusPill status={derived} size="sm" />
                        )}
                      </div>

                      {/* Price */}
                      <div className="hidden sm:flex shrink-0 flex-col items-end gap-0.5">
                        <span className="text-[14px] font-bold tabular-nums text-foreground leading-none">
                          {formatPrice(apt.service.price, language)}
                        </span>
                      </div>
                    </div>
                  );

                  return (
                    <li key={apt.id}>
                      {renderTileHoverCard ? (
                        <HoverCard openDelay={320} closeDelay={120}>
                          <HoverCardTrigger asChild>
                            {cardInner}
                          </HoverCardTrigger>
                          {renderTileHoverCard(apt)}
                        </HoverCard>
                      ) : cardInner}
                    </li>
                  );
                })}
              </ul>

              {/* Break card — diagonal stripe pattern */}
              {showSep && (() => {
                const bw = sep!;
                const BreakIcon = (bw.breakType === 'lunch' || bw.breakType === 'dinner')
                  ? ForkKnifeIcon
                  : ClockIcon;
                const breakLabel = bw.breakType === 'custom' && bw.customLabel
                  ? bw.customLabel
                  : t(`break.${bw.breakType}` as Parameters<typeof t>[0]);
                const repStaff = activeStaff.find(s => s.id === bw.representativeStaffId);
                const staffName = visibleIds.length === 1
                  ? repStaff?.firstName
                  : bw.staffCount > 1
                    ? pluralizeStaff(bw.staffCount, language)
                    : repStaff?.firstName;
                const dur = (() => {
                  const [sh, sm] = (bw.startTime ?? '').split(':').map(Number);
                  const [eh, em] = (bw.endTime ?? '').split(':').map(Number);
                  const mins = (eh * 60 + em) - (sh * 60 + sm);
                  return formatDuration(mins);
                })();
                return (
                  <div
                    className="mt-2.5 overflow-hidden rounded-xl border border-amber-200/60 dark:border-amber-800/40"
                    style={{
                      background: 'repeating-linear-gradient(-45deg, transparent 0, transparent 12px, rgba(251,191,36,0.10) 12px, rgba(251,191,36,0.10) 24px)',
                      backgroundColor: 'rgb(255 251 235 / 0.6)',
                    }}
                  >
                    <div className="flex overflow-hidden rounded-xl">
                      {/* thick amber left stripe */}
                      <span className="w-1.5 shrink-0 bg-amber-400 dark:bg-amber-500" aria-hidden />
                      <div className="flex-1 px-3 py-2.5">
                        {/* top row: icon + staff name + break label */}
                        <div className="flex items-center gap-2">
                          <BreakIcon className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          {staffName && (
                            <span className="text-[13px] font-bold italic text-amber-900 dark:text-amber-200 truncate flex-1">
                              {staffName}
                            </span>
                          )}
                          <span className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                            {breakLabel}
                          </span>
                        </div>
                        {/* bottom row: time range + duration */}
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[12px] font-semibold tabular-nums text-amber-800/80 dark:text-amber-300/80">
                            {formatHHMM(bw.startTime, timeFormat)}–{formatHHMM(bw.endTime, timeFormat)}
                          </span>
                          <span className="text-[12px] font-bold tabular-nums text-amber-700 dark:text-amber-400">
                            {dur}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </section>
          );
        })}

        {/* All-done footer — shown when every non-cancelled appointment is completed */}
        {allDone && (
          <div className="mt-1 mb-1 overflow-hidden rounded-xl border border-emerald-200/70 dark:border-emerald-800/40">
            <div className="relative flex items-center gap-3.5 px-4 py-3.5 bg-emerald-50/80 dark:bg-emerald-950/25">
              <div
                className="absolute inset-0 pointer-events-none rounded-xl"
                style={{ background: 'repeating-linear-gradient(-45deg, transparent 0, transparent 12px, rgba(16,185,129,0.06) 12px, rgba(16,185,129,0.06) 24px)' }}
                aria-hidden
              />
              <div className="relative h-9 w-9 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/30">
                <CheckCircleSolid className="h-5 w-5 text-white" />
              </div>
              <div className="relative flex-1 min-w-0">
                <p className="text-[14px] font-bold text-emerald-800 dark:text-emerald-200 leading-tight">
                  {t('calendar.allDone')}
                </p>
                <p className="text-[12px] text-emerald-700/80 dark:text-emerald-300/70 leading-tight mt-0.5 tabular-nums">
                  {completedCount} {t('calendar.allDoneCount')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
