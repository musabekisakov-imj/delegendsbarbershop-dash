'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import type { ConfirmedBooking } from '@/lib/types';

export default function ConfirmationPage() {
  const [booking, setBooking] = useState<ConfirmedBooking | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('barberpro_last_booking');
    if (raw) {
      try {
        setBooking(JSON.parse(raw));
      } catch {
        // Stale or corrupted — show the empty state below.
      }
    }
  }, []);

  if (!booking) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-bg">
        <div className="text-center">
          <div className="eyebrow mb-4">Nieko nerasta</div>
          <h1 className="display text-3xl mb-6">Vizitas neaptiktas.</h1>
          <Link href="/book" className="btn-primary">Užsisakyti naują</Link>
        </div>
      </main>
    );
  }

  const start = new Date(booking.startTime);

  return (
    <main className="min-h-screen bg-bg">
      <div className="editorial pt-20 sm:pt-32 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-ok/10 text-ok mb-8">
            <CheckIcon className="h-7 w-7" />
          </div>
          <div className="eyebrow mb-6">Patvirtinta · Iki greito</div>
          <h1 className="display text-5xl sm:text-7xl leading-[0.95]">
            Lauksime jūsų<br />
            <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
              {formatDateLT(start)} {formatTimeShort(start)}.
            </span>
          </h1>
          <p className="mt-8 text-ink-muted">
            Patvirtinimo el. laišką netrukus išsiuntėme. Jei reikia atšaukti — paskambinkite į saloną.
          </p>

          <div className="mt-16 bg-bg-raised rounded-[3px] p-8 sm:p-10 text-left">
            <Row label="Paslauga" value={booking.serviceName} />
            <Row label="Meistras" value={booking.staffName} />
            <Row label="Salonas" value={booking.officeName} />
            <Row label="Adresas" value={booking.officeAddress} />
            <Row label="Data" value={`${formatDateLT(start)}, ${formatTime(start)}`} mono />
            <div className="hairline mt-6 pt-6 flex items-center justify-between">
              <span className="eyebrow">Rezervacijos Nr.</span>
              <span className="font-mono text-sm tabular text-ink-muted">
                {booking.appointmentId.slice(-8).toUpperCase()}
              </span>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <a
              href={icsHref(booking)}
              download={`vizitas-${booking.appointmentId.slice(-6)}.ics`}
              className="btn-secondary"
            >
              Pridėti į kalendorių
            </a>
            <Link href="/" className="btn-secondary">Į pradžią</Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 py-2">
      <div className="eyebrow !text-[10px] mt-1.5">{label}</div>
      <div className={mono ? 'tabular text-sm' : 'text-sm'}>{value}</div>
    </div>
  );
}

function formatDateLT(d: Date): string {
  const months = ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTimeShort(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

function icsHref(b: ConfirmedBooking): string {
  // Minimal RFC 5545 — enough for Apple Calendar / Google Calendar to import.
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
