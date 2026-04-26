'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckIcon, ArrowDownTrayIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import type { ConfirmedBooking } from '@/lib/types';

const EASE = [0.16, 1, 0.3, 1] as const;

export default function ConfirmationPage() {
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
          <div className="eyebrow mb-5">Nieko nerasta</div>
          <h1 className="font-bold tracking-tight text-4xl mb-8">Vizitas neaptiktas.</h1>
          <Link href="/book" className="btn-primary">Užsisakyti naują</Link>
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
          background:
            'radial-gradient(ellipse 50% 40% at 50% 30%, rgba(124,38,48,0.10), transparent 70%)',
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
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-background mb-10"
          >
            <CheckIcon className="h-7 w-7" />
          </motion.div>

          <div className="eyebrow mb-6">Vizitas patvirtintas · Iki susitikimo</div>

          <h1 className="font-bold tracking-tight text-5xl sm:text-7xl lg:text-8xl tracking-tight mb-6 leading-[0.92]">
            Lauksime jūsų{' '}
            <span className="text-primary">
              {formatDateLT(start)} {formatTime(start)}.
            </span>
          </h1>

          <p className="mt-8 text-muted-foreground text-lg max-w-xl leading-relaxed">
            Patvirtinimo el. laišką ką tik išsiuntėme. Jei reikia atšaukti
            arba perkelti vizitą — paskambinkite į saloną.
            Mokėti galėsite vietoje grynaisiais arba kortele.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
            className="mt-16 card p-8 sm:p-10"
          >
            <Row label="Paslauga" value={booking.serviceName} />
            <Row label="Meistras" value={booking.staffName} />
            <Row label="Salonas" value={booking.officeName} />
            <Row label="Adresas" value={booking.officeAddress} />
            <Row label="Data" value={`${formatLongDateLT(start)} · ${formatTime(start)}`} mono />
            <div className="border-t border-border mt-6 pt-6 flex items-center justify-between">
              <span className="eyebrow">Rezervacijos Nr.</span>
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
              className="btn-primary"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Įsidėti į kalendorių
            </a>
            <Link href="/" className="btn-ghost">
              Į pradžią
              <ArrowUpRightIcon className="h-4 w-4" />
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

function formatDateLT(d: Date): string {
  const months = ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function formatLongDateLT(d: Date): string {
  const dows = ['sekmadienis', 'pirmadienis', 'antradienis', 'trečiadienis', 'ketvirtadienis', 'penktadienis', 'šeštadienis'];
  return `${dows[d.getDay()]}, ${formatDateLT(d)}`;
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
