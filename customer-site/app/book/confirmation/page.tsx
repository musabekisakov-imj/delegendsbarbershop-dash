'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckIcon, ArrowDownTrayIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useT, useLang } from '@/lib/use-t';
import type { ConfirmedBooking } from '@/lib/types';

const EASE = [0.16, 1, 0.3, 1] as const;

export default function ConfirmationPage() {
  const t = useT();
  const { lang } = useLang();
  const [booking, setBooking] = useState<ConfirmedBooking | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('barberpro_last_booking');
    if (raw) {
      try {
        setBooking(JSON.parse(raw));
      } catch {
        // Stale or corrupted — show empty state.
      }
    }
  }, []);

  if (!booking) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="text-center">
          <div className="eyebrow mb-5">{t.confirm.empty_eyebrow}</div>
          <h1 className="display text-4xl mb-8">{t.confirm.empty_title}</h1>
          <Link
            href="/book"
            className="inline-flex items-center bg-primary text-primary-foreground pl-5 py-0 pr-0 text-sm font-medium hover:bg-foreground hover:text-background transition-colors"
          >
            <span>{t.confirm.empty_cta}</span>
            <span className="border-l border-black/30 p-3 ml-5 inline-flex items-center">
              <ArrowUpRightIcon className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </main>
    );
  }

  const start = new Date(booking.startTime);

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 30%, oklch(var(--primary) / 0.10), transparent 70%)',
        }}
      />

      <div className="page pt-20 sm:pt-28 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="max-w-3xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground mb-10"
          >
            <CheckIcon className="h-7 w-7" />
          </motion.div>

          <div className="eyebrow mb-6">{t.confirm.eyebrow}</div>

          <h1 className="display text-5xl sm:text-7xl lg:text-8xl mb-6 leading-[0.92]">
            {t.confirm.title_a}
            <span className="text-primary">
              {t.confirm.title_accent(formatDateForLang(start, lang), formatTime(start))}
            </span>
          </h1>

          <p className="mt-8 text-muted-foreground text-lg max-w-xl leading-relaxed">{t.confirm.body}</p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
            className="mt-16 card p-8 sm:p-10"
          >
            <Row label={t.confirm.sum_service} value={booking.serviceName} />
            <Row label={t.confirm.sum_master} value={booking.staffName} />
            <Row label={t.confirm.sum_salon} value={booking.officeName} />
            <Row label={t.confirm.sum_address} value={booking.officeAddress} />
            <Row label={t.confirm.sum_date} value={`${formatLongDateForLang(start, lang)} · ${formatTime(start)}`} mono />
            <div className="border-t border-border mt-6 pt-6 flex items-center justify-between">
              <span className="eyebrow">{t.confirm.sum_id}</span>
              <span className="font-mono text-sm tabular text-foreground">
                #{booking.appointmentId.slice(-8).toUpperCase()}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 flex flex-wrap items-center gap-3"
          >
            <a
              href={icsHref(booking)}
              download={`vizitas-${booking.appointmentId.slice(-6)}.ics`}
              className="inline-flex items-center bg-primary text-primary-foreground pl-5 py-0 pr-0 text-sm font-medium hover:bg-foreground hover:text-background transition-colors"
            >
              <span>{t.confirm.add_calendar}</span>
              <span className="border-l border-black/30 p-3 ml-5 inline-flex items-center">
                <ArrowDownTrayIcon className="h-4 w-4" />
              </span>
            </a>
            <Link
              href="/"
              className="inline-flex items-center bg-transparent text-foreground border border-border-strong pl-5 py-0 pr-0 text-sm font-medium hover:bg-foreground hover:text-background transition-colors"
            >
              <span>{t.confirm.home}</span>
              <span className="border-l border-border-strong p-3 ml-5 inline-flex items-center">
                <ArrowUpRightIcon className="h-4 w-4" />
              </span>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 py-3 border-b border-border last:border-b-0">
      <div className="eyebrow !text-[9px] mt-1.5">{label}</div>
      <div className={mono ? 'tabular text-base text-foreground' : 'text-base text-foreground'}>{value}</div>
    </div>
  );
}

const FULL_MONTHS_BY_LANG: Record<string, string[]> = {
  lt: ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
};
const FULL_DOWS_BY_LANG: Record<string, string[]> = {
  lt: ['sekmadienis', 'pirmadienis', 'antradienis', 'trečiadienis', 'ketvirtadienis', 'penktadienis', 'šeštadienis'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ru: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
};

function formatDateForLang(d: Date, lang: string): string {
  const months = FULL_MONTHS_BY_LANG[lang] ?? FULL_MONTHS_BY_LANG.lt;
  if (lang === 'en') return `${months[d.getMonth()]} ${d.getDate()}`;
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function formatLongDateForLang(d: Date, lang: string): string {
  const dows = FULL_DOWS_BY_LANG[lang] ?? FULL_DOWS_BY_LANG.lt;
  return `${dows[d.getDay()]}, ${formatDateForLang(d, lang)}`;
}

function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

function icsHref(b: ConfirmedBooking): string {
  const fmt = (iso: string) => iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kirpykla Vilnius//Booking//LT',
    'BEGIN:VEVENT',
    `UID:${b.appointmentId}@kirpykla.lt`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(b.startTime)}`,
    `DTEND:${fmt(b.endTime)}`,
    `SUMMARY:${b.serviceName} — ${b.staffName}`,
    `LOCATION:${b.officeAddress}`,
    `DESCRIPTION:Vizitas pas ${b.staffName} (${b.officeName})`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
