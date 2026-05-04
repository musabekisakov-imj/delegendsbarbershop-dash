'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { publicApi, ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useT, useLang } from '@/lib/use-t';

const EASE = [0.16, 1, 0.3, 1] as const;

interface Props {
  id: string;
  staffId: string;
  duration: number;
}

export function ManageActions({ id, staffId, duration }: Props) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<'cancel' | 'reschedule' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  async function onCancel() {
    if (!window.confirm(t.manage.cancel_confirm)) return;
    setError(null);
    setBusy('cancel');
    try {
      await publicApi.cancelBooking(id);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.booking.error_generic);
    } finally {
      setBusy(null);
    }
  }

  async function onReschedule(newStartIso: string) {
    setError(null);
    setBusy('reschedule');
    try {
      await publicApi.rescheduleBooking(id, newStartIso);
      setExpanded(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.booking.error_generic);
    } finally {
      setBusy(null);
    }
  }

  const isBusy = busy !== null || pending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          disabled={isBusy}
          className="inline-flex items-center bg-primary text-primary-foreground pl-5 py-0 pr-0 text-sm font-semibold hover:bg-foreground hover:text-background transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none"
          aria-expanded={expanded}
        >
          <span className="inline-flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {expanded ? t.manage.back_home : t.booking.progress_step3}
          </span>
          <span className="border-l border-black/30 p-3 ml-5 inline-flex items-center">
            <ArrowRightIcon className="h-4 w-4" />
          </span>
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isBusy}
          className="inline-flex items-center bg-foreground text-background pl-5 py-0 pr-0 text-sm font-semibold hover:bg-primary hover:text-primary-foreground transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none"
        >
          <span>{busy === 'cancel' ? t.manage.cancelling : t.manage.cancel_cta}</span>
          <span className="border-l border-background/20 p-3 ml-5 inline-flex items-center">
            <ArrowRightIcon className="h-4 w-4" />
          </span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="overflow-hidden"
          >
            <ReschedulePicker
              staffId={staffId}
              duration={duration}
              onPick={onReschedule}
              disabled={isBusy}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-xs text-red-300/90 leading-relaxed" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ReschedulePicker({
  staffId,
  duration,
  onPick,
  disabled,
}: {
  staffId: string;
  duration: number;
  onPick: (iso: string) => void;
  disabled: boolean;
}) {
  const t = useT();
  const { lang } = useLang();
  const days = useMemo(() => nextDays(7, lang), [lang]);
  const [date, setDate] = useState<string>(days[0].iso);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    publicApi
      .availability({ staffId, date, duration })
      .then((s) => !cancelled && setSlots(s))
      .catch(() => !cancelled && setSlots([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date, staffId, duration]);

  return (
    <div className="card p-6 space-y-5">
      {/* Days strip */}
      <div className="-mx-6 px-6 overflow-x-auto pb-2 no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {days.map((d) => {
            const sel = d.iso === date;
            return (
              <button
                key={d.iso}
                type="button"
                onClick={() => setDate(d.iso)}
                className={cn(
                  'shrink-0 w-14 py-2.5 rounded-md border text-center transition-all duration-200',
                  sel
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-foreground hover:border-foreground/40',
                )}
              >
                <div className={cn('text-[9px] uppercase tracking-eyebrow', sel ? 'text-primary-foreground/60' : 'text-muted-foreground/70')}>
                  {d.dow}
                </div>
                <div className="font-bold tracking-tight text-xl tabular mt-0.5">{d.day}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots */}
      <div>
        {loading && (
          <div className="text-sm text-muted-foreground flex items-center gap-3">
            <span className="live-dot" />
            {t.booking.checking}
          </div>
        )}
        {!loading && slots && slots.length === 0 && (
          <div className="text-sm text-muted-foreground">{t.booking.no_slots}</div>
        )}
        {!loading && slots && slots.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map((time) => (
              <button
                key={time}
                type="button"
                disabled={disabled}
                onClick={() => onPick(`${date}T${time}:00`)}
                className="slot text-center disabled:opacity-40 disabled:pointer-events-none"
              >
                {time}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const DOWS_BY_LANG: Record<string, string[]> = {
  lt: ['Sek', 'Pir', 'Ant', 'Tre', 'Ket', 'Pen', 'Šeš'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
};

interface DayCell {
  iso: string;
  day: string;
  dow: string;
}
const pad = (n: number) => String(n).padStart(2, '0');
function nextDays(n: number, lang: string = 'lt'): DayCell[] {
  const dows = DOWS_BY_LANG[lang] ?? DOWS_BY_LANG.lt;
  const out: DayCell[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      day: String(d.getDate()),
      dow: dows[d.getDay()],
    });
  }
  return out;
}
