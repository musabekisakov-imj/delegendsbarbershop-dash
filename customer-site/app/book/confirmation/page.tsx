'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowDownTrayIcon, ArrowUpRightIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useT, useLang } from '@/lib/use-t';
import { publicApi, ApiError } from '@/lib/api';
import { ConfirmedBadge } from '@/components/booking/confirmed-badge';
import type { ConfirmedBooking } from '@/lib/types';

const EASE = [0.16, 1, 0.3, 1] as const;

export default function ConfirmationPage() {
  const t = useT();
  const { lang } = useLang();
  const searchParams = useSearchParams();
  const idParam = searchParams?.get('id') ?? null;
  const [booking, setBooking] = useState<ConfirmedBooking | null>(null);
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // 1. Same-tab path: sessionStorage holds the freshly-confirmed booking
      //    + the email we just submitted (booking-flow stuffs both in).
      const raw = sessionStorage.getItem('barberpro_last_booking');
      if (raw) {
        try {
          const parsed: ConfirmedBooking & { clientEmail?: string } = JSON.parse(raw);
          if (!idParam || parsed.appointmentId === idParam) {
            if (!cancelled) {
              setBooking(parsed);
              if (parsed.clientEmail) setClientEmail(parsed.clientEmail);
              setLoading(false);
            }
            return;
          }
        } catch {
          // Corrupted — fall through to URL-based lookup.
        }
      }

      // 2. Recovered-via-URL path: ?id=… → fetch from the manage API.
      //    The API never exposes client email by design, so we show a
      //    generic "Confirmation emailed" line instead of an address.
      if (idParam) {
        try {
          const fresh = await publicApi.getBooking(idParam);
          if (cancelled) return;
          setBooking({
            appointmentId: fresh.appointmentId,
            startTime: fresh.startTime,
            endTime: fresh.endTime,
            serviceName: fresh.serviceName,
            staffName: fresh.staffName,
            officeName: fresh.officeName,
            officeAddress: fresh.officeAddress,
          });
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 404) {
            // network blip — leave loading true, then fall to empty
          }
        }
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [idParam]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <span className="live-dot" />
          {t.booking.checking}
        </div>
      </main>
    );
  }

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
          <ConfirmedBadge size={96} className="mb-10" />

          <div className="eyebrow mb-6">{t.confirm.eyebrow}</div>

          <h1 className="display text-5xl sm:text-7xl lg:text-8xl mb-6 leading-[0.92]">
            {t.confirm.title_a}
            <span className="text-primary">
              {t.confirm.title_accent(formatDateForLang(start, lang), formatTime(start))}
            </span>
          </h1>

          {/* Email-sent line — visible right under the title.
              Shows the actual address on same-tab loads, generic copy on URL recovery. */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.85, ease: EASE }}
            className="mt-6 inline-flex items-center gap-3 border border-primary/40 bg-primary/5 px-4 py-2.5"
          >
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
              <span className="relative inline-block h-2 w-2 rounded-full bg-primary" />
            </span>
            <EnvelopeIcon className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">
              {clientEmail ? (
                <>
                  {t.confirm.email_sent_to}{' '}
                  <span className="font-mono text-primary tabular">{clientEmail}</span>
                </>
              ) : (
                t.confirm.email_sent_generic
              )}
            </span>
          </motion.div>

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
              href={`/b/${booking.appointmentId}`}
              className="inline-flex items-center bg-foreground text-background pl-5 py-0 pr-0 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <span>{t.manage.eyebrow}</span>
              <span className="border-l border-background/20 p-3 ml-5 inline-flex items-center">
                <ArrowUpRightIcon className="h-4 w-4" />
              </span>
            </Link>
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
    'PRODID:-//De Legends Barbershop//Booking//LT',
    'BEGIN:VEVENT',
    `UID:${b.appointmentId}@delegendsbarbershop.lt`,
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
