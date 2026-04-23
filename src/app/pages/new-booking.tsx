import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import {
  appointmentsApi, clientsApi, staffApi, servicesApi, shiftsApi, breaksApi,
} from '../lib/api';
import { useOfficeStore } from '../store/office-store';
import { useAuthStore } from '../store/auth-store';
import { findConflicts } from '../lib/booking-validation';
import { computeAvailableSlots } from '../lib/availability';
import { useT, useTimeFormat } from '../hooks/use-t';
import { formatTime } from '../lib/time';
import { AVATAR_GRADIENTS, hashToIndex } from '../lib/tokens';
import type { Appointment } from '../types';

import { PageHeader } from '../components/shared/page-header';
import { SectionHeading } from '../components/shared/section-heading';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../components/ui/dialog';
import { EmptyState } from '../components/shared/empty-state';
import { cn } from '../components/ui/utils';
import {
  UserIcon, ScissorsIcon, UsersIcon, CalendarDaysIcon, ClockIcon,
  CheckCircleIcon, ExclamationTriangleIcon, ArrowLeftIcon, ArrowRightIcon,
  MapPinIcon, CurrencyEuroIcon, PlusIcon,
} from '@heroicons/react/24/outline';
import { format, addDays, startOfDay, isSameDay, isToday, isTomorrow } from 'date-fns';
import { toast } from 'sonner';

// ─── Config ─────────────────────────────────────
// Wizard steps — order matters: staff must be picked before date so we can
// compute availability; time is computed from staff+date+service-duration.
const STEPS = [
  { key: 'client',  label: 'Client',  icon: UserIcon },
  { key: 'service', label: 'Service', icon: ScissorsIcon },
  { key: 'staff',   label: 'Barber',  icon: UsersIcon },
  { key: 'when',    label: 'When',    icon: CalendarDaysIcon },
  { key: 'confirm', label: 'Confirm', icon: CheckCircleIcon },
] as const;

const DATE_OPTIONS = 14; // show two weeks of pickable dates

type FormData = {
  clientId: string;
  serviceId: string;
  staffId: string;
  slotIso: string;  // ISO start-of-slot; paired with selectedService to derive end
  notes: string;
};

// ─── Page ─────────────────────────────────────
export function NewBookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const t = useT();
  const [timeFormat] = useTimeFormat();

  const officeId = useOfficeStore(s => s.currentOfficeId);
  const offices = useOfficeStore(s => s.offices);
  const currentOffice = offices.find(o => o.id === officeId);
  const userRole = useAuthStore(s => s.user?.role);
  const canOverride = userRole === 'owner' || userRole === 'manager';

  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [form, setForm] = useState<FormData>({
    clientId: searchParams.get('clientId') ?? '',
    serviceId: searchParams.get('serviceId') ?? '',
    staffId: searchParams.get('staffId') ?? '',
    slotIso: '',
    notes: '',
  });
  const [clientSearch, setClientSearch] = useState('');
  const [newClient, setNewClient] = useState({ firstName: '', lastName: '', phone: '', email: '' });
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Editable custom time — owner/manager use this to book off-grid times or book
  // past the 14-day strip. Empty string means "use selected slot from the grid".
  const [customTime, setCustomTime] = useState('');

  const [conflict, setConflict] = useState<{ conflicts: ReturnType<typeof findConflicts>; pending: Omit<Appointment, 'id' | 'createdAt'> } | null>(null);

  // Book-again URL params pre-select first 3 steps → jump to date/time
  useEffect(() => {
    if (form.clientId && form.serviceId && form.staffId) setStep(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Data ─────────────────────────────────────
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', officeId],
    queryFn: () => clientsApi.getAll(officeId),
  });
  const { data: services = [] } = useQuery({
    queryKey: ['services', officeId],
    queryFn: () => servicesApi.getAll(officeId),
  });
  const { data: staff = [] } = useQuery({
    queryKey: ['staff', officeId],
    queryFn: () => staffApi.getAll(officeId),
  });
  const { data: allAppointments = [] } = useQuery({
    queryKey: ['appointments', 'all-offices'],
    queryFn: () => appointmentsApi.getAllAcrossOffices(),
  });
  const { data: staffShifts = [] } = useQuery({
    queryKey: ['shifts', form.staffId],
    queryFn: () => shiftsApi.getByStaffId(form.staffId),
    enabled: !!form.staffId,
  });
  const { data: staffBreaks = [] } = useQuery({
    queryKey: ['breaks', form.staffId],
    queryFn: () => breaksApi.getByStaffId(form.staffId),
    enabled: !!form.staffId,
  });

  const activeStaff = useMemo(() => staff.filter(s => s.isActive), [staff]);
  const selectedClient = clients.find(c => c.id === form.clientId);
  const selectedService = services.find(s => s.id === form.serviceId);
  const selectedStaff = staff.find(s => s.id === form.staffId);

  // ─── Slot computation ─────────────────────────────
  // THIS is the fix: we only generate slots for the staff+date combo,
  // and we subtract breaks and existing bookings. No more static 8-20 grid.
  const slots = useMemo(() => {
    if (!selectedService || !form.staffId) return [];
    const staffAppointments = allAppointments.filter(a => a.staffId === form.staffId);
    return computeAvailableSlots({
      date: selectedDate,
      serviceMin: selectedService.duration,
      shifts: staffShifts,
      breaks: staffBreaks,
      appointments: staffAppointments,
      granularityMin: 30,
    });
  }, [selectedService, form.staffId, selectedDate, staffShifts, staffBreaks, allAppointments]);

  const slotsByPeriod = useMemo(() => {
    return {
      morning: slots.filter(s => s.start.getHours() < 12),
      afternoon: slots.filter(s => s.start.getHours() >= 12 && s.start.getHours() < 17),
      evening: slots.filter(s => s.start.getHours() >= 17),
    };
  }, [slots]);

  // ─── Mutations ─────────────────────────────────
  const createMut = useMutation({
    mutationFn: (payload: Omit<Appointment, 'id' | 'createdAt'> & { override?: boolean }) =>
      appointmentsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success(t('toast.bookingCreated'));
      navigate('/bookings');
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code === 'BOOKING_CONFLICT') toast.error(t('toast.bookingConflict'));
      else toast.error(t('toast.bookingCreateError'));
    },
  });

  // Inline-create a client when search returns no match.
  // On success we select the new client and advance the wizard.
  const createClientMut = useMutation({
    mutationFn: (data: Parameters<typeof clientsApi.create>[0]) => clientsApi.create(data),
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setForm(f => ({ ...f, clientId: c.id }));
      setNewClient({ firstName: '', lastName: '', phone: '', email: '' });
      setIsCreatingClient(false);
      setClientSearch('');
      toast.success(t('toast.clientCreated'));
      // Auto-advance to the next step so the receptionist keeps flow.
      setStep(s => Math.min(s + 1, STEPS.length - 1));
    },
    onError: () => toast.error(t('toast.clientCreateError')),
  });

  // ─── Step helpers ─────────────────────────────
  // Either a slot was picked from the computed grid OR a custom HH:mm was typed.
  const hasWhen = !!form.slotIso || /^\d{2}:\d{2}$/.test(customTime);

  const canContinue = (() => {
    switch (step) {
      case 0: return !!form.clientId;
      case 1: return !!form.serviceId;
      case 2: return !!form.staffId;
      case 3: return hasWhen;
      default: return true;
    }
  })();

  const handleNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  // Resolve the final start Date — prefers customTime when the user typed one.
  const resolveStart = (): Date | null => {
    if (customTime) {
      const [hh, mm] = customTime.split(':').map(Number);
      if (isNaN(hh) || isNaN(mm)) return null;
      const d = new Date(selectedDate);
      d.setHours(hh, mm, 0, 0);
      return d;
    }
    return form.slotIso ? new Date(form.slotIso) : null;
  };

  const handleSubmit = () => {
    if (!selectedService || !form.clientId || !form.staffId) {
      toast.error(t('toast.completeAllSteps'));
      return;
    }
    const start = resolveStart();
    if (!start) {
      toast.error(t('toast.completeAllSteps'));
      return;
    }
    const end = new Date(start.getTime() + selectedService.duration * 60_000);
    const payload: Omit<Appointment, 'id' | 'createdAt'> = {
      clientId: form.clientId,
      serviceId: form.serviceId,
      staffId: form.staffId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      status: 'scheduled',
      notes: form.notes,
      locationId: officeId,
    };
    const conflicts = findConflicts(
      { staffId: payload.staffId, start, end },
      allAppointments,
      offices,
    );
    if (conflicts.length > 0) {
      setConflict({ conflicts, pending: payload });
      return;
    }
    createMut.mutate(payload);
  };

  const clientsFiltered = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  // ─── Render ─────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="New Booking"
        description={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step].label}`}
      />

      {/* Stepper */}
      <Stepper step={step} onJump={(i) => i < step && setStep(i)} />

      {/* Two-column layout: form (2/3) + live summary (1/3) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">

          {/* STEP 0 — Client (autocomplete + inline create) */}
          {step === 0 && (
            <StepCard
              title="Who is this booking for?"
              subtitle="Start typing — we'll find them if they've been in before, or you can add them now."
            >
              <div className="mb-4 flex gap-2">
                <Input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setIsCreatingClient(false); }}
                  placeholder="Name, phone (e.g. +370...) or email..."
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreatingClient(true);
                    // Pre-fill whichever field the search query looks most like.
                    const q = clientSearch.trim();
                    const looksLikePhone = /[\d+()]/.test(q);
                    const looksLikeEmail = q.includes('@');
                    setNewClient({
                      firstName: !looksLikePhone && !looksLikeEmail ? q : '',
                      lastName: '',
                      phone: looksLikePhone ? q : '',
                      email: looksLikeEmail ? q : '',
                    });
                  }}
                >
                  + New client
                </Button>
              </div>

              {isCreatingClient ? (
                <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Adding new client</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">First name *</Label>
                      <Input className="mt-1" value={newClient.firstName} onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Last name</Label>
                      <Input className="mt-1" value={newClient.lastName} onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Phone *</Label>
                      <Input className="mt-1" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} placeholder="+370 600 12345" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                      <Input type="email" className="mt-1" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" onClick={() => setIsCreatingClient(false)}>Cancel</Button>
                    <Button
                      loading={createClientMut.isPending}
                      disabled={!newClient.firstName.trim() || !newClient.phone.trim()}
                      onClick={() => createClientMut.mutate({
                        firstName: newClient.firstName.trim(),
                        lastName:  newClient.lastName.trim(),
                        phone:     newClient.phone.trim(),
                        email:     newClient.email.trim(),
                        notes:     '',
                        officeIds: [officeId],
                      })}
                    >
                      Create & continue
                    </Button>
                  </div>
                </div>
              ) : clientsFiltered.length === 0 ? (
                <EmptyState
                  variant="plain"
                  icon={UserIcon}
                  title={clientSearch ? `No one matches “${clientSearch}”` : 'No clients yet'}
                  description="If this is a new customer, add them now — we'll remember them for next time."
                  action={
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreatingClient(true);
                        const q = clientSearch.trim();
                        const looksLikePhone = /[\d+()]/.test(q);
                        const looksLikeEmail = q.includes('@');
                        setNewClient({
                          firstName: !looksLikePhone && !looksLikeEmail ? q : '',
                          lastName: '',
                          phone: looksLikePhone ? q : '',
                          email: looksLikeEmail ? q : '',
                        });
                      }}
                    >
                      <PlusIcon className="h-4 w-4 mr-1.5" />
                      Add as new client
                    </Button>
                  }
                />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 max-h-[360px] overflow-y-auto pr-1">
                  {clientsFiltered.map(c => {
                    const active = form.clientId === c.id;
                    const grad = AVATAR_GRADIENTS[hashToIndex(c.id, AVATAR_GRADIENTS.length)];
                    const lastVisit = c.lastVisitAt ? format(new Date(c.lastVisitAt), 'MMM d') : null;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setForm({ ...form, clientId: c.id })}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                          active
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border bg-card hover:border-foreground/20 hover:bg-accent/30',
                        )}
                      >
                        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white', grad)}>
                          {c.firstName[0]}{c.lastName[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">{c.firstName} {c.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate tabular-nums">{c.phone}</p>
                          {lastVisit && (
                            <p className="text-[11px] text-muted-foreground/80 truncate">Last visit · {lastVisit}</p>
                          )}
                        </div>
                        {c.totalVisits > 0 && (
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums" title={`${c.totalVisits} previous visits`}>
                            {c.totalVisits}×
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </StepCard>
          )}

          {/* STEP 1 — Service */}
          {step === 1 && (
            <StepCard title="What service?" subtitle="Duration affects available time slots.">
              <div className="grid gap-2 sm:grid-cols-2">
                {services.map(svc => {
                  const active = form.serviceId === svc.id;
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => setForm({ ...form, serviceId: svc.id })}
                      className={cn(
                        'flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition-all',
                        active
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border bg-card hover:border-foreground/20 hover:bg-accent/30',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate">{svc.name}</p>
                        {svc.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{svc.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold tabular-nums text-foreground">€{svc.price}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">{svc.duration} min</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </StepCard>
          )}

          {/* STEP 2 — Staff */}
          {step === 2 && (
            <StepCard title="Which barber?" subtitle="Pick one of the active team members. Availability is checked next.">
              {activeStaff.length === 0 ? (
                <EmptyState
                  variant="plain"
                  icon={UsersIcon}
                  title="No active staff"
                  description="Activate a staff member from the Staff page to take bookings."
                />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeStaff.map(m => {
                    const active = form.staffId === m.id;
                    const grad = AVATAR_GRADIENTS[hashToIndex(m.id, AVATAR_GRADIENTS.length)];
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, staffId: m.id, slotIso: '' });
                          // Clear typed time too — availability is staff-scoped.
                          setCustomTime('');
                        }}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                          active
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border bg-card hover:border-foreground/20 hover:bg-accent/30',
                        )}
                      >
                        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white', grad)}>
                          {m.firstName[0]}{m.lastName[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground truncate">{m.firstName} {m.lastName}</p>
                          <p className="text-xs capitalize text-muted-foreground">{m.role}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </StepCard>
          )}

          {/* STEP 3 — Date & Time (computed availability) */}
          {step === 3 && (
            <StepCard
              title="Pick a date & time"
              subtitle={
                selectedStaff && selectedService
                  ? `Available slots for ${selectedStaff.firstName} ${selectedStaff.lastName} · ${selectedService.duration} min service`
                  : 'Select a service and staff first.'
              }
            >
              {/* Date strip — first 14 days, plus an editable date input for beyond-range */}
              <div className="mb-6">
                <div className="flex items-end justify-between gap-3 mb-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</Label>
                  <Input
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      // `yyyy-MM-dd` parses as UTC midnight; normalize to local day.
                      const [y, m, d] = e.target.value.split('-').map(Number);
                      setSelectedDate(startOfDay(new Date(y, m - 1, d)));
                      setForm(f => ({ ...f, slotIso: '' }));
                    }}
                    className="w-auto tabular-nums text-sm"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {Array.from({ length: DATE_OPTIONS }, (_, i) => {
                    const date = addDays(new Date(), i);
                    const active = isSameDay(date, selectedDate);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setSelectedDate(startOfDay(date)); setForm(f => ({ ...f, slotIso: '' })); }}
                        className={cn(
                          'rounded-xl border p-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                          active
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border-border bg-card hover:border-foreground/20 hover:bg-accent/30',
                        )}
                      >
                        <p className={cn('text-[10px] font-semibold uppercase tracking-wider',
                          active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                          {isToday(date) ? 'Today' : isTomorrow(date) ? 'Tmrw' : format(date, 'EEE')}
                        </p>
                        <p className={cn('mt-0.5 text-lg font-bold tabular-nums leading-none',
                          active ? 'text-primary-foreground' : 'text-foreground')}>
                          {format(date, 'd')}
                        </p>
                        <p className={cn('mt-0.5 text-[10px] tabular-nums',
                          active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                          {format(date, 'MMM')}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time slots — only when staff+service picked, else explain */}
              {!selectedStaff || !selectedService ? (
                <EmptyState
                  variant="plain"
                  icon={ClockIcon}
                  title="Pick a barber and service first"
                  description="Time slots depend on each barber's shifts and the service duration."
                />
              ) : slots.length === 0 ? (
                <EmptyState
                  variant="plain"
                  icon={ClockIcon}
                  title={`No availability on ${format(selectedDate, 'EEE, MMM d')}`}
                  description={`${selectedStaff.firstName} isn't rostered or is fully booked that day. Try another date.`}
                />
              ) : (
                <div className="space-y-5">
                  {(['morning', 'afternoon', 'evening'] as const).map(period => {
                    const periodSlots = slotsByPeriod[period];
                    if (periodSlots.length === 0) return null;
                    return (
                      <div key={period}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t(`calendar.${period}`)}
                        </p>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                          {periodSlots.map(s => {
                            const active = form.slotIso === s.iso;
                            return (
                              <button
                                key={s.iso}
                                type="button"
                                onClick={() => setForm({ ...form, slotIso: s.iso })}
                                className={cn(
                                  'rounded-lg border py-2.5 text-sm font-semibold tabular-nums transition-all',
                                  active
                                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                    : 'border-border bg-card text-foreground hover:border-foreground/20 hover:bg-accent/40',
                                )}
                              >
                                {formatTime(s.start, timeFormat)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ─── Or pick an exact time ─────────────────────────── */}
              {/* Even when slots are shown, owner/receptionist often needs to type
                  a precise time (e.g. 10:45 when the grid is on :00/:30). Conflict
                  detection still runs on submit. */}
              <div className="mt-6 border-t border-border pt-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Or type an exact time
                  </Label>
                  {customTime && (
                    <button
                      type="button"
                      onClick={() => setCustomTime('')}
                      className="text-[11px] font-medium text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="time"
                    step={300}
                    value={customTime}
                    onChange={(e) => {
                      setCustomTime(e.target.value);
                      // Typing a custom time clears any slot selection so the
                      // summary + submit path uses this value.
                      if (e.target.value) setForm(f => ({ ...f, slotIso: '' }));
                    }}
                    className="w-40 tabular-nums"
                  />
                  <p className="text-xs text-muted-foreground">
                    Overrides the slot grid. We'll still check for conflicts.
                  </p>
                </div>
              </div>
            </StepCard>
          )}

          {/* STEP 4 — Confirm + notes */}
          {step === 4 && (
            <StepCard title="Review & confirm" subtitle="Anything to add?">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes (optional)</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Allergies, special requests, styling preferences..."
                  className="mt-2"
                  rows={4}
                />
              </div>
            </StepCard>
          )}

          {/* Nav — sticky at the bottom of the viewport on long steps (time-slot grid)
              so the user never scrolls back up to hit Continue. Sits inside the form column
              so the summary sidebar isn't covered. */}
          <div className="sticky bottom-0 z-10 -mx-4 md:mx-0 mt-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border md:rounded-xl md:border md:shadow-sm">
            <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
              <Button variant="outline" onClick={() => navigate('/bookings')}>Cancel</Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleBack} disabled={step === 0}>
                  <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
                  Back
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button onClick={handleNext} disabled={!canContinue}>
                    Continue
                    <ArrowRightIcon className="h-4 w-4 ml-1.5" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} loading={createMut.isPending}>
                    <CheckCircleIcon className="h-4 w-4 mr-1.5" />
                    Create Booking
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky summary */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your booking
            </p>
            <h3 className="mt-1 text-base font-bold text-foreground">{currentOffice?.name ?? 'Shop'}</h3>
            {currentOffice?.address && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPinIcon className="h-3 w-3" />
                {currentOffice.address}
              </p>
            )}

            <div className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
              <SummaryRow label="Client" value={
                selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : null
              }/>
              <SummaryRow label="Service" value={selectedService?.name ?? null} />
              <SummaryRow label="Barber" value={
                selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : null
              } />
              <SummaryRow
                label="When"
                value={(() => {
                  const start = resolveStart();
                  return start ? `${format(start, 'EEE, MMM d')} · ${formatTime(start, timeFormat)}` : null;
                })()}
              />
            </div>

            {selectedService && (
              <div className="mt-5 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <CurrencyEuroIcon className="h-3.5 w-3.5" />
                  Total
                </span>
                <span className="text-base font-bold tabular-nums text-foreground">€{selectedService.price}</span>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Conflict dialog */}
      <Dialog open={!!conflict} onOpenChange={(open) => !open && setConflict(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
              Scheduling conflict
            </DialogTitle>
            <DialogDescription>
              {selectedStaff?.firstName} {selectedStaff?.lastName} is already booked during this time — possibly at another office.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {conflict?.conflicts.map(({ appointment, office }) => (
              <div key={appointment.id} className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p className="font-semibold text-foreground tabular-nums">
                  {format(new Date(appointment.startTime), 'MMM d, HH:mm')} — {format(new Date(appointment.endTime), 'HH:mm')}
                </p>
                <p className="text-muted-foreground">{office.name} · {office.address}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConflict(null)}>Pick another time</Button>
            {canOverride && (
              <Button variant="destructive" onClick={() => { if (conflict) { createMut.mutate({ ...conflict.pending, override: true }); setConflict(null); } }}>
                Override anyway
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Local primitives ─────────────────────────────────

function StepCard({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="p-6">
        <SectionHeading title={title} subtitle={subtitle} />
        {children}
      </div>
    </div>
  );
}

function Stepper({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  const progressPct = (step / (STEPS.length - 1)) * 100;
  return (
    <nav aria-label="Booking steps" className="relative">
      {/* Track + filled progress — one continuous line behind the dots */}
      <div className="absolute left-0 right-0 top-[0.6875rem] -z-0 flex px-[calc(100%/10)]">
        <div className="h-px w-full bg-border" />
      </div>
      <div
        className="absolute left-0 top-[0.6875rem] -z-0 h-px bg-primary transition-[width] duration-300 ease-out"
        style={{ width: `calc(${progressPct}% - ${progressPct > 0 ? '0px' : '0px'})`, marginLeft: `calc(100%/${STEPS.length * 2})` }}
        aria-hidden
      />
      <ol className="relative z-10 flex items-start justify-between">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          const reachable = i < step;
          return (
            <li key={s.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => reachable && onJump(i)}
                disabled={!reachable}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                  done
                    ? 'bg-primary text-primary-foreground hover:opacity-90 cursor-pointer'
                    : active
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/15'
                      : 'bg-card text-muted-foreground ring-1 ring-border',
                )}
              >
                {done ? <CheckCircleIcon className="h-4 w-4" /> : i + 1}
              </button>
              <span className={cn(
                'text-[11px] font-medium truncate max-w-full',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn(
        'text-sm text-right truncate',
        value ? 'font-semibold text-foreground' : 'italic text-muted-foreground/60',
      )}>
        {value ?? 'Not selected'}
      </span>
    </div>
  );
}
