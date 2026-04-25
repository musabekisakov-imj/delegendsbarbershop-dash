'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { publicApi, ApiError } from '@/lib/api';
import type { Office, Service, PublicStaff, ConfirmedBooking } from '@/lib/types';
import { cn } from '@/lib/cn';
import { StepIndicator } from './step-indicator';

// ─── State ────────────────────────────────────────────────────────

interface BookingState {
  step: 1 | 2 | 3 | 4;
  officeId?: string;
  serviceId?: string;
  staffId?: string; // never 'any' — we resolve to a concrete barber before fetching slots
  date?: string;    // YYYY-MM-DD
  startTime?: string; // "HH:mm"
  contact: { firstName: string; lastName: string; email: string; phone: string };
}

const initialState: BookingState = {
  step: 1,
  contact: { firstName: '', lastName: '', email: '', phone: '+370 ' },
};

interface Props {
  offices: Office[];
  services: Service[];
  staff: PublicStaff[];
}

export function BookingFlow({ offices, services, staff }: Props) {
  const router = useRouter();
  const [state, setState] = useState<BookingState>(() => ({
    ...initialState,
    officeId: offices[0]?.id,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Derived selections — keep render functions thin.
  const office = offices.find((o) => o.id === state.officeId);
  const service = services.find((s) => s.id === state.serviceId);
  const selectedStaff = staff.find((s) => s.id === state.staffId);

  const canAdvance = useMemo(() => {
    switch (state.step) {
      case 1: return !!state.officeId && !!state.serviceId;
      case 2: return !!state.staffId;
      case 3: return !!state.date && !!state.startTime;
      case 4: return (
        state.contact.firstName.trim().length > 0 &&
        state.contact.lastName.trim().length > 0 &&
        state.contact.email.includes('@') &&
        state.contact.phone.replace(/\D/g, '').length >= 8
      );
    }
  }, [state]);

  const goNext = () => setState((s) => ({ ...s, step: Math.min(4, s.step + 1) as BookingState['step'] }));
  const goBack = () => setState((s) => ({ ...s, step: Math.max(1, s.step - 1) as BookingState['step'] }));

  async function handleSubmit() {
    if (!state.serviceId || !state.staffId || !state.officeId || !state.date || !state.startTime || !service) return;
    setSubmitting(true);
    setSubmitError(null);

    // Compose ISO start time in tenant tz (Europe/Vilnius). The browser's tz
    // is close enough for an MVP — production should use a date library that
    // respects the office's timezone explicitly.
    const [hh, mm] = state.startTime.split(':').map(Number);
    const startDate = new Date(`${state.date}T${pad(hh)}:${pad(mm)}:00`);

    try {
      const result = await publicApi.createBooking({
        officeId: state.officeId,
        serviceId: state.serviceId,
        staffId: state.staffId,
        startTime: startDate.toISOString(),
        client: state.contact,
      });
      // Persist for the confirmation page to read on the next route.
      sessionStorage.setItem('barberpro_last_booking', JSON.stringify(result));
      router.push('/book/confirmation');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSubmitError('Šis laikas ką tik buvo užimtas. Pasirinkite kitą.');
        setState((s) => ({ ...s, step: 3, startTime: undefined }));
      } else {
        setSubmitError('Nepavyko užsakyti. Pabandykite dar kartą arba paskambinkite.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Filter services by chosen office.
  const officeServices = services.filter((s) => s.officeId === state.officeId);

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="border-b border-hairline bg-bg/80 backdrop-blur sticky top-0 z-30">
        <div className="editorial flex h-16 items-center justify-between gap-6">
          <a href="/" className="display text-[20px] tracking-[-0.01em] hover:text-accent transition-colors">
            Kirpykla
          </a>
          <StepIndicator current={state.step} />
        </div>
      </header>

      <main className="flex-1 editorial py-12 sm:py-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="max-w-3xl mx-auto"
          >
            {state.step === 1 && (
              <Step1
                offices={offices}
                services={officeServices}
                officeId={state.officeId}
                serviceId={state.serviceId}
                onOffice={(id) => setState((s) => ({ ...s, officeId: id, serviceId: undefined, staffId: undefined }))}
                onService={(id) => setState((s) => ({ ...s, serviceId: id }))}
              />
            )}
            {state.step === 2 && office && service && (
              <Step2
                staff={staff}
                staffId={state.staffId}
                onStaff={(id) => setState((s) => ({ ...s, staffId: id }))}
              />
            )}
            {state.step === 3 && service && state.staffId && (
              <Step3
                staffId={state.staffId}
                duration={service.duration}
                date={state.date}
                startTime={state.startTime}
                onDate={(d) => setState((s) => ({ ...s, date: d, startTime: undefined }))}
                onSlot={(t) => setState((s) => ({ ...s, startTime: t }))}
              />
            )}
            {state.step === 4 && service && office && (
              <Step4
                contact={state.contact}
                onContact={(c) => setState((s) => ({ ...s, contact: c }))}
                summary={{
                  service,
                  office,
                  staffName: selectedStaff
                    ? `${selectedStaff.firstName} ${selectedStaff.lastName}`
                    : '—',
                  date: state.date!,
                  startTime: state.startTime!,
                }}
                error={submitError}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-hairline bg-bg/95 backdrop-blur sticky bottom-0">
        <div className="editorial h-20 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={goBack}
            disabled={state.step === 1}
            className="btn-secondary"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Atgal</span>
          </button>

          {state.step < 4 ? (
            <button
              type="button"
              disabled={!canAdvance}
              onClick={goNext}
              className="btn-primary"
            >
              Toliau
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!canAdvance || submitting}
              onClick={handleSubmit}
              className="btn-primary"
            >
              {submitting ? 'Užsakoma…' : 'Patvirtinti vizitą'}
              {!submitting && <ArrowRightIcon className="h-4 w-4" />}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

// ─── Step 1 — Office + Service ───────────────────────────────────

function Step1({
  offices,
  services,
  officeId,
  serviceId,
  onOffice,
  onService,
}: {
  offices: Office[];
  services: Service[];
  officeId?: string;
  serviceId?: string;
  onOffice: (id: string) => void;
  onService: (id: string) => void;
}) {
  return (
    <div>
      <div className="eyebrow mb-4">Žingsnis 01 / 04</div>
      <h1 className="display text-4xl sm:text-6xl mb-12">Kuri paslauga ir kur?</h1>

      {offices.length > 1 && (
        <div className="mb-12">
          <div className="eyebrow mb-3">Salonas</div>
          <div className="flex flex-wrap gap-2">
            {offices.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onOffice(o.id)}
                className={cn(
                  'px-5 py-2.5 rounded-[3px] border text-sm transition-all',
                  officeId === o.id
                    ? 'bg-ink text-bg border-ink'
                    : 'bg-transparent text-ink border-hairline hover:border-ink/40',
                )}
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="eyebrow mb-3">Paslauga</div>
      <div className="grid gap-3">
        {services.length === 0 && (
          <p className="text-sm text-ink-muted">Šiuo metu paslaugų sąrašas neprieinamas.</p>
        )}
        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onService(s.id)}
            className={cn(
              'tile p-5 sm:p-6 text-left flex items-center justify-between gap-6',
              serviceId === s.id && 'tile-selected',
            )}
          >
            <div className="min-w-0">
              <div className="display text-xl sm:text-2xl">{s.name}</div>
              {s.description && (
                <div className={cn('text-sm mt-1.5 truncate', serviceId === s.id ? 'text-bg/70' : 'text-ink-muted')}>
                  {s.description}
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-4 shrink-0">
              <span className={cn('text-xs tabular', serviceId === s.id ? 'text-bg/70' : 'text-ink-subtle')}>
                {s.duration} min
              </span>
              <span className={cn('display text-2xl tabular', serviceId === s.id ? 'text-bg' : 'text-accent')}>
                €{s.price}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2 — Staff ──────────────────────────────────────────────

function Step2({
  staff,
  staffId,
  onStaff,
}: {
  staff: PublicStaff[];
  staffId?: string;
  onStaff: (id: string) => void;
}) {
  return (
    <div>
      <div className="eyebrow mb-4">Žingsnis 02 / 04</div>
      <h1 className="display text-4xl sm:text-6xl mb-12">Pas kurį meistrą?</h1>

      <div className="grid sm:grid-cols-2 gap-4">
        {staff.map((s) => {
          const selected = staffId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onStaff(s.id)}
              className={cn(
                'tile p-6 text-left flex items-center gap-5',
                selected && 'tile-selected',
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'h-16 w-16 rounded-full shrink-0 flex items-center justify-center display text-xl tabular',
                  selected ? 'bg-bg/15 text-bg' : 'bg-accent/10 text-accent',
                )}
                style={
                  s.avatarUrl
                    ? { background: `url(${s.avatarUrl}) center/cover` }
                    : undefined
                }
              >
                {!s.avatarUrl && initials(s.firstName, s.lastName)}
              </div>
              <div className="min-w-0">
                <div className="display text-2xl">{s.firstName}</div>
                <div className={cn('text-xs uppercase tracking-eyebrow mt-1', selected ? 'text-bg/60' : 'text-ink-subtle')}>
                  {s.lastName}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function initials(a: string, b: string) {
  return `${a.charAt(0)}${b.charAt(0)}`.toUpperCase();
}

// ─── Step 3 — Date + Time ────────────────────────────────────────

function Step3({
  staffId,
  duration,
  date,
  startTime,
  onDate,
  onSlot,
}: {
  staffId: string;
  duration: number;
  date?: string;
  startTime?: string;
  onDate: (d: string) => void;
  onSlot: (t: string) => void;
}) {
  const days = useMemo(() => nextDays(14), []);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-pick today on first render if nothing chosen.
  useEffect(() => {
    if (!date) onDate(days[0].iso);
  }, [date, days, onDate]);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    publicApi
      .availability({ staffId, date, duration })
      .then((s) => {
        if (!cancelled) setSlots(s);
      })
      .catch(() => {
        if (!cancelled) setError('Nepavyko gauti laisvų laikų.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, staffId, duration]);

  return (
    <div>
      <div className="eyebrow mb-4">Žingsnis 03 / 04</div>
      <h1 className="display text-4xl sm:text-6xl mb-12">Pasirinkite laiką.</h1>

      {/* Date strip — horizontal scroll on mobile */}
      <div className="-mx-6 sm:-mx-10 px-6 sm:px-10 overflow-x-auto pb-4 mb-10">
        <div className="flex gap-2 min-w-max">
          {days.map((d) => {
            const selected = d.iso === date;
            return (
              <button
                key={d.iso}
                type="button"
                onClick={() => onDate(d.iso)}
                className={cn(
                  'shrink-0 w-16 sm:w-20 py-3 rounded-[3px] border text-center transition-all',
                  selected ? 'bg-ink text-bg border-ink' : 'border-hairline text-ink hover:border-ink/40',
                )}
              >
                <div className={cn('text-[10px] uppercase tracking-eyebrow', selected ? 'text-bg/60' : 'text-ink-subtle')}>
                  {d.dow}
                </div>
                <div className="display text-2xl tabular mt-1">{d.day}</div>
                <div className={cn('text-[10px] mt-0.5', selected ? 'text-bg/60' : 'text-ink-subtle')}>
                  {d.month}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hairline pt-10">
        <div className="eyebrow mb-4">Laisvi laikai · {duration} min vizitas</div>

        {loading && <div className="text-sm text-ink-muted">Tikrinama…</div>}
        {error && <div className="text-sm text-warn">{error}</div>}
        {!loading && slots && slots.length === 0 && (
          <div className="text-sm text-ink-muted">
            Šią dieną pasirinktam meistrui laisvų laikų nėra. Pabandykite kitą dieną.
          </div>
        )}

        {!loading && slots && slots.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {slots.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onSlot(t)}
                className={cn(
                  'py-3 rounded-[3px] border text-center tabular text-sm transition-all',
                  startTime === t
                    ? 'bg-ink text-bg border-ink'
                    : 'border-hairline text-ink hover:border-ink/40',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface DayCell {
  iso: string;
  day: string;
  month: string;
  dow: string;
}

function nextDays(n: number): DayCell[] {
  const dows = ['Sek', 'Pir', 'Ant', 'Tre', 'Ket', 'Pen', 'Šeš'];
  const months = ['Sau', 'Vas', 'Kov', 'Bal', 'Geg', 'Bir', 'Lie', 'Rgp', 'Rgs', 'Spa', 'Lap', 'Gru'];
  const out: DayCell[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      day: String(d.getDate()),
      month: months[d.getMonth()],
      dow: dows[d.getDay()],
    });
  }
  return out;
}

// ─── Step 4 — Contact + Review ───────────────────────────────────

function Step4({
  contact,
  onContact,
  summary,
  error,
}: {
  contact: { firstName: string; lastName: string; email: string; phone: string };
  onContact: (c: { firstName: string; lastName: string; email: string; phone: string }) => void;
  summary: { service: Service; office: Office; staffName: string; date: string; startTime: string };
  error: string | null;
}) {
  return (
    <div>
      <div className="eyebrow mb-4">Žingsnis 04 / 04</div>
      <h1 className="display text-4xl sm:text-6xl mb-12">Beveik baigta.</h1>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Contact form */}
        <div>
          <div className="eyebrow mb-4">Jūsų kontaktai</div>

          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <Field
              label="Vardas"
              value={contact.firstName}
              onChange={(v) => onContact({ ...contact, firstName: v })}
              autoComplete="given-name"
            />
            <Field
              label="Pavardė"
              value={contact.lastName}
              onChange={(v) => onContact({ ...contact, lastName: v })}
              autoComplete="family-name"
            />
          </div>
          <Field
            label="El. paštas"
            type="email"
            value={contact.email}
            onChange={(v) => onContact({ ...contact, email: v })}
            autoComplete="email"
          />
          <Field
            label="Telefonas"
            type="tel"
            value={contact.phone}
            onChange={(v) => onContact({ ...contact, phone: v })}
            autoComplete="tel"
            hint="Reikalingas tik priminimui."
          />

          {error && (
            <p className="mt-6 text-sm text-warn border-l-2 border-warn pl-4">{error}</p>
          )}
        </div>

        {/* Summary */}
        <aside className="bg-bg-raised rounded-[3px] p-8 self-start">
          <div className="eyebrow mb-6">Vizitas</div>
          <SummaryRow label="Paslauga" value={summary.service.name} />
          <SummaryRow label="Meistras" value={summary.staffName} />
          <SummaryRow label="Salonas" value={summary.office.name} />
          <SummaryRow label="Adresas" value={summary.office.address} />
          <SummaryRow label="Data" value={formatDateLT(summary.date)} />
          <SummaryRow label="Laikas" value={`${summary.startTime} · ${summary.service.duration} min`} mono />
          <div className="hairline mt-6 pt-6 flex items-baseline justify-between">
            <span className="eyebrow">Kaina</span>
            <span className="display text-3xl tabular text-accent">€{summary.service.price}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-4 py-2">
      <div className="eyebrow !text-[10px] mt-1">{label}</div>
      <div className={cn('text-sm', mono && 'tabular')}>{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="block mb-3">
      <span className="eyebrow !text-[10px] block mb-2">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        autoComplete={autoComplete}
        className="w-full px-4 py-3 rounded-[3px] border border-hairline bg-bg-surface text-ink
                   focus:border-ink focus:outline-none transition-colors text-sm"
      />
      {hint && <span className="text-xs text-ink-subtle mt-1.5 block">{hint}</span>}
    </label>
  );
}

function formatDateLT(iso: string): string {
  const months = ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'];
  const dows = ['sekmadienis', 'pirmadienis', 'antradienis', 'trečiadienis', 'ketvirtadienis', 'penktadienis', 'šeštadienis'];
  const d = new Date(iso);
  return `${dows[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}
