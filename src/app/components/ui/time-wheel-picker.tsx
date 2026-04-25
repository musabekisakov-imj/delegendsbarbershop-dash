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
  /** "HH:MM" 24-hour format, e.g. "10:30" */
  value: string;
  onChange: (value: string) => void;
  /** Minutes increment — 5 (default) or 15. */
  minuteStep?: 5 | 15;
  /** First selectable hour (0-23). */
  startHour?: number;
  /** Last selectable hour (0-23, inclusive). */
  endHour?: number;
  className?: string;
  ariaLabel?: string;
}

const ITEM_HEIGHT = 36;
const VISIBLE_BUFFER = 1; // 1 item above + 1 below selected

export function TimeWheelPicker({
  value,
  onChange,
  minuteStep = 5,
  startHour = 0,
  endHour = 23,
  className,
  ariaLabel = 'Time',
}: TimeWheelPickerProps) {
  const [hourStr = '00', minuteStr = '00'] = value.split(':');
  const hour = parseInt(hourStr, 10) || 0;
  const minute = parseInt(minuteStr, 10) || 0;

  // Snap minute to nearest valid step (handles HH:23 -> HH:25 if step=5)
  const snappedMinute = Math.round(minute / minuteStep) * minuteStep;

  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const minutes = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);

  const pad = (n: number) => String(n).padStart(2, '0');

  const setHour = (h: number) => onChange(`${pad(h)}:${pad(snappedMinute)}`);
  const setMinute = (m: number) => onChange(`${pad(hour)}:${pad(m)}`);

  return (
    <div
      className={cn(
        'inline-flex items-stretch gap-1 rounded-xl border border-border bg-card p-1.5',
        className,
      )}
      aria-label={ariaLabel}
    >
      <WheelColumn
        label="hour"
        items={hours}
        selected={hour}
        onSelect={setHour}
      />
      <div className="flex items-center px-1 text-2xl font-bold tabular-nums text-muted-foreground/30 select-none">
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
}

function WheelColumn({ label, items, selected, onSelect }: WheelColumnProps) {
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
    <div className="flex flex-col items-center gap-0.5">
      {/* Up arrow */}
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label={`Previous ${label}`}
        className="flex h-5 w-12 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60"
      >
        <ChevronUpIcon className="h-3.5 w-3.5" />
      </button>

      {/* Scroll column with center highlight */}
      <div className="relative w-12" role="listbox" aria-label={label}>
        {/* Center highlight band */}
        <div
          className="pointer-events-none absolute inset-x-0 rounded-md border border-foreground/15 bg-foreground/[0.04] z-0"
          style={{ top: ITEM_HEIGHT * VISIBLE_BUFFER, height: ITEM_HEIGHT }}
          aria-hidden
        />
        {/* Top + bottom fades for soft cut-off */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-card via-card/80 to-transparent" style={{ height: ITEM_HEIGHT }} aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-card via-card/80 to-transparent" style={{ height: ITEM_HEIGHT }} aria-hidden />

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          className="overflow-y-auto snap-y snap-mandatory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded-md [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
                  'flex w-full items-center justify-center text-base font-semibold tabular-nums transition-colors snap-center cursor-pointer',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground/50 hover:text-muted-foreground',
                )}
                style={{ height: ITEM_HEIGHT, scrollSnapAlign: 'center' }}
                tabIndex={-1}
              >
                {String(item).padStart(2, '0')}
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
        className="flex h-5 w-12 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60"
      >
        <ChevronDownIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
