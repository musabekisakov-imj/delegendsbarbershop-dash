import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, accountsApi } from '../lib/api';
import { invalidateBookingGraph } from '../lib/query-keys';
import { useOfficeStore } from '../store/office-store';
import { useAuthStore } from '../store/auth-store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { useNavigate } from 'react-router';
import {
  format, parseISO, differenceInMinutes, addDays, subDays,
  startOfDay, endOfDay, isWithinInterval, isToday, isSameDay,
  startOfWeek, endOfWeek, eachDayOfInterval,
} from 'date-fns';
import {
  MagnifyingGlassIcon, PlusIcon, CalendarIcon, ScissorsIcon,
  ClockIcon, PencilSquareIcon, TrashIcon, Squares2X2Icon, ListBulletIcon,
  ChevronLeftIcon, ChevronRightIcon, CheckIcon, XMarkIcon,
  ExclamationTriangleIcon, PhoneIcon, ChatBubbleLeftEllipsisIcon,
  UserIcon, StarIcon, MapPinIcon,
} from '@heroicons/react/24/outline';
import { usePermission } from '../hooks/use-permission';
import { toast } from 'sonner';
import { cn } from '../components/ui/utils';
import { useT } from '../hooks/use-t';
import { CardSkeleton, TableSkeleton } from '../components/shared/page-skeleton';
import { exportCsv } from '../lib/csv';
import { useConfirm } from '../hooks/use-confirm';
import { Can } from '../components/shared/can';
import { EmptyState } from '../components/shared/empty-state';
import { gradientFor, STATUS_DOT, STATUS_PILL, STATUS_LABEL, STATUS_STRIPE } from '../lib/tokens';
import { ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';
import type { AppointmentStatus, AppointmentWithDetails } from '../types';

type ViewMode = 'list' | 'grid';

// Status palettes (STATUS_DOT / STATUS_PILL / STATUS_LABEL / STATUS_STRIPE)
// + avatar gradients are imported from `lib/tokens` — single source of truth
// across Bookings, Overview, Calendar, Accounts.

export function BookingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useT();
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  // Reschedule draft — holds the pending edit before Save. null = not editing.
  const [rescheduleDraft, setRescheduleDraft] = useState<{ date: string; time: string } | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const officeId = useOfficeStore(s => s.currentOfficeId);
  const offices = useOfficeStore(s => s.offices);
  const currentOffice = offices.find(o => o.id === officeId);
  const { can } = usePermission();
  const canReschedule = can('bookings.edit');

  // Stable references so memoized children (BookingCard) don't re-render
  // every time the parent renders.
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const goToDate = (date: Date) => {
    const next = startOfDay(date);
    if (isSameDay(next, selectedDate)) return;
    setSelectedDate(next);
  };

  // Role scoping — barbers only see their own chair's bookings. Mirror the
  // Overview page pattern: resolve the logged-in user's staffId via account.
  const user = useAuthStore(s => s.user);
  const isBarber = user?.role === 'barber';
  const { data: myAccount } = useQuery({
    queryKey: ['account', user?.id],
    queryFn: () => user ? accountsApi.getById(user.id) : null,
    enabled: !!user?.id && isBarber,
  });
  const myStaffId = myAccount?.staffId;

  const { data: rawAppointments = [], isLoading } = useQuery({
    queryKey: ['appointments', officeId],
    queryFn: () => appointmentsApi.getAllWithDetails(officeId),
  });
  const appointments = isBarber && myStaffId
    ? rawAppointments.filter(a => a.staffId === myStaffId)
    : rawAppointments;

  const bookingsKey = ['appointments', officeId] as const;

  // Optimistic status update — row reflects new status instantly, rolls back on error.
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsApi.update(id, { status }, { officeId }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: bookingsKey });
      const previous = queryClient.getQueryData(bookingsKey);
      queryClient.setQueryData(bookingsKey, (old: AppointmentWithDetails[] | undefined) =>
        (old ?? []).map(a => (a.id === id ? { ...a, status } : a))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(bookingsKey, context.previous);
      toast.error(t('toast.statusUpdateError'));
    },
    onSuccess: () => {
      toast.success(t('toast.statusUpdated'));
    },
    onSettled: () => {
      invalidateBookingGraph(queryClient, officeId);
    },
  });

  // Soft-delete — the API flips `deletedAt` so default reads hide the row.
  // The Undo toast calls the dedicated `restoreMutation` below instead of
  // re-creating, so the original id, audit trail, and slot assignment all
  // survive. No more unawaited Promise on the undo path.
  const restoreMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.restore(id, { officeId }),
    onSuccess: () => {
      invalidateBookingGraph(queryClient, officeId);
      toast.success(t('toast.appointmentRestored'));
    },
    onError: () => toast.error(t('toast.appointmentRestoreError')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.delete(id, { officeId }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: bookingsKey });
      const previous = queryClient.getQueryData<AppointmentWithDetails[]>(bookingsKey);
      queryClient.setQueryData<AppointmentWithDetails[]>(bookingsKey, (old) =>
        (old ?? []).filter(a => a.id !== id)
      );
      return { previous, deletedId: id };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(bookingsKey, context.previous);
      toast.error(t('toast.appointmentDeleteError'));
    },
    onSuccess: (_data, _id, context) => {
      setSelectedAppointment(null);
      toast.success(t('toast.appointmentDeleted'), {
        action: context?.deletedId
          ? { label: 'Undo', onClick: () => restoreMutation.mutate(context.deletedId) }
          : undefined,
      });
    },
    onSettled: () => {
      invalidateBookingGraph(queryClient, officeId);
    },
  });

  // Coordinated bulk actions — await Promise.allSettled, then fire one
  // summary toast. Avoids the N-toast storm and reports partial failures.
  const bulkUpdateStatus = async (status: AppointmentStatus) => {
    const ids = Array.from(selectedIds);
    setBulkPending(true);
    const results = await Promise.allSettled(
      ids.map(id => appointmentsApi.update(id, { status }, { officeId })),
    );
    setBulkPending(false);
    clearSelection();
    invalidateBookingGraph(queryClient, officeId);
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed === 0) toast.success(`Updated ${ids.length} ${ids.length === 1 ? 'booking' : 'bookings'}`);
    else if (failed === ids.length) toast.error(`All ${ids.length} updates failed`);
    else toast.error(`${failed} of ${ids.length} updates failed`);
  };

  const bulkDelete = async () => {
    const count = selectedIds.size;
    const ok = await confirm({
      title: `Delete ${count} appointment${count === 1 ? '' : 's'}?`,
      description: 'They move to archive — can be restored from Undo.',
      confirmLabel: 'Delete all',
      destructive: true,
    });
    if (!ok) return;
    const ids = Array.from(selectedIds);
    setBulkPending(true);
    const results = await Promise.allSettled(
      ids.map(id => appointmentsApi.delete(id, { officeId })),
    );
    setBulkPending(false);
    clearSelection();
    invalidateBookingGraph(queryClient, officeId);
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed === 0) {
      toast.success(`Deleted ${ids.length} ${ids.length === 1 ? 'booking' : 'bookings'}`, {
        action: { label: 'Undo', onClick: () => ids.forEach(id => restoreMutation.mutate(id)) },
      });
    } else if (failed === ids.length) {
      toast.error(`All ${ids.length} deletes failed`);
    } else {
      toast.error(`${failed} of ${ids.length} deletes failed`);
    }
  };

  // Human-relative day label — "Today", "Tomorrow", "Yesterday", or
  // "3 days ago" / "in 5 days". Used in the editorial eyebrow so the
  // operator instantly knows where in time they are.
  const dayLabel = useMemo(() => {
    const now = new Date();
    const nowStart = startOfDay(now);
    const selStart = startOfDay(selectedDate);
    const deltaDays = Math.round((selStart.getTime() - nowStart.getTime()) / 86_400_000);
    if (deltaDays === 0) return 'Today';
    if (deltaDays === 1) return 'Tomorrow';
    if (deltaDays === -1) return 'Yesterday';
    if (deltaDays > 0) return `In ${deltaDays} days`;
    return `${Math.abs(deltaDays)} days ago`;
  }, [selectedDate]);

  const dayAppointments = useMemo(() => {
    const s = startOfDay(selectedDate);
    const e = endOfDay(selectedDate);
    return appointments
      .filter(apt => isWithinInterval(parseISO(apt.startTime), { start: s, end: e }))
      .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
  }, [appointments, selectedDate]);

  // Per-day booking counts (for the week strip's tiny count badges).
  const bookingsByDay = useMemo(() => {
    const m = new Map<string, number>();
    appointments.forEach(apt => {
      const k = format(parseISO(apt.startTime), 'yyyy-MM-dd');
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  }, [appointments]);

  // 7-day Mon–Sun window centered on the selected date.
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dayAppointments.filter(apt => {
      const matchesSearch = !q ||
        apt.client.firstName.toLowerCase().includes(q) ||
        apt.client.lastName.toLowerCase().includes(q) ||
        apt.service.name.toLowerCase().includes(q) ||
        apt.client.phone.includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [dayAppointments, searchQuery, statusFilter]);

  const selectedApt = useMemo(
    () => appointments.find(apt => apt.id === selectedAppointment),
    [appointments, selectedAppointment],
  );

  // Single pass: derives statusCounts + booked/earned revenue together.
  // Was 6 separate .filter()/.reduce() scans per render.
  const dayStats = useMemo(() => {
    const counts = {
      all: dayAppointments.length,
      scheduled: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0,
    } as Record<AppointmentStatus | 'all', number>;
    let booked = 0;
    let earned = 0;
    for (const a of dayAppointments) {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
      const price = a.service.price ?? 0;
      if (a.status !== 'cancelled' && a.status !== 'no_show') booked += price;
      if (a.status === 'completed') earned += price;
    }
    return { counts, booked, earned };
  }, [dayAppointments]);
  const statusCounts = dayStats.counts;
  const dayRevenue = dayStats.earned;
  const dayBooked = dayStats.booked;

  const handleDelete = async (id: string, clientName: string) => {
    const ok = await confirm({
      title: `Delete appointment for ${clientName}?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) deleteMutation.mutate(id);
  };

  const quickSetStatus = useCallback((id: string, status: AppointmentStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    updateMutation.mutate({ id, status });
  }, [updateMutation]);

  return (
    <div className="space-y-5 print-area">
      {/* Print-only header */}
      <div className="hidden print:block mb-4">
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
          Day schedule — {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h1>
        <p style={{ color: '#666', fontSize: '12px', margin: '4px 0 0' }}>
          {dayAppointments.length} booking{dayAppointments.length === 1 ? '' : 's'} · Printed {format(new Date(), 'HH:mm')}
        </p>
      </div>

      {/* ─── Editorial hero ──────────────────────────────
          Same family as Overview/Analytics: uppercase eyebrow
          (BOOKINGS · Office · human-relative day), display-size date,
          primary actions right-aligned. The date IS the title. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>Bookings</span>
            {currentOffice && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center gap-1 normal-case tracking-normal font-medium">
                  <MapPinIcon className="h-3 w-3" />
                  {currentOffice.name}
                </span>
              </>
            )}
            <span className="text-muted-foreground/40">·</span>
            <span className="normal-case tracking-normal">{dayLabel}</span>
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-none tabular-nums">
            {format(selectedDate, 'EEEE, MMMM d')}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            aria-label="Print schedule"
            disabled={dayAppointments.length === 0}
          >
            <PrinterIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="Export CSV"
            onClick={() => exportCsv(`bookings-${format(selectedDate, 'yyyy-MM-dd')}`, filteredAppointments, [
              { key: (a) => format(parseISO(a.startTime), 'yyyy-MM-dd'), header: 'Date' },
              { key: (a) => format(parseISO(a.startTime), 'HH:mm'), header: 'Start' },
              { key: (a) => format(parseISO(a.endTime), 'HH:mm'), header: 'End' },
              { key: (a) => differenceInMinutes(parseISO(a.endTime), parseISO(a.startTime)), header: 'Duration (min)' },
              { key: (a) => `${a.client.firstName} ${a.client.lastName}`, header: 'Client' },
              { key: (a) => a.client.phone, header: 'Phone' },
              { key: (a) => a.service.name, header: 'Service' },
              { key: (a) => a.service.price, header: 'Price' },
              { key: (a) => `${a.staff.firstName} ${a.staff.lastName}`, header: 'Staff' },
              { key: 'status', header: 'Status' },
            ])}
            disabled={filteredAppointments.length === 0}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </Button>
          <Can action="bookings.create">
            <Button size="sm" onClick={() => navigate('/bookings/new')}>
              <PlusIcon className="mr-1 h-4 w-4" />
              New
            </Button>
          </Can>
        </div>
      </div>

      {/* ─── Operator bar ────────────────────────────────
          A single tight application-menubar. Normal mode: date pill with
          inline stats + prev/next/today + 7-day strip + search + view
          toggle. Bulk mode (selection > 0): content morphs in place to
          show bulk actions — no extra sticky bar pushing content. */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {selectedIds.size > 0 ? (
          /* Bulk mode — same height, same border, different content */
          <div className="flex flex-wrap items-center gap-2 p-2.5">
            <span className="inline-flex items-center gap-2 px-2 text-sm font-semibold text-foreground tabular-nums">
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-foreground text-background text-[11px] font-bold px-1.5">
                {selectedIds.size}
              </span>
              selected
            </span>
            <div className="flex-1" />
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" variant="outline" disabled={bulkPending} className="h-8" onClick={() => bulkUpdateStatus('completed')}>
                <CheckIcon className="mr-1 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mark complete</span>
                <span className="sm:hidden">Done</span>
              </Button>
              <Button size="sm" variant="outline" disabled={bulkPending} className="h-8" onClick={() => bulkUpdateStatus('no_show')}>
                <ExclamationTriangleIcon className="mr-1 h-3.5 w-3.5" />
                No-show
              </Button>
              <Button size="sm" variant="outline" disabled={bulkPending} className="h-8" onClick={() => bulkUpdateStatus('cancelled')}>
                <XMarkIcon className="mr-1 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button size="sm" variant="outline" disabled={bulkPending} onClick={bulkDelete} className="h-8 text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-900/60 dark:hover:bg-rose-950/40">
                <TrashIcon className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
              <button
                onClick={clearSelection}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Clear selection"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Normal mode — navigation + stats + search + view */
          <div className="flex flex-col gap-2 p-2 lg:flex-row lg:items-center">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => goToDate(subDays(selectedDate, 1))}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Previous day"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
                className="flex min-w-0 items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors hover:bg-accent min-w-[180px]"
              >
                <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {format(selectedDate, 'EEE, MMM d')}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {dayAppointments.length} {dayAppointments.length === 1 ? 'booking' : 'bookings'}
                    {dayBooked > 0 && <span> · €{dayBooked.toLocaleString()}</span>}
                    {dayRevenue > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-medium"> ({dayRevenue.toLocaleString()} done)</span>}
                  </p>
                </div>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={e => { const v = e.target.value; if (v) goToDate(new Date(v + 'T00:00:00')); }}
                  className="sr-only"
                  aria-label="Pick date"
                  onClick={ev => ev.stopPropagation()}
                />
              </button>
              <button
                onClick={() => goToDate(addDays(selectedDate, 1))}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Next day"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
              {!isSameDay(selectedDate, new Date()) && (
                <button
                  onClick={() => goToDate(new Date())}
                  className="ml-1 inline-flex h-9 shrink-0 items-center rounded-md px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Today
                </button>
              )}
            </div>

            {/* Mini 7-day strip (hidden on <md to save space) */}
            <div className="hidden md:flex items-center gap-px ml-2 lg:ml-3 lg:mr-auto">
              {weekDays.map(day => {
                const isActive = isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);
                const count = bookingsByDay.get(format(day, 'yyyy-MM-dd')) ?? 0;
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => goToDate(day)}
                    className={cn(
                      'group relative flex flex-col items-center justify-center rounded-md px-2 py-1.5 transition-colors min-w-[38px]',
                      isActive
                        ? 'bg-foreground text-background'
                        : 'text-foreground hover:bg-accent',
                    )}
                    aria-label={`${format(day, 'EEEE')} ${format(day, 'MMM d')}`}
                    aria-pressed={isActive}
                  >
                    <span className={cn(
                      'text-[9px] font-semibold uppercase tracking-wider',
                      isActive ? 'opacity-70' : isCurrentDay ? 'text-primary' : 'text-muted-foreground',
                    )}>
                      {format(day, 'EEE')}
                    </span>
                    <span className={cn(
                      'text-sm font-bold tabular-nums leading-none mt-0.5',
                      isCurrentDay && !isActive && 'text-primary',
                    )}>
                      {format(day, 'd')}
                    </span>
                    {count > 0 && !isActive && (
                      <span className="absolute top-1 right-1 h-1 w-1 rounded-full bg-primary" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search + view toggle */}
            <div className="flex items-center gap-2 lg:ml-auto">
              <div className="relative flex-1 lg:w-56 lg:flex-none">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <div className="inline-flex items-center rounded-md border border-border bg-background p-0.5 shrink-0">
                <button
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  aria-label="List view"
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                    viewMode === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <ListBulletIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  aria-label="Grid view"
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                    viewMode === 'grid' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Squares2X2Icon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Status tab bar ───────────────────────────────
          Tab-style with count badges. Ordered by workflow priority:
          All → Scheduled → Confirmed → Completed → No-show → Cancelled.
          Active tab gets a primary underline; inactive stays quiet. */}
      <div className="flex overflow-x-auto gap-0 border-b border-border">
        {(['all', 'scheduled', 'confirmed', 'completed', 'no_show', 'cancelled'] as const).map(key => {
          const active = statusFilter === key;
          const count = key === 'all' ? statusCounts.all : statusCounts[key];
          const label = key === 'all' ? 'All' : STATUS_LABEL[key];
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              aria-pressed={active}
              className={cn(
                'group relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {key !== 'all' && (
                <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[key])} />
              )}
              {label}
              <span className={cn(
                'inline-flex items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
              )}>
                {count}
              </span>
              {/* Active underline — aligned to the bottom of the tab */}
              {active && (
                <span aria-hidden className="absolute inset-x-3 bottom-[-1px] h-[2px] bg-foreground rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        viewMode === 'list' ? (
          <TableSkeleton rows={5} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )
      ) : filteredAppointments.length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          variant={searchQuery || statusFilter !== 'all' ? 'plain' : 'dashed'}
          title={
            searchQuery || statusFilter !== 'all'
              ? 'No appointments match'
              : `No bookings on ${format(selectedDate, 'MMM d')}`
          }
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try clearing filters.'
              : isToday(selectedDate)
                ? 'Your day is clear — create the first booking.'
                : 'Try picking a different date.'
          }
          action={
            !searchQuery && statusFilter === 'all' ? (
              <Button onClick={() => navigate('/bookings/new')}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Booking
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === 'list' ? (
        /* ─── LIST VIEW ───────────────────────────────────── */
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="pl-5 pr-2 py-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={filteredAppointments.length > 0 && filteredAppointments.every(a => selectedIds.has(a.id))}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(new Set(filteredAppointments.map(a => a.id)));
                        else clearSelection();
                      }}
                      className="h-4 w-4 rounded border-border cursor-pointer"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-28">Time</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Service</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Price</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Status</th>
                  <th className="px-5 py-2.5 w-32"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAppointments.map(apt => {
                  const start = parseISO(apt.startTime);
                  const end = parseISO(apt.endTime);
                  const duration = differenceInMinutes(end, start);
                  const grad = gradientFor(apt.clientId);
                  const isCompleted = apt.status === 'completed';
                  const isCancelled = apt.status === 'cancelled';
                  const isDone = isCompleted || isCancelled;

                  return (
                    <tr
                      key={apt.id}
                      onClick={() => setSelectedAppointment(apt.id)}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-muted/30 group',
                        isCancelled && 'opacity-50',
                        selectedIds.has(apt.id) && 'bg-blue-500/5 dark:bg-blue-500/10',
                      )}
                    >
                      {/* Checkbox */}
                      <td className="pl-5 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(apt.id)}
                          onChange={() => toggleSelected(apt.id)}
                          className="h-4 w-4 rounded border-border cursor-pointer"
                          aria-label={`Select booking for ${apt.client.firstName}`}
                        />
                      </td>
                      {/* Time */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="text-foreground font-medium tabular-nums">
                          {format(start, 'HH:mm')}
                        </div>
                        <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                          {duration} min
                        </p>
                      </td>

                      {/* Client */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white', grad)}>
                            {apt.client.firstName[0]}{apt.client.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {apt.client.firstName} {apt.client.lastName}
                              </p>
                              {/* Visits badge — single glance tells the barber
                                  "regular" vs "first-timer" before they greet. */}
                              {apt.client.totalVisits > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-0 text-[10px] font-semibold tabular-nums text-muted-foreground align-middle shrink-0"
                                  title={`${apt.client.totalVisits} past visits`}
                                >
                                  <StarIcon className="h-2.5 w-2.5" />
                                  {apt.client.totalVisits}
                                </span>
                              )}
                              {apt.client.deletedAt && (
                                <span className="inline-flex items-center rounded bg-muted px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground align-middle shrink-0">
                                  archived
                                </span>
                              )}
                            </div>
                            {/* Client notes preview — only when it exists.
                                Truncates to one line; hover to see full text. */}
                            {apt.client.notes && (
                              <p
                                className="text-[11px] text-muted-foreground truncate italic max-w-[26ch]"
                                title={apt.client.notes}
                              >
                                "{apt.client.notes}"
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground tabular-nums truncate md:hidden">
                              {apt.service.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Service */}
                      <td className="px-5 py-3 hidden md:table-cell min-w-0">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{apt.service.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            with {apt.staff.firstName} {apt.staff.lastName}
                          </p>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums whitespace-nowrap">
                        €{apt.service.price}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          STATUS_PILL[apt.status],
                        )}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[apt.status])} />
                          {STATUS_LABEL[apt.status]}
                        </span>
                      </td>

                      {/* Quick actions — visible on touch, hover, and keyboard focus */}
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                          {!isDone && (
                            <>
                              <button
                                onClick={(e) => quickSetStatus(apt.id, 'completed', e)}
                                aria-label="Mark complete"
                                title="Mark complete"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-emerald-100 hover:text-emerald-700 hover:ring-2 hover:ring-emerald-200 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-200 dark:hover:ring-emerald-900/60 transition-all"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => quickSetStatus(apt.id, 'no_show', e)}
                                aria-label="Mark as no-show"
                                title="No-show"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-amber-100 hover:text-amber-700 hover:ring-2 hover:ring-amber-200 dark:hover:bg-amber-950/60 dark:hover:text-amber-200 dark:hover:ring-amber-900/60 transition-all"
                              >
                                <ExclamationTriangleIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => quickSetStatus(apt.id, 'cancelled', e)}
                                aria-label="Cancel"
                                title="Cancel booking"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-100 hover:text-rose-700 hover:ring-2 hover:ring-rose-200 dark:hover:bg-rose-950/60 dark:hover:text-rose-200 dark:hover:ring-rose-900/60 transition-all"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(apt.id, `${apt.client.firstName} ${apt.client.lastName}`); }}
                            disabled={deleteMutation.isPending}
                            aria-label="Delete"
                            title="Delete"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition-colors disabled:opacity-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ─── GRID VIEW ───────────────────────────────────── */
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filteredAppointments.map(apt => (
            <BookingCardRow
              key={apt.id}
              apt={apt}
              onOpen={setSelectedAppointment}
              onQuickAction={quickSetStatus}
            />
          ))}
        </div>
      )}

      {/* Detail Modal — profile-editor layout */}
      <Dialog open={selectedAppointment !== null} onOpenChange={() => { setSelectedAppointment(null); setRescheduleDraft(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-hidden p-0 flex flex-col">
          {selectedApt && (
            <>
              {/* ─── Identity header — no gradient band ─────────
                  The client's NAME is the title. Status pill + visit badge +
                  inline call/SMS all in one tight row. */}
              <DialogHeader className="px-6 pt-6 pb-5 space-y-0 border-b border-border">
                <DialogDescription className="sr-only">
                  Appointment details, status controls, and reschedule options.
                </DialogDescription>
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white shadow-sm',
                    gradientFor(selectedApt.clientId),
                  )}>
                    {selectedApt.client.firstName[0]}{selectedApt.client.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <DialogTitle className="text-xl font-bold text-foreground truncate leading-tight">
                      {selectedApt.client.firstName} {selectedApt.client.lastName}
                    </DialogTitle>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                        STATUS_PILL[selectedApt.status],
                      )}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[selectedApt.status])} />
                        {STATUS_LABEL[selectedApt.status]}
                      </span>
                      {selectedApt.client.totalVisits > 0 && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                          title={`${selectedApt.client.totalVisits} past visits`}
                        >
                          <StarIcon className="h-2.5 w-2.5" />
                          {selectedApt.client.totalVisits} visits
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Quick actions — Call + SMS right-aligned */}
                  <div className="flex shrink-0 gap-2">
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <a href={`tel:${selectedApt.client.phone}`} onClick={(e) => e.stopPropagation()}>
                        <PhoneIcon className="h-4 w-4" />
                        Call
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <a href={`sms:${selectedApt.client.phone}`} onClick={(e) => e.stopPropagation()}>
                        <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                        SMS
                      </a>
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* ─── Iconic stat band ─────────────────────────
                    3-col: Service / With / Duration. Same scannable
                    pattern as the Client Details modal. */}
                <div className="flex items-stretch gap-2 border-y border-border py-4">
                  <IconStat
                    icon={ScissorsIcon}
                    label="Service"
                    value={selectedApt.service.name}
                    sub={`€${selectedApt.service.price}`}
                  />
                  <div className="w-px bg-border" aria-hidden />
                  <IconStat
                    icon={UserIcon}
                    label="With"
                    value={`${selectedApt.staff.firstName} ${selectedApt.staff.lastName}`}
                    sub={selectedApt.staff.role}
                  />
                  <div className="w-px bg-border" aria-hidden />
                  <IconStat
                    icon={ClockIcon}
                    label="Duration"
                    value={`${differenceInMinutes(parseISO(selectedApt.endTime), parseISO(selectedApt.startTime))} min`}
                    sub={format(parseISO(selectedApt.startTime), 'EEE, MMM d')}
                  />
                </div>

                {/* ─── When — prominent; editable inline when allowed ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">When</p>
                    {canReschedule && !rescheduleDraft && (
                      <button
                        type="button"
                        onClick={() => setRescheduleDraft({
                          date: format(parseISO(selectedApt.startTime), 'yyyy-MM-dd'),
                          time: format(parseISO(selectedApt.startTime), 'HH:mm'),
                        })}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Reschedule
                      </button>
                    )}
                  </div>
                  {canReschedule && rescheduleDraft ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={rescheduleDraft.date}
                          onChange={(e) => setRescheduleDraft({ ...rescheduleDraft, date: e.target.value })}
                          className="tabular-nums"
                        />
                        <Input
                          type="time"
                          step={300}
                          value={rescheduleDraft.time}
                          onChange={(e) => setRescheduleDraft({ ...rescheduleDraft, time: e.target.value })}
                          className="tabular-nums"
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setRescheduleDraft(null)}>Cancel</Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            const start = new Date(`${rescheduleDraft.date}T${rescheduleDraft.time}:00`);
                            if (isNaN(start.getTime())) { toast.error('Invalid date/time'); return; }
                            const duration = differenceInMinutes(parseISO(selectedApt.endTime), parseISO(selectedApt.startTime));
                            const end = new Date(start.getTime() + duration * 60_000);
                            appointmentsApi.update(selectedApt.id, {
                              startTime: start.toISOString(),
                              endTime: end.toISOString(),
                            }, { officeId })
                              .then(() => {
                                invalidateBookingGraph(queryClient, officeId);
                                toast.success('Rescheduled');
                                setRescheduleDraft(null);
                              })
                              .catch(() => toast.error('Reschedule failed'));
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <p className="text-lg font-bold tabular-nums text-foreground">
                        {format(parseISO(selectedApt.startTime), 'HH:mm')}
                        <span className="text-muted-foreground"> → </span>
                        {format(parseISO(selectedApt.endTime), 'HH:mm')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(selectedApt.startTime), 'EEEE, MMM d')}
                      </p>
                    </div>
                  )}
                </div>

                {/* ─── Client notes ─────────────────────────── */}
                {selectedApt.client.notes && (
                  <div className="border-l-2 border-border pl-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Notes
                    </p>
                    <p className="mt-1 text-sm text-foreground leading-relaxed italic">
                      "{selectedApt.client.notes}"
                    </p>
                  </div>
                )}

                {/* ─── Appointment notes (if any) ──────────── */}
                {selectedApt.notes && (
                  <div className="border-l-2 border-primary/60 pl-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Appointment notes
                    </p>
                    <p className="mt-1 text-sm text-foreground leading-relaxed">
                      {selectedApt.notes}
                    </p>
                  </div>
                )}

                {/* Status picker — 5 statuses in a 3-column grid */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Update status</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['scheduled', 'confirmed', 'completed', 'no_show', 'cancelled'] as const).map(status => {
                      const active = selectedApt.status === status;
                      return (
                        <button
                          key={status}
                          onClick={() => updateMutation.mutate({ id: selectedApt.id, status })}
                          disabled={active || updateMutation.isPending}
                          className={cn(
                            'inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                            active
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border bg-card text-foreground hover:bg-accent',
                            'disabled:cursor-not-allowed',
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-background' : STATUS_DOT[status])} />
                          {STATUS_LABEL[status]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ─── Sticky footer — always reachable ───────── */}
              <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-6 py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(selectedApt.id, `${selectedApt.client.firstName} ${selectedApt.client.lastName}`)}
                  disabled={deleteMutation.isPending}
                  className="text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
                >
                  <TrashIcon className="mr-1.5 h-4 w-4" />
                  Delete
                </Button>
                <Button onClick={() => setSelectedAppointment(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── BookingCard (grid view) ─────────────────────────────────
// Time-first calendar-style card. Colored left stripe = status at a glance.
// STATUS_STRIPE is imported from `lib/tokens` (top of file).

interface BookingCardProps {
  apt: AppointmentWithDetails;
  onClick: () => void;
  onQuickAction: (id: string, status: AppointmentStatus, e: React.MouseEvent) => void;
}

// Thin wrapper — the parent passes a stable `onOpen(id)` callback, this
// component derives its own per-card click handler via useCallback so the
// memoized BookingCard below doesn't re-render when the parent re-renders.
const BookingCardRow = memo(function BookingCardRow({
  apt, onOpen, onQuickAction,
}: {
  apt: AppointmentWithDetails;
  onOpen: (id: string) => void;
  onQuickAction: (id: string, status: AppointmentStatus, e: React.MouseEvent) => void;
}) {
  const handleClick = useCallback(() => onOpen(apt.id), [onOpen, apt.id]);
  return <BookingCard apt={apt} onClick={handleClick} onQuickAction={onQuickAction} />;
});

// Memoized — paired with stable useCallback props from the parent, cards
// only re-render when their own `apt` reference changes. On a busy day
// with 30 cards in the grid this is the difference between smooth typing
// in the search box and a visible hitch per keystroke.
const BookingCard = memo(function BookingCard({
  apt, onClick, onQuickAction,
}: BookingCardProps) {
  const grad = gradientFor(apt.clientId);
  const start = parseISO(apt.startTime);
  const end = parseISO(apt.endTime);
  const duration = differenceInMinutes(end, start);
  const isCancelled = apt.status === 'cancelled';
  const isDone = apt.status === 'completed' || isCancelled;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex rounded-xl border border-border bg-card overflow-hidden text-left transition-all hover:shadow-md hover:border-foreground/20',
        isCancelled && 'opacity-60',
      )}
    >
      {/* Status stripe on the left edge */}
      <span className={cn('w-1 shrink-0', STATUS_STRIPE[apt.status])} aria-hidden />

      <div className="flex-1 min-w-0 p-4">
        {/* Header: time (hero) + status pill */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xl font-bold leading-none tabular-nums text-foreground">
              {format(start, 'HH:mm')}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums mt-1">
              {duration} min · ends {format(end, 'HH:mm')}
            </p>
          </div>
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0',
            STATUS_PILL[apt.status],
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[apt.status])} />
            {STATUS_LABEL[apt.status]}
          </span>
        </div>

        {/* Body: client + service */}
        <div className="mt-3 flex items-center gap-2.5 min-w-0">
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white', grad)}>
            {apt.client.firstName[0]}{apt.client.lastName[0]}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm truncate">
              {apt.client.firstName} {apt.client.lastName}
            </p>
            <a
              href={`tel:${apt.client.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-muted-foreground tabular-nums truncate hover:text-primary transition-colors"
            >
              {apt.client.phone}
            </a>
          </div>
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <ScissorsIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-foreground font-medium truncate">{apt.service.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-foreground">€{apt.service.price}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 pl-5 truncate">
            with {apt.staff.firstName} {apt.staff.lastName}
          </p>
        </div>

        {/* Quick actions — always visible on touch; hover/focus reveal on desktop */}
        {!isDone && (
          <div className="mt-3 flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
            <button
              onClick={(e) => onQuickAction(apt.id, 'completed', e)}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 transition-colors"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              Complete
            </button>
            <button
              onClick={(e) => onQuickAction(apt.id, 'cancelled', e)}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition-colors"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        )}
      </div>
    </button>
  );
});

// ─── DetailTile (legacy — still used in other contexts) ─────
function DetailTile({
  icon: Icon, label, value, sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground truncate">{value}</p>
      {sub && <p className="text-xs text-muted-foreground truncate capitalize">{sub}</p>}
    </div>
  );
}

// ─── IconStat — dividerless inline stat for the modal hero band ──
// Same pattern as the Client modal: icon on top, tiny uppercase label,
// bold value, optional faint sub. Hairline `w-px` dividers between
// columns replace card chrome — quieter, more modern read.
function IconStat({
  icon: Icon, label, value, sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex-1 min-w-0 text-center px-2">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground truncate">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground truncate capitalize">{sub}</p>}
    </div>
  );
}

