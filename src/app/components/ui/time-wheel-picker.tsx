import { useEffect, useRef, useCallback } from 'react';
import { cn } from './utils';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

/**
 * Alarm-clock style time picker.
 *
 * Two vertical scroll columns (hours + minutes) with snap-to-item,
 * a highlighted band marking the selection, and ±arrow buttons for
 * fine adjustment. Touch-friendly (drag/scroll on iPad), mouse-friendly
 * (wheel scroll on desktop), keyboard-friendly (arrow keys + Tab).
 *
 * Replaces native <input type="time"> in places where the editorial
 * design language matters more than raw input speed (booking dialogs).
 */
interface TimeWheelPickerProps {
  /** "HH:MM" 24-hour format ALWAYS (canonical), e.g. "10:30" or "14:00".
      The picker handles 12h display internally if `format === '12h'`. */
  value: string;
  onChange: (value: string) => void;
  /** Minutes increment — 5 (default) or 15. */
  minuteStep?: 5 | 15;
  /** First selectable hour in canonical 24h (0-23). 24h mode only. */
  startHour?: number;
  /** Last selectable hour in canonical 24h (0-23, inclusive). 24h mode only. */
  endHour?: number;
  /** Display format. 24h shows 0-23. 12h shows 1-12 + AM/PM column. */
  format?: '24h' | '12h';
  className?: string;
  ariaLabel?: string;
}

const ITEM_HEIGHT = 52;
const VISIBLE_BUFFER = 2; // 2 items above + selected + 2 below = 5 visible

// Canonical 24h hour (0-23) → display hour (1-12) + period
function to12h(h24: number): { hour12: number; period: 'AM' | 'PM' } {
  const period = h24 < 12 ? 'AM' : 'PM';
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12, period };
}

// Display hour (1-12) + period → canonical 24h
function to24h(hour12: number, period: 'AM' | 'PM'): number {
  if (period === 'AM') return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

export function TimeWheelPicker({
  value,
  onChange,
  minuteStep = 5,
  startHour = 0,
  endHour = 23,
  format = '24h',
  className,
  ariaLabel = 'Time',
}: TimeWheelPickerProps) {
  const [hourStr = '00', minuteStr = '00'] = value.split(':');
  const hour24 = parseInt(hourStr, 10) || 0;
  const minute = parseInt(minuteStr, 10) || 0;

  // Snap minute to nearest valid step (handles HH:23 -> HH:25 if step=5)
  const snappedMinute = Math.round(minute / minuteStep) * minuteStep;

  const minutes = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);
  const pad = (n: number) => String(n).padStart(2, '0');

  if (format === '12h') {
    // 12h mode: 1..12 hour wheel + AM/PM column. Bounds (startHour/endHour)
    // are intentionally relaxed in 12h — picker shows the full clock and
    // the parent validates if needed.
    const hours12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const { hour12, period } = to12h(hour24);

    const setHour12 = (h: number) => {
      const newH24 = to24h(h, period);
      onChange(`${pad(newH24)}:${pad(snappedMinute)}`);
    };
    const setMinute = (m: number) => {
      onChange(`${pad(hour24)}:${pad(m)}`);
    };
    const setPeriod = (p: number) => {
      const newPeriod = p === 0 ? 'AM' : 'PM';
      const newH24 = to24h(hour12, newPeriod);
      onChange(`${pad(newH24)}:${pad(snappedMinute)}`);
    };

    return (
      <div
        className={cn(
          'inline-flex items-stretch gap-3 rounded-2xl border border-border bg-card p-3',
          className,
        )}
        aria-label={ariaLabel}
      >
        <WheelColumn
          label="hour"
          items={hours12}
          selected={hour12}
          onSelect={setHour12}
        />
        <div className="flex items-center text-4xl font-bold tabular-nums text-muted-foreground/30 select-none">
          :
        </div>
        <WheelColumn
          label="minute"
          items={minutes}
          selected={snappedMinute}
          onSelect={setMinute}
        />
        <WheelColumn
          label="period"
          items={[0, 1]}
          selected={period === 'AM' ? 0 : 1}
          onSelect={setPeriod}
          formatItem={(n) => (n === 0 ? 'AM' : 'PM')}
        />
      </div>
    );
  }

  // 24h mode (default)
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const setHour = (h: number) => onChange(`${pad(h)}:${pad(snappedMinute)}`);
  const setMinute = (m: number) => onChange(`${pad(hour24)}:${pad(m)}`);

  return (
    <div
      className={cn(
        'inline-flex items-stretch gap-3 rounded-2xl border border-border bg-card p-3',
        className,
      )}
      aria-label={ariaLabel}
    >
      <WheelColumn
        label="hour"
        items={hours}
        selected={hour24}
        onSelect={setHour}
      />
      <div className="flex items-center text-4xl font-bold tabular-nums text-muted-foreground/30 select-none">
        :
      </div>
      <WheelColumn
        label="minute"
        items={minutes}
        selected={snappedMinute}
        onSelect={setMinute}
      />
    </div>
  );
}

interface WheelColumnProps {
  label: string;
  items: number[];
  selected: number;
  onSelect: (n: number) => void;
  /** Optional custom formatter — e.g. AM/PM column shows "AM"/"PM" instead of 0/1. */
  formatItem?: (n: number) => string;
}

function WheelColumn({ label, items, selected, onSelect, formatItem }: WheelColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const lastFiredValueRef = useRef<number>(selected);

  const visibleHeight = ITEM_HEIGHT * (1 + 2 * VISIBLE_BUFFER); // 3 items visible

  // Scroll to selected item when value changes externally (on mount, or
  // when parent updates value). Skip if user is mid-scroll to avoid
  // fighting their gesture.
  useEffect(() => {
    if (isScrollingRef.current) return;
    if (selected === lastFiredValueRef.current) {
      // Initial mount: jump without smooth animation
      const idx = items.indexOf(selected);
      if (idx >= 0 && scrollRef.current) {
        scrollRef.current.scrollTop = idx * ITEM_HEIGHT;
      }
      return;
    }
    const idx = items.indexOf(selected);
    if (idx >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
    }
    lastFiredValueRef.current = selected;
  }, [selected, items]);

  // Mark "scrolling" → after 120ms quiet → snap to closest + fire change.
  // 120ms balances responsiveness vs accidental fire during fast scroll.
  const handleScroll = useCallback(() => {
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
      isScrollingRef.current = false;
      const el = scrollRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      const next = items[clamped];
      if (next !== lastFiredValueRef.current) {
        lastFiredValueRef.current = next;
        onSelect(next);
      }
    }, 120);
  }, [items, onSelect]);

  const step = (delta: number) => {
    const idx = items.indexOf(selected);
    if (idx === -1) return;
    const nextIdx = Math.max(0, Math.min(items.length - 1, idx + delta));
    onSelect(items[nextIdx]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    else if (e.key === 'PageUp') { e.preventDefault(); step(-5); }
    else if (e.key === 'PageDown') { e.preventDefault(); step(5); }
    else if (e.key === 'Home') { e.preventDefault(); onSelect(items[0]); }
    else if (e.key === 'End') { e.preventDefault(); onSelect(items[items.length - 1]); }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Up arrow */}
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label={`Previous ${label}`}
        className="flex h-7 w-20 items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <ChevronUpIcon className="h-4 w-4" />
      </button>

      {/* Scroll column with center highlight */}
      <div className="relative w-20" role="listbox" aria-label={label}>
        {/* Center highlight band — stronger contrast */}
        <div
          className="pointer-events-none absolute inset-x-0 rounded-lg border border-foreground/20 bg-foreground/[0.06] z-0"
          style={{ top: ITEM_HEIGHT * VISIBLE_BUFFER, height: ITEM_HEIGHT }}
          aria-hidden
        />
        {/* Top + bottom fades — taller so outer items dim out */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-card via-card/90 to-transparent" style={{ height: ITEM_HEIGHT * 1.5 }} aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-card via-card/90 to-transparent" style={{ height: ITEM_HEIGHT * 1.5 }} aria-hidden />

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          className="overflow-y-auto snap-y snap-mandatory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded-lg [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ height: visibleHeight, scrollSnapType: 'y mandatory' }}
        >
          {/* Top spacer so first item can center */}
          <div style={{ height: ITEM_HEIGHT * VISIBLE_BUFFER }} aria-hidden />
          {items.map(item => {
            const isActive = item === selected;
            return (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => onSelect(item)}
                className={cn(
                  'flex w-full items-center justify-center text-3xl font-bold tabular-nums transition-all snap-center cursor-pointer',
                  isActive
                    ? 'text-foreground scale-100'
                    : 'text-muted-foreground/40 hover:text-muted-foreground scale-90',
                )}
                style={{ height: ITEM_HEIGHT, scrollSnapAlign: 'center' }}
                tabIndex={-1}
              >
                {formatItem ? formatItem(item) : String(item).padStart(2, '0')}
              </button>
            );
          })}
          {/* Bottom spacer */}
          <div style={{ height: ITEM_HEIGHT * VISIBLE_BUFFER }} aria-hidden />
        </div>
      </div>

      {/* Down arrow */}
      <button
        type="button"
        onClick={() => step(1)}
        aria-label={`Next ${label}`}
        className="flex h-7 w-20 items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {/* Column label below */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 mt-0.5">
        {label}
      </p>
    </div>
  );
}
