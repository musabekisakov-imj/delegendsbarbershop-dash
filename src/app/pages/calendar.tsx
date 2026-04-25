import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, clientsApi, staffApi, servicesApi, shiftsApi, breaksApi } from '../lib/api';
import { useOfficeStore } from '../store/office-store';
import { useAuthStore } from '../store/auth-store';
import { findConflicts } from '../lib/booking-validation';
import { useT, useTimeFormat } from '../hooks/use-t';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import {
  format, parseISO, setHours, setMinutes, startOfDay,
  isToday, isBefore, differenceInMinutes, addDays, subDays,
} from 'date-fns';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  PlusIcon,
  ScissorsIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  Squares2X2Icon,
  ListBulletIcon,
  TableCellsIcon,
  CheckBadgeIcon,
  TrashIcon,
  CurrencyEuroIcon,
  PencilSquareIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { cn } from '../components/ui/utils';
import { formatTime, formatHourLabel } from '../lib/time';
import { assignLanes } from '../lib/calendar-lanes';
import { MiniCalendar } from '../components/calendar/mini-calendar';
import { DayAgenda } from '../components/calendar/day-agenda';
import { WeekView } from '../components/calendar/week-view';
import type { Appointment, AppointmentStatus, AppointmentWithDetails, Shift, Break, DayOfWeek, Client } from '../types';
import type { TranslationKey } from '../i18n';
import { AVATAR_GRADIENTS, hashToIndex } from '../lib/tokens';

// ─── Grid constants ─────────────────────────────────────
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 21;
const SLOT_HEIGHT = 100;
const MINUTES_PER_SLOT = 60;
const STAFF_COL_MIN_W = 200;
const TIME_GUTTER_W = 56;

// ─── Per-staff accent colors (dark-mode aware) ──────────
const STAFF_COLORS = [
  { bg: 'bg-blue-50/80 dark:bg-blue-950/60',       border: 'border-l-blue-500',    text: 'text-blue-900 dark:text-blue-100',     sub: 'text-blue-600 dark:text-blue-300',     dot: 'bg-blue-500',    light: 'bg-blue-100 dark:bg-blue-900/70',   label: 'text-blue-700 dark:text-blue-200',    ring: 'ring-blue-400'   },
  { bg: 'bg-violet-50/80 dark:bg-violet-950/60',   border: 'border-l-violet-500',  text: 'text-violet-900 dark:text-violet-100', sub: 'text-violet-600 dark:text-violet-300', dot: 'bg-violet-500',  light: 'bg-violet-100 dark:bg-violet-900/70', label: 'text-violet-700 dark:text-violet-200', ring: 'ring-violet-400' },
  { bg: 'bg-amber-50/80 dark:bg-amber-950/60',     border: 'border-l-amber-500',   text: 'text-amber-900 dark:text-amber-100',   sub: 'text-amber-700 dark:text-amber-300',   dot: 'bg-amber-500',   light: 'bg-amber-100 dark:bg-amber-900/70',  label: 'text-amber-700 dark:text-amber-200',  ring: 'ring-amber-400'  },
  { bg: 'bg-emerald-50/80 dark:bg-emerald-950/60', border: 'border-l-emerald-500', text: 'text-emerald-900 dark:text-emerald-100', sub:'text-emerald-600 dark:text-emerald-300', dot:'bg-emerald-500', light:'bg-emerald-100 dark:bg-emerald-900/70', label:'text-emerald-700 dark:text-emerald-200', ring:'ring-emerald-400' },
  { bg: 'bg-rose-50/80 dark:bg-rose-950/60',       border: 'border-l-rose-500',    text: 'text-rose-900 dark:text-rose-100',     sub: 'text-rose-600 dark:text-rose-300',     dot: 'bg-rose-500',    light: 'bg-rose-100 dark:bg-rose-900/70',   label: 'text-rose-700 dark:text-rose-200',    ring: 'ring-rose-400'   },
  { bg: 'bg-cyan-50/80 dark:bg-cyan-950/60',       border: 'border-l-cyan-500',    text: 'text-cyan-900 dark:text-cyan-100',     sub: 'text-cyan-600 dark:text-cyan-300',     dot: 'bg-cyan-500',    light: 'bg-cyan-100 dark:bg-cyan-900/70',   label: 'text-cyan-700 dark:text-cyan-200',    ring: 'ring-cyan-400'   },
  { bg: 'bg-orange-50/80 dark:bg-orange-950/60',   border: 'border-l-orange-500',  text: 'text-orange-900 dark:text-orange-100', sub: 'text-orange-600 dark:text-orange-300', dot: 'bg-orange-500',  light: 'bg-orange-100 dark:bg-orange-900/70', label: 'text-orange-700 dark:text-orange-200', ring: 'ring-orange-400' },
];

const getStaffColor = (idx: number) => STAFF_COLORS[idx % STAFF_COLORS.length];

// ─── Helpers ────────────────────────────────────────────
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function getDayOfWeek(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

type ViewMode = 'grid' | 'day' | 'week';

// ─── Appointment Detail Modal ───────────────────────────
function AppointmentDetailModal({
  apt,
  staffColorMap,
  statusMap,
  t,
  timeFormat,
  onClose,
  onChangeStatus,
  onDelete,
  onFullUpdate,
  canEditFully,
  staffList,
  serviceList,
  isUpdating,
  isDeleting,
}: {
  apt: AppointmentWithDetails;
  staffColorMap: Map<string, number>;
  statusMap: Record<string, { label: string; cls: string }>;
  t: (key: TranslationKey) => string;
  timeFormat: '12h' | '24h';
  onClose: () => void;
  onChangeStatus: (id: string, status: AppointmentStatus) => void;
  onDelete: (id: string, clientName: string) => void;
  onFullUpdate: (id: string, changes: { startTime?: string; endTime?: string; staffId?: string; serviceId?: string; notes?: string }) => void;
  canEditFully: boolean;
  staffList: { id: string; firstName: string; lastName: string; isActive: boolean }[];
  serviceList: { id: string; name: string; price: number; duration: number }[];
  isUpdating: boolean;
  isDeleting: boolean;
}) {
  const start = parseISO(apt.startTime);
  const end = parseISO(apt.endTime);
  const duration = differenceInMinutes(end, start);
  const colors = getStaffColor(staffColorMap.get(apt.staffId) ?? 0);
  const status = statusMap[apt.status] || statusMap.scheduled;

  const busy = isUpdating || isDeleting;

  // ── Full-edit state (owner/manager only) ───────────────────
  // Toggle between "view" mode (status buttons, delete) and "edit" mode
  // (time, duration, barber, service, notes all editable).
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(() => ({
    date: format(start, 'yyyy-MM-dd'),
    time: format(start, 'HH:mm'),
    durationMin: duration,
    staffId: apt.staffId,
    serviceId: apt.serviceId,
    notes: apt.notes ?? '',
  }));

  const saveEdit = () => {
    // Rebuild ISO timestamps from date + time; recompute endTime from duration.
    const [y, m, d] = editForm.date.split('-').map(Number);
    const [hh, mm] = editForm.time.split(':').map(Number);
    const newStart = new Date(y, m - 1, d, hh, mm, 0, 0);
    const newEnd = new Date(newStart.getTime() + editForm.durationMin * 60_000);
    onFullUpdate(apt.id, {
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
      staffId: editForm.staffId,
      serviceId: editForm.serviceId,
      notes: editForm.notes,
    });
    setIsEditing(false);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[460px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{t('calendar.appointmentDetails')}</DialogTitle>
        </DialogHeader>

        <div className={cn('h-2 w-full', colors.dot)} />

        <div className="px-6 pt-5 pb-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-full text-base font-bold shrink-0', colors.light, colors.label)}>
                {apt.client.firstName[0]}{apt.client.lastName[0]}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-foreground truncate">{apt.client.firstName} {apt.client.lastName}</p>
                <a
                  href={`tel:${apt.client.phone}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-0.5 tabular-nums transition-colors"
                >
                  <PhoneIcon className="h-3.5 w-3.5" />
                  {apt.client.phone}
                </a>
              </div>
            </div>
            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold shrink-0', status.cls)}>{status.label}</span>
          </div>

          {/* ── Details: read-only view OR full-edit form ───────────── */}
          {isEditing ? (
            <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Editing appointment</p>

              {/* Date + time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm(f => ({ ...f, date: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Start</label>
                  <input
                    type="time"
                    step={300}
                    value={editForm.time}
                    onChange={(e) => setEditForm(f => ({ ...f, time: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Duration (min)</label>
                <input
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={editForm.durationMin}
                  onChange={(e) => setEditForm(f => ({ ...f, durationMin: parseInt(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                />
              </div>

              {/* Service */}
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Service</label>
                <select
                  value={editForm.serviceId}
                  onChange={(e) => {
                    const svc = serviceList.find(s => s.id === e.target.value);
                    setEditForm(f => ({
                      ...f,
                      serviceId: e.target.value,
                      // Auto-adopt the new service's duration — owner can still override.
                      durationMin: svc?.duration ?? f.durationMin,
                    }));
                  }}
                  className="mt-1 w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  {serviceList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} — €{s.price} · {s.duration}m</option>
                  ))}
                </select>
              </div>

              {/* Barber */}
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Barber</label>
                <select
                  value={editForm.staffId}
                  onChange={(e) => setEditForm(f => ({ ...f, staffId: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  {staffList.filter(s => s.isActive).map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Notes</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Preferences, allergies…"
                  className="mt-1 w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                />
              </div>
            </div>
          ) : (
          <div className="space-y-3.5 rounded-xl border border-border bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <ClockIcon className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="text-base font-semibold text-foreground tabular-nums">
                {formatTime(start, timeFormat)} – {formatTime(end, timeFormat)}
              </span>
              <span className="text-sm text-muted-foreground">{duration}min</span>
            </div>
            <div className="flex items-center gap-3">
              <ScissorsIcon className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="text-base font-semibold text-foreground truncate">{apt.service.name}</span>
              <span className="ml-auto text-base font-semibold text-foreground tabular-nums">€{apt.service.price}</span>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="h-6 w-6 shrink-0">
                {apt.staff.avatarUrl && <AvatarImage src={apt.staff.avatarUrl} alt={apt.staff.firstName} />}
                <AvatarFallback className={cn('text-[9px] font-bold', colors.light, colors.label)}>{apt.staff.firstName[0]}{apt.staff.lastName[0]}</AvatarFallback>
              </Avatar>
              <span className="text-base font-medium text-foreground truncate">{apt.staff.firstName} {apt.staff.lastName}</span>
              <span className={cn('ml-auto h-2.5 w-2.5 rounded-full', colors.dot)} />
            </div>
          </div>
          )}

          {!isEditing && apt.notes && (
            <div className="flex gap-3 text-sm">
              <ChatBubbleLeftIcon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-muted-foreground leading-relaxed">{apt.notes}</p>
            </div>
          )}

          {/* Action buttons — differ by mode */}
          <div className="space-y-2 pt-1">
            {isEditing ? (
              <div className="grid grid-cols-2 gap-2">
                <ActionButton
                  tone="amber"
                  icon={XCircleIcon}
                  label={t('common.cancel')}
                  onClick={() => setIsEditing(false)}
                  disabled={busy}
                />
                <ActionButton
                  tone="emerald"
                  icon={CheckCircleIcon}
                  label={t('common.saveChanges')}
                  onClick={saveEdit}
                  disabled={busy}
                />
              </div>
            ) : (
              <>
                {/* Full edit — owner/manager only */}
                {canEditFully && (
                  <ActionButton
                    tone="blue"
                    icon={PencilSquareIcon}
                    label={t('clients.edit').replace('client', 'appointment').replace('Client', 'Appointment') || 'Edit appointment'}
                    onClick={() => setIsEditing(true)}
                    disabled={busy}
                    wide
                  />
                )}
            {apt.status === 'scheduled' && (
              <div className="grid grid-cols-2 gap-2">
                <ActionButton
                  tone="emerald"
                  icon={CheckCircleIcon}
                  label={t('common.confirm')}
                  onClick={() => onChangeStatus(apt.id, 'confirmed')}
                  disabled={busy}
                />
                <ActionButton
                  tone="blue"
                  icon={CheckBadgeIcon}
                  label={t('status.completed')}
                  onClick={() => onChangeStatus(apt.id, 'completed')}
                  disabled={busy}
                />
              </div>
            )}

            {apt.status === 'confirmed' && (
              <ActionButton
                tone="blue"
                icon={CheckBadgeIcon}
                label={t('status.completed')}
                onClick={() => onChangeStatus(apt.id, 'completed')}
                disabled={busy}
                wide
              />
            )}

            {apt.status === 'cancelled' && (
              <ActionButton
                tone="emerald"
                icon={CheckCircleIcon}
                label={t('status.scheduled')}
                onClick={() => onChangeStatus(apt.id, 'scheduled')}
                disabled={busy}
                wide
              />
            )}

            {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
              <ActionButton
                tone="amber"
                icon={XCircleIcon}
                label={t('common.cancel')}
                onClick={() => onChangeStatus(apt.id, 'cancelled')}
                disabled={busy}
                wide
              />
            )}

            <ActionButton
              tone="rose"
              icon={TrashIcon}
              label={t('common.delete')}
              onClick={() => onDelete(apt.id, `${apt.client.firstName} ${apt.client.lastName}`)}
              disabled={busy}
              wide
            />
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionButton({
  tone, icon: Icon, label, onClick, disabled, wide,
}: {
  tone: 'emerald' | 'blue' | 'amber' | 'rose';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  wide?: boolean;
}) {
  // Tonal buttons — single source of color (tinted bg), no competing border.
  // Refactoring UI: borders compete with color-filled backgrounds; pick one.
  const tones = {
    emerald: 'bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-200/70 dark:hover:bg-emerald-900/50',
    blue:    'bg-blue-100/70 dark:bg-blue-950/50 text-blue-700 dark:text-blue-200 hover:bg-blue-200/70 dark:hover:bg-blue-900/50',
    amber:   'bg-amber-100/70 dark:bg-amber-950/50 text-amber-700 dark:text-amber-200 hover:bg-amber-200/70 dark:hover:bg-amber-900/50',
    rose:    'bg-rose-100/70 dark:bg-rose-950/50 text-rose-700 dark:text-rose-200 hover:bg-rose-200/70 dark:hover:bg-rose-900/50',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        tones[tone],
        wide && 'w-full',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ─── Main Calendar ──────────────────────────────────────
export function CalendarPage() {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const t = useT();
  const [timeFormat] = useTimeFormat();

  const [selectedDate, setSelectedDate] = useState(new Date());
  // Initial view-mode: grid on desktop, day on mobile (grid becomes unreadable
  // with 4+ staff columns on a 375px screen). Checks viewport once at mount —
  // no rAF loop, user can still manually switch if they want.
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'day' : 'grid',
  );

  // If the viewport crosses the md breakpoint (e.g. tablet rotated), auto-swap
  // to a sensible default — but only while in the default view (grid/day),
  // not if the user deliberately chose week.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => {
      setViewMode(prev => {
        if (prev === 'week') return prev; // respect explicit choice
        return e.matches ? 'day' : 'grid';
      });
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const [miniOpen, setMiniOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailApt, setDetailApt] = useState<AppointmentWithDetails | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ hour: number; minute: number; staffId?: string } | null>(null);
  // Editable date + time for the New Appointment modal. Initialized from the
  // clicked slot; user can override via `<input type="date">` + `<input type="time">`.
  const [createDate, setCreateDate] = useState<string>(''); // yyyy-MM-dd
  const [createTime, setCreateTime] = useState<string>(''); // HH:mm
  const [formData, setFormData] = useState({ clientId: '', staffId: '', serviceId: '', notes: '' });
  // Client autocomplete — type name/phone/email to find an existing record; if
  // nothing matches, switch to the inline "new client" form (name + phone).
  // This is client review item #5: "if I type the phone or email it should
  // check the system to know if the customer information is stored".
  const [clientSearch, setClientSearch] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClient, setNewClient] = useState({ firstName: '', lastName: '', phone: '', email: '' });
  const [conflictState, setConflictState] = useState<{ conflicts: ReturnType<typeof findConflicts>; pending: Omit<Appointment, 'id' | 'createdAt'> } | null>(null);
  const officeId = useOfficeStore(s => s.currentOfficeId);
  const offices = useOfficeStore(s => s.offices);
  const userRole = useAuthStore(s => s.user?.role);
  const canOverride = userRole === 'owner' || userRole === 'manager';

  // ─── Queries ────────────
  const { data: appointments = [] } = useQuery({ queryKey: ['appointments', officeId], queryFn: () => appointmentsApi.getAllWithDetails(officeId) });
  const { data: clients = [] } = useQuery({ queryKey: ['clients', officeId], queryFn: () => clientsApi.getAll(officeId) });
  const { data: allStaff = [] } = useQuery({ queryKey: ['staff', officeId], queryFn: () => staffApi.getAll(officeId) });
  const { data: services = [] } = useQuery({ queryKey: ['services', officeId], queryFn: () => servicesApi.getAll(officeId) });
  const { data: allShifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: () => shiftsApi.getAll() });
  const { data: allBreaks = [] } = useQuery({ queryKey: ['breaks'], queryFn: () => breaksApi.getAll() });
  const { data: allAppointments = [] } = useQuery({ queryKey: ['appointments', 'all-offices'], queryFn: () => appointmentsApi.getAllAcrossOffices() });

  const activeStaff = useMemo(() => allStaff.filter(s => s.isActive), [allStaff]);

  // Editorial hero context: the office label + human-relative day
  // ("Today" / "Tomorrow" / "3 days ago") — matches Bookings/Overview.
  const currentOffice = useMemo(() => offices.find(o => o.id === officeId), [offices, officeId]);
  const dayLabel = useMemo(() => {
    const nowStart = startOfDay(new Date());
    const selStart = startOfDay(selectedDate);
    const deltaDays = Math.round((selStart.getTime() - nowStart.getTime()) / 86_400_000);
    if (deltaDays === 0) return 'Today';
    if (deltaDays === 1) return 'Tomorrow';
    if (deltaDays === -1) return 'Yesterday';
    if (deltaDays > 0) return `In ${deltaDays} days`;
    return `${Math.abs(deltaDays)} days ago`;
  }, [selectedDate]);

  // ─── Status map (translated) ─────
  const statusMap = useMemo(() => ({
    confirmed: { label: t('status.confirmed'), cls: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' },
    scheduled: { label: t('status.scheduled'), cls: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' },
    completed: { label: t('status.completed'), cls: 'bg-muted text-muted-foreground' },
    cancelled: { label: t('status.cancelled'), cls: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' },
  }), [t]);

  // ─── Shifts & breaks for current day ─────
  const currentDow = useMemo(() => getDayOfWeek(selectedDate), [selectedDate]);

  const shiftsByStaff = useMemo(() => {
    const m = new Map<string, Shift | null>();
    activeStaff.forEach(s => {
      const shift = allShifts.find(sh => sh.staffId === s.id && sh.dayOfWeek === currentDow) || null;
      m.set(s.id, shift);
    });
    return m;
  }, [allShifts, activeStaff, currentDow]);

  const breaksByStaff = useMemo(() => {
    const m = new Map<string, Break[]>();
    activeStaff.forEach(s => {
      const staffBreaks = allBreaks.filter(b => b.staffId === s.id && b.dayOfWeek === currentDow);
      m.set(s.id, staffBreaks);
    });
    return m;
  }, [allBreaks, activeStaff, currentDow]);

  const isUnavailable = useCallback((hour: number, minute: number, staffId: string): boolean => {
    const slotMin = hour * 60 + minute;
    const shift = shiftsByStaff.get(staffId);
    if (!shift) return true;
    const shiftStart = parseTimeToMinutes(shift.startTime);
    const shiftEnd = parseTimeToMinutes(shift.endTime);
    if (slotMin < shiftStart || slotMin >= shiftEnd) return true;
    const breaks = breaksByStaff.get(staffId) || [];
    return breaks.some(b => {
      const bStart = parseTimeToMinutes(b.startTime);
      const bEnd = parseTimeToMinutes(b.endTime);
      return slotMin >= bStart && slotMin < bEnd;
    });
  }, [shiftsByStaff, breaksByStaff]);

  const createMutation = useMutation({
    mutationFn: (data: Omit<Appointment, 'id' | 'createdAt'> & { override?: boolean }) => appointmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success(t('toast.appointmentCreated'));
      closeCreate();
      setConflictState(null);
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code === 'BOOKING_CONFLICT') {
        toast.error(t('toast.bookingConflict'));
      } else {
        toast.error(t('toast.appointmentError'));
      }
    },
  });

  // Inline-create a client from the New Appointment dialog when autocomplete
  // returns no match. Auto-selects the created client so the dialog stays on task.
  const createClientMut = useMutation({
    mutationFn: (data: Parameters<typeof clientsApi.create>[0]) => clientsApi.create(data),
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setFormData(f => ({ ...f, clientId: c.id }));
      setNewClient({ firstName: '', lastName: '', phone: '', email: '' });
      setIsCreatingClient(false);
      setClientSearch('');
      toast.success(t('toast.clientCreated'));
    },
    onError: () => toast.error(t('toast.clientCreateError')),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsApi.update(id, { status }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      const key = vars.status === 'confirmed' ? 'toast.appointmentConfirmed'
        : vars.status === 'cancelled' ? 'toast.appointmentCancelled'
        : 'toast.appointmentUpdated';
      toast.success(t(key as TranslationKey));
      setDetailApt(null);
    },
    onError: () => toast.error(t('toast.appointmentUpdateError')),
  });

  // Full-edit mutation — owner/manager can change time, duration, staff, service,
  // notes. We don't run conflict detection here: the owner explicitly chose to
  // override (this is the "owner has full control" path from the client review).
  // The regular create flow still enforces conflicts for receptionists.
  // Optimistic full-edit — appointment block moves to its new time/staff on the
  // calendar grid immediately. Server call still runs; on error we roll back
  // from the snapshot. Matches the delete flow so edits don't feel slower.
  const fullUpdateMutation = useMutation({
    mutationFn: ({ id, changes }: {
      id: string;
      changes: { startTime?: string; endTime?: string; staffId?: string; serviceId?: string; notes?: string };
    }) => appointmentsApi.update(id, changes),
    onMutate: async ({ id, changes }) => {
      const key = ['appointments', officeId] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AppointmentWithDetails[]>(key as unknown as readonly unknown[]);
      if (previous) {
        queryClient.setQueryData<AppointmentWithDetails[]>(key as unknown as readonly unknown[], (old) =>
          (old ?? []).map(a =>
            a.id === id
              ? {
                  ...a,
                  ...changes,
                  // Re-hydrate nested joins when staff/service changed
                  staff: changes.staffId
                    ? (allStaff.find(s => s.id === changes.staffId) ?? a.staff)
                    : a.staff,
                  service: changes.serviceId
                    ? (services.find(s => s.id === changes.serviceId) ?? a.service)
                    : a.service,
                }
              : a,
          ),
        );
      }
      return { previous, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous && context.key) {
        queryClient.setQueryData(context.key as unknown as readonly unknown[], context.previous);
      }
      toast.error(t('toast.appointmentUpdateError'));
    },
    onSuccess: () => {
      toast.success(t('toast.appointmentUpdated'));
      setDetailApt(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success(t('toast.appointmentDeleted'));
      setDetailApt(null);
    },
    onError: () => toast.error(t('toast.appointmentDeleteError')),
  });

  const handleDelete = useCallback((id: string, clientName: string) => {
    if (confirm(`Delete appointment for ${clientName}? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  const closeCreate = useCallback(() => {
    setIsCreateOpen(false);
    setFormData({ clientId: '', staffId: '', serviceId: '', notes: '' });
    setSelectedSlot(null);
    setClientSearch('');
    setIsCreatingClient(false);
    setNewClient({ firstName: '', lastName: '', phone: '', email: '' });
  }, []);

  const openSlot = (hour: number, minute: number, staffId: string) => {
    setSelectedSlot({ hour, minute, staffId });
    setFormData(f => ({ ...f, staffId }));
    // Seed the editable date + time from the clicked slot.
    setCreateDate(format(selectedDate, 'yyyy-MM-dd'));
    setCreateTime(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    setIsCreateOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.clientId || !formData.staffId || !formData.serviceId) {
      toast.error(t('toast.fillRequired'));
      return;
    }
    const svc = services.find(s => s.id === formData.serviceId);
    if (!svc) return;
    // Parse the editable date + time inputs (YYYY-MM-DD and HH:mm).
    const dateParts = createDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeParts = createTime.match(/^(\d{2}):(\d{2})$/);
    if (!dateParts || !timeParts) {
      toast.error(t('toast.fillRequired'));
      return;
    }
    const st = new Date(
      Number(dateParts[1]),
      Number(dateParts[2]) - 1,
      Number(dateParts[3]),
      Number(timeParts[1]),
      Number(timeParts[2]),
      0, 0,
    );
    const et = new Date(st.getTime() + svc.duration * 60000);
    const payload: Omit<Appointment, 'id' | 'createdAt'> = {
      clientId: formData.clientId, staffId: formData.staffId, serviceId: formData.serviceId,
      startTime: st.toISOString(), endTime: et.toISOString(), status: 'scheduled', notes: formData.notes,
      locationId: officeId,
    };
    const conflicts = findConflicts(
      { staffId: payload.staffId, start: st, end: et },
      allAppointments,
      offices,
    );
    if (conflicts.length > 0) {
      setConflictState({ conflicts, pending: payload });
      return;
    }
    createMutation.mutate(payload);
  };

  const confirmOverride = () => {
    if (!conflictState) return;
    createMutation.mutate({ ...conflictState.pending, override: true });
  };

  // ─── Derived ────────────
  const dayApts = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    return appointments.filter(a => format(parseISO(a.startTime), 'yyyy-MM-dd') === key);
  }, [appointments, selectedDate]);

  const aptsByStaff = useMemo(() => {
    const m = new Map<string, AppointmentWithDetails[]>();
    activeStaff.forEach(s => m.set(s.id, []));
    dayApts.forEach(a => { const l = m.get(a.staffId) || []; l.push(a); m.set(a.staffId, l); });
    return m;
  }, [dayApts, activeStaff]);

  // Per-staff lane assignment (fixes overlap)
  const lanesByStaff = useMemo(() => {
    const m = new Map<string, ReturnType<typeof assignLanes>>();
    aptsByStaff.forEach((appts, staffId) => m.set(staffId, assignLanes(appts)));
    return m;
  }, [aptsByStaff]);

  const staffColorMap = useMemo(() => {
    const m = new Map<string, number>();
    activeStaff.forEach((s, i) => m.set(s.id, i));
    return m;
  }, [activeStaff]);

  // ─── Time ───────────────
  // Tick once a minute so the red now-line (and its timestamp) actually moves.
  // Without this, `new Date()` is frozen at component mount and the line
  // stays put until the user reloads — subtle bug users notice at ~15 min idle.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const nowMin = (now.getHours() - DAY_START_HOUR) * 60 + now.getMinutes();
  const showNow = isToday(selectedDate) && nowMin >= 0 && nowMin <= (DAY_END_HOUR - DAY_START_HOUR) * 60;
  const totalSlots = DAY_END_HOUR - DAY_START_HOUR;
  const hours = Array.from({ length: totalSlots + 1 }, (_, i) => DAY_START_HOUR + i);
  const gridH = totalSlots * SLOT_HEIGHT;

  // Reset manual-scroll flag whenever the date changes.
  useEffect(() => { userScrolledRef.current = false; }, [selectedDate, viewMode]);

  // Auto-scroll inside the grid container to current time (~⅓ from the top).
  useEffect(() => {
    if (viewMode !== 'grid') return;
    if (!scrollRef.current) return;
    if (!isToday(selectedDate)) return;
    if (userScrolledRef.current) return;

    const targetTop = (nowMin / MINUTES_PER_SLOT) * SLOT_HEIGHT - scrollRef.current.clientHeight / 3;
    scrollRef.current.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }, [selectedDate, viewMode, nowMin]);

  const handleScroll = useCallback(() => {
    userScrolledRef.current = true;
  }, []);

  // ─── Off-duty overlay renderer ─────
  // When the viewer is owner/manager, overlays render `pointer-events-none`
  // so the clickable slot cells beneath still receive clicks — the overlay
  // stays visible (owner still needs the visual context) but doesn't block.
  const renderOffDuty = (staffId: string) => {
    const shift = shiftsByStaff.get(staffId);
    const totalMinutes = totalSlots * 60;
    const passThrough = canOverride ? 'pointer-events-none' : '';

    if (!shift) {
      return (
        <div className={cn('absolute inset-0 z-[5] flex items-center justify-center bg-muted/60 dark:bg-muted/40', passThrough)}>
          <span className="rounded-md bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            {t('calendar.dayOff')}
          </span>
        </div>
      );
    }

    const shiftStartMin = parseTimeToMinutes(shift.startTime) - DAY_START_HOUR * 60;
    const shiftEndMin = parseTimeToMinutes(shift.endTime) - DAY_START_HOUR * 60;
    const overlays: React.ReactNode[] = [];

    if (shiftStartMin > 0) {
      const h = (shiftStartMin / 60) * SLOT_HEIGHT;
      overlays.push(
        <div key="pre" className={cn('absolute left-0 right-0 top-0 z-[5] bg-muted/60 dark:bg-muted/40', passThrough)} style={{ height: `${h}px` }} />,
      );
    }

    if (shiftEndMin < totalMinutes) {
      const top = (shiftEndMin / 60) * SLOT_HEIGHT;
      const h = ((totalMinutes - shiftEndMin) / 60) * SLOT_HEIGHT;
      overlays.push(
        <div key="post" className={cn('absolute left-0 right-0 z-[5] bg-muted/60 dark:bg-muted/40', passThrough)} style={{ top: `${top}px`, height: `${h}px` }} />,
      );
    }

    return <>{overlays}</>;
  };

  const renderBreaks = (staffId: string) => {
    const breaks = breaksByStaff.get(staffId) || [];
    const passThrough = canOverride ? 'pointer-events-none' : '';
    return breaks.map(brk => {
      const startMin = parseTimeToMinutes(brk.startTime) - DAY_START_HOUR * 60;
      const endMin = parseTimeToMinutes(brk.endTime) - DAY_START_HOUR * 60;
      const top = (startMin / 60) * SLOT_HEIGHT;
      const h = ((endMin - startMin) / 60) * SLOT_HEIGHT;
      const labelKey = `break.${brk.type}` as TranslationKey;

      return (
        <div
          key={brk.id}
          className={cn('absolute left-1 right-1 z-[8] flex items-center justify-center rounded-md border border-dashed border-border break-stripes', passThrough)}
          style={{ top: `${top}px`, height: `${h}px` }}
        >
          <span className="rounded bg-muted/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {t(labelKey)}
          </span>
        </div>
      );
    });
  };

  const renderBlock = (apt: AppointmentWithDetails, laneInfo?: { lane: number; laneCount: number }) => {
    const s = parseISO(apt.startTime);
    const e = parseISO(apt.endTime);
    const sMin = (s.getHours() - DAY_START_HOUR) * 60 + s.getMinutes();
    const dur = differenceInMinutes(e, s);
    const top = (sMin / MINUTES_PER_SLOT) * SLOT_HEIGHT;
    const h = Math.max((dur / MINUTES_PER_SLOT) * SLOT_HEIGHT - 2, 36);
    const c = getStaffColor(staffColorMap.get(apt.staffId) ?? 0);
    const timeStr = `${formatTime(s, timeFormat)}–${formatTime(e, timeFormat)}`;

    const tiny = h < 44;
    const compact = h >= 44 && h < 70;

    const laneCount = laneInfo?.laneCount ?? 1;
    const lane = laneInfo?.lane ?? 0;
    // Use CSS calc so columns still have a small left/right gutter matching the single-lane case (4px).
    const lanePct = 100 / laneCount;
    const style: React.CSSProperties = {
      top: `${top}px`,
      height: `${h}px`,
      left: `calc(${lane * lanePct}% + 4px)`,
      width: `calc(${lanePct}% - 8px)`,
    };

    // Drag-to-reschedule is gated by `canOverride` — only owner/manager can
    // move bookings freely. Receptionists/barbers still see and click, but
    // the block shows a normal pointer and doesn't drag.
    return (
      <button
        key={apt.id}
        draggable={canOverride}
        onDragStart={canOverride ? (ev) => {
          ev.dataTransfer.setData('text/plain', apt.id);
          ev.dataTransfer.effectAllowed = 'move';
        } : undefined}
        onClick={ev => { ev.stopPropagation(); setDetailApt(apt); }}
        className={cn(
          'absolute rounded-lg border-l-[3px] text-left',
          'transition-all duration-150 hover:shadow-md hover:-translate-y-px overflow-hidden z-10',
          canOverride ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
          c.bg, c.border,
          apt.status === 'cancelled' && 'opacity-40',
        )}
        style={style}
        title={canOverride ? 'Drag to reschedule · click to edit' : 'Click to view'}
      >
        {tiny ? (
          <div className="flex items-center h-full px-2 gap-1.5">
            <p className={cn('text-xs font-bold truncate', c.text)}>
              {apt.client.firstName} {apt.client.lastName[0]}.
            </p>
            <p className={cn('text-[11px] tabular-nums shrink-0 ml-auto', c.sub)}>{timeStr}</p>
          </div>
        ) : compact ? (
          <div className="flex flex-col justify-center h-full px-2.5 py-1.5 gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <p className={cn('text-[13px] font-bold truncate', c.text)}>
                {apt.client.firstName} {apt.client.lastName}
              </p>
              <p className={cn('text-[11px] tabular-nums shrink-0', c.sub)}>{timeStr}</p>
            </div>
            <p className={cn('text-xs truncate', c.sub)}>{apt.service.name}</p>
          </div>
        ) : (
          <div className="flex flex-col h-full px-2.5 py-2 gap-1">
            <p className={cn('text-sm font-bold truncate leading-tight', c.text)}>
              {apt.client.firstName} {apt.client.lastName}
            </p>
            <p className={cn('text-xs font-medium truncate', c.sub)}>{apt.service.name}</p>
            {h >= 96 && apt.client.phone && (
              <p className={cn('flex items-center gap-1 text-[11px] tabular-nums truncate', c.sub)}>
                <PhoneIcon className="h-3 w-3 shrink-0" />
                {apt.client.phone}
              </p>
            )}
            <div className={cn('flex items-center justify-between gap-2 mt-auto', c.sub)}>
              <span className="text-xs tabular-nums">{timeStr}</span>
              <span className="text-xs font-semibold tabular-nums">€{apt.service.price}</span>
            </div>
          </div>
        )}
      </button>
    );
  };

  const staffCount = activeStaff.length;

  return (
    <div className="space-y-5">
      {/* ─── Editorial hero ──────────────────────────────
          Studio Score direction: the date IS the title, like a
          conductor's score sheet. Same family as Overview /
          Analytics / Bookings — uppercase eyebrow with office +
          relative day, display-size weekday/date, right-aligned
          primary action. Mini-calendar lives as a popover off
          the date chip so click-through stays one tap. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>Calendar</span>
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
          <Popover open={miniOpen} onOpenChange={setMiniOpen}>
            <PopoverTrigger asChild>
              <button
                className="group mt-2 inline-flex items-center gap-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-none tabular-nums hover:text-foreground/80 transition-colors"
                aria-label="Open date picker"
              >
                {format(selectedDate, 'EEEE, MMMM d')}
                <CalendarDaysIcon className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[260px]">
              <MiniCalendar
                selectedDate={selectedDate}
                onSelectDate={d => { setSelectedDate(d); setMiniOpen(false); }}
                appointments={appointments}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={() => { closeCreate(); setIsCreateOpen(true); }}>
            <PlusIcon className="mr-1 h-4 w-4" />
            {t('calendar.newAppointment')}
          </Button>
        </div>
      </div>

      {/* ─── Layout ───────────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* ── Left Sidebar ── */}
        <div className="hidden lg:flex flex-col gap-4 w-[248px] shrink-0">
          <div className="rounded-xl border border-border bg-card p-3.5">
            <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} appointments={appointments} />
          </div>

          {/* ─── Day summary (editorial — Studio Score) ─
              Hairline-divided typography. No gradients,
              no tinted panels. Consistent с другими страницами
              в editorial-семье (Clients, Staff, Services, etc). */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.18em]">
                {t('calendar.summary')}
              </p>
              <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                {isToday(selectedDate) ? t('common.today') : format(selectedDate, 'MMM d')}
              </span>
            </div>

            {/* Day revenue — hero number, editorial scale */}
            <div>
              <p className="text-3xl font-bold text-foreground tabular-nums leading-none tracking-tight">
                €{dayApts
                  .filter(a => a.status === 'completed')
                  .reduce((s, a) => s + (a.service.price ?? 0), 0)
                  .toLocaleString()}
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
                {dayApts.filter(a => a.status === 'completed').length} completed · {dayApts.length} booked
              </p>
            </div>

            {/* Hairline-divided stat pair */}
            <div className="grid grid-cols-2 divide-x divide-border border-y border-border -mx-4">
              <div className="px-4 py-2.5">
                <p className="text-xl font-semibold text-foreground tabular-nums leading-none">{dayApts.length}</p>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('calendar.bookings')}</p>
              </div>
              <div className="px-4 py-2.5">
                <p className="text-xl font-semibold text-foreground tabular-nums leading-none">{dayApts.filter(a => a.status === 'confirmed').length}</p>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('calendar.confirmed')}</p>
              </div>
            </div>

            {/* Staff roll — names с подсчётом appointments */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-2">
                On duty
              </p>
              <div className="space-y-1.5">
                {activeStaff.map((m, i) => {
                  const c = getStaffColor(i);
                  const cnt = aptsByStaff.get(m.id)?.length ?? 0;
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.firstName} />}
                        <AvatarFallback className={cn('text-[9px] font-bold', c.light, c.label)}>{m.firstName[0]}{m.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-[13px] text-foreground truncate">{m.firstName}</span>
                      <span className={cn(
                        'text-[11px] font-semibold tabular-nums',
                        cnt > 0 ? 'text-foreground' : 'text-muted-foreground/50',
                      )}>
                        {cnt}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Area ── */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Date strip */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedDate(d => subDays(d, 1))}>
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedDate(d => addDays(d, 1))}>
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Button>

            {!isToday(selectedDate) && (
              <button onClick={() => setSelectedDate(new Date())}
                className="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent transition-colors">
                {t('common.today')}
              </button>
            )}

            <div className="flex-1" />

            <div className="hidden sm:flex items-center gap-px">
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDays(startOfDay(selectedDate), i - 3);
                const sel = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                const td = isToday(d);
                return (
                  <button key={format(d, 'yyyy-MM-dd')} onClick={() => setSelectedDate(d)}
                    className={cn(
                      'flex flex-col items-center rounded-lg w-10 py-1 transition-colors',
                      sel ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent',
                    )}>
                    <span className="text-[9px] font-medium uppercase tracking-wider">{format(d, 'EEE')}</span>
                    <span className={cn('text-sm font-semibold', td && !sel && 'text-blue-600 dark:text-blue-400')}>{format(d, 'd')}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1" />

            {/* View toggle */}
            <div className="flex items-center rounded-md border border-border p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                title={t('calendar.viewGrid')}
                aria-label={t('calendar.viewGrid')}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors',
                  viewMode === 'grid' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={viewMode === 'grid'}
              >
                <Squares2X2Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t('calendar.viewGrid')}</span>
              </button>
              <button
                onClick={() => setViewMode('week')}
                title={t('calendar.viewWeek')}
                aria-label={t('calendar.viewWeek')}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors',
                  viewMode === 'week' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={viewMode === 'week'}
              >
                <TableCellsIcon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t('calendar.viewWeek')}</span>
              </button>
              <button
                onClick={() => setViewMode('day')}
                title={t('calendar.viewDay')}
                aria-label={t('calendar.viewDay')}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors',
                  viewMode === 'day' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={viewMode === 'day'}
              >
                <ListBulletIcon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t('calendar.viewDay')}</span>
              </button>
            </div>
          </div>

          {/* Content */}
          {viewMode === 'day' ? (
            <DayAgenda
              appointments={dayApts}
              staffColorMap={staffColorMap}
              staffColors={STAFF_COLORS}
              statusMap={statusMap}
              onSelect={setDetailApt}
              onCreate={() => { closeCreate(); setIsCreateOpen(true); }}
            />
          ) : viewMode === 'week' ? (
            <WeekView
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              appointments={appointments}
              staffColorMap={staffColorMap}
              staffColors={STAFF_COLORS}
              onSelectApt={setDetailApt}
              dayStartHour={DAY_START_HOUR}
              dayEndHour={DAY_END_HOUR}
              slotHeight={SLOT_HEIGHT}
            />
          ) : staffCount === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
              <p className="text-sm font-medium text-muted-foreground">{t('calendar.noActiveStaff')}</p>
              <p className="mt-1 text-xs text-muted-foreground/60">{t('calendar.noActiveStaffHint')}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="overflow-auto"
                style={{ maxHeight: 'calc(100vh - 300px)' }}
              >
                {/* Sticky staff header — Studio Score: hairline column
                    divider + uppercase tabular eyebrow + thin staff-tinted
                    accent rule under each header (color без ring-halo). */}
                <div className="sticky top-0 z-20 flex border-b border-border bg-card/95 backdrop-blur-sm">
                  <div className="shrink-0 border-r border-border bg-card/95 backdrop-blur-sm" style={{ width: `${TIME_GUTTER_W}px` }} />
                  {activeStaff.map((m, i) => {
                    const c = getStaffColor(i);
                    const cnt = aptsByStaff.get(m.id)?.length ?? 0;
                    const shift = shiftsByStaff.get(m.id);
                    return (
                      <div key={m.id}
                        className={cn(
                          'relative flex flex-1 flex-col items-center gap-1 px-2 py-2.5',
                          i < staffCount - 1 && 'border-r border-border',
                        )}
                        style={{ minWidth: `${STAFF_COL_MIN_W}px` }}>
                        <Avatar className="h-9 w-9">
                          {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={`${m.firstName} ${m.lastName}`} />}
                          <AvatarFallback className={cn('text-xs font-bold', c.light, c.label)}>{m.firstName[0]}{m.lastName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-[13px] font-semibold text-foreground truncate max-w-full">{m.firstName}</span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider tabular-nums">
                          {shift ? `${shift.startTime}–${shift.endTime}` : t('calendar.dayOff')}
                          <span className="mx-1 text-muted-foreground/40">·</span>
                          {cnt}
                        </span>
                        {/* Staff-tinted hairline accent — subtle column signature */}
                        <span className={cn('absolute inset-x-3 bottom-0 h-px', c.dot)} aria-hidden />
                      </div>
                    );
                  })}
                </div>

                {/* Grid body */}
                <div className="relative flex" style={{ height: `${gridH}px` }}>

                  {/* Time gutter */}
                  <div className="sticky left-0 z-10 shrink-0 border-r border-border bg-card" style={{ width: `${TIME_GUTTER_W}px` }}>
                    {hours.map((hr, i) => (
                      <div key={hr} className="absolute left-0 right-0 pr-2 flex justify-end" style={{ top: `${i * SLOT_HEIGHT}px` }}>
                        <span className="relative -top-2 text-[10px] font-medium text-muted-foreground tabular-nums select-none leading-none">
                          {formatHourLabel(hr, timeFormat)}
                        </span>
                      </div>
                    ))}

                    {showNow && (
                      <div className="absolute left-0 right-0 z-20 flex justify-end pr-0.5" style={{ top: `${(nowMin / MINUTES_PER_SLOT) * SLOT_HEIGHT}px` }}>
                        <span className="relative -top-[7px] rounded bg-red-500 px-1 py-px text-[9px] font-bold text-white tabular-nums leading-none">
                          {formatTime(now, timeFormat)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Staff columns */}
                  {activeStaff.map((member, ci) => {
                    const col = aptsByStaff.get(member.id) || [];
                    const laneMap = lanesByStaff.get(member.id);

                    // DnD reschedule: drop a booking into this column at the Y position → new start time (staff + day).
                    // Gated by canOverride — only owner/manager can reassign bookings to different staff/time.
                    const handleDrop = canOverride ? (ev: React.DragEvent<HTMLDivElement>) => {
                      ev.preventDefault();
                      const aptId = ev.dataTransfer.getData('text/plain');
                      if (!aptId) return;
                      const apt = appointments.find(a => a.id === aptId);
                      if (!apt) return;

                      // Compute target minute, snap to 15-min grid
                      const rect = ev.currentTarget.getBoundingClientRect();
                      const y = ev.clientY - rect.top;
                      const rawMin = (y / SLOT_HEIGHT) * MINUTES_PER_SLOT;
                      const snapped = Math.max(0, Math.round(rawMin / 15) * 15);
                      const startMin = DAY_START_HOUR * 60 + snapped;

                      const newStart = new Date(selectedDate);
                      newStart.setHours(0, 0, 0, 0);
                      newStart.setMinutes(startMin);
                      const durMin = differenceInMinutes(parseISO(apt.endTime), parseISO(apt.startTime));
                      const newEnd = new Date(newStart.getTime() + durMin * 60000);

                      // No-op if nothing changed
                      if (apt.staffId === member.id && parseISO(apt.startTime).getTime() === newStart.getTime()) return;

                      appointmentsApi.update(apt.id, {
                        startTime: newStart.toISOString(),
                        endTime: newEnd.toISOString(),
                        staffId: member.id,
                      }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['appointments'] });
                        toast.success(t('toast.appointmentUpdated'));
                      }).catch(() => toast.error(t('toast.appointmentUpdateError')));
                    } : undefined;

                    return (
                      <div key={member.id}
                        onDragOver={(ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; }}
                        onDrop={handleDrop}
                        className={cn('relative flex-1', ci < staffCount - 1 && 'border-r border-border')}
                        style={{ minWidth: `${STAFF_COL_MIN_W}px` }}>

                        {hours.map((hr, i) => (
                          <div key={hr} className="absolute left-0 right-0 border-t border-border/50" style={{ top: `${i * SLOT_HEIGHT}px` }} />
                        ))}

                        {Array.from({ length: totalSlots }, (_, i) => (
                          <div key={i} className="absolute left-3 right-3 border-t border-dashed border-border/30" style={{ top: `${i * SLOT_HEIGHT + SLOT_HEIGHT / 2}px` }} />
                        ))}

                        {renderOffDuty(member.id)}
                        {renderBreaks(member.id)}

                        {Array.from({ length: totalSlots * 2 }, (_, i) => {
                          const hr = DAY_START_HOUR + Math.floor(i / 2);
                          const mn = (i % 2) * 30;
                          const timeVal = setMinutes(setHours(startOfDay(selectedDate), hr), mn);
                          const past = isToday(selectedDate) && isBefore(timeVal, now);
                          const unavailable = isUnavailable(hr, mn, member.id);
                          // Owner + manager can click ANY slot — including breaks and off-duty.
                          // A warning toast makes sure the action feels deliberate.
                          const canClickAnyway = canOverride;
                          const clickable = !past && (!unavailable || canClickAnyway);
                          return (
                            <div key={i}
                              onClick={() => {
                                if (!clickable) return;
                                if (unavailable && canClickAnyway) {
                                  toast.warning(`${member.firstName} isn't scheduled at this time — booking anyway`);
                                }
                                openSlot(hr, mn, member.id);
                              }}
                              className={cn(
                                'absolute left-0 right-0 transition-colors group/slot',
                                clickable && !unavailable && 'hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer',
                                clickable && unavailable && 'hover:bg-amber-50/40 dark:hover:bg-amber-950/20 cursor-pointer z-[9]',
                                past && !unavailable && 'bg-muted/30',
                              )}
                              style={{ top: `${(i * SLOT_HEIGHT) / 2}px`, height: `${SLOT_HEIGHT / 2}px` }}
                              title={
                                clickable && unavailable
                                  ? `Book ${member.firstName} outside their shift (owner override)`
                                  : undefined
                              }>
                              {clickable && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity">
                                  <PlusIcon className={cn(
                                    'h-3.5 w-3.5',
                                    unavailable
                                      ? 'text-amber-500 dark:text-amber-400'
                                      : 'text-blue-300 dark:text-blue-600',
                                  )} />
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {col.map(apt => renderBlock(apt, laneMap?.get(apt.id)))}
                      </div>
                    );
                  })}

                  {/* Now line */}
                  {showNow && (
                    <div className="pointer-events-none absolute z-30 flex items-center"
                      style={{ top: `${(nowMin / MINUTES_PER_SLOT) * SLOT_HEIGHT}px`, left: `${TIME_GUTTER_W}px`, right: 0 }}>
                      <div className="h-2.5 w-2.5 -translate-x-[5px] rounded-full bg-red-500 ring-[3px] ring-red-500/15" />
                      <div className="h-[2px] flex-1 bg-red-500/70" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Detail Modal ─────────────────────────────── */}
      {detailApt && (
        <AppointmentDetailModal
          apt={detailApt}
          staffColorMap={staffColorMap}
          statusMap={statusMap}
          t={t}
          timeFormat={timeFormat}
          onClose={() => setDetailApt(null)}
          onChangeStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
          onDelete={handleDelete}
          onFullUpdate={(id, changes) => fullUpdateMutation.mutate({ id, changes })}
          canEditFully={canOverride /* owner + manager */}
          staffList={allStaff}
          serviceList={services}
          isUpdating={updateStatusMutation.isPending || fullUpdateMutation.isPending}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {/* ─── Create Modal ─────────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={open => { if (!open) closeCreate(); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>{t('calendar.newAppointment')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Editable date + time — previously a static badge.
                Owner/manager can retune either field before creating the
                appointment; the barber column still drives the pre-selection. */}
            <div className="rounded-lg border border-blue-100 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 p-3 space-y-2.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                <ClockIcon className="h-3.5 w-3.5 shrink-0" />
                When
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  className="w-full rounded-md border border-blue-200 dark:border-blue-800 bg-card px-2.5 py-1.5 text-sm tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  aria-label="Date"
                />
                <input
                  type="time"
                  step={300}
                  value={createTime}
                  onChange={(e) => setCreateTime(e.target.value)}
                  className="w-full rounded-md border border-blue-200 dark:border-blue-800 bg-card px-2.5 py-1.5 text-sm tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  aria-label="Start time"
                />
              </div>
              {selectedSlot?.staffId && (() => {
                const st = activeStaff.find(s => s.id === selectedSlot.staffId);
                if (!st) return null;
                const c = getStaffColor(staffColorMap.get(st.id) ?? 0);
                return (
                  <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
                    <Avatar className="h-4 w-4">
                      {st.avatarUrl && <AvatarImage src={st.avatarUrl} alt={st.firstName} />}
                      <AvatarFallback className={cn('text-[8px] font-bold', c.light, c.label)}>{st.firstName[0]}{st.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <span>Pre-selected barber: {st.firstName}</span>
                  </div>
                );
              })()}
            </div>

            {/* ── Client autocomplete (client review item #5) ──
                Type a name / phone / email. If the system has this client in
                history we surface them (with visit count + last-visit date).
                If nothing matches, switch to the inline "new client" form. */}
            <ClientAutocomplete
              t={t}
              clients={clients}
              selectedClientId={formData.clientId}
              onSelectClient={(id) => { setFormData(f => ({ ...f, clientId: id })); setClientSearch(''); }}
              search={clientSearch}
              onSearchChange={setClientSearch}
              isCreatingClient={isCreatingClient}
              onStartCreate={() => {
                const q = clientSearch.trim();
                const looksLikePhone = /[\d+()]/.test(q);
                const looksLikeEmail = q.includes('@');
                setNewClient({
                  firstName: !looksLikePhone && !looksLikeEmail ? q : '',
                  lastName: '',
                  phone: looksLikePhone ? q : '',
                  email: looksLikeEmail ? q : '',
                });
                setIsCreatingClient(true);
              }}
              onCancelCreate={() => setIsCreatingClient(false)}
              newClient={newClient}
              onNewClientChange={setNewClient}
              onSubmitNewClient={() => createClientMut.mutate({
                firstName: newClient.firstName.trim(),
                lastName:  newClient.lastName.trim(),
                phone:     newClient.phone.trim(),
                email:     newClient.email.trim(),
                notes:     '',
                officeIds: [officeId],
              })}
              isSubmittingClient={createClientMut.isPending}
            />

            <div>
              <Label className="text-sm">{t('calendar.service')}</Label>
              <Select value={formData.serviceId} onValueChange={v => setFormData(f => ({ ...f, serviceId: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder={t('calendar.selectService')} /></SelectTrigger>
                <SelectContent>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-3 w-full">
                        <span>{s.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">€{s.price} &middot; {s.duration}m</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">{t('calendar.barber')}</Label>
              <Select value={formData.staffId} onValueChange={v => setFormData(f => ({ ...f, staffId: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder={t('calendar.selectBarber')} /></SelectTrigger>
                <SelectContent>
                  {activeStaff.map((m, i) => {
                    const c = getStaffColor(i);
                    return (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.firstName} />}
                            <AvatarFallback className={cn('text-[8px]', c.light, c.label)}>{m.firstName[0]}{m.lastName[0]}</AvatarFallback>
                          </Avatar>
                          {m.firstName} {m.lastName}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">{t('calendar.notes')}</Label>
              <Textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                placeholder={t('calendar.specialRequests')} className="mt-1.5" rows={2} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending ? t('calendar.creating') : t('calendar.createAppointment')}
              </Button>
              <Button variant="outline" onClick={closeCreate}>{t('common.cancel')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Conflict Dialog ─────────────────────────── */}
      <Dialog open={!!conflictState} onOpenChange={(open) => !open && setConflictState(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Scheduling conflict</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This barber is already booked during this time at another location.
          </p>
          <div className="space-y-2">
            {conflictState?.conflicts.map(({ appointment, office }) => (
              <div key={appointment.id} className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
                <p className="font-medium text-foreground">
                  {format(new Date(appointment.startTime), 'MMM d, h:mm a')} — {format(new Date(appointment.endTime), 'h:mm a')}
                </p>
                <p className="text-muted-foreground">
                  {office.name} ({office.address})
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setConflictState(null)}>
              Pick another time
            </Button>
            {canOverride && (
              <Button variant="destructive" onClick={confirmOverride}>
                Override
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Client autocomplete ───────────────────────────────────
// Lives at the bottom of the file because it's a local primitive, only used by
// the Calendar page's New Appointment dialog. Encapsulates:
//   1. Search input (name / phone / email)
//   2. Selected client surface (with visit count + last-visit date)
//   3. Filtered results (up to 5 matches)
//   4. "Add new client" inline form
interface ClientAutocompleteProps {
  t: (key: TranslationKey) => string;
  clients: Client[];
  selectedClientId: string;
  onSelectClient: (id: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  isCreatingClient: boolean;
  onStartCreate: () => void;
  onCancelCreate: () => void;
  newClient: { firstName: string; lastName: string; phone: string; email: string };
  onNewClientChange: (v: { firstName: string; lastName: string; phone: string; email: string }) => void;
  onSubmitNewClient: () => void;
  isSubmittingClient: boolean;
}

function ClientAutocomplete({
  t, clients, selectedClientId, onSelectClient, search, onSearchChange,
  isCreatingClient, onStartCreate, onCancelCreate,
  newClient, onNewClientChange, onSubmitNewClient, isSubmittingClient,
}: ClientAutocompleteProps) {
  const selected = clients.find(c => c.id === selectedClientId);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return clients
      .filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [clients, search]);

  // Selected-client surface — shows history at a glance
  if (selected && !isCreatingClient) {
    const grad = AVATAR_GRADIENTS[hashToIndex(selected.id, AVATAR_GRADIENTS.length)];
    const lastVisit = selected.lastVisitAt ? format(new Date(selected.lastVisitAt), 'MMM d, yyyy') : null;
    return (
      <div>
        <Label className="text-sm">{t('calendar.client')}</Label>
        <div className="mt-1.5 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white', grad)}>
              {selected.firstName[0]}{selected.lastName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">{selected.firstName} {selected.lastName}</p>
              <p className="text-xs text-muted-foreground truncate tabular-nums">{selected.phone}</p>
            </div>
            <button
              type="button"
              onClick={() => { onSelectClient(''); onSearchChange(''); }}
              className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Change
            </button>
          </div>
          {(selected.totalVisits > 0 || lastVisit) && (
            <div className="mt-2 pt-2 border-t border-border/60 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="tabular-nums">
                <span className="font-semibold text-foreground">{selected.totalVisits}</span> previous visit{selected.totalVisits === 1 ? '' : 's'}
              </span>
              {lastVisit && <span>· last {lastVisit}</span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // New-client inline form
  if (isCreatingClient) {
    return (
      <div>
        <Label className="text-sm">{t('calendar.client')}</Label>
        <div className="mt-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">New client</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={newClient.firstName}
              onChange={(e) => onNewClientChange({ ...newClient, firstName: e.target.value })}
              placeholder="First name"
              className="text-sm"
            />
            <Input
              value={newClient.lastName}
              onChange={(e) => onNewClientChange({ ...newClient, lastName: e.target.value })}
              placeholder="Last name"
              className="text-sm"
            />
            <Input
              value={newClient.phone}
              onChange={(e) => onNewClientChange({ ...newClient, phone: e.target.value })}
              placeholder="+370..."
              className="text-sm tabular-nums"
            />
            <Input
              type="email"
              value={newClient.email}
              onChange={(e) => onNewClientChange({ ...newClient, email: e.target.value })}
              placeholder="email (optional)"
              className="text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onCancelCreate}>Cancel</Button>
            <Button
              size="sm"
              loading={isSubmittingClient}
              disabled={!newClient.firstName.trim() || !newClient.phone.trim()}
              onClick={onSubmitNewClient}
            >
              Save &amp; use
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Search + result list
  return (
    <div>
      <Label className="text-sm">{t('calendar.client')}</Label>
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Type name, phone or email..."
        className="mt-1.5"
        autoFocus
      />
      {search.trim() && (
        <div className="mt-1.5 rounded-lg border border-border bg-card overflow-hidden max-h-56 overflow-y-auto">
          {matches.length === 0 ? (
            <button
              type="button"
              onClick={onStartCreate}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <PlusIcon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-foreground">Add "<span className="font-semibold">{search.trim()}</span>" as a new client</span>
            </button>
          ) : (
            <>
              {matches.map(c => {
                const grad = AVATAR_GRADIENTS[hashToIndex(c.id, AVATAR_GRADIENTS.length)];
                const last = c.lastVisitAt ? format(new Date(c.lastVisitAt), 'MMM d') : null;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectClient(c.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left border-b border-border/50 last:border-0 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white', grad)}>
                      {c.firstName[0]}{c.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{c.firstName} {c.lastName}</p>
                      <p className="text-[11px] text-muted-foreground truncate tabular-nums">{c.phone}</p>
                    </div>
                    {c.totalVisits > 0 && (
                      <span className="shrink-0 text-[10px] font-semibold text-muted-foreground tabular-nums bg-muted rounded-full px-1.5 py-0.5" title={`${c.totalVisits} previous visits`}>
                        {c.totalVisits}×{last ? ` · ${last}` : ''}
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onStartCreate}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent transition-colors border-t border-border/50 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <PlusIcon className="h-3.5 w-3.5 shrink-0" />
                Not in list — add as new client
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
