import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { cn } from '../ui/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { DatePickerPopover } from '../shared/DatePickerPopover';
import { useT } from '../../hooks/use-t';
import {
  shiftAnchor, canGoNext, formatPeriodLabel,
} from '../../lib/date-range';
import type { Granularity } from '../../lib/date-range';
import type { TranslationKey } from '../../i18n';

interface PeriodNavigatorProps {
  granularity: Granularity;
  anchor: Date;
  onGranularityChange: (g: Granularity) => void;
  onAnchorChange: (d: Date) => void;
  locale: string;
}

const GRAN_KEY: Record<Granularity, TranslationKey> = {
  day: 'period.day',
  week: 'period.week',
  month: 'period.month',
  year: 'period.year',
};

const GRANULARITIES: Granularity[] = ['day', 'week', 'month', 'year'];

export function PeriodNavigator({
  granularity, anchor, onGranularityChange, onAnchorChange, locale,
}: PeriodNavigatorProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const forwardOk = canGoNext(granularity, anchor);

  const step = (dir: 1 | -1) => onAnchorChange(shiftAnchor(granularity, anchor, dir));
  const pick = (d: Date) => { onAnchorChange(d); setOpen(false); };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Granularity tabs */}
      <div
        className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5"
        role="group"
        aria-label={t('period.granularity')}
      >
        {GRANULARITIES.map(g => (
          <button
            key={g}
            type="button"
            onClick={() => onGranularityChange(g)}
            aria-pressed={granularity === g}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              granularity === g
                ? 'bg-background text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
            )}
          >
            {t(GRAN_KEY[g])}
          </button>
        ))}
      </div>

      {/* Period stepper: ‹  [label] ›  */}
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={t('period.prev')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-accent active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
        </button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t('period.pick')}
              className="group inline-flex min-w-[8rem] items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground capitalize shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {formatPeriodLabel(granularity, anchor, locale)}
              <CalendarDaysIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={6} className="w-auto p-3">
            {(granularity === 'day' || granularity === 'week') && (
              <DatePickerPopover
                value={anchor}
                onChange={pick}
                locale={locale}
                selectionMode={granularity === 'week' ? 'week' : 'day'}
                disableFuture
              />
            )}
            {granularity === 'month' && (
              <MonthPicker anchor={anchor} onPick={pick} locale={locale} prevLabel={t('common.previousMonth')} nextLabel={t('common.nextMonth')} />
            )}
            {granularity === 'year' && (
              <YearPicker anchor={anchor} onPick={pick} />
            )}
          </PopoverContent>
        </Popover>

        <button
          type="button"
          onClick={() => step(1)}
          disabled={!forwardOk}
          aria-label={t('period.next')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-accent active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Month grid — 12 months for one year, with year stepper ──
function MonthPicker({
  anchor, onPick, locale, prevLabel, nextLabel,
}: {
  anchor: Date;
  onPick: (d: Date) => void;
  locale: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const [year, setYear] = useState(anchor.getFullYear());
  const now = new Date();

  return (
    <div className="w-[272px] select-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setYear(y => y - 1)}
          aria-label={prevLabel}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground tabular-nums">{year}</span>
        <button
          type="button"
          onClick={() => setYear(y => y + 1)}
          disabled={year >= now.getFullYear()}
          aria-label={nextLabel}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 12 }, (_, m) => {
          const cell = new Date(year, m, 1);
          const label = new Intl.DateTimeFormat(locale, { month: 'short' }).format(cell);
          const isFuture = year > now.getFullYear() || (year === now.getFullYear() && m > now.getMonth());
          const isSelected = anchor.getFullYear() === year && anchor.getMonth() === m;
          return (
            <button
              key={m}
              type="button"
              disabled={isFuture}
              onClick={() => onPick(cell)}
              aria-pressed={isSelected}
              className={cn(
                'h-9 rounded-md text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-30',
                isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Year list — current year and the preceding nine ──
function YearPicker({ anchor, onPick }: { anchor: Date; onPick: (d: Date) => void }) {
  const now = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => now - i);
  return (
    <div className="w-[160px] select-none">
      <div className="grid grid-cols-2 gap-1.5">
        {years.map(y => {
          const isSelected = anchor.getFullYear() === y;
          return (
            <button
              key={y}
              type="button"
              onClick={() => onPick(new Date(y, 0, 1))}
              aria-pressed={isSelected}
              className={cn(
                'h-9 rounded-md text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent',
              )}
            >
              {y}
            </button>
          );
        })}
      </div>
    </div>
  );
}
