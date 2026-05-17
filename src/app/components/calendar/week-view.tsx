import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  addDays, differenceInMinutes, format, isSameDay, isToday, parseISO,
  startOfDay, startOfWeek,
} from 'date-fns';
import {
  ArrowPathIcon, ClockIcon, EllipsisHorizontalIcon, ExclamationCircleIcon,
  HeartIcon, MoonIcon, PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { Popover, PopoverTrigger } from '../ui/popover';
import { cn } from '../ui/utils';
import { formatTime, formatHourLabel } from '../../lib/time';
import { assignLanes } from '../../lib/calendar-lanes';
import { useT, useTimeFormat } from '../../hooks/use-t';
import { useLanguageStore } from '../../store/language-store';
import { AppointmentWarningPin } from './appointment-warning-pin';
import { getAppointmentWarning } from '../../lib/appointment-warning';
import {
  STATUS_STRIPE, STATUS_LABEL,
  CATEGORY_DOTS, hashToIndex, MOTION_EASE,
} from '../../lib/tokens';
import type { AppointmentWithDetails, Break, DayOfWeek, Shift, ShiftOverride, WorkingHoursDay } from '../../types';
import type { TranslationKey } from '../../i18n';

// ─── Custom fork-knife glyph ─────────────────────────────
// heroicons ships no cutlery icon; the day-grid renderer carries the same
// inline SVG. Duplicated here so the lunch break tile reads identically in
// both surfaces.
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

type BlockType = Break['type'];
type IconComp = React.ComponentType<{ className?: string }>;

const BLOCK_ICON: Record<BlockType, IconComp> = {
  lunch:  ForkKnifeIcon,
  dinner: MoonIcon,
  rest:   HeartIcon,
  custom: PencilSquareIcon,
};

// Per-type palette mirrors the Day-grid `BREAK_HOVER_PALETTE` so a break tile
// reads identically across both views. Five channels — bgTint / borderL /
// hatchRgb / iconText / chip — all sit on the same hue so the eye reads "this
// is dinner = indigo" before reading the text. hatchRgb is consumed inside an
// inline `backgroundImage` because Tailwind JIT can't ingest the comma-rich
// `repeating-linear-gradient(...)` syntax.
const BLOCK_PALETTE: Record<BlockType, {
  bgTint: string;
  borderL: string;
  iconText: string;
  chip: string;
  hatchRgb: string;
}> = {
  lunch:  { bgTint: 'bg-amber-50 dark:bg-amber-500/[0.06]',     borderL: 'border-l-amber-600 dark:border-l-amber-500',     iconText: 'text-amber-700 dark:text-amber-300/80',   chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',   hatchRgb: '217, 119, 6'  },
  dinner: { bgTint: 'bg-indigo-50 dark:bg-indigo-500/[0.06]',   borderL: 'border-l-indigo-600 dark:border-l-indigo-500',   iconText: 'text-indigo-700 dark:text-indigo-300/80', chip: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300', hatchRgb: '79, 70, 229'  },
  rest:   { bgTint: 'bg-emerald-50 dark:bg-emerald-500/[0.06]', borderL: 'border-l-emerald-600 dark:border-l-emerald-500', iconText: 'text-emerald-700 dark:text-emerald-300/80', chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', hatchRgb: '5, 150, 105'  },
  custom: { bgTint: 'bg-fuchsia-50 dark:bg-fuchsia-500/[0.06]', borderL: 'border-l-fuchsia-600 dark:border-l-fuchsia-500', iconText: 'text-fuchsia-700 dark:text-fuchsia-300/80', chip: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300', hatchRgb: '192, 38, 211' },
};

const BLOCK_TKEY: Record<BlockType, TranslationKey> = {
  lunch:  'break.lunch',
  dinner: 'break.dinner',
  rest:   'break.rest',
  custom: 'break.custom',
};

// Single z-index ladder — one place to reason about layering. All literal
// z-* utilities in this file should resolve through this object so that
// re-stacking (e.g. moving the now-line above the popover) is one diff.
const Z = {
  gutter:      10,
  header:      20,
  indicator:    5,   // break bar
  appointment: 15,
  nowLine:     30,
  popover:     40,
} as const;

const DOW_BY_INDEX: DayOfWeek[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];
const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const hmToMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Recurrence-aware day filter for breaks — mirrors lib/booking-validation.ts:
// - one-off → exactly that startDate
// - weekly with bounds → dow match within [startDate, endDate]
// - weekly forever → dow match
function filterBreaksForDate(breaks: Break[], date: Date): Break[] {
  const dow = DOW_BY_INDEX[date.getDay()];
  const dateStr = ymd(date);
  return breaks.filter((b) => {
    if (b.recurrence === 'one-off') return b.startDate === dateStr;
    if (b.startDate && dateStr < b.startDate) return false;
    if (b.endDate && dateStr > b.endDate) return false;
    return b.dayOfWeek === dow;
  });
}

const SHORT_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

// Duration label for the chip in the bottom-right corner. Mirrors the
// day-grid format: "30m" / "1h" / "1h 30m".
function formatDuration(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  return `${min}m`;
}

// Full-tile break indicator for Week view. Mirrors the Day grid look:
// soft type-tinted bg + 5px left stripe + diagonal hatch + density ladder
// content (tiny: icon only / compact: icon + name + label / full: identity
// row + time row + duration chip). When `onClick` is provided the tile
// becomes a clickable button.
const WeekBreakIndicator = React.forwardRef<HTMLElement, {
  start: number;       // minutes since midnight
  end: number;
  type: BlockType;
  slotHeight: number;
  dayStartHour: number;
  count: number;
  staffFirstName?: string;
  /** Already-translated, uppercase-ready label ("LUNCH" / custom user text). */
  typeLabel: string;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (ev: React.DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}>(function WeekBreakIndicator(
  { start, end, type, slotHeight, dayStartHour, count, staffFirstName, typeLabel, onClick, draggable, onDragStart, onDragEnd, isDragging },
  ref,
) {
  const top = ((start - dayStartHour * 60) / 60) * slotHeight;
  const h = Math.max(((end - start) / 60) * slotHeight, 22);
  const palette = BLOCK_PALETTE[type];
  const Icon = BLOCK_ICON[type];
  const range = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}–${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  const durLabel = formatDuration(end - start);

  // Density ladder mirrors the day-grid renderer (calendar.tsx:4903-4978).
  const tinyB = h < 28;
  const compactB = !tinyB && h < 48;
  const showTimeRow = h >= 64;
  const showDurChip = h >= 80;

  const labelChip = (
    <span className={cn('shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] truncate', palette.iconText)}>
      {typeLabel}
      {count > 1 && <span className="ml-1 opacity-70">·{count}</span>}
    </span>
  );

  const inner = (
    <>
      {tinyB ? (
        <div className="flex h-full items-center justify-center w-full pl-2 pr-1.5">
          <Icon className={cn('h-3 w-3 shrink-0', palette.iconText)} />
        </div>
      ) : compactB ? (
        <div className="flex h-full w-full items-center gap-1.5 pl-2.5 pr-1.5">
          <Icon className={cn('h-3 w-3 shrink-0', palette.iconText)} />
          {staffFirstName && (
            <span className="text-[11px] font-bold italic text-foreground truncate">
              {staffFirstName}
            </span>
          )}
          <span className="ml-auto inline-flex items-center">{labelChip}</span>
        </div>
      ) : (
        <div className="flex h-full w-full flex-col justify-center gap-1 px-2.5 py-1.5 overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0 w-full">
            <Icon className={cn('h-3.5 w-3.5 shrink-0', palette.iconText)} />
            {staffFirstName && (
              <span className="text-[12px] font-bold italic text-foreground truncate min-w-0">
                {staffFirstName}
              </span>
            )}
            <span className="ml-auto inline-flex items-center">{labelChip}</span>
          </div>
          {showTimeRow && (
            <div className="flex items-center gap-2 min-w-0 w-full">
              <span className="text-[11px] font-semibold tabular-nums text-foreground/80 truncate">
                {range}
              </span>
              {showDurChip && (
                <span className={cn('ml-auto shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums tracking-[0.08em]', palette.chip)}>
                  {durLabel}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );

  const tileClass = cn(
    'absolute left-1 right-1 overflow-hidden rounded-md',
    palette.bgTint,
    'border-l-[5px]',
    palette.borderL,
    'transition-all',
    onClick && 'hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
    draggable ? 'cursor-grab active:cursor-grabbing' : onClick && 'cursor-pointer',
    isDragging && 'opacity-45 scale-[0.985]',
  );
  const tileStyle = {
    top: `${top}px`,
    height: `${h}px`,
    zIndex: Z.indicator,
    backgroundImage: `repeating-linear-gradient(45deg, rgba(${palette.hatchRgb}, var(--break-hatch-alpha, 0.12)) 0 8px, transparent 8px 16px)`,
  } as const;
  const ariaLabel = `${typeLabel} break, ${range}${count > 1 ? `, ×${count}` : ''}`;

  if (onClick) {
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={(ev) => { ev.stopPropagation(); onClick(); }}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={tileClass}
        style={tileStyle}
        aria-label={ariaLabel}
      >
        {inner}
      </button>
    );
  }
  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className={tileClass} style={tileStyle} role="img" aria-label={ariaLabel}>
      {inner}
    </div>
  );
});

interface WeekViewProps {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  /** Optional: clicking a day-of-week header in the strip jumps directly into
   *  the day grid for that date (closes the week overview). When omitted, the
   *  click only changes selectedDate. */
  onJumpToDay?: (d: Date) => void;
  appointments: AppointmentWithDetails[];
  /** Already filtered by focused-staff at the callsite; we still need to
   *  apply per-day recurrence semantics inside the view. */
  breaks: Break[];
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
  /** The single staff Week is filtered to. Powers per-day off detection
   *  (DAY OFF overlay) and the empty-week empty state. Null when no staff
   *  is active in the office. */
  selectedStaff?: { id: string; firstName: string; lastName: string } | null;
  /** Weekly shift schedule used to detect "no shift on this dayOfWeek" → off. */
  shifts?: Shift[];
  /** Per-date overrides (`day-off` or `custom`) — applied before shifts. */
  overrides?: ShiftOverride[];
  // Phase 2 — empty-slot click → seed booking modal with date+time:
  onCreateAt?: (date: Date, hour: number, minute: number) => void;
  // Phase 3 — drag-to-reschedule (parent owns the confirm dialog):
  onRequestDragConfirm?: (req: {
    aptId: string;
    newStartIso: string;
    newEndIso: string;
  }) => void;
  // Break drag-to-reschedule. Restored once the break tile became full-size
  // (was deferred during the 4px-bar phase because the bar wasn't a viable
  // hit target). Parent owns the "all occurrences vs only this date" confirm
  // dialog — same one Day grid uses.
  onRequestBreakDragConfirm?: (req: {
    brkId: string;
    targetDateYmd: string;
  }) => void;
  /** Gates DnD + context-menu handlers. False on receptionist accounts. */
  canOverride?: boolean;
  // Context menu + hover-card via render props from parent. `close` is
  // supplied to renderTileMenu so action handlers can dismiss the Popover
  // after dispatching their mutation.
  renderTileMenu?: (apt: AppointmentWithDetails, close: () => void) => React.ReactNode;
  renderTileHoverCard?: (apt: AppointmentWithDetails) => React.ReactNode;
  // Break-tile click → opens BlockDialog in edit mode. Restored after the
  // initial Phase-5 cleanup: receptionists legitimately want to fix typo'd
  // break names without flipping to Day grid. Drag-to-reschedule on a 4px
  // bar is a hit-target nightmare, so that stays Day-grid-only.
  onEditBreak?: (brk: Break) => void;
  /** Full working-hours map keyed by day name — used by warning predicate. */
  workingHours?: Record<string, WorkingHoursDay>;
  /** Minimum gap between back-to-back appointments (bookingRules.bufferMinutes). */
  bufferMinutes?: number;
}

export function WeekView({
  selectedDate, onSelectDate, onJumpToDay, appointments, breaks,
  staffColorMap, staffColors, onSelectApt,
  dayStartHour, dayEndHour, slotHeight,
  selectedStaff, shifts = [], overrides = [],
  onCreateAt, onRequestDragConfirm, onRequestBreakDragConfirm,
  canOverride = false,
  renderTileMenu, renderTileHoverCard, onEditBreak,
  workingHours, bufferMinutes = 0,
}: WeekViewProps) {
  const t = useT();
  const [timeFormat] = useTimeFormat();
  const language = useLanguageStore(s => s.language);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const reduceMotion = useReducedMotion();

  // Visual state — drag ghost + which tile's context menu is open. Local
  // because nothing else in the parent needs to know.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingBreakId, setDraggingBreakId] = useState<string | null>(null);
  const [menuOpenForId, setMenuOpenForId] = useState<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

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

  // Per-day breaks — merged by (start, end, type) so 4 staff sharing a
  // 13:00–13:30 lunch render as ONE diagonal-striped tile with ×4 badge
  // instead of four overlapping tiles. Owners scan a 7-day strip for
  // unavailability shape, not roster headcount.
  const breaksPerDay = useMemo(() => {
    const map = new Map<string, Array<{
      start: number;
      end: number;
      type: BlockType;
      count: number;
      label?: string;
      /** Underlying break — populated only when count===1 (single staff). */
      singleBrk?: Break;
    }>>();
    for (const d of days) {
      const key = ymd(d);
      const dayBreaks = filterBreaksForDate(breaks, d);
      const grouped = new Map<string, {
        start: number; end: number; type: BlockType; count: number; label?: string; singleBrk?: Break;
      }>();
      for (const b of dayBreaks) {
        const k = `${b.startTime}-${b.endTime}-${b.type}-${b.customLabel ?? ''}`;
        const cur = grouped.get(k);
        if (cur) {
          cur.count += 1;
          // Once aggregated, we can't disambiguate which staff owns the
          // tile, so we drop the singleBrk reference. ×N tiles stay
          // read-only by design.
          cur.singleBrk = undefined;
        } else {
          grouped.set(k, {
            start: hmToMin(b.startTime),
            end: hmToMin(b.endTime),
            type: b.type,
            count: 1,
            label: b.type === 'custom' ? b.customLabel : undefined,
            singleBrk: b,
          });
        }
      }
      map.set(key, [...grouped.values()].sort((a, b) => a.start - b.start));
    }
    return map;
  }, [breaks, days]);

  // Per-day "off" detection for the selected staff. Override takes
  // precedence (e.g. owner marked Wed as day-off for vacation); otherwise
  // fall back to "no Shift on this dayOfWeek" → off. When the column reads
  // off, we render the diagonal-line overlay and skip appointments + breaks.
  const dayOffByDay = useMemo(() => {
    const map = new Map<string, boolean>();
    if (!selectedStaff) return map;
    for (const d of days) {
      const key = ymd(d);
      const dow = DOW_BY_INDEX[d.getDay()];
      const ovr = overrides.find(o => o.staffId === selectedStaff.id && o.date === key);
      if (ovr) {
        map.set(key, ovr.kind === 'day-off');
        continue;
      }
      const hasShift = shifts.some(s => s.staffId === selectedStaff.id && s.dayOfWeek === dow);
      map.set(key, !hasShift);
    }
    return map;
  }, [selectedStaff, shifts, overrides, days]);

  // Now-line clock — re-renders once per minute so the red line tracks
  // through the day. Without this, `new Date()` was only re-read when the
  // parent re-rendered for unrelated reasons (silent bug).
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const nowMin = (clock.getHours() - dayStartHour) * 60 + clock.getMinutes();
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
  const DAY_COL_MIN_W = 150;

  // Break-tile hatch is now handled by .calendar-break-tile in theme.css —
  // see @layer components there. Theme-aware alpha values + explicit fork
  // for light vs dark let us push the hatch density up in light without
  // shouting in dark.

  return (
    // bg-canvas (tinted in light, near-card in dark) gives the grid its
    // "paper" feel so white bg-card tiles can sit on top with elevation.
    <div className="rounded-xl border border-border bg-canvas overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={() => { userScrolledRef.current = true; }}
        className="overflow-auto"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {/* Sticky day header — bg-canvas matches the grid surface so the
            header reads as part of the canvas paper, not a floating chip. */}
        <div className="sticky top-0 z-20 flex border-b border-border bg-canvas">
          <div className="shrink-0 border-r border-border" style={{ width: `${TIME_GUTTER_W}px` }} />
          {days.map((d, i) => {
            const td = isToday(d);
            const sel = isSameDay(d, selectedDate);
            const shortKey = SHORT_KEYS[d.getDay()];
            // Use 3-letter day labels — single-letter caused T/T + S/S
            // disambiguation problems in the audit.
            const dayLabel = t(`days.threeLetter.${shortKey}` as TranslationKey);
            return (
              <button
                key={d.toISOString()}
                onClick={() => {
                  const day = startOfDay(d);
                  if (onJumpToDay) onJumpToDay(day);
                  else onSelectDate(day);
                }}
                title={onJumpToDay ? `Open ${format(d, 'EEEE, MMM d')}` : undefined}
                className={cn(
                  'group flex-1 flex flex-col items-center gap-0.5 px-2 py-2.5 transition-colors',
                  i < 6 && 'border-r border-border',
                  // Subtle column highlight for today extends from header
                  // through the body (see day-column body div below). Selected
                  // gets the stronger accent fill.
                  td && !sel && 'bg-[#F4F4F5] dark:bg-white/[0.04]',
                  sel ? 'bg-accent' : !td && 'hover:bg-accent/40',
                )}
                style={{ minWidth: `${DAY_COL_MIN_W}px` }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {dayLabel}
                </span>
                <span className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold tabular-nums transition-transform',
                  // Selected day → solid black pill (white in dark). Today's
                  // emphasis lives on the column highlight above, not on the
                  // date number — the blue date pill was loud and competed
                  // with the now-line.
                  sel
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-foreground',
                  onJumpToDay && 'group-hover:scale-110',
                )}>
                  {format(d, 'd')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grid body */}
        <div className="relative flex" style={{ height: `${gridH}px` }}>
          {/* Time gutter — same canvas tone as the grid so the hour ticks
              read as part of the paper, not a separate panel. */}
          <div
            className="sticky left-0 z-10 shrink-0 border-r border-border bg-canvas"
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
                <span className="relative -top-[7px] rounded bg-red-500 px-1 py-px text-[10px] font-bold text-white tabular-nums leading-none">
                  {formatTime(clock, timeFormat)}
                </span>
              </div>
            )}
          </div>

          {/* Day columns */}
          {days.map((d, ci) => {
            const key = format(d, 'yyyy-MM-dd');
            const bucket = perDay.get(key);
            const dayBreaks = breaksPerDay.get(key) ?? [];
            const td = isToday(d);
            const isOff = dayOffByDay.get(key) ?? false;

            // Snap a clientY pixel offset to the nearest 15-minute slot.
            // Returns { hour, minute } where hour is the absolute clock hour.
            const yToSlot = (rect: DOMRect, clientY: number) => {
              const yPx = Math.max(0, clientY - rect.top);
              const totalMinFloat = (yPx / slotHeight) * 60;
              // Snap to 15-min increments, clamp inside [dayStart, dayEnd).
              const snapped = Math.round(totalMinFloat / 15) * 15;
              const totalMin = Math.min(
                snapped,
                (dayEndHour - dayStartHour) * 60 - 15,
              );
              const hour = Math.floor(totalMin / 60) + dayStartHour;
              const minute = totalMin % 60;
              return { hour, minute };
            };

            return (
              <div
                key={key}
                className={cn(
                  'relative flex-1 overflow-hidden',
                  ci < 6 && 'border-r border-border',
                  // Column-level today highlight — pairs with the matching bg
                  // on the header button so the highlight reads as one
                  // top-to-bottom stripe.
                  td && 'bg-[#F4F4F5] dark:bg-white/[0.04]',
                )}
                style={{ minWidth: `${DAY_COL_MIN_W}px` }}
                onDragOver={(ev) => {
                  if (!canOverride) return;
                  if (!onRequestDragConfirm && !onRequestBreakDragConfirm) return;
                  ev.preventDefault();
                  ev.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(ev) => {
                  if (!canOverride) return;
                  const raw = ev.dataTransfer.getData('text/plain');
                  if (!raw) return;
                  ev.preventDefault();
                  const rect = (ev.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const { hour, minute } = yToSlot(rect, ev.clientY);

                  // Break drag — parent owns the "all/only this date" confirm
                  // dialog. Day-of-week target is implicit in the column key.
                  if (raw.startsWith('brk:')) {
                    onRequestBreakDragConfirm?.({
                      brkId: raw.slice(4),
                      targetDateYmd: key,
                    });
                    return;
                  }

                  const apt = appointments.find((a) => a.id === raw);
                  if (!apt) return;
                  const start = new Date(d);
                  start.setHours(hour, minute, 0, 0);
                  const dur = differenceInMinutes(parseISO(apt.endTime), parseISO(apt.startTime));
                  const end = new Date(start.getTime() + dur * 60_000);
                  onRequestDragConfirm?.({
                    aptId: apt.id,
                    newStartIso: start.toISOString(),
                    newEndIso: end.toISOString(),
                  });
                }}
              >
                {/* Hour grid lines — dashed so they read as a soft scan-rule
                    not a hard divider. Full border opacity so they actually
                    appear on white (was /50, ghosted). */}
                {hours.map((hr, i) => (
                  <div
                    key={hr}
                    className="absolute left-0 right-0 border-t border-dashed border-border pointer-events-none"
                    style={{ top: `${i * slotHeight}px` }}
                  />
                ))}

                {/* Day-off overlay — diagonal-line block with centered DAY OFF
                    label. Skips empty-slot, break, and appointment rendering
                    so a vacationing barber's column reads as unavailable in
                    one glance. Uses the theme-aware --border token so the
                    stripe lightens in light mode and darkens in dark mode. */}
                {isOff && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{
                      zIndex: Z.indicator + 1,
                      backgroundImage:
                        'repeating-linear-gradient(45deg, var(--border) 0 6px, transparent 6px 12px)',
                    }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400 bg-canvas/85 px-1.5 py-0.5 rounded">
                      {t('weekView.dayOff' as TranslationKey)}
                    </span>
                  </div>
                )}

                {/* Empty-slot click overlay — sits at z-0 in DOM order BEFORE
                    breaks (z-0) and appts (z-10), so tile clicks naturally win
                    by paint stacking. Only renders when parent provided
                    onCreateAt (gates the affordance off when not authorized).
                    Day-off columns suppress the click-to-create affordance. */}
                {onCreateAt && !isOff && (
                  <button
                    type="button"
                    aria-label={t('weekView.dropZone' as TranslationKey)}
                    className="absolute inset-0 z-0 cursor-cell focus-visible:outline-none focus-visible:bg-accent/20"
                    onClick={(ev) => {
                      const rect = (ev.currentTarget as HTMLButtonElement).getBoundingClientRect();
                      const { hour, minute } = yToSlot(rect, ev.clientY);
                      onCreateAt(d, hour, minute);
                    }}
                  />
                )}

                {/* Breaks — full hatched tile matching the Day-grid look:
                    soft type-tinted bg + 5px stripe + diagonal hatch + density
                    ladder (icon / icon+name+label / identity row + time row +
                    duration chip). Click to edit. Skipped on day-off columns. */}
                {!isOff && dayBreaks.map((b, i) => {
                  const top = ((b.start - dayStartHour * 60) / 60) * slotHeight;
                  if (top < 0 || top > gridH) return null;
                  const editable = !!onEditBreak && !!b.singleBrk;
                  const brkDraggable = !!b.singleBrk && canOverride && !!onRequestBreakDragConfirm;
                  const typeLabelText = b.label ?? t(BLOCK_TKEY[b.type]);
                  const indicator = (
                    <WeekBreakIndicator
                      start={b.start}
                      end={b.end}
                      type={b.type}
                      slotHeight={slotHeight}
                      dayStartHour={dayStartHour}
                      count={b.count}
                      staffFirstName={selectedStaff?.firstName}
                      typeLabel={typeLabelText}
                      onClick={editable ? () => onEditBreak!(b.singleBrk!) : undefined}
                      draggable={brkDraggable}
                      onDragStart={brkDraggable ? (ev) => {
                        ev.stopPropagation();
                        ev.dataTransfer.setData('text/plain', `brk:${b.singleBrk!.id}`);
                        ev.dataTransfer.effectAllowed = 'move';
                        setDraggingBreakId(b.singleBrk!.id);
                      } : undefined}
                      onDragEnd={brkDraggable ? () => setDraggingBreakId(null) : undefined}
                      isDragging={!!b.singleBrk && draggingBreakId === b.singleBrk.id}
                    />
                  );
                  const rangeFull = `${String(Math.floor(b.start / 60)).padStart(2, '0')}:${String(b.start % 60).padStart(2, '0')} – ${String(Math.floor(b.end / 60)).padStart(2, '0')}:${String(b.end % 60).padStart(2, '0')}`;
                  return (
                    <HoverCard key={`brk-${i}-${b.start}-${b.end}-${b.type}`} openDelay={320} closeDelay={120}>
                      <HoverCardTrigger asChild>{indicator}</HoverCardTrigger>
                      <HoverCardContent align="start" side="right" sideOffset={8} className="w-auto p-0 overflow-hidden border-border/80 shadow-lg">
                        <div className="w-56 p-0">
                          <div className="px-4 pt-3 pb-2.5 border-b border-border">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              {typeLabelText}
                            </p>
                          </div>
                          <div className="px-4 py-3 flex items-baseline justify-between gap-3">
                            <p className="text-[18px] font-bold tabular-nums tracking-tight leading-none text-foreground">
                              {rangeFull}
                            </p>
                            {b.count > 1 && (
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground tabular-nums shrink-0">
                                ×{b.count}
                              </span>
                            )}
                          </div>
                          {editable && (
                            <div className="px-4 pb-3 -mt-1">
                              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                                {t('weekView.breakClickToEdit' as TranslationKey)}
                              </span>
                            </div>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}

                {/* Appointments — z-10 above breaks. Skipped on day-off
                    columns (the overlay covers them anyway, but skipping
                    avoids paying the lane-assignment cost). */}
                {!isOff && bucket?.appts.map(apt => {
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

                  // Density ladder: tiny < 40 ≤ compact < 70 ≤ full < 110 ≤ huge
                  const tiny = h < 40;
                  const compact = !tiny && h < 70;
                  const full = !tiny && !compact;
                  const huge = h >= 110;

                  const catDot = CATEGORY_DOTS[hashToIndex(apt.service.categoryId, CATEGORY_DOTS.length)];
                  const isRecurring = !!apt.groupId;
                  const statusLabel = STATUS_LABEL[apt.status] ?? '';
                  const isDragging = draggingId === apt.id;
                  const draggable = canOverride && !!onRequestDragConfirm;
                  // Warning triangle — canonical 6-rule predicate.
                  const rawBreaksForDay = filterBreaksForDate(breaks, d);
                  const colApts = (bucket?.appts ?? []).filter(p => format(parseISO(p.startTime), 'yyyy-MM-dd') === key);
                  const dayDow = DOW_BY_INDEX[d.getDay()];
                  const warning = getAppointmentWarning(apt, {
                    peerAppointments: colApts,
                    staffBreaks: rawBreaksForDay.filter(b => b.startTime && b.endTime).map(b => ({ startTime: b.startTime, endTime: b.endTime })),
                    workingHours: workingHours?.[dayDow],
                    bufferMinutes,
                    now: clock,
                    t,
                  });

                  // Legacy status chips (late / unconfirmed within 24h) — not triangles.
                  const ymdNow = format(clock, 'yyyy-MM-dd');
                  const ymdApt = format(start, 'yyyy-MM-dd');
                  const minutesUntilStart = (start.getTime() - clock.getTime()) / 60_000;
                  const isLate = ymdApt === ymdNow && minutesUntilStart < -5
                    && (apt.status === 'scheduled' || apt.status === 'confirmed');
                  const isUnconfirmed = apt.status === 'scheduled'
                    && minutesUntilStart > 0 && minutesUntilStart < 24 * 60;
                  const legacyKind: 'late' | 'unconfirmed' | null =
                    isLate ? 'late' : isUnconfirmed ? 'unconfirmed' : null;
                  // Narrow lane (3+ lanes in one column) — switch to first-name
                  // only so the tile reads as "Daniel" instead of "Daniel..."
                  // with an ugly ellipsis. lanePct < 35 ≈ < 80px effective.
                  const narrowLane = lanePct < 35;
                  const displayName = narrowLane
                    ? apt.client.firstName
                    : `${apt.client.firstName} ${apt.client.lastName[0]}.`;

                  // Long-press handler family for iPad context menu.
                  // Mirrors day-grid pattern (calendar.tsx:5231-5248).
                  const handleTouchStart = renderTileMenu
                    ? () => {
                        if (longPressTimerRef.current) {
                          window.clearTimeout(longPressTimerRef.current);
                        }
                        longPressTimerRef.current = window.setTimeout(() => {
                          setMenuOpenForId(apt.id);
                          longPressTimerRef.current = null;
                        }, 550);
                      }
                    : undefined;
                  const cancelLongPress = () => {
                    if (longPressTimerRef.current) {
                      window.clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                  };

                  // Tile inner content — status stripe, issue chip, density layout.
                  // Extracted so it can live inside either a plain <button> or a
                  // HoverCard-wrapped <button> without repeating the JSX.
                  const tileContent = (
                    <>
                      <span className={cn('pointer-events-none absolute right-0 top-0 bottom-0 w-[2px]', STATUS_STRIPE[apt.status])} />

                      {warning && <AppointmentWarningPin warning={warning} size="sm" />}

                      {legacyKind && (() => {
                        const meta = legacyKind === 'late'
                          ? { Icon: ClockIcon, bg: 'bg-rose-50 dark:bg-rose-500/15', text: 'text-rose-700 dark:text-rose-400', ring: 'ring-rose-500/30', tKey: 'tile.lateStart' as TranslationKey }
                          : { Icon: ExclamationCircleIcon, bg: 'bg-blue-50 dark:bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400', ring: 'ring-blue-500/30', tKey: 'tile.unconfirmed' as TranslationKey };
                        const { Icon: LegacyIcon, bg, text: textCls, ring, tKey } = meta;
                        return (
                          <span
                            className={cn('pointer-events-none absolute top-1 right-6 inline-flex items-center justify-center rounded-full ring-1 p-0.5', bg, ring)}
                            aria-label={t(tKey)} title={t(tKey)}
                          >
                            <LegacyIcon className={cn('h-2.5 w-2.5', textCls)} strokeWidth={2.4} />
                          </span>
                        );
                      })()}

                      {tiny ? (
                        <div className="flex items-center h-full min-w-0 px-1.5 gap-1">
                          <span className="text-[11px] font-semibold text-foreground truncate leading-tight">{displayName}</span>
                          <span className="ml-auto text-[10px] tabular-nums shrink-0 text-muted-foreground leading-tight">{formatTime(start, timeFormat)}</span>
                          {isRecurring && <ArrowPathIcon className="h-2.5 w-2.5 shrink-0 text-muted-foreground/70" strokeWidth={2.4} />}
                        </div>
                      ) : compact ? (
                        <div className="flex flex-col h-full min-h-0 px-2 py-1 gap-0.5 pr-1.5">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-[10px] tabular-nums shrink-0 text-muted-foreground leading-tight">{formatTime(start, timeFormat)}</span>
                            {isRecurring && <ArrowPathIcon className="ml-auto h-2.5 w-2.5 shrink-0 text-muted-foreground/70" strokeWidth={2.4} />}
                          </div>
                          <span className="text-[11px] font-semibold text-foreground truncate leading-tight shrink-0">{displayName}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full min-h-0 px-2 py-1.5 gap-0.5 pr-1.5">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-[10px] tabular-nums shrink-0 text-muted-foreground leading-tight">{timeStr}</span>
                            {isRecurring && <ArrowPathIcon className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/70" strokeWidth={2.2} />}
                          </div>
                          <span className="text-[12px] font-semibold text-foreground truncate leading-tight shrink-0">{displayName}</span>
                          <div className="flex items-center gap-1 min-w-0 shrink-0">
                            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', catDot)} />
                            <span className="text-[10px] truncate text-muted-foreground leading-tight">{apt.service.name}</span>
                          </div>
                        </div>
                      )}
                    </>
                  );

                  // Full-tile click button — used as the HoverCard trigger.
                  // A plain <button> (not motion.button) so HoverCardTrigger asChild
                  // attaches mouseenter/leave directly without an intermediate Slot.
                  const fillBtn = (
                    <button
                      type="button"
                      onClick={ev => { ev.stopPropagation(); onSelectApt(apt); }}
                      onContextMenu={renderTileMenu ? (ev) => { ev.preventDefault(); ev.stopPropagation(); setMenuOpenForId(apt.id); } : undefined}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      onTouchCancel={cancelLongPress}
                      className="block h-full w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded-[inherit]"
                      aria-label={`${apt.client.firstName} ${apt.client.lastName}, ${timeStr}, ${apt.service.name}, ${statusLabel}`}
                    >
                      {tileContent}
                    </button>
                  );

                  // motion.div positions + animates the tile. Drag lives here so it
                  // doesn't conflict with the inner button's click/hover handlers.
                  // The HoverCard wraps just the fill button (one asChild hop, same
                  // as the day grid). The ⋯ button is a sibling PopoverTrigger that
                  // anchors the context-menu popup — mirrors day-grid exactly.
                  const tileDiv = (
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: MOTION_EASE }}
                      whileHover={reduceMotion || isDragging ? undefined : { y: -1 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                      draggable={draggable}
                      onDragStart={draggable ? (ev) => {
                        ev.dataTransfer.setData('text/plain', apt.id);
                        ev.dataTransfer.effectAllowed = 'move';
                        setDraggingId(apt.id);
                      } : undefined}
                      onDragEnd={draggable ? () => setDraggingId(null) : undefined}
                      className={cn(
                        'absolute group rounded-md border border-border/80 border-l-[5px] overflow-hidden z-10 hover:z-20',
                        'bg-card hover:bg-accent/40 transition-all',
                        'calendar-tile-elev',
                        c.border,
                        apt.status === 'cancelled' && 'opacity-40 line-through',
                        apt.status === 'completed' && 'opacity-70',
                        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                        isDragging && 'opacity-45 scale-[0.985]',
                      )}
                      style={{
                        top: `${top}px`,
                        height: `${h}px`,
                        left: `calc(${laneIdx * lanePct}% + 3px)`,
                        width: `calc(${lanePct}% - 6px)`,
                      }}
                    >
                      {renderTileHoverCard ? (
                        <HoverCard openDelay={320} closeDelay={120}>
                          <HoverCardTrigger asChild>{fillBtn}</HoverCardTrigger>
                          {renderTileHoverCard(apt)}
                        </HoverCard>
                      ) : fillBtn}

                      {renderTileMenu && !tiny && (
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label="Booking actions"
                            className={cn(
                              'absolute top-1 right-2 z-20 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground/70 transition-opacity',
                              'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                              menuOpenForId === apt.id && 'opacity-100',
                            )}
                            onClick={ev => ev.stopPropagation()}
                          >
                            <EllipsisHorizontalIcon className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                      )}
                    </motion.div>
                  );

                  return (
                    <div key={apt.id} className="contents">
                      {renderTileMenu ? (
                        <Popover
                          open={menuOpenForId === apt.id}
                          onOpenChange={(v) => setMenuOpenForId(v ? apt.id : null)}
                        >
                          {tileDiv}
                          {renderTileMenu(apt, () => setMenuOpenForId(null))}
                        </Popover>
                      ) : tileDiv}
                    </div>
                  );
                })}

                {/* Now line on today's column — full opacity + thicker bar
                    + larger anchor dot so it stays legible against the today-
                    column highlight (#F4F4F5 in light, white/4% in dark). */}
                {td && showNow && (
                  <div
                    className="pointer-events-none absolute z-30 flex items-center left-0 right-0"
                    style={{ top: `${(nowMin / minutesPerSlot) * slotHeight}px` }}
                  >
                    <div className="h-2.5 w-2.5 -translate-x-1 rounded-full bg-red-500 ring-[3px] ring-red-500/20" />
                    <div className="h-[2px] flex-1 bg-red-500" />
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
