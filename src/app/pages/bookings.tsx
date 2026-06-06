import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, accountsApi, staffApi, tenantApi } from '../lib/api';
import { invalidateBookingGraph } from '../lib/query-keys';
import { useOfficeStore } from '../store/office-store';
import { useAuthStore } from '../store/auth-store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { MiniCalendar } from '../components/calendar/mini-calendar';
import { useNavigate, useSearchParams } from 'react-router';
import {
  format, parseISO, differenceInMinutes, addDays, subDays,
  startOfDay, endOfDay, isWithinInterval, isToday, isSameDay,
  startOfWeek, endOfWeek, eachDayOfInterval,
} from 'date-fns';
import { useLanguageStore } from '../store/language-store';
import {
  MagnifyingGlassIcon, PlusIcon, CalendarIcon, ScissorsIcon,
  ClockIcon, TrashIcon, Squares2X2Icon, ListBulletIcon,
  ChevronLeftIcon, ChevronRightIcon, CheckIcon, XMarkIcon,
  ExclamationTriangleIcon, ChatBubbleLeftEllipsisIcon,
  MapPinIcon, ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon,
  CheckCircleIcon, CheckBadgeIcon, UserMinusIcon, XCircleIcon, LockClosedIcon,
} from '@heroicons/react/24/outline';
import { ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { usePermission } from '../hooks/use-permission';
import { toast } from 'sonner';
import { cn } from '../components/ui/utils';
import { useT, useTimeFormat } from '../hooks/use-t';
import { useDateLocale } from '../hooks/use-date-locale';
import { CardSkeleton, TableSkeleton } from '../components/shared/page-skeleton';
import { exportCsv } from '../lib/csv';
import { useConfirm } from '../hooks/use-confirm';
import { Can } from '../components/shared/can';
import { EmptyState } from '../components/shared/empty-state';
import { STATUS_DOT, STATUS_PILL, STATUS_STRIPE, STATUS_BADGE_TINT, STATUS_ICON_COLOR, STATUS_HOVER, STATUS_GLOW, getClientAvatarColor } from '../lib/tokens';
import { BookingDetailModal } from '../components/bookings/booking-detail-modal';
import { formatPrice, formatDurationLocalized } from '../lib/format';
import { getHoursInTz, getMinutesInTz } from '../lib/time';
import { StaffFilterRow } from '../components/shared/staff-filter-row';
import { BulkActionBar } from '../components/shared/bulk-action-bar';
import { FilterPill } from '../components/shared/filter-pill';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { TimelineView } from '../components/bookings/timeline-view';
import { useBookingsPrefsStore } from '../store/bookings-prefs-store';
import type { AppointmentStatus, AppointmentWithDetails } from '../types';

type ViewMode = 'list' | 'grid' | 'timeline';

// Icon per status — heroicons only. Double-encodes meaning (shape + color).
// JSX lives here (not tokens.ts) because tokens.ts is a pure CSS-class file.
const STATUS_ICON = {
  scheduled: <CalendarIcon    className="h-[15px] w-[15px]" />,
  confirmed: <CheckCircleIcon className="h-[15px] w-[15px]" />,
  completed: <CheckBadgeIcon  className="h-[15px] w-[15px]" />,
  no_show:   <UserMinusIcon   className="h-[15px] w-[15px]" />,
  cancelled: <XCircleIcon     className="h-[15px] w-[15px]" />,
} as const;

export function BookingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useT();
  const language = useLanguageStore(s => s.language);
  const dateLocale = useDateLocale();
  const [timeFormat] = useTimeFormat();
  const { density, setDensity, sortCol, sortDir, toggleSort, staffFilterIds, setStaffFilter, toggleStaffFilter } = useBookingsPrefsStore();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilterState] = useState<AppointmentStatus | 'all'>(() =>
    (searchParams.get('filter') as AppointmentStatus | 'all') ?? 'all'
  );
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>(() =>
    (searchParams.get('view') as ViewMode) ?? 'list'
  );
  const [selectedDate, setSelectedDateState] = useState<Date>(() => {
    const d = searchParams.get('date');
    if (d) { const p = new Date(d + 'T00:00:00'); if (!isNaN(p.getTime())) return p; }
    return startOfDay(new Date());
  });

  const setStatusFilter = useCallback((f: AppointmentStatus | 'all') => {
    setStatusFilterState(f);
    setSearchParams(p => { const n = new URLSearchParams(p); if (f === 'all') n.delete('filter'); else n.set('filter', f); return n; }, { replace: true });
  }, [setSearchParams]);

  const setViewMode = useCallback((v: ViewMode) => {
    setViewModeState(v);
    setSearchParams(p => { const n = new URLSearchParams(p); if (v === 'list') n.delete('view'); else n.set('view', v); return n; }, { replace: true });
  }, [setSearchParams]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [calPickerOpen, setCalPickerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const officeId = useOfficeStore(s => s.currentOfficeId);
  const offices = useOfficeStore(s => s.offices);
  const currentOffice = offices.find(o => o.id === officeId);
  const { can } = usePermission();
  const canReschedule = can('bookings.edit');

  const { data: tenant } = useQuery({ queryKey: ['tenant'], queryFn: tenantApi.get, staleTime: 5 * 60_000 });
  const { data: allStaff = [] } = useQuery({ queryKey: ['staff', officeId], queryFn: () => staffApi.getAll(officeId) });

  // Deterministic color index per staff member — same order as calendar view.
  const staffColorMap = useMemo(() => {
    const m = new Map<string, number>();
    allStaff.forEach((s, i) => m.set(s.id, i));
    return m;
  }, [allStaff]);

  // Working hours for the selected day — used by shop status + timeline view.
  const dayOfWeek = format(selectedDate, 'EEEE').toLowerCase() as string;
  const todayWorkingHours = tenant?.workingHours?.[dayOfWeek];

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

  const goToDate = useCallback((date: Date) => {
    const next = startOfDay(date);
    if (isSameDay(next, selectedDate)) return;
    setSelectedDateState(next);
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('date', format(next, 'yyyy-MM-dd')); return n; }, { replace: true });
  }, [selectedDate, setSearchParams]);

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
      const previous = queryClient.getQueryData<AppointmentWithDetails[]>(bookingsKey);
      const prevStatus = previous?.find(a => a.id === id)?.status;
      queryClient.setQueryData(bookingsKey, (old: AppointmentWithDetails[] | undefined) =>
        (old ?? []).map(a => (a.id === id ? { ...a, status } : a))
      );
      return { previous, prevStatus };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(bookingsKey, context.previous);
      toast.error(t('toast.statusUpdateError'));
    },
    onSuccess: (_data, { id }, context) => {
      const prev = (context as { prevStatus?: AppointmentStatus } | undefined)?.prevStatus;
      toast.success(t('toast.statusUpdated'), {
        duration: 5000,
        action: prev != null
          ? { label: t('common.undo'), onClick: () => updateMutation.mutate({ id, status: prev }) }
          : undefined,
      });
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
          ? { label: t('common.undo'), onClick: () => restoreMutation.mutate(context.deletedId) }
          : undefined,
      });
    },
    onSettled: () => {
      invalidateBookingGraph(queryClient, officeId);
    },
  });

  // Reschedule — full optimistic update + rollback, same pattern as updateMutation.
  const rescheduleMutation = useMutation({
    mutationFn: ({ id, startTime, endTime }: { id: string; startTime: string; endTime: string }) =>
      appointmentsApi.update(id, { startTime, endTime }, { officeId }),
    onMutate: async ({ id, startTime, endTime }) => {
      await queryClient.cancelQueries({ queryKey: bookingsKey });
      const previous = queryClient.getQueryData(bookingsKey);
      queryClient.setQueryData(bookingsKey, (old: AppointmentWithDetails[] | undefined) =>
        (old ?? []).map(a => (a.id === id ? { ...a, startTime, endTime } : a))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(bookingsKey, context.previous);
      toast.error(t('bookings.rescheduleFailed'));
    },
    onSuccess: () => {
      toast.success(t('bookings.rescheduled'));
    },
    onSettled: () => { invalidateBookingGraph(queryClient, officeId); },
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
    if (failed === 0) toast.success(t('bookings.bulkUpdated').replace('{n}', String(ids.length)));
    else if (failed === ids.length) toast.error(t('bookings.bulkAllFailed').replace('{n}', String(ids.length)));
    else toast.error(t('bookings.bulkUpdateFailed').replace('{failed}', String(failed)).replace('{n}', String(ids.length)));
  };

  const bulkDelete = async () => {
    const count = selectedIds.size;
    const ok = await confirm({
      title: t('bookings.confirmDeleteBulk').replace('{n}', String(count)),
      description: t('bookings.descDeleteBulk'),
      confirmLabel: t('bookings.deleteAll'),
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
      toast.success(t('bookings.bulkDeleted').replace('{n}', String(ids.length)), {
        action: {
          label: t('common.undo'),
          onClick: () => Promise.allSettled(ids.map(id => appointmentsApi.restore(id, { officeId }))).then(() => invalidateBookingGraph(queryClient, officeId)),
        },
      });
    } else if (failed === ids.length) {
      toast.error(t('bookings.bulkAllDeleteFailed').replace('{n}', String(ids.length)));
    } else {
      toast.error(t('bookings.bulkDeleteFailed').replace('{failed}', String(failed)).replace('{n}', String(ids.length)));
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
    if (deltaDays === 0) return t('calendar.dayLabelToday');
    if (deltaDays === 1) return t('calendar.dayLabelTomorrow');
    if (deltaDays === -1) return t('calendar.dayLabelYesterday');
    if (deltaDays > 0) return t('calendar.dayLabelInDays').replace('{n}', String(deltaDays));
    return t('calendar.dayLabelDaysAgo').replace('{n}', String(Math.abs(deltaDays)));
  }, [selectedDate, t]);

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
    const staffSet = new Set(staffFilterIds);
    let result = dayAppointments.filter(apt => {
      const matchesSearch = !q ||
        apt.client.firstName.toLowerCase().includes(q) ||
        apt.client.lastName.toLowerCase().includes(q) ||
        apt.service.name.toLowerCase().includes(q) ||
        apt.client.phone.includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
      const matchesStaff = staffSet.size === 0 || staffSet.has(apt.staffId);
      return matchesSearch && matchesStatus && matchesStaff;
    });
    // Apply sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'time':    cmp = parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime(); break;
        case 'client':  cmp = `${a.client.firstName} ${a.client.lastName}`.localeCompare(`${b.client.firstName} ${b.client.lastName}`); break;
        case 'service': cmp = a.service.name.localeCompare(b.service.name); break;
        case 'price':   cmp = a.service.price - b.service.price; break;
        case 'status':  cmp = a.status.localeCompare(b.status); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [dayAppointments, searchQuery, statusFilter, staffFilterIds, sortCol, sortDir]);

  const selectedApt = useMemo(
    () => appointments.find(apt => apt.id === selectedAppointment),
    [appointments, selectedAppointment],
  );

  // Full-day revenue stats — not staff-filtered so the operator bar date
  // picker always shows the true day total regardless of which filters are on.
  const { dayRevenue, dayBooked } = useMemo(() => {
    let booked = 0;
    let earned = 0;
    for (const a of dayAppointments) {
      const price = a.service.price ?? 0;
      if (a.status !== 'cancelled' && a.status !== 'no_show') booked += price;
      if (a.status === 'completed') earned += price;
    }
    return { dayBooked: booked, dayRevenue: earned };
  }, [dayAppointments]);

  // Status counts for the filter tab badges — staff-filtered but NOT
  // status-filtered, so badge numbers reflect the active staff selection.
  const statusCounts = useMemo(() => {
    const staffSet = new Set(staffFilterIds);
    const base = staffSet.size === 0
      ? dayAppointments
      : dayAppointments.filter(a => staffSet.has(a.staffId));
    const counts: Record<string, number> = {
      all: base.length, scheduled: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0,
    };
    for (const a of base) counts[a.status] = (counts[a.status] ?? 0) + 1;
    return counts as Record<AppointmentStatus | 'all', number>;
  }, [dayAppointments, staffFilterIds]);

  // First upcoming appointment on today's view — shown with a "NEXT" chip.
  const nextAptId = useMemo(() => {
    if (!isToday(selectedDate)) return null;
    const now = new Date();
    return filteredAppointments.find(a => parseISO(a.startTime) > now)?.id ?? null;
  }, [filteredAppointments, selectedDate]);

  const handleDelete = async (id: string, clientName: string) => {
    const ok = await confirm({
      title: t('bookings.confirmDeleteSingle').replace('{name}', clientName),
      description: t('bookings.descDeleteSingle'),
      confirmLabel: t('bookings.deleteSingle'),
      destructive: true,
    });
    if (ok) deleteMutation.mutate(id);
  };

  const quickSetStatus = useCallback((id: string, status: AppointmentStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    updateMutation.mutate({ id, status });
  }, [updateMutation]);

  return (
    <div className={cn("space-y-5 print-area", selectedIds.size > 0 && "pb-24")}>
      {/* Print-only header */}
      <div className="hidden print:block mb-4">
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
          {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: dateLocale })}
        </h1>
        <p style={{ color: '#666', fontSize: '12px', margin: '4px 0 0' }}>
          {dayAppointments.length} {t(dayAppointments.length === 1 ? 'bookings.countOne' : 'bookings.countMany')} · {format(new Date(), 'HH:mm')}
        </p>
      </div>

      {/* ─── Editorial hero ──────────────────────────────
          Same family as Overview/Analytics: uppercase eyebrow
          (BOOKINGS · Office · human-relative day), display-size date,
          primary actions right-aligned. The date IS the title. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>{t('bookings.title')}</span>
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
            <span className={cn(
              'normal-case tracking-normal rounded-full px-2 py-0.5 text-[11px] font-semibold',
              isToday(selectedDate)
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground',
            )}>{dayLabel}</span>
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-none tabular-nums">
            {format(selectedDate, 'EEEE, d MMMM', { locale: dateLocale })}
          </h1>
        </div>
        {/* Shop open/closed indicator */}
        {todayWorkingHours && (() => {
          const now = new Date();
          const closeMin = todayWorkingHours.closeTime.split(':').map(Number).reduce((h, m) => h * 60 + m);
          const nowMin = getHoursInTz(now) * 60 + getMinutesInTz(now);
          const isOpenNow = todayWorkingHours.isOpen && isSameDay(selectedDate, now) && nowMin < closeMin;
          return (
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
              isOpenNow
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
            )}>
              {isOpenNow
                ? <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-emerald-500 animate-pulse" />
                : <LockClosedIcon className="h-3 w-3 shrink-0" />}
              {isOpenNow
                ? t('bookings.openUntil', { time: todayWorkingHours.closeTime })
                : t('bookings.closedToday')}
            </span>
          );
        })()}

        <div className="flex items-center gap-2 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  aria-label={t('bookings.printSchedule')}
                  disabled={dayAppointments.length === 0}
                >
                  <PrinterIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('bookings.printSchedule')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={filteredAppointments.length === 0} aria-label={t('bookings.exportTooltip')}>
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => exportCsv(`bookings-${format(selectedDate, 'yyyy-MM-dd')}`, filteredAppointments, [
                        { key: (a) => format(parseISO(a.startTime), 'yyyy-MM-dd'), header: t('bookings.csv.date') },
                        { key: (a) => format(parseISO(a.startTime), 'HH:mm'), header: t('bookings.csv.start') },
                        { key: (a) => format(parseISO(a.endTime), 'HH:mm'), header: t('bookings.csv.end') },
                        { key: (a) => differenceInMinutes(parseISO(a.endTime), parseISO(a.startTime)), header: t('bookings.csv.duration') },
                        { key: (a) => `${a.client.firstName} ${a.client.lastName}`, header: t('bookings.csv.client') },
                        { key: (a) => a.client.phone, header: t('bookings.csv.phone') },
                        { key: (a) => a.service.name, header: t('bookings.csv.service') },
                        { key: (a) => a.service.price, header: t('bookings.csv.price') },
                        { key: (a) => `${a.staff.firstName} ${a.staff.lastName}`, header: t('bookings.csv.staff') },
                        { key: 'status', header: t('bookings.csv.status') },
                      ])}
                    >
                      {t('bookings.exportCsvLabel')}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>{t('bookings.exportXlsx')}</DropdownMenuItem>
                    <DropdownMenuItem disabled>{t('bookings.exportPdf')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent>{t('bookings.exportTooltip')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Can action="bookings.create">
            <Button size="sm" onClick={() => navigate('/bookings/new')}>
              <PlusIcon className="mr-1 h-4 w-4" />
              {t('bookings.new')}
            </Button>
          </Can>
        </div>
      </div>

      {/* ─── Operator bar ────────────────────────────────
          Static page-actions bar: date navigation + 7-day strip + search
          + view toggle + density toggle. Bulk actions moved to the fixed
          BulkActionBar at the bottom of the screen.                       */}
      <div className={cn("rounded-xl border border-border bg-card overflow-hidden transition-[padding] duration-200", scrolled && "shadow-sm")}>
        <div className={cn("flex flex-col gap-2 lg:flex-row lg:items-center", scrolled ? "p-1.5" : "p-2")}>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => goToDate(subDays(selectedDate, 1))}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={t('bookings.prevDay')}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <Popover open={calPickerOpen} onOpenChange={setCalPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex min-w-0 items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors hover:bg-accent min-w-[180px]"
                  aria-label={t('bookings.pickDate')}
                >
                  <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {format(selectedDate, 'EEE, d MMM', { locale: dateLocale })}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {dayAppointments.length} {t(dayAppointments.length === 1 ? 'bookings.countOne' : 'bookings.countMany')}
                      {dayBooked > 0 && <span> · {formatPrice(dayBooked, language)}</span>}
                      {dayRevenue > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-medium"> {t('bookings.earnedDone').replace('{n}', formatPrice(dayRevenue, language))}</span>}
                    </p>
                    {dayAppointments.length > 0 && (() => {
                      const confirmedAmt = dayAppointments.filter(a => a.status === 'confirmed').reduce((s, a) => s + (a.service?.price ?? 0), 0);
                      const scheduledAmt = dayAppointments.filter(a => a.status === 'scheduled').reduce((s, a) => s + (a.service?.price ?? 0), 0);
                      const completedAmt = dayAppointments.filter(a => a.status === 'completed').reduce((s, a) => s + (a.service?.price ?? 0), 0);
                      const parts: string[] = [];
                      if (confirmedAmt > 0) parts.push(`${t('status.confirmed')}: ${formatPrice(confirmedAmt, language)}`);
                      if (scheduledAmt > 0) parts.push(`${t('status.scheduled')}: ${formatPrice(scheduledAmt, language)}`);
                      if (completedAmt > 0) parts.push(`${t('status.completed')}: ${formatPrice(completedAmt, language)}`);
                      if (parts.length === 0) return null;
                      return <p className="text-[10px] text-muted-foreground/60 tabular-nums mt-0.5">{parts.join(' · ')}</p>;
                    })()}
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" sideOffset={6}>
                <div className="p-3">
                  <MiniCalendar
                    selectedDate={selectedDate}
                    onSelectDate={(d) => { goToDate(d); setCalPickerOpen(false); }}
                    appointments={appointments}
                  />
                </div>
                <div className="flex items-center justify-end border-t border-border px-3 py-2">
                  <button
                    onClick={() => { goToDate(new Date()); setCalPickerOpen(false); }}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t('common.today')}
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            <button
              onClick={() => goToDate(addDays(selectedDate, 1))}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={t('bookings.nextDay')}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            {!isSameDay(selectedDate, new Date()) && (
              <button
                onClick={() => goToDate(new Date())}
                className="ml-1 inline-flex h-7 shrink-0 items-center rounded-full bg-foreground text-background px-2.5 text-[11px] font-bold uppercase tracking-wider transition-opacity hover:opacity-75"
              >
                {t('common.today')}
              </button>
            )}
          </div>

          {/* Mini 7-day strip — hidden on <md and when scrolled to reclaim vertical space */}
          <div className={cn("hidden items-center gap-px ml-2 lg:ml-3 lg:mr-auto transition-all", !scrolled && "md:flex")}>
            {weekDays.map(day => {
              const isActive = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              const count = bookingsByDay.get(format(day, 'yyyy-MM-dd')) ?? 0;
              const dotClass = count === 0
                ? null
                : count <= 3
                  ? 'bg-zinc-300 dark:bg-zinc-600'
                  : count <= 8
                    ? 'bg-primary/70'
                    : 'bg-primary';
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
                  aria-label={`${format(day, 'EEEE', { locale: dateLocale })} ${format(day, 'd MMM', { locale: dateLocale })}`}
                  aria-pressed={isActive}
                >
                  <span className={cn(
                    'text-[9px] font-semibold uppercase tracking-wider',
                    isActive ? 'opacity-70' : isCurrentDay ? 'text-primary' : 'text-muted-foreground',
                  )}>
                    {format(day, 'EEEE', { locale: dateLocale }).slice(0, 2).toUpperCase()}
                  </span>
                  <span className={cn(
                    'text-sm font-bold tabular-nums leading-none mt-0.5',
                    isCurrentDay && !isActive && 'text-primary',
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dotClass && !isActive && (
                    <span
                      className={cn('absolute top-1 right-1 h-1 w-1 rounded-full', dotClass)}
                      title={t('bookings.dayBookingsCount', { count })}
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Search + view toggle + density toggle */}
          <div className="flex items-center gap-2 lg:ml-auto">
            <div className="relative flex-1 lg:w-64 lg:flex-none">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('bookings.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            {/* Density toggle */}
            <div className="inline-flex items-center rounded-md border border-border bg-background p-0.5 shrink-0">
              <button
                onClick={() => setDensity('comfortable')}
                aria-pressed={density === 'comfortable'}
                aria-label={t('bookings.density.comfortable')}
                title={t('bookings.density.comfortable')}
                className={cn(
                  'inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors',
                  density === 'comfortable' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="hidden sm:inline">{t('bookings.density.comfortable')}</span>
                <span className="sm:hidden">C</span>
              </button>
              <button
                onClick={() => setDensity('compact')}
                aria-pressed={density === 'compact'}
                aria-label={t('bookings.density.compact')}
                title={t('bookings.density.compact')}
                className={cn(
                  'inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors',
                  density === 'compact' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="hidden sm:inline">{t('bookings.density.compact')}</span>
                <span className="sm:hidden">S</span>
              </button>
            </div>
            {/* View mode toggle */}
            <div className="inline-flex items-center rounded-md border border-border bg-background p-0.5 shrink-0">
              <button
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                aria-label={t('bookings.listView')}
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
                aria-label={t('bookings.gridView')}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                  viewMode === 'grid' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                aria-pressed={viewMode === 'timeline'}
                aria-label={t('bookings.timelineView')}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                  viewMode === 'timeline' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <ClockIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Staff filter row — appears when >1 staff have bookings on this day */}
      <StaffFilterRow
        staff={allStaff}
        staffColorMap={staffColorMap}
        selectedIds={new Set(staffFilterIds)}
        onToggle={(id) => {
          if (id === null) {
            setStaffFilter([]);
          } else {
            const activeStaffIds = allStaff
              .filter(s => dayAppointments.some(a => a.staffId === s.id))
              .map(s => s.id);
            toggleStaffFilter(id, activeStaffIds);
          }
        }}
        countFor={(staffId) => dayAppointments.filter(a => a.staffId === staffId).length}
        totalCount={dayAppointments.length}
      />

      {/* Slide-up bulk-action bar — fixed at screen bottom when rows are checked */}
      <BulkActionBar
        count={selectedIds.size}
        selectedLabel={t('bookings.selected')}
        onClear={clearSelection}
        actions={[
          {
            key: 'complete',
            label: t('bookings.markComplete'),
            icon: <CheckIcon className="h-4 w-4" />,
            onClick: () => bulkUpdateStatus('completed'),
            disabled: bulkPending,
          },
          {
            key: 'noshow',
            label: t('bookings.noShowAction'),
            icon: <ExclamationTriangleIcon className="h-4 w-4" />,
            onClick: () => bulkUpdateStatus('no_show'),
            disabled: bulkPending,
          },
          {
            key: 'cancel',
            label: t('bookings.cancelAction'),
            icon: <XMarkIcon className="h-4 w-4" />,
            onClick: () => bulkUpdateStatus('cancelled'),
            disabled: bulkPending,
          },
          {
            key: 'delete',
            label: t('bookings.deleteAction'),
            icon: <TrashIcon className="h-4 w-4" />,
            onClick: bulkDelete,
            danger: true,
            disabled: bulkPending,
          },
        ]}
      />

      {/* ─── Status filter tabs ──────────────────────────────
          Shares the same FilterPill shell as StaffFilterRow above.
          Status counts reflect the active staff filter so both rows
          compose correctly. Escape while focused resets to "All".    */}
      <div
        className="relative border-b border-border bg-black/[0.01] dark:bg-white/[0.01]"
        onKeyDown={(e) => { if (e.key === 'Escape') setStatusFilter('all'); }}
      >
        <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
          <FilterPill
            variant="meta"
            icon={<FunnelIcon className="h-4 w-4" />}
            label={t('bookings.allFilter')}
            count={statusCounts.all}
            selected={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            groupId="status-filter"
          />

          <span className="h-5 w-px bg-border shrink-0" aria-hidden />

          {(['scheduled', 'confirmed', 'completed', 'no_show', 'cancelled'] as const).map(key => {
            const count = statusCounts[key] ?? 0;
            const active = statusFilter === key;
            // Completely hide pills with no appointments (unless they're currently selected)
            if (count === 0 && !active) return null;
            return (
              <FilterPill
                key={key}
                variant="status"
                label={t(`status.${key}` as const)}
                count={count}
                selected={active}
                onClick={() => setStatusFilter(active ? 'all' : key)}
                fillColor={STATUS_DOT[key]}
                groupId="status-filter"
                badgeTintClass={STATUS_BADGE_TINT[key]}
                icon={STATUS_ICON[key]}
                iconColorClass={STATUS_ICON_COLOR[key]}
                hoverClass={STATUS_HOVER[key]}
                glowShadow={STATUS_GLOW[key]}
              />
            );
          })}
        </div>
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
              ? t('bookings.emptyTitleFiltered')
              : t('bookings.emptyTitleDate').replace('{date}', format(selectedDate, 'd MMM', { locale: dateLocale }))
          }
          description={
            searchQuery || statusFilter !== 'all'
              ? t('bookings.emptyDescFiltered')
              : isToday(selectedDate)
                ? t('bookings.emptyDescToday')
                : t('bookings.emptyDescOther')
          }
          action={
            !searchQuery && statusFilter === 'all' ? (
              <Button onClick={() => navigate('/bookings/new')}>
                <PlusIcon className="mr-2 h-4 w-4" />
                {t('bookings.createBooking')}
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === 'list' ? (
        /* ─── LIST VIEW ───────────────────────────────────── */
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border bg-muted/40">
                  <th scope="col" className="pl-3 pr-2 py-2.5 w-11">
                    <label className="inline-flex items-center justify-center h-11 w-11 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filteredAppointments.length > 0 && filteredAppointments.every(a => selectedIds.has(a.id))}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(new Set(filteredAppointments.map(a => a.id)));
                          else clearSelection();
                        }}
                        className="h-4 w-4 rounded border-border"
                        aria-label={t('bookings.selectAll')}
                      />
                    </label>
                  </th>
                  {([
                    { col: 'time' as const, label: t('bookings.colTime'), className: 'px-3 py-2.5 text-left w-28' },
                    { col: 'client' as const, label: t('bookings.colClient'), className: 'px-5 py-2.5 text-left' },
                    { col: 'service' as const, label: t('bookings.colService'), className: 'px-5 py-2.5 text-left hidden md:table-cell' },
                    { col: 'price' as const, label: t('bookings.colPrice'), className: 'px-5 py-2.5 text-right' },
                    { col: 'status' as const, label: t('bookings.colStatus'), className: 'px-5 py-2.5 text-left hidden sm:table-cell' },
                  ] as const).map(({ col, label, className }) => (
                    <th key={col} scope="col" className={className}>
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        aria-label={sortCol === col && sortDir === 'asc' ? t('bookings.sortDesc') : t('bookings.sortAsc')}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        {label}
                        {sortCol === col ? (
                          sortDir === 'asc'
                            ? <ChevronUpIcon className="h-3 w-3" />
                            : <ChevronDownIcon className="h-3 w-3" />
                        ) : (
                          <ChevronUpDownIcon className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-2.5 w-32"><span className="sr-only">{t('bookings.colActions')}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAppointments.map(apt => {
                  const start = parseISO(apt.startTime);
                  const end = parseISO(apt.endTime);
                  const duration = differenceInMinutes(end, start);
                  const avatarColor = getClientAvatarColor(apt.clientId);
                  const isCompleted = apt.status === 'completed';
                  const isCancelled = apt.status === 'cancelled';
                  const isDone = isCompleted || isCancelled;
                  const rowPy = density === 'compact' ? 'py-1.5' : 'py-3';

                  return (
                    <tr
                      key={apt.id}
                      tabIndex={0}
                      onClick={() => setSelectedAppointment(apt.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedAppointment(apt.id); } }}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring group',
                        isCancelled && 'opacity-50',
                        selectedIds.has(apt.id) && 'bg-primary/5',
                      )}
                    >
                      {/* Checkbox — 44×44 touch target via label wrapper */}
                      <td className={cn('pl-3 pr-2', rowPy)} onClick={(e) => e.stopPropagation()}>
                        <label className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(apt.id)}
                            onChange={() => toggleSelected(apt.id)}
                            className="h-4 w-4 rounded border-border"
                            aria-label={t('bookings.selectRow').replace('{name}', apt.client.firstName)}
                          />
                        </label>
                      </td>
                      {/* Time */}
                      <td className={cn('px-5 whitespace-nowrap', rowPy)}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground font-semibold tabular-nums">
                            {format(start, 'HH:mm')}
                          </span>
                          {apt.id === nextAptId && (
                            <span className="inline-flex items-center rounded-[4px] bg-primary px-1 py-px text-[9px] font-bold uppercase tracking-wider text-primary-foreground leading-none">
                              {t('bookings.nextLabel')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                          {formatDurationLocalized(duration, language)}
                        </p>
                      </td>

                      {/* Client */}
                      <td className={cn('px-5', rowPy)}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold', avatarColor.bg, avatarColor.text)}>
                            {apt.client.firstName[0]}{apt.client.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {apt.client.firstName} {apt.client.lastName}
                              </p>
                              {apt.client.totalVisits > 1 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center rounded bg-muted px-1 py-0 text-[10px] font-semibold tabular-nums text-muted-foreground align-middle shrink-0 cursor-default">
                                        ×{apt.client.totalVisits}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{t('bookings.clientVisits', { count: apt.client.totalVisits })}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {apt.client.deletedAt && (
                                <span className="inline-flex items-center rounded bg-muted px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground align-middle shrink-0">
                                  {t('bookings.archivedLabel')}
                                </span>
                              )}
                            </div>
                            {apt.client.notes && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center cursor-default">
                                      <ChatBubbleLeftEllipsisIcon className="h-3 w-3 text-muted-foreground/70" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[200px] text-xs">
                                    {apt.client.notes.slice(0, 80)}{apt.client.notes.length > 80 ? '…' : ''}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <p className="text-xs text-muted-foreground tabular-nums truncate md:hidden">
                              {apt.service.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Service */}
                      <td className={cn('px-5 hidden md:table-cell min-w-0', rowPy)}>
                        <div className="min-w-0">
                          <p className="font-normal text-foreground truncate">{apt.service.name}</p>
                          <p className="text-xs text-muted-foreground/70 truncate">
                            {apt.staff.firstName}
                          </p>
                        </div>
                      </td>

                      {/* Price */}
                      <td className={cn('px-5 text-right font-semibold text-foreground tabular-nums whitespace-nowrap', rowPy)}>
                        {formatPrice(apt.service.price, language)}
                      </td>

                      {/* Status */}
                      <td className={cn('px-5 hidden sm:table-cell', rowPy)}>
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          STATUS_PILL[apt.status],
                        )}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[apt.status])} />
                          {t(`status.${apt.status}` as const)}
                        </span>
                      </td>

                      {/* Quick actions — visible on touch, hover, and keyboard focus */}
                      <td className={cn('px-5', rowPy)}>
                        <div className="flex items-center justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                          {!isDone && (
                            <>
                              <button
                                onClick={(e) => quickSetStatus(apt.id, 'completed', e)}
                                aria-label={t('bookings.markComplete')}
                                title={t('bookings.markComplete')}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-emerald-100 hover:text-emerald-700 hover:ring-2 hover:ring-emerald-200 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-200 dark:hover:ring-emerald-900/60 transition-all"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => quickSetStatus(apt.id, 'no_show', e)}
                                aria-label={t('bookings.noShowAction')}
                                title={t('bookings.noShowAction')}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-amber-100 hover:text-amber-700 hover:ring-2 hover:ring-amber-200 dark:hover:bg-amber-950/60 dark:hover:text-amber-200 dark:hover:ring-amber-900/60 transition-all"
                              >
                                <ExclamationTriangleIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => quickSetStatus(apt.id, 'cancelled', e)}
                                aria-label={t('bookings.cancelAction')}
                                title={t('bookings.cancelAction')}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-100 hover:text-rose-700 hover:ring-2 hover:ring-rose-200 dark:hover:bg-rose-950/60 dark:hover:text-rose-200 dark:hover:ring-rose-900/60 transition-all"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
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
      ) : (
        /* ─── TIMELINE VIEW ────────────────────────────────── */
        <TimelineView
          appointments={filteredAppointments}
          workingHours={todayWorkingHours}
          selectedDate={selectedDate}
          density={density}
          onSelect={setSelectedAppointment}
        />
      )}

      {/* Detail Modal */}
      <BookingDetailModal
        apt={selectedApt}
        open={selectedAppointment !== null}
        onClose={() => setSelectedAppointment(null)}
        onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
        onDelete={handleDelete}
        onReschedule={(id, startTime, endTime) => rescheduleMutation.mutate({ id, startTime, endTime })}
        canReschedule={canReschedule}
        statusPending={updateMutation.isPending}
        deletePending={deleteMutation.isPending}
        reschedulePending={rescheduleMutation.isPending}
      />
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
  const t = useT();
  const language = useLanguageStore(s => s.language);
  const avatarColor = getClientAvatarColor(apt.clientId);
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
              {formatDurationLocalized(duration, language)} · {t('bookings.endsAt').replace('{time}', format(end, 'HH:mm'))}
            </p>
          </div>
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0',
            STATUS_PILL[apt.status],
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[apt.status])} />
            {t(`status.${apt.status}` as const)}
          </span>
        </div>

        {/* Body: client + service */}
        <div className="mt-3 flex items-center gap-2.5 min-w-0">
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold', avatarColor.bg, avatarColor.text)}>
            {apt.client.firstName[0]}{apt.client.lastName[0]}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm truncate">
              {apt.client.firstName} {apt.client.lastName}
            </p>
            <span className="text-xs text-muted-foreground tabular-nums truncate">
              {apt.client.phone}
            </span>
          </div>
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <ScissorsIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-foreground font-medium truncate">{apt.service.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-foreground">{formatPrice(apt.service.price, language)}</span>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-0.5 pl-5 truncate">
            {apt.staff.firstName}
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
              {t('bookings.markDone')}
            </button>
            <button
              onClick={(e) => onQuickAction(apt.id, 'cancelled', e)}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition-colors"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
              {t('bookings.cancelAction')}
            </button>
          </div>
        )}
      </div>
    </button>
  );
});


