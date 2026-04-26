'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ArrowUpRightIcon, ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { publicApi, ApiError } from '@/lib/api';
import type { Office, Service, PublicStaff } from '@/lib/types';
import { cn } from '@/lib/cn';
import { useT, useLang } from '@/lib/use-t';
import {
  translateServiceName,
  translateServiceDescription,
  translateCategory,
} from '@/lib/translate-service';

const EASE = [0.16, 1, 0.3, 1] as const;

// ─── State ────────────────────────────────────────────────────────

interface BookingState {
  officeId?: string;
  serviceId?: string;
  staffId?: string;
  date?: string;
  startTime?: string;
  contact: { firstName: string; lastName: string; email: string; phone: string };
}

const initial: BookingState = {
  contact: { firstName: '', lastName: '', email: '', phone: '+370 ' },
};

interface Props {
  offices: Office[];
  services: Service[];
  staff: PublicStaff[];
}

export function BookingFlow({ offices, services, staff }: Props) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const officeFromUrl = searchParams?.get('office');

  const [state, setState] = useState<BookingState>(() => ({
    ...initial,
    officeId: officeFromUrl ?? offices[0]?.id,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const office = offices.find((o) => o.id === state.officeId);
  const service = services.find((s) => s.id === state.serviceId);
  const selectedStaff = staff.find((s) => s.id === state.staffId);
  const officeServices = useMemo(
    () => services.filter((s) => s.officeId === state.officeId),
    [services, state.officeId],
  );

  const refStaff = useRef<HTMLDivElement>(null);
  const refTime = useRef<HTMLDivElement>(null);
  const refContact = useRef<HTMLDivElement>(null);

  function scrollSoft(ref: React.RefObject<HTMLDivElement | null>) {
    setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
  }

  const canSubmit =
    !!state.officeId && !!state.serviceId && !!state.staffId && !!state.date && !!state.startTime &&
    state.contact.firstName.trim().length > 0 &&
    state.contact.lastName.trim().length > 0 &&
    state.contact.email.includes('@') &&
    state.contact.phone.replace(/\D/g, '').length >= 8;

  async function handleSubmit() {
    if (!canSubmit || !state.serviceId || !state.staffId || !state.officeId || !state.date || !state.startTime) return;
    setSubmitting(true);
    setSubmitError(null);

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
      sessionStorage.setItem('barberpro_last_booking', JSON.stringify(result));
      router.push('/book/confirmation');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSubmitError(t.booking.error_conflict);
        setState((s) => ({ ...s, startTime: undefined }));
        scrollSoft(refTime);
      } else {
        setSubmitError(t.booking.error_generic);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Booking-specific compact header (global nav is hidden on /book/*) */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="page flex h-16 items-center justify-between gap-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="font-medium tracking-tight text-[18px] text-foreground">Kirpykla</span>
          </Link>
          <Progress state={state} t={t} />
          <span className="hidden md:inline text-[10px] uppercase tracking-eyebrow text-muted-foreground/70 tabular">
            {t.booking.flow_subtitle}
          </span>
        </div>
      </header>

      <main className="page pt-12 pb-32">
        {/* ── Step 1: Service ── */}
        <Section eyebrow={t.booking.step_label(1, 4)} title={t.booking.step1_title}>
          {offices.length > 1 && (
            <div className="mb-10">
              <div className="eyebrow mb-3">{t.booking.salon_label}</div>
              <div className="flex flex-wrap gap-2">
                {offices.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() =>
                      setState((s) => ({ ...s, officeId: o.id, serviceId: undefined, staffId: undefined }))
                    }
                    className={cn('chip', state.officeId === o.id && 'chip-active')}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {officeServices.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                durationUnit={t.ui.duration_min}
                selected={state.serviceId === s.id}
                onSelect={() => {
                  setState((st) => ({ ...st, serviceId: s.id, staffId: undefined, startTime: undefined }));
                  scrollSoft(refStaff);
                }}
              />
            ))}
          </div>
        </Section>

        {/* ── Step 2: Staff ── */}
        <div ref={refStaff}>
          <Section
            eyebrow={t.booking.step_label(2, 4)}
            title={t.booking.step2_title}
            disabled={!state.serviceId}
            disabledLabel={t.booking.step2_disabled}
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {staff.map((s) => (
                <StaffTile
                  key={s.id}
                  staff={s}
                  selected={state.staffId === s.id}
                  onSelect={() => {
                    setState((st) => ({ ...st, staffId: s.id, startTime: undefined }));
                    scrollSoft(refTime);
                  }}
                />
              ))}
            </div>
          </Section>
        </div>

        {/* ── Step 3: Date + Time ── */}
        <div ref={refTime}>
          <Section
            eyebrow={t.booking.step_label(3, 4)}
            title={t.booking.step3_title}
            disabled={!state.staffId || !state.serviceId}
            disabledLabel={t.booking.step3_disabled}
          >
            {state.staffId && service && (
              <SlotPicker
                staffId={state.staffId}
                duration={service.duration}
                date={state.date}
                startTime={state.startTime}
                onDate={(d) => setState((s) => ({ ...s, date: d, startTime: undefined }))}
                onSlot={(time) => {
                  setState((s) => ({ ...s, startTime: time }));
                  scrollSoft(refContact);
                }}
              />
            )}
          </Section>
        </div>

        {/* ── Step 4: Contact + Summary ── */}
        <div ref={refContact} id="summary">
          <Section
            eyebrow={t.booking.step_label(4, 4)}
            title={t.booking.step4_title}
            accent={t.booking.step4_accent}
            disabled={!state.startTime}
            disabledLabel={t.booking.step4_disabled}
          >
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
              <div className="lg:col-span-7">
                <ContactForm
                  contact={state.contact}
                  onChange={(c) => setState((s) => ({ ...s, contact: c }))}
                />
                {submitError && (
                  <p className="mt-6 text-sm text-live border-l-2 border-live pl-4">{submitError}</p>
                )}
              </div>

              <aside className="lg:col-span-5">
                <Summary
                  service={service}
                  office={office}
                  staffName={selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : undefined}
                  date={state.date}
                  startTime={state.startTime}
                />
                <button
                  type="button"
                  disabled={!canSubmit || submitting}
                  onClick={handleSubmit}
                  className="inline-flex items-center justify-center w-full bg-primary text-primary-foreground pl-7 py-0 pr-0 text-base font-medium hover:bg-foreground hover:text-background transition-colors duration-200 mt-6 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <span className="flex-1 text-center">
                    {submitting ? t.booking.submitting : t.booking.submit}
                  </span>
                  {!submitting && (
                    <span className="border-l border-black/30 p-4 ml-7 inline-flex items-center">
                      <ArrowUpRightIcon className="h-4 w-4" />
                    </span>
                  )}
                </button>
                <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 text-center font-mono">
                  {t.booking.fineprint}
                </p>
              </aside>
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

// ─── Sub-components ──────────────────────────────────────────────

function Progress({ state, t }: { state: BookingState; t: ReturnType<typeof useT> }) {
  const steps = [
    { done: !!state.serviceId, label: t.booking.progress_step1 },
    { done: !!state.staffId, label: t.booking.progress_step2 },
    { done: !!state.startTime, label: t.booking.progress_step3 },
    { done: state.contact.firstName.length > 0, label: t.booking.progress_step4 },
  ];
  return (
    <ol className="flex items-center gap-3">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-2">
          <span
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-full border tabular text-[10px] transition-all duration-300',
              s.done
                ? 'border-ink bg-ink text-background'
                : 'border-border text-muted-foreground/70',
            )}
          >
            {s.done ? <CheckIcon className="h-3 w-3" /> : i + 1}
          </span>
          <span className="hidden md:inline text-[10px] uppercase tracking-eyebrow text-muted-foreground">
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="hidden md:inline text-muted-foreground/70/40 mx-1">—</span>}
        </li>
      ))}
    </ol>
  );
}

function Section({
  eyebrow,
  title,
  accent,
  children,
  disabled,
  disabledLabel,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  children: React.ReactNode;
  disabled?: boolean;
  disabledLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.7, ease: EASE }}
      className={cn(
        'min-h-[80vh] py-16 transition-opacity duration-500',
        disabled && 'opacity-30 pointer-events-none',
      )}
    >
      <div className="eyebrow mb-4 tabular">{eyebrow}</div>
      <h2 className="font-bold tracking-tight text-4xl sm:text-6xl mb-12 tracking-tight">
        {title}{' '}
        {accent && <span className="text-primary">{accent}</span>}
      </h2>
      {disabled ? (
        <div className="text-sm uppercase tracking-eyebrow text-muted-foreground/70">{disabledLabel}</div>
      ) : (
        children
      )}
    </motion.section>
  );
}

function ServiceCard({
  service,
  selected,
  durationUnit,
  onSelect,
}: {
  service: Service;
  selected: boolean;
  durationUnit: string;
  onSelect: () => void;
}) {
  const { lang } = useLang();
  const name = translateServiceName(service.name, lang);
  const description = translateServiceDescription(service.description, lang);
  const category = service.category?.name ? translateCategory(service.category.name, lang) : '—';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'tile p-6 text-left flex flex-col h-full',
        selected && 'tile-selected',
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className={cn(
            'text-[10px] uppercase tracking-eyebrow',
            selected ? 'text-background/60' : 'text-muted-foreground',
          )}
        >
          {category}
        </span>
        <span
          className={cn(
            'tabular text-[10px] uppercase tracking-eyebrow',
            selected ? 'text-background/60' : 'text-muted-foreground/70',
          )}
        >
          {service.duration} {durationUnit}
        </span>
      </div>

      <h3
        className={cn(
          'display text-2xl sm:text-3xl tracking-tight mb-2',
          selected ? 'text-background' : 'text-foreground',
        )}
      >
        {name}
      </h3>
      {description && (
        <p
          className={cn(
            'text-sm mb-6 line-clamp-2',
            selected ? 'text-background/70' : 'text-muted-foreground',
          )}
        >
          {description}
        </p>
      )}
      <div
        className={cn(
          'mt-auto pt-4 border-t flex items-baseline justify-between',
          selected ? 'border-ink-inverse/15' : 'border-border',
        )}
      >
        <span
          className={cn(
            'display text-3xl tabular',
            selected ? 'text-background' : 'text-foreground',
          )}
        >
          €{service.price}
        </span>
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full border transition-all',
            selected ? 'border-ink-inverse bg-ink-inverse text-foreground' : 'border-border',
          )}
        >
          {selected && <CheckIcon className="h-3.5 w-3.5" />}
        </span>
      </div>
    </button>
  );
}

function StaffTile({
  staff,
  selected,
  onSelect,
}: {
  staff: PublicStaff;
  selected: boolean;
  onSelect: () => void;
}) {
  const initials = `${staff.firstName[0]}${staff.lastName[0]}`.toUpperCase();
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3, ease: EASE }}
      className={cn('tile p-6 text-left flex flex-col gap-5', selected && 'tile-selected')}
    >
      <div
        className={cn(
          'h-14 w-14 rounded-full flex items-center justify-center display text-lg shrink-0',
          selected ? 'bg-ink-inverse text-foreground' : 'bg-muted text-foreground',
        )}
        style={staff.avatarUrl ? { background: `url(${staff.avatarUrl}) center/cover` } : undefined}
      >
        {!staff.avatarUrl && initials}
      </div>
      <div>
        <div className={cn('display text-2xl', selected ? 'text-background' : 'text-foreground')}>
          {staff.firstName}
        </div>
        <div
          className={cn(
            'text-[10px] uppercase tracking-eyebrow mt-1',
            selected ? 'text-background/60' : 'text-muted-foreground',
          )}
        >
          {staff.lastName}
        </div>
      </div>
    </motion.button>
  );
}

// ─── Slot picker ───────────────────────────────────────────────

function SlotPicker({
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
  const t = useT();
  const { lang } = useLang();
  const days = useMemo(() => nextDays(14, lang), [lang]);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      .then((s) => !cancelled && setSlots(s))
      .catch(() => !cancelled && setError(t.booking.no_slots_error))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date, staffId, duration, t]);

  return (
    <>
      <div className="-mx-5 sm:-mx-8 px-5 sm:px-8 overflow-x-auto pb-3 mb-8 no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {days.map((d) => {
            const sel = d.iso === date;
            return (
              <button
                key={d.iso}
                type="button"
                onClick={() => onDate(d.iso)}
                className={cn(
                  'shrink-0 w-16 sm:w-20 py-3 rounded-md border text-center transition-all duration-200',
                  sel ? 'bg-ink text-background border-ink' : 'border-border text-foreground hover:border-ink/40',
                )}
              >
                <div className={cn('text-[9px] uppercase tracking-eyebrow', sel ? 'text-background/60' : 'text-muted-foreground/70')}>
                  {d.dow}
                </div>
                <div className="font-bold tracking-tight text-2xl tabular mt-0.5">{d.day}</div>
                <div className={cn('text-[10px] mt-0.5', sel ? 'text-background/60' : 'text-muted-foreground/70')}>
                  {d.month}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border pt-8">
        <div className="eyebrow mb-5 tabular">{t.booking.available_at} · {duration} {t.booking.duration_visit}</div>

        {loading && (
          <div className="text-sm text-muted-foreground flex items-center gap-3">
            <span className="live-dot" />
            {t.booking.checking}
          </div>
        )}
        {error && <div className="text-sm text-primary">{error}</div>}
        {!loading && slots && slots.length === 0 && (
          <div className="text-sm text-muted-foreground">{t.booking.no_slots}</div>
        )}

        {!loading && slots && slots.length > 0 && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.02 } },
            }}
            className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2"
          >
            {slots.map((t) => (
              <motion.button
                key={t}
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
                }}
                type="button"
                onClick={() => onSlot(t)}
                className={cn('slot text-center', startTime === t && 'slot-selected')}
              >
                {t}
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}

interface DayCell {
  iso: string;
  day: string;
  month: string;
  dow: string;
}

const DOWS_BY_LANG: Record<string, string[]> = {
  lt: ['Sek', 'Pir', 'Ant', 'Tre', 'Ket', 'Pen', 'Šeš'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
};
const MONTHS_BY_LANG: Record<string, string[]> = {
  lt: ['Sau', 'Vas', 'Kov', 'Bal', 'Geg', 'Bir', 'Lie', 'Rgp', 'Rgs', 'Spa', 'Lap', 'Gru'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
};

function nextDays(n: number, lang: string = 'lt'): DayCell[] {
  const dows = DOWS_BY_LANG[lang] ?? DOWS_BY_LANG.lt;
  const months = MONTHS_BY_LANG[lang] ?? MONTHS_BY_LANG.lt;
  const out: DayCell[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      day: String(d.getDate()),
      month: months[d.getMonth()],
      dow: dows[d.getDay()],
    });
  }
  return out;
}

// ─── Contact form ───────────────────────────────────────────────

function ContactForm({
  contact,
  onChange,
}: {
  contact: { firstName: string; lastName: string; email: string; phone: string };
  onChange: (c: { firstName: string; lastName: string; email: string; phone: string }) => void;
}) {
  const t = useT();
  return (
    <div>
      <div className="eyebrow mb-5">{t.booking.contact_label}</div>
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <Field label={t.booking.field_first} value={contact.firstName} onChange={(v) => onChange({ ...contact, firstName: v })} autoComplete="given-name" />
        <Field label={t.booking.field_last} value={contact.lastName} onChange={(v) => onChange({ ...contact, lastName: v })} autoComplete="family-name" />
      </div>
      <Field label={t.booking.field_email} type="email" value={contact.email} onChange={(v) => onChange({ ...contact, email: v })} autoComplete="email" />
      <Field label={t.booking.field_phone} type="tel" value={contact.phone} onChange={(v) => onChange({ ...contact, phone: v })} autoComplete="tel" hint={t.booking.phone_hint} />
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
    <label className="block mb-4">
      <span className="eyebrow block mb-2">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        autoComplete={autoComplete}
        className="w-full px-4 py-3.5 rounded-md border border-border bg-card text-foreground
                   focus:border-ink focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-base"
      />
      {hint && <span className="text-[10px] uppercase tracking-eyebrow text-muted-foreground/70 mt-2 block">{hint}</span>}
    </label>
  );
}

// ─── Summary card ──────────────────────────────────────────────

function Summary({
  service,
  office,
  staffName,
  date,
  startTime,
}: {
  service?: Service;
  office?: Office;
  staffName?: string;
  date?: string;
  startTime?: string;
}) {
  const t = useT();
  const { lang } = useLang();
  return (
    <div className="card p-7 sm:p-8">
      <div className="eyebrow mb-6 flex items-center gap-2">
        <span className="live-dot" />
        {t.booking.summary_title}
      </div>
      <Row label={t.booking.sum_service} value={service ? translateServiceName(service.name, lang) : undefined} />
      <Row label={t.booking.sum_master} value={staffName} />
      <Row label={t.booking.sum_salon} value={office?.name} />
      <Row label={t.booking.sum_address} value={office?.address} />
      <Row label={t.booking.sum_date} value={date ? formatDateForLang(date, lang) : undefined} />
      <Row label={t.booking.sum_time} value={startTime && service ? `${startTime} · ${service.duration} ${t.ui.duration_min}` : undefined} mono />
      <div className="border-t border-border mt-6 pt-6 flex items-baseline justify-between">
        <span className="eyebrow">{t.booking.sum_price}</span>
        <AnimatedPrice price={service?.price} />
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-4 py-2.5 border-b border-border last:border-b-0">
      <div className="eyebrow !text-[9px] mt-1.5">{label}</div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={value ?? 'empty'}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className={cn('text-sm', mono && 'tabular', !value && 'text-muted-foreground/70')}
        >
          {value ?? '—'}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function AnimatedPrice({ price }: { price?: number }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={price ?? 'empty'}
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="font-bold tracking-tight text-4xl tabular text-foreground"
      >
        {price !== undefined ? `€${price}` : '€—'}
      </motion.span>
    </AnimatePresence>
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

function formatDateForLang(iso: string, lang: string = 'lt'): string {
  const months = FULL_MONTHS_BY_LANG[lang] ?? FULL_MONTHS_BY_LANG.lt;
  const dows = FULL_DOWS_BY_LANG[lang] ?? FULL_DOWS_BY_LANG.lt;
  const d = new Date(iso);
  if (lang === 'en') return `${dows[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  return `${dows[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}
