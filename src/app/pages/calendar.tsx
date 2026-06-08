import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from 'motion/react';
import { useNavigate } from 'react-router';
import { appointmentsApi, clientsApi, staffApi, servicesApi, shiftsApi, breaksApi, absencesApi, shiftOverridesApi, categoriesApi, accountsApi, tenantApi } from '../lib/api';
import { useOfficeStore } from '../store/office-store';
import { useAuthStore } from '../store/auth-store';
import { findConflicts, findBreakConflicts, type BreakConflict } from '../lib/booking-validation';
import { useT, useLanguage, useTimeFormat, useTimeGranularity, useBreakCutMode, useCalendarGridDensity, useWeekViewStaffId } from '../hooks/use-t';
import { ru as ruLocale, lt as ltLocale, enUS as enLocale } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../components/ui/hover-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Textarea } from '../components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Switch } from '../components/ui/switch';
import { fileToDataUrl } from '../lib/image-upload';
import {
  format, parseISO, setHours, setMinutes, startOfDay, startOfWeek,
  isToday, isBefore, differenceInMinutes, addDays, subDays,
  addWeeks,
} from 'date-fns';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  PlusIcon,
  MinusIcon,
  ScissorsIcon,
  BanknotesIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  Squares2X2Icon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ListBulletIcon,
  TableCellsIcon,
  CheckBadgeIcon,
  TrashIcon,
  PencilSquareIcon,
  MapPinIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  UserIcon,
  CameraIcon,
  EllipsisHorizontalIcon,
  NoSymbolIcon,
  AdjustmentsHorizontalIcon,
  BoltIcon,
  UsersIcon,
  ArrowTopRightOnSquareIcon,
  CakeIcon,
  MoonIcon,
  PaperAirplaneIcon,
  AcademicCapIcon,
  HeartIcon,
  ArrowPathIcon,
  PlusCircleIcon,
  XMarkIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  SparklesIcon,
  SunIcon,
} from '@heroicons/react/24/outline';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import { MOTION_EASE, MOTION_DUR } from '../lib/tokens';
import { toast } from 'sonner';
import { cn } from '../components/ui/utils';
import { formatTime, formatHourLabel, getHoursInTz, getMinutesInTz, getWallDateInTz, getWallTimeInTz, wallTimeToUtc, type TimeFormat } from '../lib/time';
import { getPaymentStatus } from '../lib/payment';
import { assignLanes } from '../lib/calendar-lanes';
import { MiniCalendar } from '../components/calendar/mini-calendar';
import { DayAgenda } from '../components/calendar/day-agenda';
import { WeekView } from '../components/calendar/week-view';
import { AppointmentWarningPin } from '../components/calendar/appointment-warning-pin';
import { getAppointmentWarning } from '../lib/appointment-warning';
import { StaffCard } from '../components/calendar/StaffCard';
import type { Appointment, AppointmentStatus, AppointmentWithDetails, Service, Category, Shift, ShiftOverride, Break, Absence, AbsenceReason, DayOfWeek, Client, Language, StaffRole } from '../types';
import type { TranslationKey } from '../i18n';
import { AVATAR_GRADIENTS, ELEVATION, hashToIndex, ROLE_CHIP, ROLE_DOT, ROLE_LABEL, STATUS_DOT, STATUS_LABEL, STATUS_PILL, STATUS_STRIPE, STAFF_COLORS, getStaffColor, CLIENT_AVATAR_COLORS, getClientAvatarColor } from '../lib/tokens';

// ─── Grid constants ─────────────────────────────────────
// MINUTES_PER_SLOT is the minutes represented by SLOT_HEIGHT pixels —
// keep at 60 so the visual cadence stays one-row-per-hour. SLOT_MINUTES
// controls click + DnD granularity (15 min = four sub-slots per hour).
// SLOT_HEIGHT trimmed from 100 → 96 so each sub-slot is a clean 24 px.
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 21;
const SLOT_HEIGHT = 96;
const MINUTES_PER_SLOT = 60;

// End-time label for a wall-clock start ("HH:mm") + duration, rendered as a
// pure wall time. Formats through a UTC instant so formatTime's shop-tz default
// doesn't shift the label. Returns null on invalid input.
function endLabelFromWall(time: string, durationMin: number, fmt: TimeFormat): string | null {
  const [hh, mm] = time.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const total = hh * 60 + mm + durationMin;
  const eh = ((Math.floor(total / 60) % 24) + 24) % 24;
  const em = ((total % 60) + 60) % 60;
  return formatTime(new Date(Date.UTC(2000, 0, 1, eh, em)), fmt, 'UTC');
}
const SLOT_MINUTES = 15;
const SUB_SLOTS_PER_HOUR = 60 / SLOT_MINUTES; // 4
// Two presets driven by user preference. Standard = roomy booking-card grammar;
// Compact lets ~9 columns fit on iPad-portrait without horizontal scroll.
const STAFF_COL_MIN_W_STANDARD = 200;
const STAFF_COL_MIN_W_COMPACT = 110;
const TIME_GUTTER_W = 56;

// Split a free-text full name into firstName + lastName for the
// CreateClientModal save path. The first whitespace-separated token is
// the first name; everything after it is the last name (so "Jonas Petras
// Kazlauskas" becomes { first: 'Jonas', last: 'Petras Kazlauskas' }).
function splitFullName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

const EMPTY_NEW_CLIENT_DRAFT = {
  fullName: '',
  phone: '',
  email: '',
  notes: '',
  avatarUrl: '',
  marketingOk: false,
};

// Map AppointmentStatus → translation key. The render-direct STATUS_LABEL
// in lib/tokens.ts is hardcoded English; this companion map routes the
// status through the i18n dictionary so the operator's locale shows up.
const STATUS_TKEY: Record<AppointmentStatus, TranslationKey> = {
  scheduled: 'status.scheduled',
  confirmed: 'status.confirmed',
  completed: 'status.completed',
  cancelled: 'status.cancelled',
  no_show: 'status.no_show',
};

// CLDR-style plural category resolver for Russian and Lithuanian.
// English keeps two forms (One / Many); the suffix matches the i18n
// keys (`...One`, `...Few`, `...Many`). 'Few' falls through to 'Many'
// for English.
function pluralKey(lang: Language, n: number): 'One' | 'Few' | 'Many' {
  if (lang === 'ru') {
    const last2 = n % 100;
    if (last2 >= 11 && last2 <= 14) return 'Many';
    const last1 = n % 10;
    if (last1 === 1) return 'One';
    if (last1 >= 2 && last1 <= 4) return 'Few';
    return 'Many';
  }
  if (lang === 'lt') {
    const last2 = n % 100;
    if (last2 >= 11 && last2 <= 19) return 'Many';
    const last1 = n % 10;
    if (last1 === 1) return 'One';
    if (last1 >= 2 && last1 <= 9) return 'Few';
    return 'Many';
  }
  return n === 1 ? 'One' : 'Many';
}

// STAFF_COLORS, getStaffColor, CLIENT_AVATAR_COLORS promoted to lib/tokens.ts

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

// ─── Block-dialog vocabulary ────────────────────────────
// `Break` is intra-day (lunch/dinner/rest) — partial overlay on a working day.
// `Absence` is whole-day (day-off / vacation / sick / training) — replaces the
// shift entirely. The Block dialog routes the chosen type to the right store.
type BlockType = 'lunch' | 'dinner' | 'rest' | 'custom' | 'day-off' | 'vacation' | 'sick' | 'training';
type BlockKind = 'break' | 'absence';

const BLOCK_KIND: Record<BlockType, BlockKind> = {
  lunch:    'break',
  dinner:   'break',
  rest:     'break',
  custom:   'break',
  'day-off': 'absence',
  vacation: 'absence',
  sick:     'absence',
  training: 'absence',
};

// Custom fork-knife icon — heroicons has no cutlery glyph. Earlier draft had 6
// thin stroke paths that blurred at 12px (became Greek-letter mush). Rewritten
// as 4 simple paths: U-shape fork head + filled blade for the knife. Filled
// silhouette on the blade gives the icon enough visual mass to read at any
// size; rounded line caps + thicker 1.8 stroke survive scale-down.
function ForkKnifeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {/* Fork — outer U-shape (prong tops + sides) merging into the stem */}
      <path d="M5 3v4a3 3 0 0 0 6 0V3" />
      {/* Fork stem — single vertical line down the center */}
      <path d="M8 9v12" />
      {/* Knife — triangular blade with a faint fill so the silhouette reads */}
      <path d="M14 11h3V3c-2 1-3 4-3 8z" fill="currentColor" fillOpacity={0.18} />
      {/* Knife handle */}
      <path d="M17 11v10" />
    </svg>
  );
}

const BLOCK_ICON: Record<BlockType, typeof CakeIcon> = {
  lunch:    ForkKnifeIcon as unknown as typeof CakeIcon,
  dinner:   MoonIcon,
  rest:     SparklesIcon,
  custom:   PlusIcon,
  'day-off': NoSymbolIcon,
  vacation: SunIcon,
  sick:     HeartIcon,
  training: AcademicCapIcon,
};

// Translation keys are the `break.*` namespace; same vocabulary already
// shipped in en/ru/lt for the four extra types.
const BLOCK_TKEY: Record<BlockType, TranslationKey> = {
  lunch:    'break.lunch',
  dinner:   'break.dinner',
  rest:     'break.rest',
  custom:   'break.custom',
  'day-off': 'break.day-off',
  vacation: 'break.vacation',
  sick:     'break.sick',
  training: 'break.training',
};

// Owner-only types — receptionists/barbers see Lunch/Dinner/Rest only.
const OWNER_ONLY_TYPES: BlockType[] = ['day-off', 'vacation', 'sick', 'training'];

// ─── Appointment Detail Modal ───────────────────────────
// PendingSlot — additional appointment block added inline via "Add next service".
// Stored locally until the user hits Save; then created via onCreatePending.
interface PendingSlot {
  tempId: string;
  serviceId: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:mm (24h internal)
  durationMin: number;
  staffId: string;
  notes: string;
}

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
  onCreatePending,
  onRebook,
  canEditFully,
  staffList,
  serviceList,
  categories,
  isUpdating,
  isDeleting,
  creatorName,
  creatorChip,
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
  onCreatePending: (clientId: string, slots: PendingSlot[]) => Promise<void>;
  onRebook: (apt: AppointmentWithDetails) => void;
  canEditFully: boolean;
  staffList: { id: string; firstName: string; lastName: string; isActive: boolean; avatarUrl?: string }[];
  serviceList: Service[];
  categories: Category[];
  isUpdating: boolean;
  isDeleting: boolean;
  /** Resolved display name of the operator who created this booking. Threaded
   *  in from the page-level accountById lookup; null when the row predates the
   *  createdBy field or the account was deleted. */
  creatorName?: string | null;
  /** Pre-rendered creator chip — clickable button + Popover with profile.
   *  Built at the page level so this component doesn't need to know about
   *  accountById, navigate, or auth-store. Falls back to plain text via
   *  `creatorName` when null. */
  creatorChip?: React.ReactNode;
}) {
  const start = parseISO(apt.startTime);
  const end = parseISO(apt.endTime);
  const duration = differenceInMinutes(end, start);
  void statusMap; // kept for backward-compat with DayAgenda/WeekView contracts

  const busy = isUpdating || isDeleting;

  // Single always-editable form. No view/edit toggle — fields edit inline,
  // Save button is enabled only when the form is dirty (matches the
  // competitor's flow where the operator scans + tweaks in one motion).
  const [form, setForm] = useState(() => ({
    // Seed the form in shop time so it matches the header and the calendar grid
    // (date-fns format would render the viewer's local zone instead).
    date: getWallDateInTz(start),
    time: getWallTimeInTz(start),
    durationMin: duration,
    staffId: apt.staffId,
    serviceId: apt.serviceId,
    notes: apt.notes ?? '',
  }));

  const dirty = (
    form.date !== getWallDateInTz(start) ||
    form.time !== getWallTimeInTz(start) ||
    form.durationMin !== duration ||
    form.staffId !== apt.staffId ||
    form.serviceId !== apt.serviceId ||
    form.notes !== (apt.notes ?? '')
  );

  // Live "ends at HH:mm" computed from the form's time + duration. Useful
  // because a barber tweaking duration sees the end immediately, no math.
  const computedEndLabel = useMemo(
    () => endLabelFromWall(form.time, form.durationMin, timeFormat),
    [form.time, form.durationMin, timeFormat],
  );

  // Pending slots — additional appointments added inline via "Add next service".
  // Each slot becomes its own appointment record on Save (sequential creates).
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);
  const [savingPending, setSavingPending] = useState(false);
  // Cancel-confirmation — instead of an instant status flip, the operator
  // sees a dedicated "Are you sure?" dialog with the appointment context
  // and a destructive Confirm button. Mirrors the competitor's pattern.
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  // null = closed; tempId string = that slot's picker is open
  const [slotPickerTempId, setSlotPickerTempId] = useState<string | null>(null);

  // Compute "next slot" defaults from the end of the most recent block —
  // either the last pending slot, or the primary appointment.
  const computeNextSlotDefaults = (): { date: string; time: string; staffId: string } => {
    const last = pendingSlots[pendingSlots.length - 1];
    const baseDate = last?.date ?? form.date;
    const baseTime = last?.time ?? form.time;
    const baseDuration = last?.durationMin ?? form.durationMin;
    const baseStaff = last?.staffId ?? form.staffId;

    const [hh, mm] = baseTime.split(':').map(Number);
    const baseEnd = new Date();
    baseEnd.setHours(hh, mm + baseDuration, 0, 0);
    const endTime = `${String(baseEnd.getHours()).padStart(2, '0')}:${String(baseEnd.getMinutes()).padStart(2, '0')}`;

    return { date: baseDate, time: endTime, staffId: baseStaff };
  };

  const addPendingSlot = () => {
    const defaults = computeNextSlotDefaults();
    setPendingSlots((prev) => [
      ...prev,
      {
        tempId: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        serviceId: '',
        date: defaults.date,
        time: defaults.time,
        durationMin: 30,
        staffId: defaults.staffId,
        notes: '',
      },
    ]);
  };

  const updatePendingSlot = (tempId: string, patch: Partial<PendingSlot>) => {
    setPendingSlots((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, ...patch } : s)));
  };

  const deletePendingSlot = (tempId: string) => {
    setPendingSlots((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const computeEndLabel = (time: string, durationMin: number): string =>
    endLabelFromWall(time, durationMin, timeFormat) ?? '—';

  const allPendingValid = pendingSlots.every((s) => s.serviceId);
  const hasPending = pendingSlots.length > 0;
  const isSavable = (dirty || hasPending) && (!hasPending || allPendingValid);

  const save = async () => {
    if (hasPending && !allPendingValid) {
      toast.error(t('toast.fillRequired'));
      return;
    }
    // 1. Save primary if dirty (mutation; fire-and-forget per existing pattern)
    if (dirty) {
      // form.date/time are shop wall-clock — convert back to the right instant.
      const newStart = wallTimeToUtc(form.date, form.time);
      const newEnd = new Date(newStart.getTime() + form.durationMin * 60_000);
      onFullUpdate(apt.id, {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        staffId: form.staffId,
        serviceId: form.serviceId,
        notes: form.notes,
      });
    }
    // 2. Create each pending slot. Sequential awaits so a partial failure
    //    leaves a clean cursor (slots before the failure get created).
    if (hasPending) {
      try {
        setSavingPending(true);
        await onCreatePending(apt.clientId, pendingSlots);
        setPendingSlots([]);
        onClose();
      } catch (err) {
        toast.error((err as Error).message ?? 'Failed to create appointments');
      } finally {
        setSavingPending(false);
      }
    }
  };

  // No-show prevention: nudge to fill in client phone/email if missing
  // (matches the competitor's banner). Only owner/manager sees this since
  // they're typically the ones who'd contact clients.
  const missingContact = !apt.client.phone && !apt.client.email;

  // Refs for the top toolbar's "Add note" / "Reschedule" actions —
  // both shortcuts focus a field below rather than open a sub-popup.
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const timeFieldRef = useRef<HTMLDivElement>(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const focusNotes = () => {
    notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    notesRef.current?.focus();
  };
  const focusTime = () => {
    timeFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimePickerOpen(true);
  };

  // Locale lookup for date-fns (matches EditDayShiftModal). Required so the
  // date trigger displays "6 май 2026" / "geg. 6 2026" / "6 May 2026" in the
  // active language instead of always-English.
  const [language] = useLanguage();
  const dateLocale: DateFnsLocale =
    language === 'ru' ? ruLocale : language === 'lt' ? ltLocale : enLocale;

  // Prefer the backend's real payment flag; fall back to inferring from status
  // for legacy rows. See lib/payment.ts.
  const paymentStatus = getPaymentStatus(apt);
  const paymentLabel =
    paymentStatus === 'paid' ? t('calendar.paid')
    : paymentStatus === 'voided' ? t('calendar.voided')
    : t('calendar.notPaid');

  // Live hero values — recompute from form state so the headline time range
  // and service line update as the operator tweaks the form before saving.
  const reduceMotion = useReducedMotion();
  const liveStart = useMemo(() => {
    const [y, m, d] = form.date.split('-').map(Number);
    const [hh, mm] = form.time.split(':').map(Number);
    if (Number.isNaN(y) || Number.isNaN(hh)) return null;
    // form.date/time are shop wall-clock — resolve to the true instant so the
    // header renders back to the same shop time via formatTime.
    return wallTimeToUtc(form.date, form.time);
  }, [form.date, form.time]);
  const liveEnd = useMemo(() => {
    if (!liveStart) return null;
    return new Date(liveStart.getTime() + form.durationMin * 60_000);
  }, [liveStart, form.durationMin]);
  const liveTimeRange = liveStart && liveEnd
    ? `${formatTime(liveStart, timeFormat)} — ${formatTime(liveEnd, timeFormat)}`
    : '—';

  const selectedService = serviceList.find(s => s.id === form.serviceId) ?? apt.service;
  const selectedStaff = staffList.find(s => s.id === form.staffId);
  const heroPrice = selectedService?.price ?? apt.service.price;
  // Service sub-line + category column resolve categoryId → category name.
  const serviceCategoryName = categories.find(c => c.id === selectedService?.categoryId)?.name ?? '';

  // A public multi-service booking is a single row carrying several services.
  // Show the aggregate line ("primary + N") and the booking total instead of
  // just the primary line item. (The edit form below stays single-service —
  // the backend only persists status/notes/time, not service edits.)
  const multiServices = apt.services && apt.services.length > 1 ? apt.services : null;
  const heroServiceName = multiServices
    ? `${multiServices[0].name} + ${multiServices.length - 1}`
    : (selectedService?.name ?? apt.service.name);
  const heroTotal = multiServices
    ? (apt.totalPrice != null ? Number(apt.totalPrice) : multiServices.reduce((sum, s) => sum + s.price, 0))
    : heroPrice;

  // Avatar — semantic palette for the client (separate from staff colors).
  const clientAvatarColor = getClientAvatarColor(apt.clientId);
  const clientInitials = `${apt.client.firstName[0] ?? ''}${apt.client.lastName[0] ?? ''}`.toUpperCase();

  // Stagger entrance — sections fade up sequentially. Reduced motion bypasses.
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.045,
        delayChildren: reduceMotion ? 0 : 0.03,
      },
    },
  };
  const itemVariants = {
    hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: MOTION_EASE } },
  };

  // Staff-colored "spine" — runs full height on the LEFT edge of the modal
  // as a 4px accent bar. Uses the assigned staff member's color for instant
  // identity at a glance.
  const staffColorIdx = staffColorMap.get(apt.staffId) ?? 0;
  const staffColor = getStaffColor(staffColorIdx);
  const spineCls = staffColor.dot;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="!w-[calc(100vw-2rem)] !max-w-[600px] p-0 gap-0 overflow-hidden max-h-[92vh] overflow-y-auto overflow-x-hidden [&>button]:hidden"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t('calendar.appointmentDetails')}</DialogTitle>
        </DialogHeader>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative">
          {/* Status spine — 4px accent on the left edge of the modal body
              (sits BELOW the dark hero, runs the rest of the way down). The
              spine is the modal's identity at a glance: emerald=confirmed,
              blue=scheduled, rose=cancelled, amber=no-show. */}
          <div className={cn('absolute left-0 top-0 bottom-0 w-1 z-10', spineCls)} />

          {/* HERO — uniform theme-aware surface. Editorial typography carries
              the visual weight; subtle border-bottom separates from the action
              toolbar. Same palette as the rest of the modal — no theme-inverting
              dark/white split that previously read as two stitched-together
              cards. */}
          <motion.div variants={itemVariants} className="relative bg-card text-foreground px-6 pt-6 pb-5 border-b border-border">
            {/* Header buttons — close + "..." (rebook) */}
            <div className="absolute top-3 right-3 flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="More actions"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <EllipsisHorizontalIcon className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-40 p-1">
                  <button
                    type="button"
                    onClick={() => onRebook(apt)}
                    disabled={busy}
                    className="w-full inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <ArrowPathIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {t('calendar.rebook')}
                  </button>
                </PopoverContent>
              </Popover>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Client identity — avatar + name + full date */}
            <div className="flex items-center gap-3 pr-20">
              <div className="relative shrink-0">
                <div className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full text-[14px] font-semibold ring-2 ring-background shadow-sm',
                  clientAvatarColor.bg,
                  clientAvatarColor.text,
                )}>
                  {clientInitials || <UserIcon className="h-6 w-6" />}
                </div>
                <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card', STATUS_DOT[apt.status])} aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-[19px] font-bold leading-tight tracking-tight text-foreground truncate">
                  {apt.client.firstName} {apt.client.lastName}
                </h2>
                <p className="text-[12.5px] text-muted-foreground truncate mt-0.5">
                  {isToday(start) && (
                    <>
                      <span className="text-foreground font-medium">{t('common.today')}</span>
                      <span className="mx-1.5 text-muted-foreground/40">•</span>
                    </>
                  )}
                  {format(start, 'EEEE, MMMM d, yyyy', { locale: dateLocale })}
                </p>
              </div>
            </div>

            {/* Live time range + duration chip */}
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <h3 className="text-[26px] sm:text-[28px] font-bold leading-none tracking-tight tabular-nums text-foreground">
                {liveTimeRange}
              </h3>
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-[12px] font-semibold tabular-nums text-muted-foreground">
                {form.durationMin}m
              </span>
            </div>

            {/* Status + payment pills — soft, icon-led */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold', STATUS_PILL[apt.status])}>
                {apt.status === 'confirmed' || apt.status === 'completed'
                  ? <CheckCircleIcon className="h-3.5 w-3.5" />
                  : <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[apt.status])} />
                }
                {t(`status.${apt.status}` as TranslationKey)}
              </span>
              <span className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold',
                paymentStatus === 'paid' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : paymentStatus === 'voided' ? 'bg-muted text-muted-foreground'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300',
              )}>
                <BanknotesIcon className="h-3.5 w-3.5" />
                {paymentLabel}
                <span className="tabular-nums font-bold">€{heroTotal}</span>
              </span>
            </div>
          </motion.div>

          {/* ACTION TOOLBAR — Reschedule + Confirm/Completed state machine. */}
          <motion.div variants={itemVariants} className="px-5 pt-3 pb-3 border-b border-border bg-background">
            <div className="flex items-center gap-x-1 gap-y-1 flex-wrap">
              <button
                type="button"
                onClick={focusTime}
                disabled={busy || !canEditFully || apt.status === 'cancelled' || apt.status === 'completed'}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12.5px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent whitespace-nowrap"
              >
                <CalendarDaysIcon className="h-3.5 w-3.5 shrink-0" />
                {t('calendar.reschedule')}
              </button>
              <span className="h-4 w-px bg-border/60 shrink-0" aria-hidden />
              {/* Confirm — filled emerald pill when this is the active step */}
              <button
                type="button"
                onClick={() => apt.status === 'scheduled' ? onChangeStatus(apt.id, 'confirmed') : undefined}
                disabled={busy || apt.status !== 'scheduled'}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-semibold transition-colors whitespace-nowrap',
                  apt.status === 'scheduled'
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                    : apt.status === 'confirmed' || apt.status === 'completed'
                      ? 'text-emerald-600 dark:text-emerald-400 cursor-default'
                      : 'text-muted-foreground/40 cursor-not-allowed',
                )}
              >
                {apt.status === 'confirmed' || apt.status === 'completed'
                  ? <CheckIcon className="h-3.5 w-3.5 shrink-0" />
                  : <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" />
                }
                {t('common.confirm')}
              </button>
              {/* Completed — filled emerald pill when this is the active step */}
              <button
                type="button"
                onClick={() => apt.status === 'confirmed' ? onChangeStatus(apt.id, 'completed') : undefined}
                disabled={busy || apt.status !== 'confirmed'}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-semibold transition-colors whitespace-nowrap',
                  apt.status === 'confirmed'
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                    : apt.status === 'completed'
                      ? 'text-emerald-600 dark:text-emerald-400 cursor-default'
                      : 'text-muted-foreground/40 cursor-not-allowed',
                )}
              >
                {apt.status === 'completed'
                  ? <CheckIcon className="h-3.5 w-3.5 shrink-0" />
                  : <CheckBadgeIcon className="h-3.5 w-3.5 shrink-0" />
                }
                {t('status.completed')}
              </button>
              {apt.status === 'cancelled' && (
                <button
                  type="button"
                  onClick={() => onChangeStatus(apt.id, 'scheduled')}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12.5px] font-semibold text-blue-600 dark:text-blue-400 transition-colors hover:bg-blue-500/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent whitespace-nowrap"
                >
                  <ArrowPathIcon className="h-3.5 w-3.5 shrink-0" />
                  {t('common.restore')}
                </button>
              )}
            </div>
          </motion.div>

          {/* CLIENT CARD — avatar circle + name + contact.
              Replaces the previous read-only Input pair, which had a
              "form field" feel that didn't match the rest of the modal. */}
          {/* CUSTOMER CARD */}
          <motion.div variants={itemVariants} className="px-6 pt-4 pb-1">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('calendar.customer')}</p>
                <p className="text-[15px] font-semibold tracking-tight text-foreground truncate leading-tight mt-0.5">
                  {apt.client.firstName} {apt.client.lastName}
                </p>
                <p className="text-[12px] text-muted-foreground tabular-nums truncate mt-0.5">
                  {apt.client.phone || apt.client.email || '—'}
                </p>
              </div>
              {apt.client.phone && (
                <a
                  href={`tel:${apt.client.phone}`}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                  aria-label={`Call ${apt.client.firstName}`}
                >
                  <PhoneIcon className="h-4 w-4" />
                </a>
              )}
            </div>
            {missingContact && (
              <div className="mt-2.5 inline-flex items-start gap-1.5 rounded-md bg-emerald-500/5 border border-emerald-500/20 px-2.5 py-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                <span className="shrink-0 mt-px">ⓘ</span>
                <span>{t('calendar.noShowHint')}</span>
              </div>
            )}
          </motion.div>

          {/* SERVICE CARD — scissor tile + name + category sub-line + price/duration/category strip.
              Whole card opens the ServicePickerSheet (edit). */}
          <motion.div variants={itemVariants} className="px-6 py-1">
            <button
              type="button"
              onClick={() => canEditFully && setServicePickerOpen(true)}
              disabled={!canEditFully}
              className="w-full text-left rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <ScissorsIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('calendar.service')}</p>
                  <p className="text-[15px] font-semibold tracking-tight text-foreground truncate leading-tight mt-0.5">
                    {heroServiceName}
                  </p>
                  {serviceCategoryName && (
                    <p className="text-[12px] text-muted-foreground truncate mt-0.5">{serviceCategoryName}</p>
                  )}
                </div>
                <ChevronDownIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('calendar.price')}</p>
                  <p className="text-[13px] font-semibold tabular-nums text-foreground mt-0.5">€{selectedService?.price ?? 0}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('common.duration')}</p>
                  <p className="text-[13px] font-semibold tabular-nums text-foreground mt-0.5">{selectedService?.duration ?? form.durationMin} {t('common.minAbbr')}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('calendar.category')}</p>
                  <p className="text-[13px] font-semibold text-foreground truncate mt-0.5">{serviceCategoryName || '—'}</p>
                </div>
              </div>
            </button>
          </motion.div>

          {/* DATE + TIME CARDS */}
          <motion.div variants={itemVariants} className="px-6 py-1 grid grid-cols-2 gap-3">
            <div className="min-w-0 rounded-xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
                  <CalendarDaysIcon className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('common.date')}</p>
              </div>
              <CompactDateField
                value={form.date}
                onChange={(v) => setForm(f => ({ ...f, date: v }))}
                locale={dateLocale}
                ariaLabel={t('common.date')}
                disabled={!canEditFully}
                className="h-9 w-full"
              />
            </div>
            <div ref={timeFieldRef} className="min-w-0 rounded-xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
                  <ClockIcon className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('common.time')}</p>
              </div>
              <TimePickerField
                value={form.time}
                onChange={(v) => setForm(f => ({ ...f, time: v }))}
                timeFormat={timeFormat}
                disabled={!canEditFully}
                ariaLabel={t('common.time')}
                open={timePickerOpen}
                onOpenChange={setTimePickerOpen}
              />
            </div>
          </motion.div>

          {/* BARBER + DURATION + NOTES */}
          <motion.div variants={itemVariants} className="px-6 py-2 space-y-4">
            {/* BARBER — selectable cards */}
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('calendar.barber')}</Label>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {staffList.filter(s => s.isActive).map(s => {
                  const sColorIdx = staffColorMap.get(s.id) ?? 0;
                  const sColor = getStaffColor(sColorIdx);
                  const active = form.staffId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => canEditFully && setForm(f => ({ ...f, staffId: s.id }))}
                      disabled={!canEditFully}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors',
                        active
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-card text-foreground hover:bg-accent/40',
                        !canEditFully && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      <div className={cn('rounded-full p-[1.5px]', active ? 'bg-background/20' : sColor.dot)}>
                        <Avatar className="h-6 w-6 block">
                          {s.avatarUrl && <AvatarImage src={s.avatarUrl} alt={s.firstName} />}
                          <AvatarFallback className={cn('text-[9px] font-bold', active ? 'bg-background/30 text-foreground' : cn(sColor.light, sColor.label))}>
                            {s.firstName[0]}{s.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      {s.firstName}
                      {active && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DURATION — preset chips (blue selected) */}
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('common.duration')}</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[15, 30, 45, 60, 90, 120].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => canEditFully && setForm(f => ({ ...f, durationMin: d }))}
                    disabled={!canEditFully}
                    className={cn(
                      'inline-flex items-center justify-center h-9 min-w-[52px] px-3 rounded-lg border text-[12px] font-semibold tabular-nums transition-colors',
                      form.durationMin === d
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-foreground hover:bg-accent/40',
                      !canEditFully && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {d}m
                  </button>
                ))}
                {![15, 30, 45, 60, 90, 120].includes(form.durationMin) && (
                  <span className="inline-flex items-center justify-center h-9 min-w-[52px] px-3 rounded-lg border border-primary bg-primary text-primary-foreground text-[12px] font-semibold tabular-nums">
                    {form.durationMin}m
                  </span>
                )}
              </div>
            </div>

            {/* NOTES */}
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('calendar.notes')}</Label>
              <div className="relative mt-2">
                <ChatBubbleLeftIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                <Textarea
                  ref={notesRef}
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={t('calendar.specialRequests')}
                  disabled={!canEditFully}
                  className="pl-9"
                />
              </div>
            </div>
          </motion.div>

          {/* AUDIT — single subtle line. The "ends at" line was removed because
              the hero already shows the full time range live. Creator name (if
              the booking was stamped post-schema-v10) sits between the eyebrow
              and the date so an operator can see *who took the call* without
              opening a separate audit log. */}
          <motion.div variants={itemVariants} className="px-7 pb-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 tabular-nums">
              <span>{t('calendar.created')}</span>
              {(creatorChip || creatorName) && (
                <>
                  <span className="mx-1.5 text-muted-foreground/40">·</span>
                  {creatorChip ?? (
                    <span className="font-bold text-foreground/80 normal-case tracking-normal">{creatorName}</span>
                  )}
                </>
              )}
              <span className="mx-1.5 text-muted-foreground/40">·</span>
              <span>{format(parseISO(apt.createdAt), 'MMM d, yyyy · HH:mm')}</span>
            </p>
          </motion.div>

          {/* PENDING SLOTS — additional appointment blocks added via the
              "Add next service" button. Each is editable inline and gets
              created as its own appointment when the modal saves. */}
          <AnimatePresence initial={false}>
            {pendingSlots.map((slot, idx) => {
              const slotEnd = computeEndLabel(slot.time, slot.durationMin);
              const slotService = serviceList.find((s) => s.id === slot.serviceId);
              const slotPrice = slotService?.price ?? 0;
              return (
                <motion.div
                  key={slot.tempId}
                  initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.28, ease: MOTION_EASE }}
                  className="border-t border-border bg-muted/15 overflow-hidden"
                >
                  <div className="px-7 py-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        + {t('calendar.addNextService')}
                        <span className="mx-1.5 text-muted-foreground/40">·</span>
                        <span className="tabular-nums">#{idx + 2}</span>
                        {slotPrice > 0 && (
                          <>
                            <span className="mx-1.5 text-muted-foreground/40">·</span>
                            <span className="tabular-nums text-foreground/70 font-bold">€{slotPrice}</span>
                          </>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => deletePendingSlot(slot.tempId)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline transition-colors"
                      >
                        <TrashIcon className="h-3 w-3" />
                        {t('common.delete')}
                      </button>
                    </div>

                    <div>
                      <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {t('calendar.service')}
                      </Label>
                      {/* Service trigger → opens ServicePickerSheet */}
                      <button
                        type="button"
                        onClick={() => setSlotPickerTempId(slot.tempId)}
                        className={cn(
                          'mt-1.5 w-full inline-flex items-center justify-between h-10 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                          !slot.serviceId && 'text-muted-foreground',
                        )}
                      >
                        <span className="truncate">
                          {slot.serviceId
                            ? (() => { const s = serviceList.find(sv => sv.id === slot.serviceId); return s ? `${s.name} — €${s.price} · ${s.duration}m` : t('calendar.selectService'); })()
                            : t('calendar.selectService')}
                        </span>
                        <ChevronDownIcon className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                      </button>
                    </div>

                    {/* DATE + TIME */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('common.date')}</Label>
                        <div className="mt-1.5">
                          <CompactDateField
                            value={slot.date}
                            onChange={(v) => updatePendingSlot(slot.tempId, { date: v })}
                            locale={dateLocale}
                            ariaLabel={t('common.date')}
                            className="h-10 w-full"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('common.time')}</Label>
                        <div className="mt-1.5">
                          <TimePickerField
                            value={slot.time}
                            onChange={(v) => updatePendingSlot(slot.tempId, { time: v })}
                            timeFormat={timeFormat}
                            ariaLabel={t('common.time')}
                          />
                        </div>
                      </div>
                    </div>

                    {/* BARBER — avatar chips */}
                    <div>
                      <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('calendar.barber')}</Label>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {staffList.filter(s => s.isActive).map(s => {
                          const sColorIdx = staffColorMap.get(s.id) ?? 0;
                          const sColor = getStaffColor(sColorIdx);
                          const active = slot.staffId === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => updatePendingSlot(slot.tempId, { staffId: s.id })}
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full border pl-1 pr-3 py-1 text-[12px] font-medium transition-colors',
                                active
                                  ? 'border-foreground bg-foreground text-background'
                                  : 'border-border bg-card text-foreground hover:bg-accent/40',
                              )}
                            >
                              <div className={cn('rounded-full p-[1.5px]', active ? 'bg-background/20' : sColor.dot)}>
                                <Avatar className="h-5 w-5 block">
                                  {s.avatarUrl && <AvatarImage src={s.avatarUrl} alt={s.firstName} />}
                                  <AvatarFallback className={cn('text-[9px] font-bold', active ? 'bg-background/30 text-foreground' : cn(sColor.light, sColor.label))}>
                                    {s.firstName[0]}{s.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              {s.firstName}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* DURATION — preset chips */}
                    <div>
                      <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('common.duration')}</Label>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {[15, 30, 45, 60, 90, 120].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => updatePendingSlot(slot.tempId, { durationMin: d })}
                            className={cn(
                              'inline-flex items-center justify-center h-9 min-w-[48px] px-2.5 rounded-md border text-[12px] font-semibold tabular-nums transition-colors',
                              slot.durationMin === d
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border bg-card text-foreground hover:bg-accent/40',
                            )}
                          >
                            {d}m
                          </button>
                        ))}
                        {![15, 30, 45, 60, 90, 120].includes(slot.durationMin) && (
                          <span className="inline-flex items-center justify-center h-9 min-w-[48px] px-2.5 rounded-md border border-foreground bg-foreground text-background text-[12px] font-semibold tabular-nums">
                            {slot.durationMin}m
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 tabular-nums">
                      {t('calendar.endsAt').replace('{time}', slotEnd)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Add extra service (left) + Cancel appointment (right) — one row */}
          <motion.div variants={itemVariants} className="px-6 py-3 border-t border-border flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={addPendingSlot}
              disabled={busy || savingPending || !canEditFully}
              className="group inline-flex items-center gap-2 h-10 rounded-lg border border-border bg-card px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent/40 hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PlusCircleIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              {t('calendar.addNextService')}
            </button>
            {(apt.status !== 'cancelled' && apt.status !== 'completed') && (
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-destructive hover:text-destructive/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <XCircleIcon className="h-4 w-4 shrink-0" />
                {t('calendar.cancelAppointment')}
              </button>
            )}
          </motion.div>

          {/* Footer — Delete (subtle) · Cancel · Save (dirty-gated) */}
          <motion.div variants={itemVariants} className="px-7 py-3.5 border-t border-border flex items-center gap-3">
            <button
              onClick={() => onDelete(apt.id, `${apt.client.firstName} ${apt.client.lastName}`)}
              disabled={busy}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-40"
              title={t('common.delete')}
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onClose}
              disabled={busy}
              className="ml-auto text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <Button
              onClick={save}
              disabled={!isSavable || busy || savingPending || !canEditFully}
              title={!isSavable ? t('apt.modal.saveTooltip') : undefined}
              className="min-w-[120px] gap-1.5"
            >
              <span>{t('common.saveChanges')}</span>
              {hasPending && allPendingValid && (
                <span className="text-[10px] tabular-nums opacity-80 px-1.5 py-0.5 -mr-1 rounded bg-foreground/10">
                  +{pendingSlots.length}
                </span>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>

      {/* Cancel-confirmation — secondary Dialog opened by the toolbar's
          "Cancel appointment" link. Replaces the previous instant status
          flip with a deliberate Confirm step that surfaces what's about
          to happen. Closes back to the detail modal on Keep; performs
          the status change + closes the entire detail modal on Confirm. */}
      <AnimatePresence>
        {cancelConfirmOpen && (
          <Dialog open onOpenChange={(o) => { if (!o) setCancelConfirmOpen(false); }}>
            <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: MOTION_EASE }}
              >
                <DialogHeader className="px-7 pt-6 pb-4 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-600 dark:text-rose-400">
                    {t('calendar.cancelConfirmEyebrow')}
                  </p>
                  <DialogTitle className="text-xl font-bold tracking-tight">
                    {t('calendar.cancelConfirmTitle')}
                  </DialogTitle>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {t('calendar.cancelConfirmHint').replace(
                      '{name}',
                      `${apt.client.firstName} ${apt.client.lastName}`,
                    )}
                  </p>
                </DialogHeader>

                {/* Context cards — preserve the "what am I cancelling" anchor */}
                <div className="px-7 pb-4 grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-muted/40 ring-1 ring-border/40 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {t('calendar.when')}
                    </p>
                    <p className="mt-1.5 text-[13px] font-semibold tabular-nums text-foreground leading-tight">
                      {formatTime(start, timeFormat)} — {formatTime(end, timeFormat)}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                      {format(start, 'EEE, MMM d')}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/40 ring-1 ring-border/40 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {t('calendar.service')}
                    </p>
                    <p className="mt-1.5 text-[13px] font-semibold text-foreground leading-tight truncate">
                      {apt.service.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                      €{apt.service.price} · {duration}m
                    </p>
                  </div>
                </div>

                {/* Effect bullets — one Confirm leads to these consequences */}
                <div className="px-7 pb-5 border-t border-border pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2.5">
                    {t('calendar.cancelConfirmWhat')}
                  </p>
                  <ul className="space-y-2 text-[13px] text-foreground/85 leading-snug">
                    <li className="flex items-start gap-2.5">
                      <span className="mt-2 h-1 w-1 rounded-full bg-rose-500 shrink-0" />
                      <span>{t('calendar.cancelConfirmEffect1')}</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-2 h-1 w-1 rounded-full bg-muted-foreground/60 shrink-0" />
                      <span>{t('calendar.cancelConfirmEffect2')}</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-2 h-1 w-1 rounded-full bg-muted-foreground/60 shrink-0" />
                      <span>{t('calendar.cancelConfirmEffect3')}</span>
                    </li>
                  </ul>
                </div>

                <div className="border-t border-border bg-muted/15 px-7 py-3.5 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCancelConfirmOpen(false)}
                    disabled={busy}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t('common.keep')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onChangeStatus(apt.id, 'cancelled');
                      setCancelConfirmOpen(false);
                      onClose();
                    }}
                    disabled={busy}
                    className="min-w-[160px] gap-1.5"
                  >
                    <XCircleIcon className="h-3.5 w-3.5" />
                    {t('calendar.cancelAppointment')}
                  </Button>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Service picker — main appointment */}
      <ServicePickerSheet
        open={servicePickerOpen}
        onClose={() => setServicePickerOpen(false)}
        services={serviceList}
        categories={categories}
        staffName={selectedStaff ? selectedStaff.firstName : ''}
        selectedIds={form.serviceId ? [form.serviceId] : []}
        onSelect={(serviceId) => {
          const svc = serviceList.find(s => s.id === serviceId);
          setForm(f => ({
            ...f,
            serviceId,
            durationMin: svc?.duration ?? f.durationMin,
          }));
          setServicePickerOpen(false);
        }}
        t={t}
      />

      {/* Service picker — pending slot (Add next service) */}
      {slotPickerTempId && (() => {
        const slot = pendingSlots.find(s => s.tempId === slotPickerTempId);
        if (!slot) return null;
        const slotStaff = staffList.find(s => s.id === slot.staffId);
        return (
          <ServicePickerSheet
            open
            onClose={() => setSlotPickerTempId(null)}
            services={serviceList}
            categories={categories}
            staffName={slotStaff ? slotStaff.firstName : ''}
            selectedIds={slot.serviceId ? [slot.serviceId] : []}
            onSelect={(serviceId) => {
              const svc = serviceList.find(s => s.id === serviceId);
              updatePendingSlot(slot.tempId, {
                serviceId,
                durationMin: svc?.duration ?? slot.durationMin,
              });
              setSlotPickerTempId(null);
            }}
            t={t}
          />
        );
      })()}
    </Dialog>
  );
}

// ─── Editorial primitives for the Detail modal ──────────────
function DetailRow({
  icon: Icon, label, value, secondary, dot, multiline,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  secondary?: string;
  dot?: string;
  multiline?: boolean;
}) {
  return (
    <div className="px-6 py-3 flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className={cn(
          'mt-0.5 text-sm font-medium text-foreground',
          multiline ? 'leading-relaxed' : 'truncate flex items-center gap-2',
        )}>
          {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dot)} />}
          {value}
        </p>
      </div>
      {secondary && (
        <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{secondary}</span>
      )}
    </div>
  );
}

function QuickAction({
  icon: Icon, label, onClick, disabled, dotClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  dotClass: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:border-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotClass)} />
      <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
      {label}
    </button>
  );
}

// ─── Block Dialog ────────────────────────────────────────
// Single dialog covers both stores: lunch/dinner/rest go to `breaksApi`,
// day-off / vacation / sick / training go to `absencesApi`. Switching the
// type chip swaps the bottom of the form (time-range pickers vs. all-day).
const DOW_ORDER: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DOW_LABEL: Record<DayOfWeek, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

function BlockDialog({
  state,
  onClose,
  onSaved,
  onSwitchToBooking,
  staffList,
  isOwner,
  defaultDow,
  appointments = [],
}: {
  state: NonNullable<{
    mode: 'create'; staffId?: string; dayOfWeek?: DayOfWeek;
  } | { mode: 'edit-break'; brk: Break } | { mode: 'edit-absence'; absence: Absence; staffId: string }>;
  onClose: () => void;
  onSaved: () => void;
  /** Optional: provided in create-mode entry from "+" Popover so the user can
   *  flip to the booking flow without losing the chosen staff. Edit-mode
   *  callers omit this — mid-edit you don't want a tab that throws away
   *  the record under the cursor. */
  onSwitchToBooking?: (carry: { staffId?: string }) => void;
  staffList: { id: string; firstName: string; lastName: string; isActive: boolean; avatarUrl?: string }[];
  /** Pass allAppointments so the dialog can warn about scheduling conflicts. */
  appointments?: Appointment[];
  isOwner: boolean;
  defaultDow: DayOfWeek;
}) {
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
  const currentUserId = useAuthStore(s => s.user?.id);
  const [timeFormat] = useTimeFormat();

  // Derive initial form values from the state
  const init = useMemo(() => {
    if (state.mode === 'edit-break') {
      return {
        type: state.brk.type as BlockType,
        staffId: state.brk.staffId,
        dayOfWeek: state.brk.dayOfWeek,
        startTime: state.brk.startTime,
        endTime: state.brk.endTime,
        editingId: state.brk.id,
      };
    }
    if (state.mode === 'edit-absence') {
      return {
        type: state.absence.reason as BlockType,
        staffId: state.absence.staffId,
        dayOfWeek: state.absence.dayOfWeek,
        startTime: '12:00',
        endTime: '13:00',
        editingId: undefined,
      };
    }
    return {
      type: 'lunch' as BlockType,
      staffId: state.staffId ?? staffList.find(s => s.isActive)?.id ?? '',
      dayOfWeek: state.dayOfWeek ?? defaultDow,
      startTime: '12:00',
      endTime: '13:00',
      editingId: undefined,
    };
  }, [state, staffList, defaultDow]);

  const [type, setType] = useState<BlockType>(init.type);
  const [staffId, setStaffId] = useState<string>(init.staffId);
  // In edit mode the day is fixed (each Break/Absence is keyed to one day).
  // In create mode we let the operator multi-select — saving fans out one
  // Break/Absence per selected day so a "every Mon/Wed/Fri" block becomes
  // three independent records that can be edited separately later.
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(init.dayOfWeek);
  const [dayOfWeeks, setDayOfWeeks] = useState<Set<DayOfWeek>>(() => new Set([init.dayOfWeek]));
  const [startTime, setStartTime] = useState(init.startTime);
  const [endTime, setEndTime] = useState(init.endTime);
  // Free-text label for `type === 'custom'`. Carries through edits when the
  // existing break already has a customLabel; otherwise starts blank.
  const [customLabel, setCustomLabel] = useState<string>(
    state.mode === 'edit-break' && state.brk.type === 'custom' ? (state.brk.customLabel ?? '') : '',
  );
  // Recurrence — 'weekly' is the historical default (repeats forever on selected days).
  // 'never' = single date (one-off). 'ranged' = weekly bounded by [startDate, endDate].
  type BlockRecurrence = 'never' | 'weekly' | 'ranged';
  const initRecurrence: BlockRecurrence = state.mode === 'edit-break' && state.brk.recurrence === 'one-off'
    ? 'never'
    : state.mode === 'edit-break' && (state.brk.startDate || state.brk.endDate)
      ? 'ranged'
      : 'weekly';
  const todayYMD = format(new Date(), 'yyyy-MM-dd');
  const [recurrence, setRecurrence] = useState<BlockRecurrence>(initRecurrence);
  const [oneOffDate, setOneOffDate] = useState<string>(
    state.mode === 'edit-break' && state.brk.startDate ? state.brk.startDate : todayYMD,
  );
  const [rangeStart, setRangeStart] = useState<string>(
    state.mode === 'edit-break' && state.brk.startDate ? state.brk.startDate : todayYMD,
  );
  const [rangeEnd, setRangeEnd] = useState<string>(
    state.mode === 'edit-break' && state.brk.endDate
      ? state.brk.endDate
      : format(addDays(new Date(), 7), 'yyyy-MM-dd'),
  );
  const [oneOffDateOpen, setOneOffDateOpen] = useState(false);
  const [rangeStartOpen, setRangeStartOpen] = useState(false);
  const [rangeEndOpen, setRangeEndOpen] = useState(false);

  const kind = BLOCK_KIND[type];
  const isEdit = state.mode !== 'create';
  // Sorted by Mon→Sun order so the recurrence note and save iteration both
  // read in the user's mental order, regardless of the click sequence used
  // to toggle the chips.
  const targetDays: DayOfWeek[] = isEdit ? [dayOfWeek] : DOW_ORDER.filter(d => dayOfWeeks.has(d));

  const upsertMut = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        // Single-day update — same as before.
        if (kind === 'break') {
          if (state.mode === 'edit-absence') {
            await absencesApi.remove({ staffId, dayOfWeek });
          }
          return breaksApi.upsert({
            id: init.editingId,
            staffId,
            dayOfWeek,
            startTime,
            endTime,
            type: type as 'lunch' | 'dinner' | 'rest' | 'custom',
            customLabel: type === 'custom' ? (customLabel.trim() || undefined) : undefined,
          });
        }
        if (state.mode === 'edit-break') {
          await breaksApi.remove({ id: init.editingId!, staffId });
        }
        return absencesApi.upsert({
          staffId,
          dayOfWeek,
          reason: type as AbsenceReason,
        });
      }
      // Create-mode fan-out: across staff (1 specific OR all active) × days.
      // Sequential awaits so a partial failure leaves a consistent set —
      // earlier rows land, the toast catches the failure, the operator can
      // retry from a half-saved state. `breaksApi.upsert` and `absencesApi.upsert`
      // are idempotent (absence by {staffId, dayOfWeek}; break creates new id
      // on retry — duplicates possible there if user retries, but rare in practice).
      const targetStaff = staffId === 'all'
        ? staffList.filter(s => s.isActive).map(s => s.id)
        : [staffId];
      // Recurrence semantics drive both the day-set and the persisted fields:
      // - 'never': single record per staff, dayOfWeek derived from oneOffDate.
      // - 'weekly': legacy behavior — one record per (staff, dow), unbounded.
      // - 'ranged': one record per (staff, dow), bounded by startDate/endDate.
      const recurrenceMeta: Pick<Break, 'recurrence' | 'startDate' | 'endDate'> = recurrence === 'never'
        ? { recurrence: 'one-off', startDate: oneOffDate }
        : recurrence === 'ranged'
          ? { recurrence: 'weekly', startDate: rangeStart, endDate: rangeEnd }
          : { recurrence: 'weekly' };
      // Audit stamp — same shape as Appointment so the hover-card can render
      // a "СОЗДАНО · {operator name} · {timestamp}" footer on block tiles.
      const auditMeta = {
        createdBy: currentUserId,
        createdAt: new Date().toISOString(),
      };
      const oneOffDow = recurrence === 'never'
        ? DOW_ORDER[(parseISO(oneOffDate).getDay() + 6) % 7]
        : null;
      const daysToWrite: DayOfWeek[] = recurrence === 'never' && oneOffDow
        ? [oneOffDow]
        : targetDays;
      const results = [];
      for (const sid of targetStaff) {
        for (const d of daysToWrite) {
          if (kind === 'break') {
            results.push(await breaksApi.upsert({
              staffId: sid, dayOfWeek: d, startTime, endTime,
              type: type as 'lunch' | 'dinner' | 'rest' | 'custom',
              customLabel: type === 'custom' ? (customLabel.trim() || undefined) : undefined,
              ...recurrenceMeta,
              ...auditMeta,
            }));
          } else {
            results.push(await absencesApi.upsert({
              staffId: sid, dayOfWeek: d, reason: type as AbsenceReason,
              ...recurrenceMeta,
              ...auditMeta,
            }));
          }
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breaks'] });
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      const nStaff = staffId === 'all' ? staffList.filter(s => s.isActive).length : 1;
      const nDays = targetDays.length;
      const total = nStaff * nDays;
      toast.success(
        isEdit ? 'Block updated'
          : total === 1 ? 'Block added'
          : nStaff > 1 && nDays > 1 ? `Block added · ${nStaff} staff × ${nDays} days`
          : nStaff > 1 ? `Block added on ${nStaff} staff`
          : `Block added on ${nDays} days`,
      );
      onSaved();
    },
    onError: () => toast.error('Could not save block'),
  });

  const removeMut = useMutation({
    mutationFn: async () => {
      if (state.mode === 'edit-break') {
        return breaksApi.remove({ id: state.brk.id, staffId: state.brk.staffId });
      }
      if (state.mode === 'edit-absence') {
        return absencesApi.remove({ staffId: state.absence.staffId, dayOfWeek: state.absence.dayOfWeek });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breaks'] });
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      toast.success('Block removed');
      onSaved();
    },
    onError: () => toast.error('Could not remove block'),
  });

  // Validate break time ranges
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  const breakInvalid = kind === 'break' && endMin <= startMin;
  const busy = upsertMut.isPending || removeMut.isPending;

  // Conflict check: find appointments for the selected staff member whose time
  // overlaps with this block. Only meaningful for 'never' (one specific date)
  // and 'weekly' on the selected day-of-week(s). Returns conflicting counts.
  const conflictingApts = useMemo(() => {
    if (kind !== 'break' || appointments.length === 0) return [];
    const checkStaffIds = staffId === 'all'
      ? staffList.filter(s => s.isActive).map(s => s.id)
      : [staffId];
    return appointments.filter(apt => {
      if (!checkStaffIds.includes(apt.staffId)) return false;
      const aptStart = parseISO(apt.startTime);
      // Only check the relevant day-of-week
      const aptDow = format(aptStart, 'EEEE').toLowerCase() as DayOfWeek;
      if (!targetDays.includes(aptDow)) return false;
      // Time overlap check (HH:mm strings)
      const aptStartMin = getHoursInTz(aptStart) * 60 + getMinutesInTz(aptStart);
      const aptEnd = parseISO(apt.endTime);
      const aptEndMin = getHoursInTz(aptEnd) * 60 + getMinutesInTz(aptEnd);
      return aptStartMin < endMin && aptEndMin > startMin;
    });
  }, [appointments, staffId, staffList, kind, targetDays, startMin, endMin]);

  const allTypes: BlockType[] = ['lunch', 'dinner', 'rest', 'custom', 'day-off', 'vacation', 'sick', 'training'];
  const visibleTypes = allTypes.filter(tp => isOwner || !OWNER_ONLY_TYPES.includes(tp));

  const t = useT();

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[92vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>{isEdit ? t('calendar.blockEditTitle') : t('calendar.blockTitle')}</DialogTitle>
        </DialogHeader>

        {/* Editorial header */}
        <div className="px-7 pt-7 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {isEdit ? 'Edit · Block time' : 'Add to calendar'}
          </p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
            {isEdit ? t('calendar.blockEditTitle') : t('calendar.blockTitle')}
          </p>
          <p className="text-[12px] text-muted-foreground leading-relaxed mt-1">
            {t('block.modal.helpText')}
          </p>
        </div>

        {/* Mode tabs — visible only in create mode (edit is locked to one record).
            Clicking "Booking" closes this dialog and opens the New Appointment
            flow with the chosen staff carried over. Underline is per-dialog
            (no shared layoutId across dialogs) since we can't morph between
            two Radix Dialog roots cleanly. */}
        {!isEdit && onSwitchToBooking && (
          <div className="flex border-b border-border px-7">
            <button
              type="button"
              onClick={() => {
                onSwitchToBooking({ staffId: staffId === 'all' ? undefined : staffId });
              }}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Booking
            </button>
            <button
              type="button"
              className="relative px-3 py-2 text-sm font-semibold text-foreground"
              aria-pressed
            >
              Block
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />
            </button>
          </div>
        )}

        {/* Type chips — partitioned into Break vs Absence sub-sections.
            BLOCK_KIND already routes the save to the right store; the UI
            now reflects that bisection visually. "Свой" (custom) lives in
            the Break group as the last chip with a dashed border to
            communicate "this one is a free-text label" before the click. */}
        <div className="border-t border-border px-7 py-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('calendar.blockType')}
          </p>
          {(() => {
            const breakTypes = visibleTypes.filter(tp => BLOCK_KIND[tp] === 'break');
            const absenceTypes = visibleTypes.filter(tp => BLOCK_KIND[tp] === 'absence');

            const renderChip = (tp: BlockType) => {
              const Icon = BLOCK_ICON[tp];
              const active = type === tp;
              const owner = OWNER_ONLY_TYPES.includes(tp);
              const isCustom = tp === 'custom';
              return (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setType(tp)}
                  className={cn(
                    'group inline-flex items-center gap-1.5 rounded-full border pl-2 pr-3 py-1 text-xs font-medium transition-colors',
                    isCustom && 'border-dashed',
                    active
                      ? isCustom
                        ? 'border-background/60 bg-foreground text-background'
                        : 'border-foreground bg-foreground text-background'
                      : isCustom
                        ? 'border-foreground/40 bg-card text-foreground hover:border-foreground/60 hover:bg-accent/40'
                        : 'border-border bg-card text-foreground hover:bg-accent/40',
                  )}
                  aria-pressed={active}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(BLOCK_TKEY[tp])}
                  {owner && !active && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <LockClosedIcon className="ml-0.5 h-3 w-3 text-amber-500/70" aria-label="Manager only" />
                      </TooltipTrigger>
                      <TooltipContent side="top">Manager only</TooltipContent>
                    </Tooltip>
                  )}
                </button>
              );
            };

            return (
              <div className="space-y-3.5">
                {breakTypes.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                      {t('block.groupBreak')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {breakTypes.map(renderChip)}
                    </div>
                  </div>
                )}
                {absenceTypes.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                      {t('block.groupAbsence')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {absenceTypes.map(renderChip)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {/* Custom label input — appears with a height-collapse animation
              when the user picks "Custom". The label is optional; an empty
              field falls back to the translated "Custom" label on the tile. */}
          <AnimatePresence initial={false}>
            {type === 'custom' && (
              <motion.div
                key="custom-label"
                initial={reduce ? false : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={{ duration: MOTION_DUR.base, ease: MOTION_EASE }}
                className="overflow-hidden"
              >
                <div className="pt-3">
                  <Input
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    onBlur={() => {
                      // Detect keyboard-mash labels like "xxxxx" / "kjkjk" —
                      // 4+ consonants only. Non-blocking nudge so the
                      // operator can still save a deliberate cipher.
                      const trimmed = customLabel.trim();
                      if (/^[bcdfghjklmnpqrstvwxyz]{4,}$/i.test(trimmed)) {
                        toast.warning(t('toast.breakNameSuspicious'));
                      }
                    }}
                    placeholder={t('calendar.customBlockPlaceholder')}
                    maxLength={48}
                    className="h-10"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Staff picker. The "All team" chip leads — clicking it fans the save
            out across every active staff member (e.g. salon-wide holiday). Only
            available in create mode; edit always targets one record. */}
        <div className="border-t border-border px-7 py-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('calendar.blockStaff')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {!isEdit && (
              <button
                key="__all"
                type="button"
                onClick={() => setStaffId('all')}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border pl-2.5 pr-3 py-1 transition-colors',
                  staffId === 'all'
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-foreground hover:bg-accent/40',
                )}
                aria-pressed={staffId === 'all'}
              >
                <UsersIcon className="h-4 w-4" />
                <span className="text-xs font-medium">All team</span>
              </button>
            )}
            {staffList.filter(s => s.isActive).map(s => {
              const active = staffId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStaffId(s.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 transition-colors',
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-foreground hover:bg-accent/40',
                  )}
                  aria-pressed={active}
                >
                  <Avatar className="h-6 w-6 ring-2 ring-background">
                    {s.avatarUrl && <AvatarImage src={s.avatarUrl} alt={s.firstName} />}
                    <AvatarFallback className="text-[10px] font-bold bg-muted">
                      {s.firstName[0]}{s.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{s.firstName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* When — day of week + (break only) time range */}
        <div className="border-t border-border px-7 py-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t('calendar.blockWhen')}
            </p>
            {/* Quick-select shortcuts — only meaningful in create mode where
                multi-day pick is allowed. "Mon–Fri" is the typical "weekday
                routine" pattern (recurring lunch break for the working week);
                "All week" handles e.g. permanent rest day for receptionist. */}
            {!isEdit && (
              <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setDayOfWeeks(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']))}
                  className="rounded px-1.5 py-0.5 hover:bg-accent hover:text-foreground transition-colors"
                >
                  Mon–Fri
                </button>
                <span className="text-muted-foreground/40">·</span>
                <button
                  type="button"
                  onClick={() => setDayOfWeeks(new Set(DOW_ORDER))}
                  className="rounded px-1.5 py-0.5 hover:bg-accent hover:text-foreground transition-colors"
                >
                  All week
                </button>
                <span className="text-muted-foreground/40">·</span>
                <button
                  type="button"
                  onClick={() => setDayOfWeeks(new Set([defaultDow]))}
                  className="rounded px-1.5 py-0.5 hover:bg-accent hover:text-foreground transition-colors"
                >
                  Today
                </button>
              </div>
            )}
          </div>

          {/* Recurrence selector — Never (one-off) / Every week (current behavior) /
              In defined time (weekly bounded by date range). */}
          {!isEdit && (
            <div className="mb-4 space-y-3">
              <Select value={recurrence} onValueChange={v => setRecurrence(v as BlockRecurrence)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">{t('calendar.repeatNever')}</SelectItem>
                  <SelectItem value="weekly">{t('calendar.repeatWeekly')}</SelectItem>
                  <SelectItem value="ranged">{t('calendar.repeatRanged')}</SelectItem>
                </SelectContent>
              </Select>
              {recurrence === 'never' && (
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t('calendar.blockWhen')}
                  </Label>
                  <Popover open={oneOffDateOpen} onOpenChange={setOneOffDateOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="mt-1.5 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 h-10 text-sm font-medium tabular-nums hover:bg-accent transition-colors w-full"
                      >
                        {format(parseISO(oneOffDate), 'EEE, MMM d, yyyy')}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="p-0">
                      <MiniCalendar
                        selectedDate={parseISO(oneOffDate)}
                        onSelectDate={(d) => {
                          setOneOffDate(format(d, 'yyyy-MM-dd'));
                          setOneOffDateOpen(false);
                        }}
                        appointments={[]}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              {recurrence === 'ranged' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('calendar.from')}</Label>
                    <Popover open={rangeStartOpen} onOpenChange={setRangeStartOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="mt-1.5 inline-flex items-center justify-center rounded-md border border-border bg-card px-3 h-9 text-sm font-medium tabular-nums hover:bg-accent transition-colors w-full"
                        >
                          {format(parseISO(rangeStart), 'MMM d')}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="p-0">
                        <MiniCalendar
                          selectedDate={parseISO(rangeStart)}
                          onSelectDate={(d) => { setRangeStart(format(d, 'yyyy-MM-dd')); setRangeStartOpen(false); }}
                          appointments={[]}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('calendar.to')}</Label>
                    <Popover open={rangeEndOpen} onOpenChange={setRangeEndOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="mt-1.5 inline-flex items-center justify-center rounded-md border border-border bg-card px-3 h-9 text-sm font-medium tabular-nums hover:bg-accent transition-colors w-full"
                        >
                          {format(parseISO(rangeEnd), 'MMM d')}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="p-0">
                        <MiniCalendar
                          selectedDate={parseISO(rangeEnd)}
                          onSelectDate={(d) => { setRangeEnd(format(d, 'yyyy-MM-dd')); setRangeEndOpen(false); }}
                          appointments={[]}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={cn('flex flex-wrap gap-1', !isEdit && recurrence === 'never' && 'hidden')}>
            {DOW_ORDER.map(d => {
              const active = isEdit ? dayOfWeek === d : dayOfWeeks.has(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    if (isEdit) {
                      setDayOfWeek(d);
                      return;
                    }
                    setDayOfWeeks(prev => {
                      const next = new Set(prev);
                      if (next.has(d)) {
                        // Don't allow emptying the set — at least one day must remain
                        // selected so Save isn't a no-op the operator has to debug.
                        if (next.size === 1) return next;
                        next.delete(d);
                      } else {
                        next.add(d);
                      }
                      return next;
                    });
                  }}
                  className={cn(
                    'flex h-9 w-12 items-center justify-center rounded-md border text-[11px] font-semibold uppercase tracking-wider transition-colors',
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent/40 hover:text-foreground',
                  )}
                  aria-pressed={active}
                >
                  {DOW_LABEL[d]}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {kind === 'break' ? (
              <motion.div
                key="break-times"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: MOTION_DUR.fast, ease: MOTION_EASE }}
                className="mt-4 grid grid-cols-2 gap-3"
              >
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('block.modal.starts')}</Label>
                  <div className="mt-1.5">
                    <TimePickerField
                      value={startTime}
                      onChange={setStartTime}
                      timeFormat={timeFormat}
                      ariaLabel={t('block.modal.starts')}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('block.modal.ends')}</Label>
                  <div className={cn('mt-1.5', breakInvalid && '[&_button]:border-rose-500')}>
                    <TimePickerField
                      value={endTime}
                      onChange={setEndTime}
                      timeFormat={timeFormat}
                      ariaLabel={t('block.modal.ends')}
                    />
                  </div>
                </div>
                {breakInvalid && (
                  <p className="col-span-2 text-[11px] text-rose-600 dark:text-rose-400">
                    {t('calendar.invalidRange')}
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="absence-allday"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: MOTION_DUR.fast, ease: MOTION_EASE }}
                className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
              >
                <ClockIcon className="h-3.5 w-3.5" />
                <span>{t('calendar.allDay')}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recurrence note — three variants based on the selected mode:
              - never:  "On {date} only"
              - weekly: "Repeats every {day} until removed"
              - ranged: "Every {day} from {start} to {end}" */}
          <p className="mt-3 text-[11px] text-muted-foreground/80 leading-relaxed">
            {(() => {
              if (!isEdit && recurrence === 'never') {
                return t('calendar.blockRecurrenceNever').replace('{date}', format(parseISO(oneOffDate), 'MMM d, yyyy'));
              }
              const dayLabel = targetDays.length === 7 ? 'day' : targetDays.map(d => DOW_LABEL[d]).join(', ');
              if (!isEdit && recurrence === 'ranged') {
                return t('calendar.blockRecurrenceRanged')
                  .replace('{day}', dayLabel)
                  .replace('{start}', format(parseISO(rangeStart), 'MMM d'))
                  .replace('{end}', format(parseISO(rangeEnd), 'MMM d'));
              }
              return t('calendar.blockRecurrence').replace('{day}', dayLabel);
            })()}
          </p>
        </div>

        {/* Conflict warning — shown when this block time overlaps with scheduled
            appointments for the selected staff on the selected day(s). */}
        {conflictingApts.length > 0 && (
          <div className="mx-7 mb-4 flex items-start gap-2.5 rounded-lg border border-amber-300/60 bg-amber-50/80 dark:bg-amber-950/25 dark:border-amber-500/30 px-3.5 py-2.5">
            <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-px shrink-0" />
            <p className="text-[12.5px] text-amber-800 dark:text-amber-300">
              <span className="font-semibold">{conflictingApts.length} appointment{conflictingApts.length > 1 ? 's' : ''}</span>
              {' '}already scheduled during this time. The block will be saved but the appointments remain.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-7 py-5 flex items-center gap-3 border-t border-border">
          {isEdit ? (
            <button
              type="button"
              onClick={() => removeMut.mutate()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 border border-destructive text-destructive hover:bg-destructive/5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              {t('calendar.removeBlock')}
            </button>
          ) : <span />}

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="ml-auto text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <Button
            onClick={() => upsertMut.mutate()}
            disabled={
              busy
              || breakInvalid
              || !staffId
              || (isEdit ? false : (recurrence === 'never' ? false : targetDays.length === 0))
              || (recurrence === 'ranged' && rangeEnd < rangeStart)
            }
          >
            {upsertMut.isPending
              ? '…'
              : (() => {
                  if (isEdit) return t('common.saveChanges');
                  if (recurrence === 'never') return t('common.saveChanges');
                  const nStaff = staffId === 'all' ? staffList.filter(s => s.isActive).length : 1;
                  const total = nStaff * targetDays.length;
                  return total > 1 ? `Save · ${total}` : t('common.saveChanges');
                })()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Walk-in Dialog ──────────────────────────────────────
// Quick "client without a prior booking" flow. Faster than the full
// New Appointment dialog — just client + service + barber, with the
// time defaulted to the next 15-min slot from now.
function WalkInDialog({
  open,
  onClose,
  activeStaff,
  services,
  clients,
  officeId,
  staffColorMap,
  prefillName,
}: {
  open: boolean;
  onClose: () => void;
  activeStaff: { id: string; firstName: string; lastName: string; isActive: boolean; avatarUrl?: string }[];
  services: { id: string; name: string; price: number; duration: number }[];
  clients: Client[];
  officeId: string;
  staffColorMap: Map<string, number>;
  /** When the operator launches walk-in via the booking picker's
   *  "Save as walk-in (query)" shortcut, this carries the typed name
   *  through so the inner client search starts pre-filled. */
  prefillName?: string;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
  const currentUserId = useAuthStore(s => s.user?.id);

  // Round "now" up to the next 15-min slot.
  const nextSlot = useMemo(() => {
    const d = new Date();
    const m = d.getMinutes();
    const next = Math.ceil(m / 15) * 15;
    if (next >= 60) {
      d.setHours(d.getHours() + 1);
      d.setMinutes(0);
    } else {
      d.setMinutes(next);
    }
    d.setSeconds(0); d.setMilliseconds(0);
    return d;
  }, [open]);

  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClient, setNewClient] = useState<NewClientDraft>(EMPTY_NEW_CLIENT_DRAFT);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [staffId, setStaffId] = useState(activeStaff[0]?.id ?? '');
  const [time, setTime] = useState(format(nextSlot, 'HH:mm'));

  // Reset form when reopened. `prefillName` lands in the inner client
  // search so the operator who typed "Maria" in the booking picker and
  // jumped into walk-in doesn't have to retype.
  useEffect(() => {
    if (!open) return;
    setClientId('');
    setClientSearch(prefillName ?? '');
    setIsCreatingClient(false);
    setNewClient(EMPTY_NEW_CLIENT_DRAFT);
    setServiceId(services[0]?.id ?? '');
    setStaffId(activeStaff[0]?.id ?? '');
    setTime(format(nextSlot, 'HH:mm'));
  }, [open, services, activeStaff, nextSlot, prefillName]);

  const createClientMut = useMutation({
    mutationFn: (data: Parameters<typeof clientsApi.create>[0]) => clientsApi.create(data),
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setClientId(c.id);
      setNewClient(EMPTY_NEW_CLIENT_DRAFT);
      setIsCreatingClient(false);
      setClientSearch('');
      toast.success(t('toast.clientCreated'));
    },
    onError: () => toast.error(t('toast.clientCreateError')),
  });

  const checkInMut = useMutation({
    mutationFn: (payload: Omit<Appointment, 'id' | 'createdAt'>) => appointmentsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Walk-in checked in');
      onClose();
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code === 'BOOKING_CONFLICT') toast.error(t('toast.bookingConflict'));
      else toast.error(t('toast.appointmentError'));
    },
  });

  const submit = () => {
    if (!clientId || !serviceId || !staffId) {
      toast.error(t('toast.fillRequired'));
      return;
    }
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return;
    const m = time.match(/^(\d{2}):(\d{2})$/);
    if (!m) return;
    const today = new Date();
    const st = new Date(today.getFullYear(), today.getMonth(), today.getDate(), Number(m[1]), Number(m[2]), 0, 0);
    const et = new Date(st.getTime() + svc.duration * 60_000);
    checkInMut.mutate({
      clientId, staffId, serviceId,
      startTime: st.toISOString(),
      endTime: et.toISOString(),
      status: 'confirmed', // walk-in: client already in the chair
      notes: 'Walk-in',
      locationId: officeId,
      createdBy: currentUserId,
    });
  };

  const ready = clientId && serviceId && staffId && time;
  const busy = checkInMut.isPending || createClientMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-1.5">
            <BoltIcon className="h-3 w-3" />
            {t('calendar.walkIn')}
          </p>
          <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('calendar.walkInTitle')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('calendar.walkInSubtitle')}
          </p>
        </DialogHeader>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_DUR.base, ease: MOTION_EASE }}
          className="space-y-6"
        >
          {/* Client */}
          <div className="border-t border-border pt-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t('calendar.sectionWho')}
            </p>
            <ClientAutocomplete
              t={t}
              clients={clients}
              selectedClientId={clientId}
              onSelectClient={(id) => { setClientId(id); setClientSearch(''); }}
              search={clientSearch}
              onSearchChange={setClientSearch}
              isCreatingClient={isCreatingClient}
              onStartCreate={() => {
                const q = clientSearch.trim();
                const looksLikePhone = /[\d+()]/.test(q);
                const looksLikeEmail = q.includes('@');
                setNewClient({
                  ...EMPTY_NEW_CLIENT_DRAFT,
                  fullName: !looksLikePhone && !looksLikeEmail ? q : '',
                  phone: looksLikePhone ? q : '',
                  email: looksLikeEmail ? q : '',
                });
                setIsCreatingClient(true);
              }}
              onCancelCreate={() => setIsCreatingClient(false)}
              newClient={newClient}
              onNewClientChange={setNewClient}
              onSubmitNewClient={() => {
                const { firstName, lastName } = splitFullName(newClient.fullName);
                createClientMut.mutate({
                  firstName,
                  lastName,
                  phone:     newClient.phone.trim(),
                  email:     newClient.email.trim(),
                  notes:     newClient.notes.trim(),
                  avatarUrl: newClient.avatarUrl?.trim() || undefined,
                  officeIds: [officeId],
                });
              }}
              isSubmittingClient={createClientMut.isPending}
            />
          </div>

          {/* Service + Barber */}
          <div className="border-t border-border pt-5 grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('calendar.service')}
              </Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger className="mt-1.5 h-10 tabular-nums"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — €{s.price} · {s.duration}m
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('calendar.barber')}
              </Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger className="mt-1.5 h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activeStaff.map(s => {
                    const c = getStaffColor(staffColorMap.get(s.id) ?? 0);
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="inline-flex items-center gap-2">
                          <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />
                          {s.firstName} {s.lastName}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time */}
          <div className="border-t border-border pt-5">
            <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Start time
            </Label>
            <div className="mt-1.5 flex items-center gap-3">
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                step={900}
                className="h-10 w-32 tabular-nums"
              />
              <button
                type="button"
                onClick={() => setTime(format(new Date(), 'HH:mm'))}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Now
              </button>
              <span className="text-[11px] text-muted-foreground/70">
                Defaults to the next 15-min slot from now.
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border pt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !ready}
              className="group ml-auto inline-flex items-center bg-primary text-primary-foreground py-0 pl-6 pr-0 text-sm font-semibold uppercase tracking-[0.18em] transition-colors duration-200 hover:bg-foreground hover:text-background disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="py-3 text-left tabular-nums">
                {checkInMut.isPending ? t('calendar.checkingIn') : t('calendar.checkIn')}
              </span>
              <span className="border-l border-black/30 dark:border-white/20 p-3 inline-flex items-center transition-transform duration-200 group-hover:translate-x-[2px]">
                <ArrowRightIcon className="h-4 w-4" />
              </span>
            </button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Focus banner ────────────────────────────────────────
// Sits above the grid/week/day view when a single barber is focused.
// motion.div lays in via a tiny y-fade — `layoutId` is intentionally NOT used
// because the column-header in grid view doesn't survive across view modes
// (the WeekView and DayAgenda don't render column headers), so a shared-id
// morph would only animate part of the time and feel inconsistent.
function FocusBanner({
  staff,
  color,
  onClear,
  onJumpToShift,
  t,
}: {
  staff: { id: string; firstName: string; lastName: string; avatarUrl?: string };
  color: { dot: string; light: string; label: string };
  onClear: () => void;
  onJumpToShift: () => void;
  t: (key: TranslationKey) => string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key="focus-banner"
      initial={reduce ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: -6 }}
      transition={{ duration: MOTION_DUR.base, ease: MOTION_EASE }}
      className="flex items-center gap-3 border-b border-border bg-card px-4 py-2.5"
    >
      {/* Staff color accent pill */}
      <span className={cn('h-8 w-1 rounded-full shrink-0', color.dot)} aria-hidden />

      {/* Avatar in staff color ring */}
      <div className={cn('rounded-full p-[1.5px] shrink-0', color.dot)}>
        <Avatar className="h-7 w-7 block">
          {staff.avatarUrl && <AvatarImage src={staff.avatarUrl} alt={staff.firstName} />}
          <AvatarFallback className={cn('text-[10px] font-bold', color.light, color.label)}>
            {staff.firstName[0]}{staff.lastName[0]}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground leading-none mb-0.5">
          {t('calendar.focus')}
        </p>
        <p className="text-sm font-semibold text-foreground truncate leading-tight">
          {staff.firstName} {staff.lastName}
        </p>
      </div>

      <button
        type="button"
        onClick={onJumpToShift}
        className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
        {t('calendar.contextJumpShift')}
      </button>

      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <XMarkIcon className="h-3.5 w-3.5" />
        {t('calendar.focusClear')}
      </button>
    </motion.div>
  );
}

// ─── Compact date field — eyebrow-less popover trigger ───
// Used inside the Period section where the section header carries the label.
// Renders as a lightweight chip; click opens a MiniCalendar Popover.
function CompactDateField({
  value,
  onChange,
  locale,
  minDate,
  ariaLabel,
  disabled,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  locale: DateFnsLocale;
  minDate?: string;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const date = useMemo(() => parseISO(value), [value]);
  const display = format(date, 'd MMM yyyy', { locale });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            'group flex items-center justify-between gap-2 rounded-md border border-border/80 bg-card/50 px-3 h-9 text-sm font-medium tabular-nums text-foreground transition-colors hover:border-foreground/40 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-card/50 disabled:hover:border-border/80',
            className,
          )}
        >
          <span className="truncate">{display}</span>
          <CalendarDaysIcon className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <MiniCalendar
          selectedDate={date}
          onSelectDate={(d) => {
            const next = format(d, 'yyyy-MM-dd');
            if (minDate && next < minDate) return;
            onChange(next);
            setOpen(false);
          }}
          appointments={[]}
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── Time picker — alarm-clock style with grid + LayoutGroup pills ───
// Trigger displays "09:30 AM" (12h) or "09:30" (24h). Click opens a Popover
// with a big digital display, hour grid, minute grid, and AM/PM toggle.
// Each grid uses LayoutGroup so the selection pill *springs* between cells —
// the signature alarm-clock feel.
function TimePickerField({
  value,         // HH:mm in 24h internal format
  onChange,
  timeFormat,
  disabled,
  ariaLabel,
  open,
  onOpenChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  timeFormat: '12h' | '24h';
  disabled?: boolean;
  ariaLabel?: string;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  // Visual focus indicator on the digit display — clicking HH/MM in the
  // dark hero highlights that segment. Pure visual nudge; the grid below
  // stays interactive for either segment regardless.
  const [focusedField, setFocusedField] = useState<'hour' | 'minute' | null>(null);

  // Parse the 24h internal value
  const [hStr = '00', mStr = '00'] = value.split(':');
  const hour24 = Math.max(0, Math.min(23, parseInt(hStr, 10) || 0));
  const minute = Math.max(0, Math.min(59, parseInt(mStr, 10) || 0));
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;

  // Display label: locale-agnostic since times are universal
  const displayLabel = timeFormat === '12h'
    ? `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`
    : `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const setHour = (h: number) => {
    let new24: number;
    if (timeFormat === '24h') {
      new24 = h;
    } else {
      // h is in 12h display range (1-12). Convert to 24h based on current period.
      if (period === 'PM') new24 = h === 12 ? 12 : h + 12;
      else new24 = h === 12 ? 0 : h;
    }
    onChange(`${String(new24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };
  const setMinute = (m: number) => {
    onChange(`${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };
  const setPeriod = (p: 'AM' | 'PM') => {
    if (p === period) return;
    let new24: number;
    if (p === 'PM') new24 = hour24 < 12 ? hour24 + 12 : hour24;
    else new24 = hour24 >= 12 ? hour24 - 12 : hour24;
    onChange(`${String(new24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };

  const hourCells = timeFormat === '12h'
    ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    : Array.from({ length: 24 }, (_, i) => i);
  // Minute grid is driven by the user-set granularity (Settings → "Time
  // picker interval"). 15 → [0,15,30,45], 5 → [0,5,...,55], etc. The cells
  // grow taller and reduce in count as the interval coarsens.
  const [granularity] = useTimeGranularity();
  const minuteCells = useMemo(() => {
    const out: number[] = [];
    for (let m = 0; m < 60; m += granularity) out.push(m);
    return out;
  }, [granularity]);
  // Layout choice — keep cells legible across all six interval options.
  const minuteCols = granularity === 1  ? 'grid-cols-10'
    : granularity === 5  ? 'grid-cols-4'
    : granularity === 10 ? 'grid-cols-6'
    : granularity === 15 ? 'grid-cols-4'
    : granularity === 30 ? 'grid-cols-2'
    :                      'grid-cols-1';
  const minuteCellH = granularity === 1 ? 'h-7 text-[11px]' : 'h-9 text-[13px]';
  const selectedHourValue = timeFormat === '12h' ? hour12 : hour24;
  const hourCols = timeFormat === '12h' ? 'grid-cols-4' : 'grid-cols-6';

  // Stable layoutId — prefix with a unique-ish marker so multiple TimePicker
  // instances on the same screen don't share pill animation state.
  const groupKey = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  // ── Quick-shortcut handlers ───────────────────────────
  // Snap to current local time, rounded to the user's interval (or 5m floor
  // when the interval is finer). Bump-by adds N minutes with overflow into
  // the hour/day boundary handled correctly.
  const snapNow = () => {
    const now = new Date();
    const step = Math.max(granularity, 5);
    const mm = Math.round(now.getMinutes() / step) * step;
    const carryHr = mm === 60 ? (now.getHours() + 1) % 24 : now.getHours();
    const adjMm = mm === 60 ? 0 : mm;
    onChange(`${String(carryHr).padStart(2, '0')}:${String(adjMm).padStart(2, '0')}`);
  };
  const bumpBy = (deltaMin: number) => {
    const totalMin = hour24 * 60 + minute + deltaMin;
    const newHr = ((Math.floor(totalMin / 60)) % 24 + 24) % 24;
    const newMin = ((totalMin % 60) + 60) % 60;
    onChange(`${String(newHr).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`);
  };
  // Snap to the next granularity-aligned slot strictly after the current clock
  // time — useful when the operator opens the picker mid-schedule and wants the
  // first available future slot without doing the arithmetic manually.
  const snapNextSlot = () => {
    const now = new Date();
    const step = Math.max(granularity, 5);
    const totalNowMin = getHoursInTz(now) * 60 + getMinutesInTz(now);
    const nextMin = Math.ceil((totalNowMin + 1) / step) * step;
    const newHr = Math.floor(nextMin / 60) % 24;
    const newMm = nextMin % 60;
    onChange(`${String(newHr).padStart(2, '0')}:${String(newMm).padStart(2, '0')}`);
  };

  const shortcuts = [
    { key: 'now', label: 'Now', aria: 'Snap to current time', onClick: snapNow },
    { key: 'p15', label: '+15', aria: 'Add 15 minutes', onClick: () => bumpBy(15) },
    { key: 'p30', label: '+30', aria: 'Add 30 minutes', onClick: () => bumpBy(30) },
    { key: 'p60', label: '+1h', aria: 'Add 1 hour', onClick: () => bumpBy(60) },
    { key: 'next', label: 'Next', aria: 'Next available slot', onClick: snapNextSlot },
  ];

  // Hero digit button — keeps AnimatePresence flip on value change but
  // ditches the dark-bar surround in favor of an editorial light surface
  // with a subtle accent state when focused. Same shape for hour & minute
  // so the two slots read as a typographic pair, not two controls.
  const heroDigit = (field: 'hour' | 'minute', val: number) => (
    <button
      type="button"
      onClick={() => setFocusedField(field)}
      className={cn(
        // focus-visible:ring is layered on top of the conditional state ring
        // so keyboard users always see a clear indicator regardless of which
        // segment is "active" in the visual focus model. (P2 fix.)
        'relative leading-none rounded-lg px-1.5 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        focusedField === field
          ? 'bg-foreground/[0.06] ring-1 ring-foreground/15'
          : 'hover:bg-accent/50',
      )}
      aria-label={`Focus ${field}`}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={`${field}-${val}`}
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: MOTION_EASE }}
          className="inline-block text-[44px] font-bold tabular-nums tracking-tight text-foreground leading-none"
        >
          {String(val).padStart(2, '0')}
        </motion.span>
      </AnimatePresence>
    </button>
  );

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'group flex w-full items-center justify-between gap-2 rounded-md border border-input bg-input-background px-3 h-10 text-sm font-medium tabular-nums text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-input',
            className,
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ClockIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0 overflow-hidden border-border/80 shadow-lg" align="start">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 28 }}
        >
          {/* QUICK SHORTCUTS — most-used adjustments live as a thin pill bar
              above the editorial hero, so the operator never has to scrub two
              grids for "set this to about now". Order: Now, +15/+30/+1h
              forward bumps, snap to top-of-hour. Each chip springs on hover. */}
          <div className="flex items-center gap-1 px-3 pt-2.5 pb-2 border-b border-border">
            {shortcuts.map((sc, i) => (
              <motion.button
                key={sc.key}
                type="button"
                onClick={sc.onClick}
                aria-label={sc.aria}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: MOTION_EASE, delay: 0.02 + i * 0.025 }}
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                // Visual chip stays 28px tall; min-h-[44px] expands the tap
                // area on touch (WCAG 2.5.5). The bumped touch zone collapses
                // back to 28px at sm+ where mouse precision rules.
                className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground hover:bg-accent rounded-md px-2 h-7 min-h-[44px] sm:min-h-[28px] tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {sc.label}
              </motion.button>
            ))}
          </div>

          {/* EDITORIAL HERO — light surface, display-size HH:MM in foreground,
              eyebrow above, AM/PM as a segmented control with sliding
              LayoutGroup pill. Replaces the prior dark-bar inversion that
              didn't fit the Editorial Command Center family. */}
          <div className="px-5 pt-3.5 pb-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
              Time
            </p>
            <div className="flex items-end gap-3">
              <div className="flex items-baseline gap-0.5 flex-1 min-w-0">
                {heroDigit('hour', selectedHourValue)}
                <span className="text-[40px] font-bold tabular-nums text-muted-foreground/35 leading-none pb-1">:</span>
                {heroDigit('minute', minute)}
              </div>

              {/* AM/PM segmented control */}
              {timeFormat === '12h' && (
                <LayoutGroup id={`tp-period-${groupKey}`}>
                  <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40">
                    {(['AM', 'PM'] as const).map(p => {
                      const active = period === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPeriod(p)}
                          aria-pressed={active}
                          className={cn(
                            // Visual cell stays 32px; min-h-[44px] expands the
                            // tap area on touch (WCAG 2.5.5). Resets to 32px
                            // at sm+ where mouse precision rules.
                            'relative h-8 min-h-[44px] sm:min-h-[32px] px-3 rounded-md text-[11px] font-bold tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                            active ? 'text-background' : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId={`tp-period-${groupKey}`}
                              className="absolute inset-0 rounded-md bg-foreground shadow-sm"
                              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 36 }}
                              style={{ zIndex: 0 }}
                            />
                          )}
                          <span className="relative z-10">{p}</span>
                        </button>
                      );
                    })}
                  </div>
                </LayoutGroup>
              )}
            </div>
          </div>

          <div className="border-t border-border" />

          <div className="px-4 pt-3 pb-4">
            {/* Hour grid — circular cells nod to clock-face affordance.
                Selected pill rides a LayoutGroup spring; siblings stagger
                in on open with a subtle y-translate so the grid "lands"
                rather than appears. */}
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
              Hour
            </p>
            <LayoutGroup id={`tp-hour-${groupKey}`}>
              <div className={cn('grid gap-1 mb-4', hourCols)}>
                {hourCells.map((h, i) => {
                  const sel = h === selectedHourValue;
                  return (
                    <motion.button
                      key={h}
                      type="button"
                      onClick={() => { setFocusedField('hour'); setHour(h); }}
                      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: MOTION_EASE, delay: 0.04 + i * 0.012 }}
                      whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                      className="relative h-9 text-[13px] font-semibold tabular-nums rounded-full hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      {sel && (
                        <motion.span
                          layoutId={`tp-hour-${groupKey}`}
                          className="absolute inset-0 rounded-full bg-foreground shadow-md ring-2 ring-foreground/10 ring-offset-1 ring-offset-background"
                          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 36 }}
                          style={{ zIndex: 0 }}
                        />
                      )}
                      <span className={cn('relative z-10 transition-colors', sel ? 'text-background' : 'text-foreground')}>
                        {String(h).padStart(2, '0')}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </LayoutGroup>

            {/* Minute grid */}
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">
              Minute
            </p>
            <LayoutGroup id={`tp-min-${groupKey}`}>
              <div className={cn('grid gap-1', minuteCols)}>
                {minuteCells.map((m, i) => {
                  const sel = m === minute;
                  return (
                    <motion.button
                      key={m}
                      type="button"
                      onClick={() => { setFocusedField('minute'); setMinute(m); }}
                      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: MOTION_EASE, delay: 0.08 + i * 0.012 }}
                      whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                      className={cn(
                        'relative font-semibold tabular-nums rounded-full hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                        minuteCellH,
                      )}
                    >
                      {sel && (
                        <motion.span
                          layoutId={`tp-min-${groupKey}`}
                          className="absolute inset-0 rounded-full bg-foreground shadow-md ring-2 ring-foreground/10 ring-offset-1 ring-offset-background"
                          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 36 }}
                          style={{ zIndex: 0 }}
                        />
                      )}
                      <span className={cn('relative z-10 transition-colors', sel ? 'text-background' : 'text-foreground')}>
                        {String(m).padStart(2, '0')}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </LayoutGroup>
          </div>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Schedule strip — visual preview of the working window ───
// Horizontal 06:00→22:00 timeline with a band that animates between modes.
// Day-off mode → no band, just a muted "DAY OFF" label.
// Custom mode → band repositions live as From/To selects update.
// Standard mode → band reflects the weekly Shift.
function ScheduleStrip({
  mode,
  customStart,
  customEnd,
  weeklyShift,
  reduceMotion,
  dayOffLabel,
}: {
  mode: 'day-off' | 'standard' | 'custom';
  customStart: string;
  customEnd: string;
  weeklyShift: Shift | null;
  reduceMotion: boolean;
  dayOffLabel: string;
}) {
  const STRIP_START = 360;  // 06:00 in minutes
  const STRIP_END = 1320;   // 22:00
  const SPAN = STRIP_END - STRIP_START;
  const pct = (mins: number) => Math.max(0, Math.min(100, ((mins - STRIP_START) / SPAN) * 100));
  const parseHHMM = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };

  let bandStart: number | null = null;
  let bandEnd: number | null = null;
  if (mode === 'custom') {
    bandStart = parseHHMM(customStart);
    bandEnd = parseHHMM(customEnd);
  } else if (mode === 'standard' && weeklyShift) {
    bandStart = parseHHMM(weeklyShift.startTime);
    bandEnd = parseHHMM(weeklyShift.endTime);
  }

  const showBand = bandStart !== null && bandEnd !== null && bandEnd > bandStart;
  const leftPct = showBand && bandStart !== null ? pct(bandStart) : 0;
  const widthPct = showBand && bandStart !== null && bandEnd !== null ? pct(bandEnd) - pct(bandStart) : 0;

  const formatHHMM = (mins: number) =>
    `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-1.5">
      <div className="relative h-12 rounded-lg bg-muted/30 ring-1 ring-border/50 overflow-hidden">
        {/* Hour grid */}
        {[6, 8, 10, 12, 14, 16, 18, 20, 22].map((h) => (
          <div
            key={h}
            className="absolute top-0 bottom-0 w-px bg-border/40"
            style={{ left: `${pct(h * 60)}%` }}
          />
        ))}

        {/* Working band — animates left/width when mode/times change */}
        <motion.div
          className="absolute top-1.5 bottom-1.5 rounded-md bg-foreground/10 ring-1 ring-foreground/40 flex items-center justify-center overflow-hidden"
          animate={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            opacity: showBand ? 1 : 0,
          }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 32 }}
        >
          {showBand && widthPct > 26 && bandStart !== null && bandEnd !== null && (
            <span className="text-[10px] font-semibold tabular-nums text-foreground/85 px-2 whitespace-nowrap">
              {formatHHMM(bandStart)} – {formatHHMM(bandEnd)}
            </span>
          )}
        </motion.div>

        {/* Day-off / no-band overlay */}
        <AnimatePresence>
          {!showBand && (
            <motion.div
              key="dayoff"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
                {dayOffLabel}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hour labels */}
      <div className="relative h-3.5">
        {[6, 10, 14, 18, 22].map((h) => (
          <span
            key={h}
            className="absolute top-0 text-[10px] font-medium tabular-nums text-muted-foreground/55"
            style={{ left: `${pct(h * 60)}%`, transform: 'translateX(-50%)' }}
          >
            {String(h).padStart(2, '0')}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Edit-day shift override modal ──────────────────────
// Single-day shift editor. Replaces the prior 4-row context menu.
// Modes: Day off, Standard (use weekly default), Custom hours.
// Save creates/updates a ShiftOverride; Standard removes it.
function EditDayShiftModal({
  open,
  staffId,
  staffName,
  selectedDate,
  weeklyShift,
  existingOverride,
  onClose,
}: {
  open: boolean;
  staffId: string;
  staffName: string;
  selectedDate: Date;
  weeklyShift: Shift | null;
  existingOverride: ShiftOverride | null;
  onClose: () => void;
}) {
  const t = useT();
  const [language] = useLanguage();
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();

  // Locale lookup for date-fns. Without this the RU/LT UI would still read
  // the eyebrow date as "WED, MAY 6" — a glaring i18n hole noted in user feedback.
  const dateLocale: DateFnsLocale =
    language === 'ru' ? ruLocale : language === 'lt' ? ltLocale : enLocale;

  // Derive initial mode from the **current effective state** for this date:
  //  - override exists → reflect its kind
  //  - no override + weekly shift → 'standard' (this is what's actually scheduled)
  //  - no override + no weekly shift → 'day-off' (no work today by default)
  // Critical: the previous default of 'day-off' broke Save (dirty=false because
  // mode==initialMode), so the user couldn't actually save a day off.
  const initialMode: 'day-off' | 'standard' | 'custom' =
    existingOverride?.kind === 'day-off' ? 'day-off'
    : existingOverride?.kind === 'custom' ? 'custom'
    : weeklyShift ? 'standard' : 'day-off';
  const initialStart = existingOverride?.startTime ?? weeklyShift?.startTime ?? '10:00';
  const initialEnd = existingOverride?.endTime ?? weeklyShift?.endTime ?? '20:00';

  const [mode, setMode] = useState<'day-off' | 'standard' | 'custom'>(initialMode);
  const [customStart, setCustomStart] = useState(initialStart);
  const [customEnd, setCustomEnd] = useState(initialEnd);

  // Date range — defaults to single day (from = to = clicked date). Lets the
  // operator block multiple days at once (e.g. a week of vacation) without
  // closing/reopening the modal per day.
  const initialDateKey = format(selectedDate, 'yyyy-MM-dd');
  const [dateFrom, setDateFrom] = useState(initialDateKey);
  const [dateTo, setDateTo] = useState(initialDateKey);

  // Reset state every time a fresh modal opens with different props
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setCustomStart(initialStart);
      setCustomEnd(initialEnd);
      setDateFrom(initialDateKey);
      setDateTo(initialDateKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, staffId, selectedDate.toISOString()]);

  // Build 15-min time options from 06:00 to 22:00 (buffers the 8-21 grid)
  const timeOptions = useMemo(() => {
    const out: string[] = [];
    for (let h = 6; h <= 22; h++) {
      for (let m = 0; m < 60; m += 15) {
        out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return out;
  }, []);

  const initials = staffName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const gradient = AVATAR_GRADIENTS[hashToIndex(staffId, AVATAR_GRADIENTS.length)];

  // Build the inclusive list of dates [dateFrom..dateTo]. Empty when invalid.
  const datesInRange = useMemo(() => {
    const out: string[] = [];
    if (!dateFrom || !dateTo || dateTo < dateFrom) return out;
    const start = parseISO(dateFrom);
    const end = parseISO(dateTo);
    for (let d = start; d <= end; d = addDays(d, 1)) {
      out.push(format(d, 'yyyy-MM-dd'));
    }
    return out;
  }, [dateFrom, dateTo]);

  // Multi-day range OR mode/time change counts as dirty. Single-day same-mode
  // clicks where nothing else changed = not dirty (Save disabled, as expected).
  const isMultiDay = datesInRange.length > 1;
  const dirty =
    mode !== initialMode ||
    (mode === 'custom' && (customStart !== initialStart || customEnd !== initialEnd)) ||
    isMultiDay;

  // String-compare HH:mm — lexicographic order matches chronological for fixed-width
  const customTimeValid = mode !== 'custom' || customEnd > customStart;
  const dateRangeValid = datesInRange.length > 0;
  const rangeValid = customTimeValid && dateRangeValid;

  const standardLabel = weeklyShift
    ? `${weeklyShift.startTime} – ${weeklyShift.endTime}`
    : t('calendar.modeNoWeekly');

  // Locale-aware "Wed, May 6" → "Ср, 6 мая" / "Tr, geg. 6". The Russian/Lithuanian
  // eyebrows previously displayed English short-day + month, breaking i18n.
  const dateLabel = format(selectedDate, 'EEE, d MMM', { locale: dateLocale }).toUpperCase();

  // Caption beneath the staff name — describes the current effective schedule
  // for this date so the operator sees state at a glance, not just radio choices.
  const currentLabel = (() => {
    if (existingOverride?.kind === 'day-off') return t('calendar.currentDayOff');
    if (existingOverride?.kind === 'custom' && existingOverride.startTime && existingOverride.endTime) {
      return `${existingOverride.startTime} – ${existingOverride.endTime}`;
    }
    return weeklyShift ? `${weeklyShift.startTime} – ${weeklyShift.endTime}` : t('calendar.currentDayOff');
  })();

  // Compact preview of what hitting Save will do — keeps the operator from
  // second-guessing the radio choices. Updates live as `mode` changes.
  const willApplyLabel =
    mode === 'day-off' ? t('calendar.willApplyDayOff')
    : mode === 'standard' ? t('calendar.willApplyStandard')
    : t('calendar.willApplyCustom').replace('{start}', customStart).replace('{end}', customEnd);

  const onSave = async () => {
    if (datesInRange.length === 0) return;
    try {
      // Sequential awaits over the range so a partial failure leaves the
      // store in a consistent state — mirrors the BlockDialog multi-day fan-out.
      for (const dateKey of datesInRange) {
        if (mode === 'standard') {
          await shiftOverridesApi.remove({ staffId, date: dateKey });
        } else if (mode === 'day-off') {
          await shiftOverridesApi.upsert({ staffId, date: dateKey, kind: 'day-off' });
        } else {
          await shiftOverridesApi.upsert({
            staffId,
            date: dateKey,
            kind: 'custom',
            startTime: customStart,
            endTime: customEnd,
          });
        }
      }
      const baseToast = mode === 'standard' ? t('calendar.scheduleReverted') : t('calendar.scheduleUpdated');
      const dayLabel = datesInRange.length === 1
        ? t('calendar.singleDay')
        : t('calendar.dayCount').replace('{count}', String(datesInRange.length));
      toast.success(`${baseToast} · ${dayLabel}`);
      queryClient.invalidateQueries({ queryKey: ['shift-overrides'] });
      onClose();
    } catch (err) {
      toast.error((err as Error).message ?? 'Save failed');
    }
  };

  // Three mode definitions — used by the segmented card group below.
  const modeCards: { value: 'day-off' | 'standard' | 'custom'; icon: typeof NoSymbolIcon; titleKey: TranslationKey; subtitle: string }[] = [
    { value: 'day-off', icon: NoSymbolIcon, titleKey: 'calendar.modeDayOff', subtitle: t('calendar.modeDayOffDesc') },
    { value: 'standard', icon: ClockIcon, titleKey: 'calendar.modeStandard', subtitle: weeklyShift ? standardLabel : t('calendar.modeNoWeekly') },
    { value: 'custom', icon: AdjustmentsHorizontalIcon, titleKey: 'calendar.modeCustom', subtitle: `${customStart} – ${customEnd}` },
  ];

  // Stagger entrance — header → cards → custom hours → strip → period → footer.
  // Spring physics on the LayoutGroup pill give that satisfying "snap" when the
  // user clicks between modes. Reduced motion bypasses the stagger entirely.
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.045,
        delayChildren: reduceMotion ? 0 : 0.04,
      },
    },
  };
  const itemVariants = {
    hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: MOTION_EASE },
    },
  };

  const dayCountLabel = datesInRange.length === 1
    ? t('calendar.singleDay')
    : t('calendar.dayCount').replace('{count}', String(datesInRange.length));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {/* Header — eyebrow + identity in a tight chip card.
              Avatar, name, "Currently · X" caption stacked compactly. */}
          <motion.div variants={itemVariants} className="px-7 pt-7 pb-4">
            <DialogTitle className="sr-only">
              {staffName} — {t('calendar.editDayEyebrow')}
            </DialogTitle>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/85">
              {t('calendar.editDayEyebrow')} <span className="mx-1 text-muted-foreground/40">·</span> <span className="tabular-nums">{dateLabel}</span>
            </p>
            <div className="mt-3.5 flex items-center gap-3 rounded-xl bg-muted/35 px-3 py-2.5 ring-1 ring-border/50">
              <div className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white shrink-0 ring-2 ring-background shadow-sm',
                gradient,
              )}>
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold tracking-tight text-foreground truncate leading-none">{staffName}</p>
                <p className="text-[10px] text-muted-foreground/90 truncate mt-1.5">
                  <span className="uppercase tracking-[0.16em] font-medium">{t('calendar.currently')}</span>
                  <span className="mx-1.5 text-muted-foreground/40">·</span>
                  <span className="tabular-nums text-foreground/80 font-semibold">{currentLabel}</span>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Mode segmented card group — three cards with a spring-animated
              "selected" pill via layoutId. Disabled state for Standard when
              there's no weekly shift. ARIA: explicit radiogroup. */}
          <motion.div variants={itemVariants} className="px-7 pb-4">
            <div role="radiogroup" aria-label={t('calendar.editDayEyebrow')} className="relative grid grid-cols-3 gap-1.5 rounded-xl bg-muted/40 p-1.5 ring-1 ring-border/40">
              <LayoutGroup id="edit-day-mode-pill">
                {modeCards.map((card) => {
                  const selected = mode === card.value;
                  const disabled = card.value === 'standard' && !weeklyShift;
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={disabled}
                      onClick={() => !disabled && setMode(card.value)}
                      className={cn(
                        'group relative flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-lg transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                      )}
                    >
                      {selected && (
                        <motion.span
                          layoutId="mode-pill"
                          className="absolute inset-0 rounded-lg bg-card border border-border/80 shadow-[0_2px_6px_-2px_rgba(0,0,0,0.08)]"
                          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 36 }}
                          style={{ zIndex: 0 }}
                        />
                      )}
                      <span className="relative z-10 flex flex-col items-center gap-1">
                        <Icon className={cn(
                          'h-[18px] w-[18px] transition-colors',
                          selected ? 'text-foreground' : 'text-muted-foreground/70 group-hover:text-foreground/80',
                        )} />
                        <span className={cn(
                          'text-[12.5px] font-semibold leading-tight transition-colors',
                          selected ? 'text-foreground' : 'text-muted-foreground/80 group-hover:text-foreground',
                        )}>
                          {t(card.titleKey)}
                        </span>
                        <span className={cn(
                          'text-[9.5px] font-medium uppercase tracking-[0.1em] tabular-nums transition-colors leading-none',
                          selected ? 'text-muted-foreground' : 'text-muted-foreground/55',
                        )}>
                          {card.subtitle}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </LayoutGroup>
            </div>
          </motion.div>

          {/* Custom hours — From/To time selects, animated height-collapse */}
          <AnimatePresence initial={false}>
            {mode === 'custom' && (
              <motion.div
                key="custom-pickers"
                initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={{ duration: MOTION_DUR.base, ease: MOTION_EASE }}
                className="overflow-hidden"
              >
                <div className="px-7 pb-4 grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="custom-start" className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t('calendar.from')}
                    </Label>
                    <Select value={customStart} onValueChange={setCustomStart}>
                      <SelectTrigger id="custom-start" className="tabular-nums bg-card/50 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {timeOptions.map((tm) => (
                          <SelectItem key={tm} value={tm} className="tabular-nums">{tm}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="custom-end" className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t('calendar.to')}
                    </Label>
                    <Select value={customEnd} onValueChange={setCustomEnd}>
                      <SelectTrigger id="custom-end" className="tabular-nums bg-card/50 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {timeOptions.map((tm) => (
                          <SelectItem key={tm} value={tm} className="tabular-nums">{tm}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!customTimeValid && (
                    <p className="col-span-2 text-[11px] text-destructive">{t('calendar.invalidRange')}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Schedule preview strip — visual band of the working window.
              Springs between modes; collapses to a "DAY OFF" label when off. */}
          <motion.div variants={itemVariants} className="px-7 pb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('calendar.willApply')}
              </p>
            </div>
            <ScheduleStrip
              mode={mode}
              customStart={customStart}
              customEnd={customEnd}
              weeklyShift={weeklyShift}
              reduceMotion={!!reduceMotion}
              dayOffLabel={t('calendar.modeDayOff')}
            />
          </motion.div>

          {/* Period — date range picker. Compact triggers + day count badge. */}
          <motion.div variants={itemVariants} className="border-t border-border/70 bg-muted/15 px-7 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('calendar.applyToRange')}
              </p>
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-foreground/75 tabular-nums">
                {dayCountLabel}
              </p>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <CompactDateField
                value={dateFrom}
                onChange={(v) => { setDateFrom(v); if (dateTo < v) setDateTo(v); }}
                locale={dateLocale}
                ariaLabel={t('calendar.from')}
              />
              <ArrowRightIcon className="h-3.5 w-3.5 text-muted-foreground/55" />
              <CompactDateField
                value={dateTo}
                onChange={setDateTo}
                locale={dateLocale}
                minDate={dateFrom}
                ariaLabel={t('calendar.to')}
              />
            </div>
          </motion.div>

          {/* Footer — Cancel ghost + Save with day count badge inline */}
          <motion.div variants={itemVariants} className="border-t border-border/70 px-7 py-3.5 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={!dirty || !rangeValid}
              className="min-w-[120px] gap-1.5"
            >
              <span>{t('common.saveChanges')}</span>
              {dirty && rangeValid && (
                <span className="text-[10px] tabular-nums opacity-80 px-1.5 py-0.5 -mr-1 rounded bg-foreground/10">
                  {datesInRange.length}d
                </span>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

// Skeleton for the calendar grid — drawn while the appointments query is in
// its first-load state. Matches the real layout: time gutter on the left, staff
// columns to the right, scattered fake tiles at varying heights so the eye
// reads it as "the calendar is almost here" instead of a generic loading box.
// Pulse runs on `bg-muted/60` (theme-aware via CSS variable). Tiles are
// pre-seeded with a deterministic positions array — no per-render reshuffle.
const SKELETON_TILES: Array<Array<{ topPct: number; heightMin: number }>> = [
  [{ topPct: 12, heightMin: 60 }, { topPct: 35, heightMin: 90 }, { topPct: 70, heightMin: 45 }],
  [{ topPct: 8, heightMin: 75 }, { topPct: 50, heightMin: 60 }, { topPct: 80, heightMin: 30 }],
  [{ topPct: 20, heightMin: 45 }, { topPct: 42, heightMin: 75 }, { topPct: 78, heightMin: 60 }],
  [{ topPct: 5, heightMin: 90 }, { topPct: 55, heightMin: 45 }],
  [{ topPct: 18, heightMin: 60 }, { topPct: 60, heightMin: 90 }, { topPct: 88, heightMin: 30 }],
  [{ topPct: 30, heightMin: 45 }, { topPct: 65, heightMin: 75 }],
];

function CalendarGridSkeleton({
  visibleStaffCount,
  hours,
  gridH,
  staffColWidth,
}: {
  visibleStaffCount: number;
  hours: number[];
  gridH: number;
  staffColWidth: number;
}) {
  const staffCount = Math.max(1, visibleStaffCount);
  return (
    <div>
      {/* Sticky header pulse — staff name + load-bead placeholders */}
      <div className="sticky top-0 z-40 flex border-b border-border bg-card shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="sticky left-0 z-50 shrink-0 border-r border-border bg-card" style={{ width: `${TIME_GUTTER_W}px` }} />
        {Array.from({ length: staffCount }).map((_, i) => (
          <div key={i} className={cn('flex flex-1 items-center gap-3 px-3.5 py-3', i < staffCount - 1 && 'border-r border-border')} style={{ minWidth: `${staffColWidth}px` }}>
            <div className="h-9 w-9 rounded-full bg-muted/70 animate-pulse shrink-0" style={{ animationDelay: `${i * 70}ms` }} />
            <div className="h-3 flex-1 rounded bg-muted/60 animate-pulse" style={{ animationDelay: `${i * 70 + 30}ms` }} />
            <div className="h-5 w-10 rounded-md border border-border bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 70 + 60}ms` }} />
          </div>
        ))}
      </div>

      {/* Body: time-gutter pulses + staff columns with fake tiles */}
      <div className="relative flex" style={{ height: `${gridH}px` }}>
        <div className="sticky left-0 z-20 shrink-0 border-r border-border bg-card" style={{ width: `${TIME_GUTTER_W}px` }}>
          {hours.map((_, i) => (
            <div
              key={i}
              className="absolute right-2 h-2 w-7 rounded bg-muted/50 animate-pulse"
              style={{ top: `${i * SLOT_HEIGHT - 4}px`, animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
        {Array.from({ length: staffCount }).map((_, ci) => {
          const tiles = SKELETON_TILES[ci % SKELETON_TILES.length];
          return (
            <div key={ci} className={cn('relative flex-1', ci < staffCount - 1 && 'border-r border-border')} style={{ minWidth: `${staffColWidth}px` }}>
              {/* Hour grid lines (subtle, match real calendar) */}
              {hours.map((_, hi) => (
                <div key={hi} className="absolute left-0 right-0 border-t border-border/40" style={{ top: `${hi * SLOT_HEIGHT}px` }} />
              ))}
              {/* Fake tiles */}
              {tiles.map((tile, ti) => {
                const top = (tile.topPct / 100) * gridH;
                const h = (tile.heightMin / MINUTES_PER_SLOT) * SLOT_HEIGHT;
                return (
                  <div
                    key={ti}
                    className="absolute left-1 right-1 rounded-lg border-l-[3px] border-l-muted-foreground/30 border border-border bg-muted/40 animate-pulse overflow-hidden p-2.5"
                    style={{ top: `${top}px`, height: `${h}px`, animationDelay: `${(ci * 90) + (ti * 60)}ms` }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                      <div className="h-3 flex-1 rounded bg-muted-foreground/15 max-w-[60%]" />
                    </div>
                    {h >= 50 && <div className="mt-1.5 h-2 w-1/2 rounded bg-muted-foreground/10" />}
                    {h >= 70 && (
                      <div className="mt-auto pt-2 flex items-center justify-between">
                        <div className="h-2 w-10 rounded bg-muted-foreground/10" />
                        <div className="h-2.5 w-8 rounded bg-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Per-category accent palette — literal class strings so Tailwind JIT picks
// them up. Used by both ServicePickerSheet (rows) and the selected-service
// card (thumbnail tile) so a service has the SAME color signature in both
// surfaces. Operator memorizes "purple = Highlights" once, sees it everywhere.
const CATEGORY_PALETTE: Array<{ dot: string; grad: string; tile: string }> = [
  { dot: 'bg-emerald-500', grad: 'from-emerald-400 to-emerald-600', tile: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  { dot: 'bg-blue-500',    grad: 'from-blue-400 to-blue-600',       tile: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  { dot: 'bg-amber-500',   grad: 'from-amber-400 to-amber-600',     tile: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  { dot: 'bg-rose-500',    grad: 'from-rose-400 to-rose-600',       tile: 'bg-rose-500/10 text-rose-700 dark:text-rose-400' },
  { dot: 'bg-violet-500',  grad: 'from-violet-400 to-violet-600',   tile: 'bg-violet-500/10 text-violet-700 dark:text-violet-400' },
  { dot: 'bg-teal-500',    grad: 'from-teal-400 to-teal-600',       tile: 'bg-teal-500/10 text-teal-700 dark:text-teal-400' },
  { dot: 'bg-orange-500',  grad: 'from-orange-400 to-orange-600',   tile: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  { dot: 'bg-fuchsia-500', grad: 'from-fuchsia-400 to-fuchsia-600', tile: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400' },
];
function paletteForCategory(id: string): typeof CATEGORY_PALETTE[number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return CATEGORY_PALETTE[Math.abs(h) % CATEGORY_PALETTE.length];
}

// Service picker sheet — replaces the chip-stack popover with a full-modal
// browse + search experience. Reference: Image #171. Categorized list grouped
// by `Category.id`; search filters across all groups; tapping a service adds
// it and closes the sheet (one-at-a-time selection mirrors the reference).
function ServicePickerSheet({
  open,
  onClose,
  services,
  categories,
  staffName,
  selectedIds,
  onSelect,
  t,
}: {
  open: boolean;
  onClose: () => void;
  services: Service[];
  categories: Category[];
  staffName: string;
  selectedIds: string[];
  onSelect: (serviceId: string) => void;
  t: (key: TranslationKey) => string;
}) {
  const [search, setSearch] = useState('');
  // pendingIds tracks services staged for addition in this picker session.
  // Initialized from selectedIds so already-added items render as committed.
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set(selectedIds));
  // Reset search + pending on every open so operators start clean.
  useEffect(() => {
    if (open) {
      setSearch('');
      setPendingIds(new Set(selectedIds));
    }
  }, [open, selectedIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(s => s.name.toLowerCase().includes(q));
  }, [services, search]);

  const grouped = useMemo(() => {
    const byCat = new Map<string, Service[]>();
    filtered.forEach(s => {
      const arr = byCat.get(s.categoryId) ?? [];
      arr.push(s);
      byCat.set(s.categoryId, arr);
    });
    return categories
      .map(c => ({ category: c, items: byCat.get(c.id) ?? [] }))
      .filter(g => g.items.length > 0);
  }, [filtered, categories]);

  const totalCount = filtered.length;
  const totalMin = filtered.reduce((sum, s) => sum + s.duration, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!w-[calc(100vw-2rem)] !max-w-[640px] p-0 gap-0 max-h-[92vh] flex flex-col [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{t('calendar.servicePickerTitle')}</DialogTitle>
        </DialogHeader>

        {/* ── HERO ── editorial title block. Eyebrow shows context (booking +
            staff) so the operator never loses scope. Hero typography pulls
            weight via tracking-tight + font-bold; back/close are neutral
            ghost buttons that don't compete. */}
        <div className="px-7 pt-6 pb-5 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {staffName && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
                  Booking <span className="text-muted-foreground/40 mx-1">·</span> {staffName}
                </p>
              )}
              <h2 className="text-2xl sm:text-[28px] font-bold leading-none tracking-tight text-foreground">
                {t('calendar.servicePickerTitle')}
              </h2>
            </div>
            <div className="flex items-center gap-1 shrink-0 -mt-1">
              <button
                type="button"
                onClick={onClose}
                aria-label="Back"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── SEARCH ── glass-icon prefix + bare input. Border-bottom only,
            no boxed bg-muted — keeps the editorial restraint of input
            fields elsewhere in the modal. */}
        <div className="px-7 py-3 border-b border-border">
          <div className="relative flex items-center">
            <MagnifyingGlassIcon className="absolute left-0 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('calendar.servicePickerSearch')}
              autoFocus
              className="w-full pl-7 pr-2 h-9 bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none border-0"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── CATEGORIZED LIST ── hairline-divided rows, no per-item card.
            Density bump: 48px row height vs old 60+px. Sticky category
            eyebrows on scroll so operators never lose context in a long list. */}
        <div className="flex-1 overflow-y-auto">
          {grouped.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-7 text-center">
              <MagnifyingGlassIcon className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-foreground/80">No matches</p>
              {search && (
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Nothing for "<span className="font-medium text-foreground/70">{search}</span>"
                </p>
              )}
            </div>
          )}
          {(() => {
            // Track row index across all categories for stagger delay calc.
            // Animation cascades from top-left, ~25ms per row, capped at ~400ms
            // so even a long list finishes its entrance reasonably quick.
            let rowIdx = 0;
            return grouped.map(({ category, items }) => {
              const palette = paletteForCategory(category.id);
              const catDot = palette.dot;
              const catGrad = palette.grad;
              return (
                <div key={category.id}>
                  {/* Sticky category eyebrow — accent dot + uppercase tracking
                      + count. The colored dot gives each category a distinct
                      signature operators learn to recognize over time. */}
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: MOTION_EASE }}
                    className="sticky top-0 z-10 flex items-center gap-2 px-7 pt-6 pb-2.5 bg-card"
                  >
                    <span className={cn('h-2 w-2 rounded-full shrink-0', catDot)} aria-hidden />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {category.name}
                    </p>
                    <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full bg-muted px-1.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                      {items.length}
                    </span>
                  </motion.div>
                  {/* Hairline-divided rows with stagger entrance */}
                  <div className="border-y border-border divide-y divide-border">
                    {items.map(svc => {
                      // committed = already added to booking (from parent selectedIds)
                      // pending = staged in this picker session (not yet confirmed)
                      const committed = selectedIds.includes(svc.id);
                      const pending = pendingIds.has(svc.id) && !committed;
                      const i = rowIdx++;
                      const delay = Math.min(i * 0.025, 0.4);
                      const initials = svc.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map(w => w[0])
                        .join('')
                        .toUpperCase();
                      return (
                        <motion.button
                          key={svc.id}
                          type="button"
                          onClick={() => {
                            if (committed) return;
                            setPendingIds(prev => {
                              const next = new Set(prev);
                              if (next.has(svc.id)) next.delete(svc.id); else next.add(svc.id);
                              return next;
                            });
                          }}
                          disabled={committed}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay, duration: 0.28, ease: MOTION_EASE }}
                          whileHover={committed ? undefined : { scale: 1.005 }}
                          whileTap={committed ? undefined : { scale: 0.997 }}
                          className={cn(
                            'group w-full flex items-center gap-4 px-7 py-4 text-left transition-colors',
                            committed
                              ? 'cursor-not-allowed bg-emerald-50/40 dark:bg-emerald-950/20'
                              : pending
                                ? 'bg-foreground/[0.03] hover:bg-foreground/[0.05] focus-visible:outline-none'
                                : 'hover:bg-accent/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:bg-accent/40',
                          )}
                        >
                          {/* Service thumbnail */}
                          {svc.imageUrl ? (
                            <div className="h-10 w-10 shrink-0 rounded-md overflow-hidden bg-muted">
                              <img src={svc.imageUrl} alt="" className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className={cn(
                              'h-10 w-10 shrink-0 rounded-md bg-gradient-to-br flex items-center justify-center text-[13px] font-bold text-white shadow-[0_0_0_1px_rgba(0,0,0,0.04)]',
                              catGrad,
                            )}>
                              {initials}
                            </div>
                          )}
                          {/* Name + description */}
                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              'text-[15px] font-semibold tracking-tight truncate transition-transform duration-200',
                              committed ? 'text-muted-foreground' : 'text-foreground group-hover:translate-x-0.5',
                            )}>
                              {svc.name}
                            </p>
                            {svc.description && svc.description.trim() && (
                              <p className={cn(
                                'mt-0.5 text-[12.5px] truncate',
                                committed ? 'text-muted-foreground/60' : 'text-muted-foreground/85',
                              )}>
                                {svc.description}
                              </p>
                            )}
                          </div>
                          {/* Price + duration */}
                          <div className="shrink-0 text-right tabular-nums">
                            <p className={cn(
                              'text-[15px] font-bold leading-none',
                              committed ? 'text-muted-foreground' : 'text-foreground',
                            )}>
                              €{svc.price}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground/70 leading-none">
                              {svc.duration} min
                            </p>
                          </div>
                          {/* Right indicator — checkbox square (not radio circle) */}
                          {committed ? (
                            <motion.span
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400"
                            >
                              <CheckIcon className="h-3 w-3" strokeWidth={3} />
                              Added
                            </motion.span>
                          ) : (
                            <span className={cn(
                              'shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-[4px] border-[1.5px] transition-all',
                              pending
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-muted-foreground/30 bg-transparent group-hover:border-foreground/50',
                            )} aria-hidden>
                              {pending && <CheckIcon className="h-3 w-3" strokeWidth={3} />}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
          {/* Footer breathing room so the last row doesn't kiss the dialog edge */}
          <div className="h-5" />
        </div>

        {/* ── FOOTER ── "Add (N)" confirm + Cancel. The Add button stays disabled
            until at least one new service is staged so operators can't
            accidentally commit nothing. Pending count badge is the visual cue. */}
        <div className="flex items-center gap-3 px-7 py-3.5 border-t border-border bg-card/50">
          {(() => {
            const newlyStaged = [...pendingIds].filter(id => !selectedIds.includes(id));
            const n = newlyStaged.length;
            return (
              <>
                <p className="text-[12px] tabular-nums text-muted-foreground mr-auto">
                  {grouped.length > 0 && (
                    <>
                      <span className="font-bold text-foreground">{totalCount}</span>
                      <span className="mx-1">{totalCount === 1 ? 'service' : 'services'}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="ml-1 font-bold text-foreground">{totalMin}m</span>
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={n === 0}
                  onClick={() => {
                    newlyStaged.forEach(id => onSelect(id));
                    onClose();
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 h-8 text-[13px] font-semibold transition-colors',
                    n > 0
                      ? 'bg-foreground text-background hover:bg-foreground/90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed',
                  )}
                >
                  Add{n > 0 && <span className="inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full bg-background/20 px-1 text-[11px] tabular-nums font-bold">{n}</span>}
                </button>
              </>
            );
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Stepper — minus/value/plus inline control. Used by the recurrence section to
// match the reference design (Image #173-174). Min/max clamps prevent the
// operator from accidentally setting absurd values (e.g. 0 weeks = infinite
// loop in expansion). Tabular-nums on the value cell so the digits don't jitter.
function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  ariaLabel?: string;
}) {
  // Track previous value to compute slide direction (-1 down, +1 up). The
  // motion.span keyed by value triggers a re-mount, springs in from the dir
  // axis. Subtle but adds the "value changed, here's the new one" signal.
  const prevRef = useRef(value);
  const dir = value > prevRef.current ? 1 : value < prevRef.current ? -1 : 0;
  useEffect(() => { prevRef.current = value; }, [value]);

  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div
      className="inline-flex h-12 items-stretch rounded-xl border border-border bg-card overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      role="group"
      aria-label={ariaLabel}
    >
      <motion.button
        type="button"
        onClick={dec}
        disabled={value <= min}
        whileHover={value > min ? { scale: 1.08 } : undefined}
        whileTap={value > min ? { scale: 0.92 } : undefined}
        transition={{ type: 'spring', stiffness: 480, damping: 22 }}
        className="w-11 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:bg-accent/60"
        aria-label="Decrease"
      >
        <MinusIcon className="h-4 w-4" strokeWidth={2.5} />
      </motion.button>
      <span className="relative px-3 inline-flex items-center justify-center min-w-[3.75rem] border-x border-border tabular-nums text-[20px] font-bold text-foreground overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={dir !== 0 ? { y: dir > 0 ? 18 : -18, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: dir > 0 ? -18 : 18, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 28, mass: 0.5 }}
            className="absolute"
          >
            {value}
          </motion.span>
        </AnimatePresence>
        {/* Invisible reservation so the cell width doesn't collapse during the
            absolute-positioned animation */}
        <span aria-hidden className="invisible">{value}</span>
      </span>
      <motion.button
        type="button"
        onClick={inc}
        disabled={value >= max}
        whileHover={value < max ? { scale: 1.08 } : undefined}
        whileTap={value < max ? { scale: 0.92 } : undefined}
        transition={{ type: 'spring', stiffness: 480, damping: 22 }}
        className="w-11 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:bg-accent/60"
        aria-label="Increase"
      >
        <PlusIcon className="h-4 w-4" strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}

// Summary panel skeleton — pulses the hero revenue, the 7-day sparkline shape,
// the stat-pair, and a few staff-roll rows. Layout matches the real panel so
// content slot stays the same width once data arrives (no jump).
function SummarySkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="h-2 w-14 rounded bg-muted/60 animate-pulse" />
        <div className="h-2 w-10 rounded bg-muted/40 animate-pulse" />
      </div>
      <div>
        <div className="h-7 w-28 rounded bg-muted/60 animate-pulse" />
        <div className="mt-2 h-2 w-32 rounded bg-muted/40 animate-pulse" />
      </div>
      <div>
        <div className="h-2 w-16 rounded bg-muted/40 animate-pulse mb-1.5" />
        {/* Faux sparkline — wave-shaped pulse with a dot anchor */}
        <svg viewBox="0 0 200 36" className="w-full h-9" preserveAspectRatio="none" aria-hidden>
          <path d="M0 28 L33 22 L66 25 L100 14 L133 18 L166 10 L200 12" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40 animate-pulse" />
          <circle cx="200" cy="12" r="2.5" fill="currentColor" className="text-muted-foreground/60 animate-pulse" />
        </svg>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border border-y border-border -mx-4">
        <div className="px-4 py-2.5">
          <div className="h-5 w-8 rounded bg-muted/60 animate-pulse" />
          <div className="mt-1.5 h-2 w-12 rounded bg-muted/40 animate-pulse" />
        </div>
        <div className="px-4 py-2.5">
          <div className="h-5 w-8 rounded bg-muted/60 animate-pulse" />
          <div className="mt-1.5 h-2 w-12 rounded bg-muted/40 animate-pulse" />
        </div>
      </div>
      <div>
        <div className="h-2 w-12 rounded bg-muted/40 animate-pulse mb-2" />
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-muted/60 animate-pulse" style={{ animationDelay: `${i * 70}ms` }} />
              <div className="h-2 flex-1 rounded bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 70 + 30}ms` }} />
              <div className="h-2 w-4 rounded bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 70 + 60}ms` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Calendar ──────────────────────────────────────
export function CalendarPage() {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const t = useT();
  const [timeFormat] = useTimeFormat();
  const [breakCutMode] = useBreakCutMode();
  const [gridDensity, setGridDensity] = useCalendarGridDensity();
  const staffColWidth = gridDensity === 'compact' ? STAFF_COL_MIN_W_COMPACT : STAFF_COL_MIN_W_STANDARD;
  // Locale-aware date formatting for the booking modal's date picker
  // trigger. Without this, the trigger renders the month name in English
  // even when the operator runs the UI in Russian or Lithuanian.
  const [language] = useLanguage();
  const dateLocale: DateFnsLocale =
    language === 'ru' ? ruLocale : language === 'lt' ? ltLocale : enLocale;

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
      let switchedFromWeek = false;
      setViewMode(prev => {
        // Week view holds its own ground at any size — except when the
        // viewport drops below 768 where it's mathematically too dense to
        // read. We auto-switch and surface a toast so the operator knows
        // why the layout flipped.
        if (prev === 'week' && e.matches) {
          switchedFromWeek = true;
          return 'day';
        }
        if (prev === 'week') return prev;
        return e.matches ? 'day' : 'grid';
      });
      if (switchedFromWeek) {
        // Defer the toast until after the state update commits so it
        // doesn't fire mid-render. The user sees the layout change first,
        // then reads the explanation.
        queueMicrotask(() => toast.info(t('toast.viewSwitchedDayMobile')));
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [miniOpen, setMiniOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailApt, setDetailApt] = useState<AppointmentWithDetails | null>(null);
  // Rebook mode — when set, the calendar grid acts as a slot picker for
  // moving this appointment. Slot clicks call `update` instead of opening
  // the create modal. Cleared by selecting a slot or clicking Cancel.
  const [rebookingApt, setRebookingApt] = useState<AppointmentWithDetails | null>(null);
  // Hover preview during rebook — as the cursor moves over slots, render a
  // faded ghost of the appointment at the cursor's position so the operator
  // sees exactly where the move will land before they click.
  const [rebookHover, setRebookHover] = useState<{ hour: number; minute: number; staffId: string } | null>(null);
  // Drag-to-reschedule confirm — instead of committing instantly on drop,
  // surface the change ("16:15 → 15:05  ·  Jeiko → Dilan") in a confirm
  // dialog so a fat-finger drop can be undone before it costs the operator.
  const [dragConfirm, setDragConfirm] = useState<{
    aptId: string;
    oldStartTime: string;     // ISO
    newStartTime: string;     // ISO
    newEndTime: string;       // ISO
    oldStaffId: string;
    newStaffId: string;
    oldStaffName: string;
    newStaffName: string;
  } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ hour: number; minute: number; staffId?: string } | null>(null);
  // Editable date + time for the New Appointment modal. Initialized from the
  // clicked slot; the operator overrides via a MiniCalendar Popover (date)
  // and the alarm-clock TimePickerField (time, with spring-pill cells).
  const [createDate, setCreateDate] = useState<string>(''); // yyyy-MM-dd
  const [createTime, setCreateTime] = useState<string>(''); // HH:mm
  const [createDatePickerOpen, setCreateDatePickerOpen] = useState(false);
  const [formData, setFormData] = useState<{ clientId: string; staffId: string; serviceIds: string[]; notes: string }>({ clientId: '', staffId: '', serviceIds: [], notes: '' });
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  // Recurrence — Switch + 2 steppers (every N weeks, ends after M times). Fan
  // out N independent appointments at submit. No series link is stored.
  const [recurrenceEnabled, setRecurrenceEnabled] = useState<boolean>(false);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState<number>(1); // step in weeks
  const [recurrenceCount, setRecurrenceCount] = useState<number>(4); // total occurrences (incl. base)
  // Client autocomplete — type name/phone/email to find an existing record; if
  // nothing matches, switch to the inline "new client" form (name + phone).
  // This is client review item #5: "if I type the phone or email it should
  // check the system to know if the customer information is stored".
  const [clientSearch, setClientSearch] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClient, setNewClient] = useState<NewClientDraft>(EMPTY_NEW_CLIENT_DRAFT);
  // Click on the selected-client tile inside the booking modal opens this
  // profile sheet (contact info, notes, history). Pencil-edit on the sheet
  // sets editClientId, which opens CreateClientModal in edit mode stacked
  // on top — so the sheet stays mounted underneath until the edit closes.
  const [profileSheetClientId, setProfileSheetClientId] = useState<string | null>(null);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [editClientDraft, setEditClientDraft] = useState<NewClientDraft>(EMPTY_NEW_CLIENT_DRAFT);
  const [conflictState, setConflictState] = useState<{
    conflicts: ReturnType<typeof findConflicts>;
    breakConflicts: BreakConflict[];
    pending: Array<Omit<Appointment, 'id' | 'createdAt'>>;
  } | null>(null);
  // Track the dragged appointment so the source tile can ghost (opacity-45)
  // while the user holds it. Cleared on dragend (drop or escape).
  const [draggingAptId, setDraggingAptId] = useState<string | null>(null);
  const [draggingBreakId, setDraggingBreakId] = useState<string | null>(null);
  // When a weekly break is dropped, defer commit to a "Все / Только этот"
  // confirmation modal. one-off breaks commit directly without prompt.
  const [breakDragConfirm, setBreakDragConfirm] = useState<{
    brkId: string;
    newStartTime: string;  // HH:mm
    newEndTime: string;    // HH:mm
    targetDate: string;    // YYYY-MM-DD — drop date for "Only this"
  } | null>(null);
  // ─── New flows: walk-in, block, focus, filter, tile menu ─────
  const [walkInOpen, setWalkInOpen] = useState(false);
  // Carries the typed query from the booking picker through to the
  // walk-in dialog when the operator launches it via the
  // "Save as walk-in (query)" shortcut.
  const [walkInPrefill, setWalkInPrefill] = useState<string | undefined>(undefined);
  const [blockState, setBlockState] = useState<
    | { mode: 'create'; staffId?: string; dayOfWeek?: DayOfWeek }
    | { mode: 'edit-break'; brk: Break }
    | { mode: 'edit-absence'; absence: Absence; staffId: string }
    | null
  >(null);
  // null => "all visible". A non-null Set is the explicit allow-list.
  const [staffFilter, setStaffFilter] = useState<Set<string> | null>(null);
  const [staffFilterOpen, setStaffFilterOpen] = useState(false);
  // Single-staff focus mode — column-header click sets this. Renders one column at full width.
  const [focusedStaffId, setFocusedStaffId] = useState<string | null>(null);
  // Week-view per-staff selection. Persisted across refreshes (Zustand). The
  // useEffect below auto-defaults to alphabetically-first active staff when
  // null or when the selected id has been deactivated.
  const [weekViewStaffId, setWeekViewStaffId] = useWeekViewStaffId();
  // Tile context menu — controlled separately from the deep-edit modal so a quick
  // status change doesn't have to open the heavy dialog.
  const [contextApt, setContextApt] = useState<AppointmentWithDetails | null>(null);
  // Off-shift "edit day" menu — owner/manager click on a gray off-shift band
  // opens this with the staff name, "edit shift hours" + "add/edit day off"
  // shortcuts. Mirrors the competitor's edit-day flow.
  // Single-day shift override editor — owner/manager click on any off-shift
  // band opens this modal. Three modes: Day off, Standard (use weekly default),
  // Custom hours. Save persists a ShiftOverride record (or removes one when
  // reverting to Standard). Renamed from `offShiftMenu` 2026-05-06 when the
  // 4-row context menu was replaced with this focused editor.
  const [editDayModal, setEditDayModal] = useState<{ staffId: string; staffName: string } | null>(null);
  const officeId = useOfficeStore(s => s.currentOfficeId);
  const offices = useOfficeStore(s => s.offices);
  const userRole = useAuthStore(s => s.user?.role);
  const currentUserId = useAuthStore(s => s.user?.id);
  const currentUser = useAuthStore(s => s.user);
  const canOverride = userRole === 'owner' || userRole === 'manager';
  const isOwner = userRole === 'owner';
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  // When set, the next fullUpdateMutation success skips its built-in "updated" toast
  // so the drag-confirm flow can show its own toast with an Undo action instead.
  const suppressNextUpdateToast = useRef(false);

  // ─── Queries ────────────
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({ queryKey: ['appointments', officeId], queryFn: () => appointmentsApi.getAllWithDetails(officeId) });
  const { data: tenant } = useQuery({ queryKey: ['tenant'], queryFn: () => tenantApi.get(), staleTime: 5 * 60_000 });
  const { data: clients = [] } = useQuery({ queryKey: ['clients', officeId], queryFn: () => clientsApi.getAll(officeId) });
  const { data: allStaff = [] } = useQuery({ queryKey: ['staff', officeId], queryFn: () => staffApi.getAll(officeId) });
  // Accounts list is used to resolve `Appointment.createdBy` (Account.id) to a
  // display name for the audit row in the hover-card + detail modal. Tenant-
  // wide so we ship one query for the whole page.
  const { data: allAccounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => accountsApi.getAll() });
  const accountById = useMemo(() => {
    const m = new Map<string, { firstName: string; lastName: string }>();
    for (const a of allAccounts) m.set(a.id, { firstName: a.firstName, lastName: a.lastName });
    return m;
  }, [allAccounts]);
  const formatCreator = (createdBy: string | undefined): string | null => {
    if (!createdBy) return null;
    const a = accountById.get(createdBy);
    if (a) return `${a.firstName} ${a.lastName}`.trim();
    // Fallback: when the stored ID is the current session user (e.g. login
    // fallback path used `user-1` instead of an account ID), pull the name
    // straight from auth-store so the byline still resolves.
    if (currentUser && createdBy === currentUser.id) {
      return `${currentUser.firstName} ${currentUser.lastName}`.trim();
    }
    return null;
  };

  // Click on the creator name in any audit row → open a popover with
  // avatar + role chip + email + phone + "Open full profile" CTA.
  // Pattern: imya = identification, popover = preview, kalachik to /accounts
  // = navigation. Click `<button>` instead of plain `<span>` so the affordance
  // reads as interactive.
  const renderCreatorChip = (createdBy: string | undefined, opts?: { uppercase?: boolean }) => {
    const name = formatCreator(createdBy);
    if (!name || !createdBy) return null;
    const account = accountById.get(createdBy);
    const fullAccount = allAccounts.find(a => a.id === createdBy);
    const role = fullAccount?.role;
    const email = fullAccount?.email;
    const grad = AVATAR_GRADIENTS[hashToIndex(createdBy, AVATAR_GRADIENTS.length)];
    const initials = account
      ? `${account.firstName[0] ?? ''}${account.lastName[0] ?? ''}`.toUpperCase()
      : '';
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(ev) => ev.stopPropagation()}
            className={cn(
              'inline-flex items-center rounded-sm px-0.5 -mx-0.5 transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              'cursor-pointer underline-offset-2 hover:underline',
              opts?.uppercase ? 'font-bold normal-case tracking-normal text-foreground/80' : 'font-semibold text-muted-foreground',
            )}
            aria-label={`${name} — ${t('audit.openProfile')}`}
          >
            {name}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0 overflow-hidden border-border/80 shadow-lg">
          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border">
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[12px] font-bold text-white shadow-sm',
              grad,
            )}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-foreground truncate leading-tight">
                {name}
              </p>
              {role && (
                <span className={cn(
                  'mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
                  ROLE_CHIP[role],
                )}>
                  <span className={cn('h-1 w-1 rounded-full', ROLE_DOT[role])} />
                  {ROLE_LABEL[role]}
                </span>
              )}
            </div>
          </div>
          {email && (
            <div className="px-4 py-2.5 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 mb-0.5">
                Email
              </p>
              <p className="text-[12px] text-foreground/85 truncate tabular-nums">
                {email}
              </p>
            </div>
          )}
          <div className="px-4 py-2.5 flex justify-end">
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                navigate(`/accounts?focus=${createdBy}`);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-foreground bg-foreground text-background px-3 h-8 text-[12px] font-semibold transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {t('audit.openProfile')}
              <ChevronRightIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };
  const { data: services = [] } = useQuery({ queryKey: ['services', officeId], queryFn: () => servicesApi.getAll(officeId) });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.getAll() });
  const { data: allShifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: () => shiftsApi.getAll() });
  const { data: allBreaks = [] } = useQuery({ queryKey: ['breaks'], queryFn: () => breaksApi.getAll() });
  const { data: allAbsences = [] } = useQuery({ queryKey: ['absences'], queryFn: () => absencesApi.getAll() });
  const { data: allOverrides = [] } = useQuery({ queryKey: ['shift-overrides'], queryFn: () => shiftOverridesApi.getAll() });
  const { data: allAppointments = [] } = useQuery({ queryKey: ['appointments', 'all-offices'], queryFn: () => appointmentsApi.getAllAcrossOffices() });

  const activeStaff = useMemo(() => allStaff.filter(s => s.isActive), [allStaff]);

  // Visible staff = active ∩ (filter ?? all). When focusedStaffId is set the
  // single staff overrides everything else — that's the whole point of focus mode.
  const visibleStaff = useMemo(() => {
    if (focusedStaffId) {
      const m = activeStaff.find(s => s.id === focusedStaffId);
      return m ? [m] : activeStaff;
    }
    if (!staffFilter) return activeStaff;
    return activeStaff.filter(s => staffFilter.has(s.id));
  }, [activeStaff, staffFilter, focusedStaffId]);

  // Auto-default the Week-view staff picker. Triggers when visibleStaff loads
  // for the first time (persisted id is null) or when the persisted id refers
  // to a staff who's been deactivated or filtered out. Picks alphabetically-first
  // from visibleStaff so week view stays in sync with the grid's staff filter.
  useEffect(() => {
    if (visibleStaff.length === 0) return;
    if (weekViewStaffId && visibleStaff.some(s => s.id === weekViewStaffId)) return;
    const first = [...visibleStaff].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
    )[0];
    if (first) setWeekViewStaffId(first.id);
  }, [visibleStaff, weekViewStaffId, setWeekViewStaffId]);

  // Per-staff appointment count for the visible week. Powers the muted
  // "{n} this week" suffix in the Week-view staff picker so the operator
  // sees who's busiest at a glance before switching.
  const weekStaffApptCount = useMemo(() => {
    const wkStartsOn: 0 | 1 = language === 'en' ? 0 : 1;
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: wkStartsOn });
    const weekStartMs = weekStart.getTime();
    const weekEndMs = weekStartMs + 7 * 86_400_000;
    const visibleIds = new Set(visibleStaff.map(s => s.id));
    const m = new Map<string, number>();
    for (const a of appointments) {
      if (!visibleIds.has(a.staffId)) continue;
      const t = parseISO(a.startTime).getTime();
      if (t < weekStartMs || t >= weekEndMs) continue;
      m.set(a.staffId, (m.get(a.staffId) ?? 0) + 1);
    }
    return m;
  }, [appointments, selectedDate, language, visibleStaff]);

  // Editorial hero context: the office label + human-relative day
  // ("Today" / "Tomorrow" / "3 days ago") — matches Bookings/Overview.
  const currentOffice = useMemo(() => offices.find(o => o.id === officeId), [offices, officeId]);
  const dayLabel = useMemo(() => {
    const nowStart = startOfDay(new Date());
    const selStart = startOfDay(selectedDate);
    const deltaDays = Math.round((selStart.getTime() - nowStart.getTime()) / 86_400_000);
    if (deltaDays === 0) return t('calendar.dayLabelToday');
    if (deltaDays === 1) return t('calendar.dayLabelTomorrow');
    if (deltaDays === -1) return t('calendar.dayLabelYesterday');
    if (deltaDays > 0) return t('calendar.dayLabelInDays').replace('{n}', String(deltaDays));
    return t('calendar.dayLabelDaysAgo').replace('{n}', String(Math.abs(deltaDays)));
  }, [selectedDate, t]);

  // ─── Status map (translated) ─────
  const statusMap = useMemo(() => ({
    confirmed: { label: t('status.confirmed'), cls: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' },
    scheduled: { label: t('status.scheduled'), cls: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' },
    completed: { label: t('status.completed'), cls: 'bg-muted text-muted-foreground' },
    cancelled: { label: t('status.cancelled'), cls: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' },
  }), [t]);

  // ─── Shifts & breaks for current day ─────
  const currentDow = useMemo(() => getDayOfWeek(selectedDate), [selectedDate]);

  // Shift resolver — date-specific override takes precedence over the
  // weekly recurring Shift. Downstream consumers (isUnavailable, renderOffDuty,
  // slot click) just see Shift|null and don't care which source it came from.
  const shiftsByStaff = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const m = new Map<string, Shift | null>();
    activeStaff.forEach(s => {
      const ov = allOverrides.find(o => o.staffId === s.id && o.date === dateKey);
      if (ov) {
        if (ov.kind === 'day-off') {
          m.set(s.id, null);
          return;
        }
        if (ov.kind === 'custom' && ov.startTime && ov.endTime) {
          m.set(s.id, {
            id: `override-${ov.id}`,
            staffId: s.id,
            dayOfWeek: currentDow,
            startTime: ov.startTime,
            endTime: ov.endTime,
          });
          return;
        }
      }
      const shift = allShifts.find(sh => sh.staffId === s.id && sh.dayOfWeek === currentDow) || null;
      m.set(s.id, shift);
    });
    return m;
  }, [allShifts, allOverrides, activeStaff, currentDow, selectedDate]);

  // Quick lookup of the override for the currently selected date — used by
  // EditDayShiftModal to pre-select the right radio mode and time pickers.
  const overrideByStaff = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const m = new Map<string, ShiftOverride | null>();
    activeStaff.forEach(s => {
      m.set(s.id, allOverrides.find(o => o.staffId === s.id && o.date === dateKey) ?? null);
    });
    return m;
  }, [allOverrides, activeStaff, selectedDate]);

  const breaksByStaff = useMemo(() => {
    const m = new Map<string, Break[]>();
    const todayYMD = format(selectedDate, 'yyyy-MM-dd');
    activeStaff.forEach(s => {
      const staffBreaks = allBreaks.filter(b => {
        if (b.staffId !== s.id) return false;
        // Honor full recurrence semantics — same logic as findBreakConflicts.
        if (b.recurrence === 'one-off') return b.startDate === todayYMD;
        if (b.startDate && todayYMD < b.startDate) return false;
        if (b.endDate && todayYMD > b.endDate) return false;
        if (b.exceptionDates?.includes(todayYMD)) return false;
        return b.dayOfWeek === currentDow;
      });
      m.set(s.id, staffBreaks);
    });
    return m;
  }, [allBreaks, activeStaff, currentDow, selectedDate]);

  const absenceByStaff = useMemo(() => {
    const m = new Map<string, Absence | null>();
    activeStaff.forEach(s => {
      m.set(s.id, allAbsences.find(a => a.staffId === s.id && a.dayOfWeek === currentDow) ?? null);
    });
    return m;
  }, [allAbsences, activeStaff, currentDow]);

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

  // Multi-service bookings fan out into N sibling appointments sharing a groupId.
  // Sequential awaits keep error handling clean — first failure stops the chain.
  const createMutation = useMutation({
    mutationFn: async (data: Array<Omit<Appointment, 'id' | 'createdAt'> & { override?: boolean }>) => {
      for (const p of data) await appointmentsApi.create(p);
    },
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
      setNewClient(EMPTY_NEW_CLIENT_DRAFT);
      setIsCreatingClient(false);
      setClientSearch('');
      toast.success(t('toast.clientCreated'));
    },
    onError: () => toast.error(t('toast.clientCreateError')),
  });

  // Edit an existing client from the profile sheet's pencil-icon flow.
  // Reuses CreateClientModal's UI in edit mode; on success the profile
  // sheet (still mounted underneath) re-renders with fresh data.
  const editClientMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
      clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setEditClientId(null);
      setEditClientDraft(EMPTY_NEW_CLIENT_DRAFT);
      toast.success(t('toast.clientUpdated'));
    },
    onError: () => toast.error(t('toast.clientUpdateError')),
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
  // Drag-to-reschedule for break tiles — the mutation below covers both
  // confirm-modal branches: "Все" (update existing weekly's startTime/endTime)
  // and "Только этот" (add date to exceptionDates + create one-off override).
  // Also called directly for one-off breaks where no modal is needed.
  const breakUpsertMut = useMutation({
    mutationFn: async (next: Break) => breaksApi.upsert(next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breaks'] });
      toast.success(t('toast.scheduleUpdated'));
    },
    onError: () => toast.error(t('toast.appointmentError')),
  });
  const breakSplitMut = useMutation({
    mutationFn: async (args: { brk: Break; targetDate: string; newStart: string; newEnd: string }) => {
      const { brk, targetDate, newStart, newEnd } = args;
      // 1. Mark target date as exception on the weekly original.
      const exceptionDates = Array.from(new Set([...(brk.exceptionDates ?? []), targetDate]));
      await breaksApi.upsert({ ...brk, exceptionDates });
      // 2. Create a one-off Break for this date with the new time range.
      await breaksApi.upsert({
        staffId: brk.staffId,
        dayOfWeek: brk.dayOfWeek,
        startTime: newStart,
        endTime: newEnd,
        type: brk.type,
        customLabel: brk.customLabel,
        recurrence: 'one-off',
        startDate: targetDate,
        createdBy: currentUserId,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breaks'] });
      toast.success(t('toast.scheduleUpdated'));
    },
    onError: () => toast.error(t('toast.appointmentError')),
  });

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
      // Drag-confirm Save handles its own toast (with Undo action). Skip ours so
      // the user doesn't see two stacked notifications.
      if (suppressNextUpdateToast.current) {
        suppressNextUpdateToast.current = false;
      } else {
        toast.success(t('toast.appointmentUpdated'));
      }
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
    setFormData({ clientId: '', staffId: '', serviceIds: [], notes: '' });
    setSelectedSlot(null);
    setClientSearch('');
    setIsCreatingClient(false);
    setNewClient(EMPTY_NEW_CLIENT_DRAFT);
    setRecurrenceEnabled(false);
    setRecurrenceWeeks(1);
    setRecurrenceCount(4);
  }, []);

  // Opens the New Appointment modal from the header/FAB (no slot context).
  // Seeds date = today, time = next granularity-aligned slot from now so
  // the operator never sees 12:00 AM as the default.
  const openCreateFromHeader = useCallback(() => {
    closeCreate();
    const now = new Date();
    const step = 15;
    const mm = Math.ceil(now.getMinutes() / step) * step;
    const carryHr = mm >= 60 ? (now.getHours() + 1) % 24 : now.getHours();
    const adjMm = mm >= 60 ? 0 : mm;
    setCreateDate(format(now, 'yyyy-MM-dd'));
    setCreateTime(`${String(carryHr).padStart(2, '0')}:${String(adjMm).padStart(2, '0')}`);
    setIsCreateOpen(true);
  }, [closeCreate]);

  const openSlot = (hour: number, minute: number, staffId: string) => {
    // Rebook intercept — if the user previously hit "Rebook" on an existing
    // appointment, the calendar grid is now a slot picker. Clicking creates
    // a CLONE of the original at the new slot (same client, same service,
    // possibly different staff/time) instead of moving the original. The
    // original stays intact — that's the correct semantic for "repeat
    // booking" (e.g. "schedule the same haircut for next week").
    if (rebookingApt) {
      const dur = differenceInMinutes(
        parseISO(rebookingApt.endTime),
        parseISO(rebookingApt.startTime),
      );
      const start = setMinutes(setHours(startOfDay(selectedDate), hour), minute);
      const end = new Date(start.getTime() + dur * 60_000);
      const aptToClone = rebookingApt; // capture before clearing state
      // Clear UI state immediately so the ghost/banner disappear during the
      // async create. Toast resolves on success/failure.
      setRebookingApt(null);
      setRebookHover(null);
      appointmentsApi
        .create({
          clientId: aptToClone.clientId,
          staffId,
          serviceId: aptToClone.serviceId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          status: 'scheduled',
          notes: aptToClone.notes ?? '',
          locationId: officeId,
          override: canOverride,
        })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['appointments', officeId] });
          queryClient.invalidateQueries({ queryKey: ['appointments', 'all-offices'] });
          toast.success(t('calendar.rebookSuccess'));
        })
        .catch((err) => {
          toast.error((err as Error).message ?? 'Rebook failed');
        });
      return;
    }
    setSelectedSlot({ hour, minute, staffId });
    setFormData(f => ({ ...f, staffId }));
    // Seed the editable date + time from the clicked slot.
    setCreateDate(format(selectedDate, 'yyyy-MM-dd'));
    setCreateTime(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    setIsCreateOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.clientId || !formData.staffId || formData.serviceIds.length === 0) {
      toast.error(t('toast.fillRequired'));
      return;
    }
    const picked = formData.serviceIds
      .map(id => services.find(s => s.id === id))
      .filter((s): s is Service => !!s);
    if (picked.length === 0) return;
    // Parse the editable date + time inputs (YYYY-MM-DD and HH:mm).
    const dateParts = createDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeParts = createTime.match(/^(\d{2}):(\d{2})$/);
    if (!dateParts || !timeParts) {
      toast.error(t('toast.fillRequired'));
      return;
    }
    const baseStart = new Date(
      Number(dateParts[1]),
      Number(dateParts[2]) - 1,
      Number(dateParts[3]),
      Number(timeParts[1]),
      Number(timeParts[2]),
      0, 0,
    );
    // Recurrence expansion — fan out occurrences spaced `recurrenceWeeks` weeks
    // apart, total `recurrenceCount` (including the base). Each occurrence is an
    // independent Appointment row (no series link).
    const expandOccurrences = (): Date[] => {
      if (!recurrenceEnabled) return [baseStart];
      const n = Math.max(1, Math.min(52, recurrenceCount));
      const stepWeeks = Math.max(1, Math.min(12, recurrenceWeeks));
      return Array.from({ length: n }, (_, i) => addWeeks(baseStart, i * stepWeeks));
    };
    const occurrences = expandOccurrences();
    // For each occurrence, fan out the multi-service array. Each occurrence gets its
    // own groupId (siblings within an occurrence share it; cross-occurrence siblings
    // do NOT — that's the "no series link" semantic).
    const payloads: Array<Omit<Appointment, 'id' | 'createdAt'>> = [];
    for (const occStart of occurrences) {
      const occGroupId = picked.length > 1 ? crypto.randomUUID() : undefined;
      let cursorMs = occStart.getTime();
      for (const svc of picked) {
        const start = new Date(cursorMs);
        const end = new Date(cursorMs + svc.duration * 60000);
        payloads.push({
          clientId: formData.clientId,
          staffId: formData.staffId,
          serviceId: svc.id,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          status: 'scheduled',
          notes: formData.notes,
          locationId: officeId,
          groupId: occGroupId,
          createdBy: currentUserId,
        });
        cursorMs = end.getTime();
      }
    }
    // Aggregate conflicts across every payload — block on any.
    const allConflicts: ReturnType<typeof findConflicts> = [];
    const allBreakConflicts: BreakConflict[] = [];
    for (const p of payloads) {
      const pStart = new Date(p.startTime);
      const pEnd = new Date(p.endTime);
      allConflicts.push(...findConflicts({ staffId: p.staffId, start: pStart, end: pEnd }, allAppointments, offices));
      allBreakConflicts.push(...findBreakConflicts({ staffId: p.staffId, start: pStart, end: pEnd }, allBreaks));
    }
    if (allConflicts.length > 0 || allBreakConflicts.length > 0) {
      setConflictState({ conflicts: allConflicts, breakConflicts: allBreakConflicts, pending: payloads });
      return;
    }
    createMutation.mutate(payloads);
  };

  const confirmOverride = () => {
    if (!conflictState) return;
    createMutation.mutate(conflictState.pending.map(p => ({ ...p, override: true })));
  };

  // ─── Derived ────────────
  const dayApts = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    return appointments.filter(a => format(parseISO(a.startTime), 'yyyy-MM-dd') === key);
  }, [appointments, selectedDate]);

  // Multi-service bookings share a `groupId`. The grid renders one stacked tile per
  // group anchored at the earliest sibling, height extended to the latest sibling's
  // end. Standalone (no groupId) appointments pass through unchanged.
  const { groupedDayApts, groupMetaById } = useMemo(() => {
    const byGroup = new Map<string, AppointmentWithDetails[]>();
    const standalones: AppointmentWithDetails[] = [];
    for (const a of dayApts) {
      if (!a.groupId) { standalones.push(a); continue; }
      const arr = byGroup.get(a.groupId) ?? [];
      arr.push(a);
      byGroup.set(a.groupId, arr);
    }
    const meta = new Map<string, { siblings: AppointmentWithDetails[]; totalPrice: number; totalDuration: number }>();
    const groupPrimaries: AppointmentWithDetails[] = [];
    byGroup.forEach((siblings) => {
      const sorted = [...siblings].sort((a, b) => a.startTime.localeCompare(b.startTime));
      const primary = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalPrice = sorted.reduce((sum, s) => sum + (s.service?.price ?? 0), 0);
      const totalDuration = sorted.reduce((sum, s) => {
        const d = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000;
        return sum + d;
      }, 0);
      // Synthesize a primary with extended endTime so lane assignment treats the
      // group as one tile.
      groupPrimaries.push({ ...primary, endTime: last.endTime });
      meta.set(primary.id, { siblings: sorted, totalPrice, totalDuration });
    });
    return { groupedDayApts: [...standalones, ...groupPrimaries], groupMetaById: meta };
  }, [dayApts]);

  const aptsByStaff = useMemo(() => {
    const m = new Map<string, AppointmentWithDetails[]>();
    activeStaff.forEach(s => m.set(s.id, []));
    groupedDayApts.forEach(a => { const l = m.get(a.staffId) || []; l.push(a); m.set(a.staffId, l); });
    return m;
  }, [groupedDayApts, activeStaff]);

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
  const nowMin = (getHoursInTz(now) - DAY_START_HOUR) * 60 + getMinutesInTz(now);
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
  // Off-shift overlays are now interactive for owner/manager. Each gray band
  // (pre-shift, post-shift, or full-day) is a button that opens an "Edit day"
  // menu pre-targeted at this staff member — matches the competitor's flow
  // where clicking outside-shift hours surfaces a per-day shortcut sheet.
  // Receptionists keep static, non-interactive overlays.
  const renderOffDuty = (staffId: string) => {
    const shift = shiftsByStaff.get(staffId);
    const totalMinutes = totalSlots * 60;
    const member = activeStaff.find(s => s.id === staffId);
    if (!member) return null;

    // Solid muted bg + diagonal hatch overlay (added inline below per band)
    // — flagged "this column is closed" in one glance instead of reading a
    // single centered line of grey text. Same hatch grammar as break tiles.
    const baseClass = 'absolute left-0 right-0 z-[10] flex items-center justify-center bg-muted dark:bg-muted/95';
    const interactiveClass = 'transition-colors hover:bg-muted/85 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60';
    const hatchStyle: React.CSSProperties = {
      backgroundImage: 'repeating-linear-gradient(45deg, rgba(102,112,133,0.07) 0 8px, transparent 8px 16px)',
    };

    const openMenu = () => setEditDayModal({
      staffId,
      staffName: `${member.firstName} ${member.lastName}`,
    });

    const renderBand = (key: string, style: React.CSSProperties, content?: React.ReactNode, withHatch = false) => {
      const mergedStyle = withHatch ? { ...style, ...hatchStyle } : style;
      return canOverride ? (
        <button
          key={key}
          type="button"
          onClick={openMenu}
          className={cn(baseClass, interactiveClass)}
          style={mergedStyle}
          title={`Edit ${member.firstName}'s day`}
        >
          {content}
        </button>
      ) : (
        <div key={key} className={cn(baseClass, 'pointer-events-none')} style={mergedStyle}>
          {content}
        </div>
      );
    };

    if (!shift) {
      // Full-day off — diagonal-hatched column with a centered editorial
      // label. Hatch makes "this column is closed" readable at a glance even
      // when the operator is scanning a 7-staff row.
      const absence = absenceByStaff.get(staffId) ?? null;
      const reasonKey = absence ? (`break.${absence.reason}` as TranslationKey) : 'calendar.dayOff';
      const label = (
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          {t(reasonKey)}
        </span>
      );
      return renderBand('full', { top: 0, bottom: 0 }, label, /* withHatch */ true);
    }

    const shiftStartMin = parseTimeToMinutes(shift.startTime) - DAY_START_HOUR * 60;
    const shiftEndMin = parseTimeToMinutes(shift.endTime) - DAY_START_HOUR * 60;
    const overlays: React.ReactNode[] = [];

    if (shiftStartMin > 0) {
      const h = (shiftStartMin / 60) * SLOT_HEIGHT;
      overlays.push(renderBand('pre', { top: 0, height: `${h}px` }));
    }
    if (shiftEndMin < totalMinutes) {
      const top = (shiftEndMin / 60) * SLOT_HEIGHT;
      const h = ((totalMinutes - shiftEndMin) / 60) * SLOT_HEIGHT;
      overlays.push(renderBand('post', { top: `${top}px`, height: `${h}px` }));
    }
    return <>{overlays}</>;
  };

  const renderBreaks = (staffId: string) => {
    const breaks = breaksByStaff.get(staffId) || [];
    const colApts = aptsByStaff.get(staffId) || [];
    const staff = allStaff.find(s => s.id === staffId);

    // Per-break-type semantic palette — literal classes so the JIT picks
    // them up. Stripe = saturated bar on the left edge ("identity spine"),
    // chip = soft-tint pill carrying the icon + label, ring = subtle outline
    // around the avatar to echo the type color without screaming.
    //
    // `bgTint` + `borderL` + `hatchRgb` carry the *tile-surface* identity
    // for the day-grid break overlay. All four channels (bg + stripe rail +
    // diagonal hatch + label color) reinforce the type so the eye reads
    // "this is dinner" before reading the text.
    const BREAK_HOVER_PALETTE: Record<Break['type'], {
      stripe: string;       // hover-card left-rail (saturated)
      chip: string;         // hover-card chip
      iconText: string;     // tile + hover icon color
      ring: string;         // hover-card avatar ring
      bgTint: string;       // tile soft-tint bg utility
      borderL: string;      // tile 5px left rail
      hatchRgb: string;     // raw rgb triplet for the diagonal hatch
    }> = {
      // Dark-mode tints dropped from /10 to /[0.06] — at /10 the hatch overlay
      // pushed effective alpha to ~0.22 and the lunch tile shouted louder
      // than the actual booking. /[0.06] keeps the type identity readable
      // without competing with the booking tiles for visual weight.
      lunch:  { stripe: 'bg-amber-500',   chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',     iconText: 'text-amber-700 dark:text-amber-300/80',   ring: 'ring-amber-500/30',  bgTint: 'bg-amber-50 dark:bg-amber-500/[0.06]',     borderL: 'border-l-amber-600 dark:border-l-amber-500',     hatchRgb: '217, 119, 6'  },
      dinner: { stripe: 'bg-indigo-500',  chip: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',  iconText: 'text-indigo-700 dark:text-indigo-300/80', ring: 'ring-indigo-500/30', bgTint: 'bg-indigo-50 dark:bg-indigo-500/[0.06]',   borderL: 'border-l-indigo-600 dark:border-l-indigo-500',   hatchRgb: '79, 70, 229'  },
      rest:   { stripe: 'bg-emerald-500', chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', iconText: 'text-emerald-700 dark:text-emerald-300/80', ring: 'ring-emerald-500/30', bgTint: 'bg-emerald-50 dark:bg-emerald-500/[0.06]', borderL: 'border-l-emerald-600 dark:border-l-emerald-500', hatchRgb: '5, 150, 105'  },
      custom: { stripe: 'bg-fuchsia-500', chip: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300', iconText: 'text-fuchsia-700 dark:text-fuchsia-300/80', ring: 'ring-fuchsia-500/30', bgTint: 'bg-fuchsia-50 dark:bg-fuchsia-500/[0.06]', borderL: 'border-l-fuchsia-600 dark:border-l-fuchsia-500', hatchRgb: '192, 38, 211' },
    };

    // Hover-card content for a break tile — Editorial Studio Ledger.
    // Mirrors the appointment HoverCard at ~4689 (left accent stripe, hero
    // time block, ledger meta rows) but with break-specific signals: type
    // pill semantic-colored, avatar gradient ring matching the stripe, no
    // status pill (a break has no "scheduled/confirmed" — it just IS).
    // Motion: subtle stagger so the eye lands on the time hero last.
    const breakInfoCard = (brk: Break) => {
      const Icon = BLOCK_ICON[brk.type];
      const labelKey = `break.${brk.type}` as TranslationKey;
      const typeLabel = brk.type === 'custom' && brk.customLabel
        ? brk.customLabel
        : t(labelKey);
      const dayLabel = t(`days.${brk.dayOfWeek}` as TranslationKey);
      const recurrenceText = brk.recurrence === 'one-off'
        ? t('break.metaRecurrenceOnce')
        : (brk.startDate && brk.endDate
            ? t('break.metaRecurrenceRanged').replace('{day}', dayLabel)
            : t('break.metaRecurrenceWeekly').replace('{day}', dayLabel));
      const fmtDate = (s: string | undefined) =>
        s ? format(parseISO(s), 'd MMM yyyy', { locale: dateLocale }) : null;
      const startDate = fmtDate(brk.startDate);
      const endDate = fmtDate(brk.endDate);
      const timeRange = `${brk.startTime} – ${brk.endTime}`;
      // Duration in minutes for the right-aligned chip in the time hero.
      const durMin = parseTimeToMinutes(brk.endTime) - parseTimeToMinutes(brk.startTime);
      const durLabel = durMin >= 60
        ? (durMin % 60 === 0 ? `${durMin / 60}h` : `${Math.floor(durMin / 60)}h ${durMin % 60}m`)
        : `${durMin} min`;
      const staffName = staff ? `${staff.firstName} ${staff.lastName}`.trim() : '';
      const staffInitials = staff
        ? `${staff.firstName[0] ?? ''}${staff.lastName[0] ?? ''}`.toUpperCase()
        : '';
      const staffGrad = staff
        ? AVATAR_GRADIENTS[hashToIndex(staff.id, AVATAR_GRADIENTS.length)]
        : 'from-muted to-muted';
      const palette = BREAK_HOVER_PALETTE[brk.type];

      // Stagger timeline — 4 chunks land in 200ms so the eye flows
      // header → identity → time hero → meta. Reduced-motion collapses
      // everything to a single 0ms fade.
      const stagger = (i: number) => reduceMotion
        ? { duration: 0 }
        : { duration: 0.22, ease: MOTION_EASE, delay: 0.04 * i };
      const fade = reduceMotion ? false : { opacity: 0, y: 4 };

      return (
        <motion.div
          initial={fade}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: MOTION_EASE }}
          className="relative w-80 p-0 overflow-hidden rounded-lg"
        >
          {/* Left accent stripe — semantic-colored "spine" */}
          <div className={cn('absolute left-0 top-0 bottom-0 w-1', palette.stripe)} aria-hidden />

          {/* Editorial eyebrow header — typographic, not a boxy strip */}
          <motion.div
            initial={fade}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(0)}
            className="pl-5 pr-4 pt-3 pb-2.5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
              {t('break.hoverTitle')}
            </p>
          </motion.div>

          <div className="border-t border-border" />

          {/* Identity — gradient avatar + name + semantic-tint type chip */}
          <motion.div
            initial={fade}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(1)}
            className="pl-5 pr-4 py-3.5 flex items-center gap-3"
          >
            <div className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white shadow-sm ring-2',
              staffGrad,
              palette.ring,
            )}>
              {staffInitials}
            </div>
            <div className="min-w-0 flex-1">
              {staffName && (
                <p className="text-[15px] font-bold text-foreground truncate leading-tight tracking-tight">
                  {staffName}
                </p>
              )}
              <span className={cn(
                'mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
                palette.chip,
              )}>
                <Icon className="h-3 w-3" />
                {typeLabel}
              </span>
            </div>
          </motion.div>

          {/* TIME HERO — display-size range + duration chip on the right */}
          <motion.div
            initial={fade}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(2)}
            className="border-t border-border pl-5 pr-4 py-3 flex items-baseline justify-between gap-3"
          >
            <p className="text-[20px] font-bold tabular-nums tracking-tight leading-none text-foreground">
              {timeRange}
            </p>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground tabular-nums shrink-0">
              {durLabel}
            </span>
          </motion.div>

          {/* Ledger meta rows — bold uppercase eyebrow label + value */}
          <motion.div
            initial={fade}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(3)}
            className="border-t border-border pl-5 pr-4 py-3 text-[12px] space-y-2"
          >
            <div className="flex items-baseline gap-3">
              <span className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {t('break.metaRepeats')}
              </span>
              <span className="text-foreground font-medium">{recurrenceText}</span>
            </div>
            {startDate && endDate && startDate !== endDate && (
              <div className="flex items-baseline gap-3">
                <span className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {t('break.metaStartDate')}
                </span>
                <span className="tabular-nums text-foreground font-medium">{startDate} → {endDate}</span>
              </div>
            )}
            {startDate && (!endDate || startDate === endDate) && (
              <div className="flex items-baseline gap-3">
                <span className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {t('break.metaStartDate')}
                </span>
                <span className="tabular-nums text-foreground font-medium">{startDate}</span>
              </div>
            )}
          </motion.div>

          {/* AUDIT — muted strip with creator + creation timestamp. Mirrors
              the appointment hover-card's audit row so the operator's eye
              learns one signal across both surfaces. */}
          {(() => {
            const creatorName = formatCreator(brk.createdBy);
            const creatorChip = renderCreatorChip(brk.createdBy);
            const stampedAt = brk.createdAt
              ? format(parseISO(brk.createdAt), 'MMM d · HH:mm')
              : null;
            if (!creatorName && !stampedAt) return null;
            return (
              <motion.div
                initial={fade}
                animate={{ opacity: 1, y: 0 }}
                transition={stagger(4)}
                className="border-t border-border bg-muted/25 pl-5 pr-4 py-2 flex items-baseline justify-between gap-3"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/65 shrink-0">
                  {t('calendar.created')}
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground/85 truncate text-right">
                  {creatorChip ?? (creatorName && <span className="font-semibold text-muted-foreground">{creatorName}</span>)}
                  {creatorName && stampedAt && <span className="mx-1.5 text-muted-foreground/40">·</span>}
                  {stampedAt}
                </span>
              </motion.div>
            );
          })()}
        </motion.div>
      );
    };

    return breaks.flatMap(brk => {
      const breakStartMin = parseTimeToMinutes(brk.startTime) - DAY_START_HOUR * 60;
      const breakEndMin = parseTimeToMinutes(brk.endTime) - DAY_START_HOUR * 60;
      const labelKey = `break.${brk.type}` as TranslationKey;
      const Icon = BLOCK_ICON[brk.type];
      const displayLabel = brk.type === 'custom' && brk.customLabel
        ? brk.customLabel
        : t(labelKey);

      // Booking-card-style inner content. Density ladder mirrors the
      // appointment tile (renderBlock): staff name is the prominent "who",
      // type label + icon below as the "what", time range pinned to the
      // bottom on tall tiles. Semantic left accent stripe carries the type
      // identity (lunch=amber / dinner=indigo / rest=emerald / custom=fuchsia)
      // so an operator scans break TYPES at a glance, not just "is there a
      // break here".
      const palette = BREAK_HOVER_PALETTE[brk.type];
      const staffFirstName = staff?.firstName ?? '';
      const timeStr = `${brk.startTime}–${brk.endTime}`;
      // Duration label for the chip in the time row — formats minutes as
      // "30m" / "1h" / "1h 30m" so the operator sees the block's *cost* in
      // shift hours at a glance, not just its endpoints.
      const durMin = parseTimeToMinutes(brk.endTime) - parseTimeToMinutes(brk.startTime);
      const durLabel = durMin >= 60
        ? (durMin % 60 === 0 ? `${durMin / 60}h` : `${Math.floor(durMin / 60)}h ${durMin % 60}m`)
        : `${durMin}m`;
      const buildInner = (segH: number) => {
        const tinyB = segH < 28;
        const compactB = !tinyB && segH < 48;
        const showTimeRow = segH >= 64;
        const showDurChip = segH >= 80;
        return (
          <>
            {/* Left semantic stripe — same hue as the hover-card */}
            <span
              aria-hidden
              className={cn('pointer-events-none absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md', palette.stripe)}
            />
            {tinyB ? (
              <div className="flex h-full items-center justify-center w-full pl-2 pr-1.5">
                <Icon className={cn('h-3 w-3 shrink-0', palette.iconText)} />
              </div>
            ) : compactB ? (
              // Italic on the staff name at compact density doubles as the
              // "I'm a block, not a booking" signal — booking tiles never
              // italicize the client name. Combined with the dashed border +
              // semantic stripe, the operator can't confuse the two even at
              // narrow heights. (Audit P1 #5.)
              <div className="flex h-full w-full items-center gap-1.5 pl-2.5 pr-1.5">
                <Icon className={cn('h-3 w-3 shrink-0', palette.iconText)} />
                <span className="text-[11px] font-bold italic text-foreground truncate">
                  {staffFirstName}
                </span>
                <span className={cn('ml-auto text-[10px] font-semibold uppercase tracking-[0.14em] truncate', palette.iconText)}>
                  {displayLabel}
                </span>
              </div>
            ) : (
              // Full variant — vertically-centered identity + time pair so
              // the content reads as a balanced editorial card on tall tiles
              // (no more huge gap between identity and bottom-pinned time).
              // Identity row mirrors the booking-card grammar: icon + bold
              // italic name (left) + uppercase type tag (right). Time row
              // sits directly below with a duration chip on the right edge,
              // giving operators "block cost in shift hours" at a glance.
              <div className="flex h-full w-full flex-col justify-center gap-1 px-2.5 py-1.5 overflow-hidden">
                {/* Identity row */}
                <div className="flex items-center gap-1.5 min-w-0 w-full">
                  <Icon className={cn('h-3.5 w-3.5 shrink-0', palette.iconText)} />
                  <span className="text-[12px] font-bold italic text-foreground truncate min-w-0">
                    {staffFirstName}
                  </span>
                  <span className={cn(
                    'ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em]',
                    palette.iconText,
                  )}>
                    {displayLabel}
                  </span>
                </div>

                {/* Time + duration row — only renders on tall tiles. Time
                    bold-left, duration chip far-right; matches the identity
                    row's left/right symmetry above so the two read as a pair. */}
                {showTimeRow && (
                  <div className="flex items-center gap-2 min-w-0 w-full">
                    <span className="text-[11px] font-semibold tabular-nums text-foreground/80 truncate">
                      {timeStr}
                    </span>
                    {showDurChip && (
                      <span className={cn(
                        'ml-auto shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums tracking-[0.08em]',
                        palette.chip,
                      )}>
                        {durLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        );
      };

      // Horizontal mode (settings preference): render the break as a single
      // continuous overlay; the appointment z-indexes above it. No segmentation.
      // Operator sees the break "framing" the appointment.
      if (breakCutMode === 'horizontal') {
        const top = (breakStartMin / 60) * SLOT_HEIGHT;
        const h = ((breakEndMin - breakStartMin) / 60) * SLOT_HEIGHT;
        const inner = buildInner(h);
        // Per-type tile chrome — soft-tint bg + 5px stripe + diagonal hatch
        // in the same hue. The hatch is inline (Tailwind JIT can't ingest
        // the comma-rich repeating-linear-gradient cleanly).
        const tileClass = cn(
          'absolute left-1 right-1 z-[5] overflow-hidden rounded-md border-l-[5px]',
          palette.bgTint,
          palette.borderL,
          'transition-all duration-150',
        );
        const tileStyle = {
          top: `${top}px`,
          height: `${h}px`,
          backgroundImage: `repeating-linear-gradient(45deg, rgba(${palette.hatchRgb}, var(--break-hatch-alpha, 0.12)) 0 8px, transparent 8px 16px)`,
        };
        return [(
          <HoverCard key={brk.id} openDelay={320} closeDelay={120}>
            <HoverCardTrigger asChild>
              {canOverride ? (
                <button
                  type="button"
                  draggable
                  onDragStart={(ev) => {
                    ev.stopPropagation();
                    ev.dataTransfer.setData('text/plain', `brk:${brk.id}`);
                    ev.dataTransfer.effectAllowed = 'move';
                    setDraggingBreakId(brk.id);
                  }}
                  onDragEnd={() => setDraggingBreakId(null)}
                  onClick={(ev) => { ev.stopPropagation(); setBlockState({ mode: 'edit-break', brk }); }}
                  className={cn(
                    tileClass,
                    'hover:brightness-95 cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                    draggingBreakId === brk.id && 'opacity-45 scale-[0.985]',
                  )}
                  style={tileStyle}
                  aria-label={t('tile.editBlockAria').replace('{kind}', t(labelKey)).replace('{staff}', staffFirstName)}
                >
                  {inner}
                </button>
              ) : (
                <div
                  className={tileClass}
                  style={tileStyle}
                >
                  {inner}
                </div>
              )}
            </HoverCardTrigger>
            <HoverCardContent align="start" side="right" sideOffset={8} className="w-auto p-0 overflow-hidden border-border/80 shadow-lg">
              {breakInfoCard(brk)}
            </HoverCardContent>
          </HoverCard>
        )];
      }

      // ── Vertical (default): cut break around overlapping appointments ──
      // When an appointment lands inside a break, the operator should see TWO
      // independent shapes — the appointment as a real card, the break as
      // remaining dead-time chunks above/below. Without this cut, the break
      // overlay extends around the appointment as a "frame", making it look
      // like the appointment lives INSIDE the break.
      const apptRanges = colApts
        .map(apt => {
          const s = parseISO(apt.startTime);
          const e = parseISO(apt.endTime);
          return {
            aStart: (getHoursInTz(s) - DAY_START_HOUR) * 60 + getMinutesInTz(s),
            aEnd:   (getHoursInTz(e) - DAY_START_HOUR) * 60 + getMinutesInTz(e),
          };
        })
        .filter(({ aStart, aEnd }) => aStart < breakEndMin && breakStartMin < aEnd)
        .sort((a, b) => a.aStart - b.aStart);

      const segments: { start: number; end: number }[] = [];
      let cursor = breakStartMin;
      for (const { aStart, aEnd } of apptRanges) {
        if (cursor < aStart && aStart < breakEndMin) {
          segments.push({ start: cursor, end: Math.min(aStart, breakEndMin) });
        }
        cursor = Math.max(cursor, aEnd);
      }
      if (cursor < breakEndMin) {
        segments.push({ start: cursor, end: breakEndMin });
      }

      // Drop slivers (< 5 min) — they render as visual noise, not signal.
      const visible = segments.filter(s => s.end - s.start >= 5);
      if (visible.length === 0) return [];

      // Label rides on the largest segment so we don't duplicate the icon
      // across two stripes wrapping an appointment.
      const largestIdx = visible.reduce(
        (maxIdx, s, i, arr) => (s.end - s.start) > (arr[maxIdx].end - arr[maxIdx].start) ? i : maxIdx,
        0,
      );

      return visible.map((seg, i) => {
        const top = (seg.start / 60) * SLOT_HEIGHT;
        const h = ((seg.end - seg.start) / 60) * SLOT_HEIGHT;
        // Only render the booking-style content on the largest segment AND
        // only when its height fits at least the tiny row (≥ 22px). Other
        // segments (the slivers above/below an appointment) render as plain
        // dashed bars with just the semantic stripe — the dashed outline +
        // accent color still telegraph "there's a break here" without
        // duplicating the staff name across two stripes.
        const isLabelSeg = i === largestIdx && h >= 22;
        const inner = isLabelSeg ? buildInner(h) : (
          <span
            aria-hidden
            className={cn('pointer-events-none absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md', palette.stripe)}
          />
        );

        const segClass = cn(
          'absolute left-1 right-1 z-[5] overflow-hidden rounded-md border-l-[5px]',
          palette.bgTint,
          palette.borderL,
          'transition-all duration-150',
        );
        const segStyle = {
          top: `${top}px`,
          height: `${h}px`,
          backgroundImage: `repeating-linear-gradient(45deg, rgba(${palette.hatchRgb}, var(--break-hatch-alpha, 0.12)) 0 8px, transparent 8px 16px)`,
        };
        return (
          <HoverCard key={`${brk.id}-seg-${i}`} openDelay={320} closeDelay={120}>
            <HoverCardTrigger asChild>
              {canOverride ? (
                <button
                  type="button"
                  draggable
                  onDragStart={(ev) => {
                    ev.stopPropagation();
                    ev.dataTransfer.setData('text/plain', `brk:${brk.id}`);
                    ev.dataTransfer.effectAllowed = 'move';
                    setDraggingBreakId(brk.id);
                  }}
                  onDragEnd={() => setDraggingBreakId(null)}
                  onClick={(ev) => { ev.stopPropagation(); setBlockState({ mode: 'edit-break', brk }); }}
                  className={cn(
                    segClass,
                    'hover:brightness-95 cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                    draggingBreakId === brk.id && 'opacity-45 scale-[0.985]',
                  )}
                  style={segStyle}
                  aria-label={t('tile.editBlockAria').replace('{kind}', t(labelKey)).replace('{staff}', staffFirstName)}
                >
                  {inner}
                </button>
              ) : (
                <div
                  className={segClass}
                  style={segStyle}
                >
                  {inner}
                </div>
              )}
            </HoverCardTrigger>
            <HoverCardContent align="start" side="right" sideOffset={8} className="w-auto p-0 overflow-hidden border-border/80 shadow-lg">
              {breakInfoCard(brk)}
            </HoverCardContent>
          </HoverCard>
        );
      });
    });
  };

  // Shared rich hover-card. Both Day grid (via inline mount) and Week (via
  // renderTileHoverCard render-prop) call this so a hover anywhere shows the
  // same editorial preview: hero time + status/payment pills + client identity
  // + service line + (optional) notes + audit footer with creator + timestamp.
  const appointmentHoverCardContent = (apt: AppointmentWithDetails, side: 'top' | 'bottom' | 'left' | 'right' = 'right', align: 'start' | 'center' | 'end' = 'start') => {
    const s = parseISO(apt.startTime);
    const e = parseISO(apt.endTime);
    const dur = differenceInMinutes(e, s);
    const timeStr = `${formatTime(s, timeFormat)}–${formatTime(e, timeFormat)}`;
    // Multi-service booking → aggregate name + total; otherwise the single line.
    const hcMulti = apt.services && apt.services.length > 1 ? apt.services : null;
    const hcServiceName = hcMulti ? `${hcMulti[0].name} + ${hcMulti.length - 1}` : apt.service.name;
    const hcTotal = hcMulti
      ? (apt.totalPrice != null ? Number(apt.totalPrice) : hcMulti.reduce((sum, x) => sum + x.price, 0))
      : apt.service.price;
    const ps = getPaymentStatus(apt);
    const psLabel =
      ps === 'paid' ? t('calendar.paid')
        : ps === 'voided' ? t('calendar.voided')
        : t('calendar.notPaid');
    const accentBar =
      apt.status === 'confirmed' ? 'bg-emerald-500'
        : apt.status === 'completed' ? 'bg-foreground'
        : apt.status === 'cancelled' ? 'bg-rose-500'
        : apt.status === 'no-show' ? 'bg-amber-500'
        : 'bg-blue-500';
    const clientGrad = AVATAR_GRADIENTS[hashToIndex(apt.clientId, AVATAR_GRADIENTS.length)];
    const clientInit = `${apt.client.firstName[0] ?? ''}${apt.client.lastName[0] ?? ''}`.toUpperCase();
    const creatorName = formatCreator(apt.createdBy);
    const creatorChip = renderCreatorChip(apt.createdBy);
    return (
      <HoverCardContent
        align={align}
        side={side}
        sideOffset={8}
        collisionPadding={12}
        className="w-80 p-0 overflow-hidden border-border/80 shadow-lg"
      >
        <div className="relative">
          <div className={cn('absolute left-0 top-0 bottom-0 w-1', accentBar)} />
          <div className="pl-5 pr-4 pt-4 pb-3.5">
            <p className="text-[20px] font-bold tabular-nums tracking-tight leading-none text-foreground">
              {timeStr}
            </p>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {format(s, 'EEE, MMM d')}
              <span className="mx-1.5 text-muted-foreground/40">·</span>
              <span className="tabular-nums">{dur} min</span>
            </p>
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <span className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
                STATUS_PILL[apt.status],
              )}>
                <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[apt.status])} />
                {t(`status.${apt.status}` as TranslationKey)}
              </span>
              <span className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
                ps === 'paid' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : ps === 'voided' ? 'bg-muted text-muted-foreground'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
              )}>
                {psLabel}
                <span className="tabular-nums opacity-90">€{hcTotal}</span>
              </span>
            </div>
          </div>
          <div className="border-t border-border pl-5 pr-4 py-3 flex items-center gap-3">
            <div className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white shrink-0 ring-2 ring-background shadow-sm',
              clientGrad,
            )}>
              {clientInit}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                {apt.client.firstName} {apt.client.lastName}
              </p>
              {apt.client.phone && (
                <p className="text-[11px] text-muted-foreground tabular-nums truncate mt-0.5">
                  {apt.client.phone}
                </p>
              )}
            </div>
          </div>
          <div className="border-t border-border pl-5 pr-4 py-3 flex items-center gap-2.5">
            <ScissorsIcon className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
            <p className="text-[12.5px] font-semibold text-foreground truncate flex-1">
              {hcServiceName}
            </p>
            <p className="text-[13px] font-bold tabular-nums text-foreground shrink-0">
              €{hcTotal}
            </p>
          </div>
          {apt.notes && apt.notes.trim().length > 0 && (
            <div className="border-t border-border pl-5 pr-4 py-3 flex items-start gap-2.5">
              <ChatBubbleLeftIcon className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
              <p className="text-[11.5px] text-muted-foreground/90 italic leading-relaxed line-clamp-3">
                “{apt.notes}”
              </p>
            </div>
          )}
          <div className="border-t border-border bg-muted/25 pl-5 pr-4 py-2 flex items-baseline justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/65 shrink-0">
              {t('calendar.created')}
            </span>
            <span className="text-[10px] tabular-nums text-muted-foreground/85 truncate text-right">
              {creatorChip ?? (creatorName && <span className="font-semibold text-muted-foreground">{creatorName}</span>)}
              {creatorName && <span className="mx-1.5 text-muted-foreground/40">·</span>}
              {apt.createdAt && format(parseISO(apt.createdAt), 'MMM d · HH:mm')}
            </span>
          </div>
        </div>
      </HoverCardContent>
    );
  };

  const renderBlock = (apt: AppointmentWithDetails, laneInfo?: { lane: number; laneCount: number }) => {
    const s = parseISO(apt.startTime);
    const e = parseISO(apt.endTime);
    const sMin = (getHoursInTz(s) - DAY_START_HOUR) * 60 + getMinutesInTz(s);
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

    // ─── Tile state flags ────────────────────────────────
    const isCancelled = apt.status === 'cancelled';
    const isSelected = detailApt?.id === apt.id;
    const isDragging = draggingAptId === apt.id;

    // Warning triangle — single canonical predicate, 6 priority-ordered rules.
    const staffBreaks = breaksByStaff.get(apt.staffId) ?? [];
    const aptDateKey = format(s, 'yyyy-MM-dd');
    const currentDow = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][s.getDay()];
    const breaksForDay = staffBreaks.filter(b => {
      if (b.recurrence === 'weekly') return b.dayOfWeek === currentDow;
      if (b.recurrence === 'none') return b.dayOfWeek === currentDow;
      if (b.recurrence === 'ranged') {
        return b.dayOfWeek === currentDow
          && (!b.startDate || b.startDate <= aptDateKey)
          && (!b.endDate || b.endDate >= aptDateKey)
          && !(b.exceptionDates ?? []).includes(aptDateKey);
      }
      return b.dayOfWeek === currentDow;
    });
    const peerApts = (aptsByStaff.get(apt.staffId) ?? []).filter(p => format(parseISO(p.startTime), 'yyyy-MM-dd') === aptDateKey);
    const workingHoursDay = tenant?.workingHours?.[currentDow as keyof typeof tenant.workingHours];
    const warning = getAppointmentWarning(apt, {
      peerAppointments: peerApts,
      staffBreaks: breaksForDay.filter(b => b.startTime && b.endTime).map(b => ({ startTime: b.startTime, endTime: b.endTime })),
      workingHours: workingHoursDay,
      bufferMinutes: tenant?.bookingRules?.bufferMinutes ?? 0,
      now: new Date(),
      t,
    });

    // Legacy chips (late, unconfirmed within 24h) — kept untouched, not triangles.
    const now = new Date();
    const ymdNow = format(now, 'yyyy-MM-dd');
    const ymdApt = format(s, 'yyyy-MM-dd');
    const minutesUntilStart = (s.getTime() - now.getTime()) / 60_000;
    const isTodayApt = ymdApt === ymdNow;
    const isLate = isTodayApt && minutesUntilStart < -5
      && (apt.status === 'scheduled' || apt.status === 'confirmed');
    const isUnconfirmed = apt.status === 'scheduled'
      && minutesUntilStart > 0 && minutesUntilStart < 24 * 60;

    type LegacyKind = 'late' | 'unconfirmed';
    const legacyKind: LegacyKind | null = isLate ? 'late' : isUnconfirmed ? 'unconfirmed' : null;
    const legacyMeta: Record<LegacyKind, { Icon: typeof ClockIcon; bg: string; text: string; ring: string; tKey: TranslationKey }> = {
      late: {
        Icon: ClockIcon,
        bg: 'bg-rose-50 dark:bg-rose-500/15',
        text: 'text-rose-700 dark:text-rose-400',
        ring: 'ring-rose-500/30',
        tKey: 'tile.lateStart',
      },
      unconfirmed: {
        Icon: ExclamationCircleIcon,
        bg: 'bg-blue-50 dark:bg-blue-500/15',
        text: 'text-blue-700 dark:text-blue-400',
        ring: 'ring-blue-500/30',
        tKey: 'tile.unconfirmed',
      },
    };

    // Phase C4 — gradient avatar for the Full variant. Vocabulary alignment
    // with the HoverCard preview (which already uses this).
    const clientGrad = AVATAR_GRADIENTS[hashToIndex(apt.clientId, AVATAR_GRADIENTS.length)];
    const clientInit = `${apt.client.firstName[0] ?? ''}`.toUpperCase();

    // Phase C1 — cancelled treatment combines line-through + bumped opacity
    const nameStrike = isCancelled ? 'line-through decoration-rose-500/60 decoration-2' : '';

    // Multi-service group: when this is a group primary, render the stacked
    // service list and aggregate price/duration. groupMetaById is keyed by
    // primary id; standalones are absent → groupMeta is undefined.
    const groupMeta = groupMetaById.get(apt.id);
    // Two multi-service shapes converge here: the dashboard's own sibling rows
    // (grouped into `groupMeta`) and the public website's single row carrying a
    // resolved `services[]` array. Prefer the website array when present.
    const lineServices = apt.services && apt.services.length > 1 ? apt.services : null;
    const siblingGroup = !!groupMeta && groupMeta.siblings.length > 1;
    const isGroup = !!lineServices || siblingGroup;
    const lineItemNames: string[] = lineServices
      ? lineServices.map(s => s.name)
      : siblingGroup
        ? groupMeta!.siblings.map(sib => sib.service?.name ?? '')
        : [];
    const serviceCount = lineItemNames.length || 1;
    const primaryName = lineServices ? lineServices[0].name : (apt.service?.name ?? '');
    const displayServiceName = serviceCount > 1
      ? `${primaryName} + ${serviceCount - 1}`
      : primaryName;
    const displayPrice = lineServices
      ? (apt.totalPrice != null ? Number(apt.totalPrice) : lineServices.reduce((sum, x) => sum + x.price, 0))
      : siblingGroup
        ? groupMeta!.totalPrice
        : (apt.service?.price ?? 0);

    const tileContent = tiny ? (
      // Phase C3 — tiny variant preserves service name as a 2nd line when
      // there's at least 36px of vertical space. Below that, single-row.
      h >= 36 ? (
        <div className="flex flex-col h-full px-2 py-1 gap-0">
          <div className="flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[apt.status])} />
            <p className={cn('text-xs font-bold truncate flex-1', c.text, nameStrike)}>
              {apt.client.firstName} {apt.client.lastName[0]}.
            </p>
            <p className={cn('text-[10px] tabular-nums shrink-0 font-medium', c.sub)}>{timeStr}</p>
          </div>
          <p className={cn('text-[10px] truncate leading-tight', c.sub)}>{displayServiceName}</p>
        </div>
      ) : (
        <div className="flex items-center h-full px-2 gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[apt.status])} />
          <p className={cn('text-xs font-bold truncate', c.text, nameStrike)}>
            {apt.client.firstName} {apt.client.lastName[0]}.
          </p>
          <p className={cn('text-[11px] tabular-nums shrink-0 ml-auto font-medium', c.sub)}>{timeStr}</p>
        </div>
      )
    ) : compact ? (
      // Phase C3 — compact moves time to row 2 with the service so name has
      // the full row 1 to truncate cleanly on narrow lanes.
      <div className="flex flex-col justify-center h-full px-2.5 py-1.5 gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[apt.status])} />
          <p className={cn('text-[13px] font-bold truncate flex-1 leading-tight', c.text, nameStrike)}>
            {apt.client.firstName} {apt.client.lastName}
          </p>
        </div>
        <div className={cn('flex items-center justify-between gap-2', c.sub)}>
          <p className="text-xs truncate flex-1 min-w-0">{displayServiceName}</p>
          <p className="text-[11px] tabular-nums shrink-0 font-medium">{timeStr}</p>
        </div>
      </div>
    ) : (
      // Phase C4 — Full variant adds gradient avatar before the name and
      // splits the footer hierarchy: price BOLD, time muted secondary.
      // `min-h-0` lets text rows respect their `leading-*` instead of being
      // squeezed when total content exceeds tile height. Otherwise truncate's
      // overflow-hidden clips the bottom half of glyphs (visual half-cut).
      <div className="flex flex-col h-full px-2.5 py-2 gap-1 min-h-0">
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[8px] font-bold text-white shadow-[0_0_0_1.5px_var(--background)]',
            clientGrad,
          )}>
            {clientInit}
          </div>
          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[apt.status])} />
          <p className={cn('text-sm font-bold truncate leading-tight flex-1', c.text, nameStrike)}>
            {apt.client.firstName} {apt.client.lastName}
          </p>
        </div>
        {/* Service line: stacked list when this is a multi-service group with
            enough vertical space, otherwise single-line "name + N more". */}
        {isGroup && h >= 88 ? (
          <div className={cn('space-y-0.5', c.sub)}>
            {lineItemNames.slice(0, h >= 120 ? 4 : 2).map((nm, idx) => (
              <p key={idx} className="text-xs font-medium truncate flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-current opacity-50 shrink-0" />
                <span className="truncate">{nm}</span>
              </p>
            ))}
            {lineItemNames.length > (h >= 120 ? 4 : 2) && (
              <p className="text-[11px] truncate opacity-70">+{lineItemNames.length - (h >= 120 ? 4 : 2)} more</p>
            )}
          </div>
        ) : (
          <p className={cn('text-xs font-medium truncate leading-tight shrink-0', c.sub)}>{displayServiceName}</p>
        )}
        {h >= 96 && apt.client.phone && !isGroup && (
          <p className={cn('flex items-center gap-1 text-[11px] tabular-nums truncate', c.sub)}>
            <PhoneIcon className="h-3 w-3 shrink-0" />
            {apt.client.phone}
          </p>
        )}
        {/* Status pill — appears on h ≥ 120 tiles (≥ 60 min). Editorial
            chip style, semantic background tint via STATUS_PILL token. Reads
            at a glance: "scheduled / confirmed / completed / cancelled". */}
        {h >= 120 && (
          <span className={cn(
            'mt-0.5 inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
            STATUS_PILL[apt.status],
          )}>
            <span className={cn('h-1 w-1 rounded-full', STATUS_DOT[apt.status])} />
            {t(`status.${apt.status}` as TranslationKey)}
          </span>
        )}
        {/* Notes preview — shown on h ≥ 150 tiles when notes exist. Italic
            muted single-line truncation; the full note is in the detail modal. */}
        {h >= 150 && apt.notes && apt.notes.trim() && (
          <p className={cn('mt-0.5 text-[11px] italic truncate', c.sub)}>
            "{apt.notes.trim()}"
          </p>
        )}
        {/* Footer pinned to the bottom of tall tiles so price/time act as a
            ledger line, with content stacking from top. mt-auto kicks in when
            there's room above (h ≥ 120); otherwise it just sits below content. */}
        <div className={cn(
          'flex items-center justify-between gap-2',
          h >= 120 ? 'mt-auto pt-1' : 'mt-0.5',
        )}>
          <span className={cn('text-[11px] tabular-nums font-medium text-muted-foreground/80', c.sub)}>{timeStr}</span>
          <span className={cn('text-[13px] font-bold tabular-nums leading-none', c.label)}>€{displayPrice}</span>
        </div>
      </div>
    );

    // Outer wrapper carries position + DnD; inner button carries the click.
    // The "⋯" menu trigger sits as a sibling so we don't nest <button>s.
    // Drag-to-reschedule is gated by `canOverride` — only owner/manager can
    // move bookings freely. Receptionists/barbers still see and click, but
    // the block shows a normal pointer and doesn't drag.
    //
    // Status visibility is bookended: staff color on the LEFT (`border-l-[3px]`)
    // for "who's working it" identity; STATUS_STRIPE on the RIGHT (2px absolute
    // span) for "what state is it in." A glance reads both edges.
    return (
      <div
        key={apt.id}
        draggable={canOverride}
        onDragStart={canOverride ? (ev) => {
          ev.dataTransfer.setData('text/plain', apt.id);
          ev.dataTransfer.effectAllowed = 'move';
          setDraggingAptId(apt.id);
        } : undefined}
        onDragEnd={canOverride ? () => setDraggingAptId(null) : undefined}
        onContextMenu={(ev) => {
          // Right-click opens the context popover instead of the modal.
          ev.preventDefault();
          ev.stopPropagation();
          setContextApt(apt);
        }}
        onTouchStart={(ev) => {
          // iPad long-press parity for the right-click context menu (audit P2).
          // Desktop has right-click; touch needs a deliberate hold (550ms) to
          // avoid hijacking simple taps. Cleared on touchend/touchmove.
          const target = ev.currentTarget;
          const timer = window.setTimeout(() => {
            setContextApt(apt);
          }, 550);
          const cancel = () => {
            window.clearTimeout(timer);
            target.removeEventListener('touchend', cancel);
            target.removeEventListener('touchmove', cancel);
            target.removeEventListener('touchcancel', cancel);
          };
          target.addEventListener('touchend', cancel);
          target.addEventListener('touchmove', cancel);
          target.addEventListener('touchcancel', cancel);
        }}
        className={cn(
          // 5px stripe + real elevation utility so light theme tiles read as
          // *lifted papers* on the canvas, not painted regions.
          'group/tile absolute rounded-xl border-l-[5px] overflow-hidden calendar-tile-elev',
          'hover:-translate-y-[1px]',
          // Sit on top of break overlays when overlap is detected.
          (warning?.code === 'break_overlap' || warning?.code === 'break_touch') ? 'z-20' : 'z-10',
          'transition-all duration-150',
          canOverride ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
          c.surface, c.border,
          // Phase C1 — cancelled bumped from opacity-40 to opacity-50 so the
          // strikethrough line stays legible.
          isCancelled && 'opacity-50',
          apt.status === 'no_show' && 'hover:bg-amber-500/5',
          // Phase C2 — selected/drag states
          isSelected && 'ring-2 ring-foreground/35 ring-offset-2 ring-offset-background',
          isDragging && 'opacity-45 scale-[0.985]',
        )}
        style={style}
        title={canOverride ? 'Drag to reschedule · Shift+↑/↓ to nudge 15 min · click to edit · right-click for menu' : 'Click to view'}
      >
        {/* Phase C1 — status right-edge bookend (2px stripe). Sits below
            the ⋯ button (no z-index) and never blocks pointer events. */}
        <span
          aria-hidden
          className={cn('pointer-events-none absolute right-0 top-0 bottom-0 w-[2px]', STATUS_STRIPE[apt.status])}
        />

        {/* Warning triangle — canonical 6-rule predicate, corner-pinned. */}
        {warning && !tiny && <AppointmentWarningPin warning={warning} size="md" />}

        {/* Legacy status chips (late / unconfirmed within 24h) — not triangles, kept untouched. */}
        {legacyKind && !tiny && (() => {
          const m = legacyMeta[legacyKind];
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'absolute top-1 right-7 z-20 inline-flex h-4 w-4 items-center justify-center rounded-full ring-1',
                    m.bg, m.text, m.ring,
                  )}
                  aria-label={t(m.tKey)}
                  onClick={(ev) => { ev.stopPropagation(); ev.preventDefault(); }}
                >
                  <m.Icon className="h-2.5 w-2.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6} className="max-w-[220px] text-center">
                {t(m.tKey)}
              </TooltipContent>
            </Tooltip>
          );
        })()}
        <HoverCard openDelay={320} closeDelay={120}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              onClick={ev => { ev.stopPropagation(); setDetailApt(apt); }}
              onKeyDown={canOverride ? (ev) => {
                // Keyboard-reschedule parity for the drag-to-reschedule path.
                // Shift+ArrowUp/Down nudges by 15-min slot; Shift+PageUp/Down
                // jumps a full hour. Owners using keyboard are no longer
                // locked out (audit P0).
                if (!ev.shiftKey) return;
                const stepMin =
                  ev.key === 'ArrowUp' ? -15
                  : ev.key === 'ArrowDown' ? 15
                  : ev.key === 'PageUp' ? -60
                  : ev.key === 'PageDown' ? 60
                  : null;
                if (stepMin === null) return;
                ev.preventDefault();
                ev.stopPropagation();
                const oldStart = parseISO(apt.startTime);
                const oldEnd   = parseISO(apt.endTime);
                const newStart = new Date(oldStart.getTime() + stepMin * 60_000);
                const newEnd   = new Date(oldEnd.getTime()   + stepMin * 60_000);
                fullUpdateMutation.mutate({
                  id: apt.id,
                  changes: {
                    startTime: newStart.toISOString(),
                    endTime:   newEnd.toISOString(),
                  },
                });
              } : undefined}
              className="block h-full w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded-md"
              aria-keyshortcuts={canOverride ? 'Shift+ArrowUp Shift+ArrowDown Shift+PageUp Shift+PageDown' : undefined}
            >
              {tileContent}
            </button>
          </HoverCardTrigger>
          {/* Rich hover preview — same shape as Week's hover-card (single
              source of truth via appointmentHoverCardContent helper). Opens
              after 320ms idle: status banner, identity, date/time, duration,
              service, payment + creation timestamp. */}
          {appointmentHoverCardContent(apt)}
        </HoverCard>

        {/* ⋯ context-menu — visible on hover (or always if tile is large enough).
            Tap-friendly hit target on iPad, opens a Popover with the same actions
            the right-click menu surfaces. The Popover anchors to this trigger. */}
        <Popover
          open={contextApt?.id === apt.id}
          onOpenChange={(o) => { if (!o) setContextApt(null); else setContextApt(apt); }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Booking actions"
              className={cn(
                // Phase C4 — nudged from top-0.5/right-0.5 (collided with rounded-lg corner)
                // and bumped to h-6/w-6 for a comfortable touch hit-target on iPad.
                // right-2 leaves a 6px gap from the new STATUS_STRIPE right bookend.
                'absolute top-1 right-2 z-20 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 transition-opacity',
                'opacity-0 group-hover/tile:opacity-100 focus-visible:opacity-100',
                'hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                tiny && 'hidden',
                // Hide ⋯ when the warning pin occupies the same corner.
                warning && 'hidden',
                contextApt?.id === apt.id && 'opacity-100',
              )}
            >
              <EllipsisHorizontalIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[220px] p-1.5">
            <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground truncate">
              {apt.client.firstName} {apt.client.lastName}
            </p>
            <button
              type="button"
              onClick={() => { setContextApt(null); setDetailApt(apt); }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
            >
              <PencilSquareIcon className="h-4 w-4 text-muted-foreground" />
              {t('calendar.contextEdit')}
            </button>
            {apt.status === 'scheduled' && (
              <button
                type="button"
                onClick={() => { setContextApt(null); updateStatusMutation.mutate({ id: apt.id, status: 'confirmed' }); }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
              >
                <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                {t('common.confirm')}
              </button>
            )}
            {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
              <>
                <button
                  type="button"
                  onClick={() => { setContextApt(null); updateStatusMutation.mutate({ id: apt.id, status: 'completed' }); }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <CheckBadgeIcon className="h-4 w-4 text-muted-foreground" />
                  {t('status.completed')}
                </button>
                <button
                  type="button"
                  onClick={() => { setContextApt(null); updateStatusMutation.mutate({ id: apt.id, status: 'cancelled' }); }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <XCircleIcon className="h-4 w-4 text-rose-500" />
                  {t('calendar.contextCancel')}
                </button>
              </>
            )}
            {apt.status === 'cancelled' && (
              <button
                type="button"
                onClick={() => { setContextApt(null); updateStatusMutation.mutate({ id: apt.id, status: 'scheduled' }); }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
              >
                <CheckCircleIcon className="h-4 w-4 text-blue-500" />
                {t('status.scheduled')}
              </button>
            )}
            {canOverride && (
              <button
                type="button"
                onClick={() => { setContextApt(null); navigate(`/staff?focus=${apt.staffId}`); }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-muted-foreground" />
                {t('calendar.contextJumpShift')}
              </button>
            )}
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              onClick={() => { setContextApt(null); handleDelete(apt.id, `${apt.client.firstName} ${apt.client.lastName}`); }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
              {t('calendar.contextDelete')}
            </button>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  const staffCount = activeStaff.length;
  const visibleStaffCount = visibleStaff.length;
  const filterActive = staffFilter !== null || focusedStaffId !== null;

  const staffRoleLabel: Record<StaffRole, string> = {
    owner: t('staff.roleOwner'),
    manager: t('staff.roleManager'),
    barber: t('staff.roleBarber'),
    receptionist: t('staff.roleReceptionist'),
  };

  return (
    <div className="space-y-5">
      {/* Rebook mode banner — anchored to the top of the page. While set,
          calendar slot clicks move the appointment instead of opening the
          create modal. Cancel returns to normal mode. Springs in/out with
          a y-translate so the entrance reads as "command bar overlay." */}
      <AnimatePresence>
        {rebookingApt && (
          <motion.div
            key="rebook-banner"
            initial={reduceMotion ? false : { y: -32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: -32, opacity: 0 }}
            transition={{ duration: 0.28, ease: MOTION_EASE }}
            className="-mx-6 -mt-6 mb-1 sm:-mx-8 sm:-mt-8 sticky top-0 z-50 bg-foreground text-background shadow-[0_4px_16px_-4px_rgba(0,0,0,0.25)]"
          >
            <div className="px-7 py-3.5 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/15 shrink-0">
                <CalendarDaysIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-tight truncate">
                  {t('calendar.rebookBannerTitle').replace(
                    '{name}',
                    `${rebookingApt.client.firstName} ${rebookingApt.client.lastName}`,
                  )}
                </p>
                <p className="text-[11px] opacity-80 truncate">
                  {t('calendar.rebookBannerHint')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRebookingApt(null);
                  setRebookHover(null);
                  toast.info(t('calendar.rebookCancelled'));
                }}
                className="inline-flex items-center justify-center h-8 px-3 rounded-md text-[12px] font-semibold text-background hover:bg-background/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/40"
              >
                {t('common.cancel')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                className="group mt-2 inline-flex items-center gap-3 text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-none tabular-nums hover:text-foreground/80 transition-colors"
                aria-label="Open date picker"
                title="Click to pick another date"
              >
                {format(selectedDate, 'EEEE, MMMM d, yyyy', { locale: dateLocale })}
                {/* Always visible so operators know the title is clickable —
                    not a decorative glyph. Brightens + nudges right on hover
                    to telegraph the affordance. */}
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground group-hover:text-foreground group-hover:border-foreground/30 group-hover:translate-x-[1px] transition-all">
                  <CalendarDaysIcon className="h-5 w-5" />
                </span>
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
          <Button
            size="sm"
            onClick={openCreateFromHeader}
            className="h-11 rounded-xl px-5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] hover:-translate-y-[1px] transition-transform"
          >
            <PlusIcon className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">{t('calendar.newAppointment')}</span>
          </Button>
        </div>
      </div>

      {/* ─── Layout ───────────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* ── Left Sidebar ── */}
        <div className="hidden lg:flex flex-col gap-4 w-[248px] shrink-0">
          <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
            <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} appointments={appointments} />
          </div>

          {/* ─── Day summary (editorial — Studio Score) ─
              Hairline-divided typography. No gradients,
              no tinted panels. Consistent с другими страницами
              в editorial-семье (Clients, Staff, Services, etc). */}
          {appointmentsLoading ? <SummarySkeleton /> : (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.18em]">
                {t('calendar.summary')}
              </p>
              <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                {isToday(selectedDate) ? t('common.today') : format(selectedDate, 'MMM d', { locale: dateLocale })}
              </span>
            </div>

            {/* Day revenue — hero number, editorial scale */}
            <div>
              <p className="text-3xl font-bold text-foreground tabular-nums leading-none tracking-tight">
                €{dayApts
                  .filter(a => a.status === 'completed')
                  .reduce((s, a) => s + Number(a.service.price ?? 0), 0)
                  .toLocaleString()}
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
                {dayApts.filter(a => a.status === 'completed').length} completed · {dayApts.length} booked
              </p>
            </div>

            {/* 7-day revenue sparkline. Hand-rolled SVG (no recharts) so the
                calendar chunk stays lean. Hairline polyline + faint area fill +
                accent dot on today's value. Reads as a glance — no axes, no
                tooltip — matches the editorial "score sheet" vocabulary. */}
            {(() => {
              const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(selectedDate), i - 6));
              const series = days.map(d => {
                const key = format(d, 'yyyy-MM-dd');
                return appointments
                  .filter(a => a.status === 'completed' && format(parseISO(a.startTime), 'yyyy-MM-dd') === key)
                  .reduce((s, a) => s + Number(a.service?.price ?? 0), 0);
              });
              const max = Math.max(1, ...series);
              const W = 200;
              const H = 36;
              const padY = 3;
              const stepX = W / (series.length - 1);
              const pts = series.map((v, i) => ({
                x: i * stepX,
                y: H - padY - (v / max) * (H - padY * 2),
              }));
              const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
              const areaPath = `${path} L ${W} ${H} L 0 ${H} Z`;
              const last = pts[pts.length - 1];
              return (
                <div className="-mt-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1.5">7-day trend</p>
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-9 overflow-visible" preserveAspectRatio="none" aria-hidden>
                    <defs>
                      <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={areaPath} fill="url(#sparkfill)" className="text-foreground" />
                    <path d={path} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" className="text-foreground/85" />
                    <circle cx={last.x} cy={last.y} r="2.5" fill="currentColor" className="text-foreground" />
                    <circle cx={last.x} cy={last.y} r="5" fill="currentColor" className="text-foreground/15" />
                  </svg>
                </div>
              );
            })()}

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

            {/* Staff roster — presence + role. Left color-accent matches each
                barber's grid column hue (via staffColorMap), with role subtitle
                and an Online/Offline pill driven by `isActive`. Iterates all
                staff so off-shift members still appear (marked Offline). */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-2">
                {t('calendar.staff')}
              </p>
              <div className="space-y-0.5">
                {allStaff.map((m, i) => {
                  const c = getStaffColor(staffColorMap.get(m.id) ?? i);
                  const online = m.isActive;
                  const cnt = aptsByStaff.get(m.id)?.length ?? 0;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-2.5 rounded-lg py-1.5 pr-1 transition-colors hover:bg-accent/40"
                    >
                      {/* Accent bar — same hue as the barber's calendar column */}
                      <span className={cn('h-8 w-1 shrink-0 rounded-full', c.dot)} aria-hidden />

                      <Avatar className="h-9 w-9 shrink-0">
                        {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={`${m.firstName} ${m.lastName}`} />}
                        <AvatarFallback className={cn('text-[11px] font-bold', c.light, c.label)}>{m.firstName[0]}{m.lastName[0]}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                          {m.firstName} {m.lastName[0]}.
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate leading-tight">
                          {staffRoleLabel[m.role]}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1 pr-1">
                        {/* Today's bookings — staff-hued pill */}
                        <span
                          aria-label={t('calendar.staffBookingsToday', { count: cnt })}
                          className={cn(
                            'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                            cnt > 0 ? cn(c.light, c.label) : 'bg-muted text-muted-foreground/50',
                          )}
                        >
                          {cnt}
                        </span>
                        {/* Presence */}
                        <span className="flex items-center gap-1.5">
                          <span
                            className={cn('h-1.5 w-1.5 rounded-full', online ? 'bg-emerald-500' : 'bg-muted-foreground/40')}
                            aria-hidden
                          />
                          <span className="text-[11px] text-muted-foreground">
                            {online ? t('calendar.staffOnline') : t('calendar.staffOffline')}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          )}

          {/* ── Connect calendar (Google / Outlook sync — placeholder) ── */}
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
              <CalendarDaysIcon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">{t('calendar.connectTitle')}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{t('calendar.connectBody')}</p>
            <button
              type="button"
              onClick={() => toast.info(t('calendar.connectSoon'))}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[13px] font-semibold text-foreground shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 7.1 29.5 5 24 5 16 5 9.1 9.5 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.9 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9 41.4 15.9 45 24 45z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.8 36 45 30.5 45 24c0-1.2-.1-2.3-.4-3.5z"/>
              </svg>
              {t('calendar.connectCta')}
            </button>
          </div>
        </div>

        {/* ── Main Area ── */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Date strip — month-jump + day-step + today, then 7-day rail.
              Double chevrons jump a full month; single chevrons step one day.
              Operator can reach any date in two clicks max. */}
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2">
            {/* Touch targets — visual buttons stay 28px so the operator bar
                doesn't bloat, but min-w/min-h-[44px] expands the tap area for
                iPad mis-tap protection (WCAG 2.5.5). Month-jump chevrons were
                removed (audit P2 #10) — duplicates the MiniCalendar popover's
                own month nav, which the date-title chip opens in one tap. */}
            <button
              type="button"
              onClick={() => setSelectedDate(d => subDays(d, 1))}
              title="Previous day"
              aria-label="Previous day"
              className="inline-flex h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm hover:bg-accent active:scale-[0.97] transition-all duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 cursor-pointer"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(d => addDays(d, 1))}
              title="Next day"
              aria-label="Next day"
              className="inline-flex h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm hover:bg-accent active:scale-[0.97] transition-all duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 cursor-pointer"
            >
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </button>

            {!isToday(selectedDate) && (
              <button
                type="button"
                onClick={() => setSelectedDate(new Date())}
                className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground shadow-sm hover:bg-accent active:scale-[0.97] transition-all duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 cursor-pointer"
              >
                {t('common.today')}
              </button>
            )}

            <div className="flex-1" />

            <div className="hidden sm:flex items-center gap-px">
              {/* Fixed-week strip — Mon-Sun for RU/LT (ISO), Sun-Sat for EN.
                  Anchor to startOfWeek instead of "centered ±3 from selected"
                  so the strip stays put when the user picks any day in the
                  current week — operator can scan "where am I in the week"
                  without the strip shifting under them. */}
              {Array.from({ length: 7 }, (_, i) => {
                const weekStartsOn: 0 | 1 = language === 'en' ? 0 : 1;
                const d = addDays(startOfWeek(selectedDate, { weekStartsOn }), i);
                const sel = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                const td = isToday(d);
                return (
                  <button key={format(d, 'yyyy-MM-dd')} onClick={() => setSelectedDate(d)}
                    className={cn(
                      'flex flex-col items-center rounded-lg w-10 py-1 transition-colors',
                      sel ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-accent',
                    )}>
                    <span className="text-[10px] font-medium uppercase tracking-wider">{format(d, 'EEE', { locale: dateLocale })}</span>
                    <span className={cn('text-sm font-semibold', td && !sel && 'text-blue-600 dark:text-blue-400')}>{format(d, 'd', { locale: dateLocale })}</span>
                    {td && !sel && <span className="mt-0.5 h-1 w-1 rounded-full bg-blue-500" />}
                  </button>
                );
              })}
            </div>

            <div className="flex-1" />

            {/* Staff filter — owner/manager flow. Receptionist gets the same
                filter (it's a view, not a permission) but ownerOnly Block types
                are still gated inside the Block dialog.
                Hidden in day-view since a single agenda doesn't need the filter. */}
            {viewMode === 'grid' && staffCount > 1 && (
              <Popover open={staffFilterOpen} onOpenChange={setStaffFilterOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      filterActive
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent',
                    )}
                    aria-label={t('calendar.filterStaff')}
                    title={t('calendar.filterStaff')}
                  >
                    <AdjustmentsHorizontalIcon className="h-4 w-4" />
                    <span className="tabular-nums">
                      {focusedStaffId
                        ? activeStaff.find(s => s.id === focusedStaffId)?.firstName
                        : staffFilter
                          ? `${visibleStaffCount}/${staffCount}`
                          : t('calendar.filterAll')}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[220px] p-2">
                  {/* All */}
                  <button
                    type="button"
                    onClick={() => { setStaffFilter(null); setFocusedStaffId(null); }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors',
                      !filterActive
                        ? 'bg-foreground text-background'
                        : 'text-foreground hover:bg-accent',
                    )}
                  >
                    <span className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                      !filterActive ? 'bg-white/15' : 'bg-muted',
                    )}>
                      <UsersIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1">{t('calendar.filterAll')}</span>
                    <span className={cn(
                      'text-[11px] font-bold tabular-nums',
                      !filterActive ? 'text-white/60' : 'text-muted-foreground',
                    )}>{staffCount}</span>
                  </button>

                  <div className="my-2 border-t border-border" />

                  {/* Per-staff rows */}
                  <div className="space-y-0.5">
                  {activeStaff.map(m => {
                    const colorIdx = staffColorMap.get(m.id) ?? 0;
                    const c = getStaffColor(colorIdx);
                    const checked = focusedStaffId
                      ? focusedStaffId === m.id
                      : staffFilter ? staffFilter.has(m.id) : true;
                    const cnt = aptsByStaff.get(m.id)?.length ?? 0;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setFocusedStaffId(null);
                          setStaffFilter(prev => {
                            const next = new Set(prev ?? activeStaff.map(s => s.id));
                            if (next.has(m.id)) next.delete(m.id); else next.add(m.id);
                            if (next.size === activeStaff.length) return null;
                            if (next.size === 0) return null;
                            return next;
                          });
                        }}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                          checked ? cn(c.light, 'font-semibold') : 'opacity-40 hover:opacity-70 hover:bg-accent/50',
                        )}
                      >
                        {/* Avatar with staff-color ring */}
                        <div className={cn('shrink-0 rounded-full p-[1.5px]', checked ? c.dot : 'bg-muted-foreground/30')}>
                          <Avatar className="h-6 w-6 block">
                            {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.firstName} />}
                            <AvatarFallback className={cn('text-[8px] font-bold', c.light, c.label)}>
                              {m.firstName[0]}{m.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <span className="flex-1 truncate text-sm text-foreground">{m.firstName} {m.lastName}</span>
                        {cnt > 0 && (
                          <span className={cn(
                            'shrink-0 text-[10px] font-bold tabular-nums rounded-full px-1.5 py-0.5 leading-none',
                            checked ? cn(c.dot, 'text-white') : 'bg-muted text-muted-foreground',
                          )}>{cnt}</span>
                        )}
                        {checked && <CheckIcon className={cn('h-3.5 w-3.5 shrink-0', c.label)} />}
                      </button>
                    );
                  })}
                  </div>
                </PopoverContent>
              </Popover>
            )}


            {/* Column-density toggle — only meaningful on the grid view, only
                shown when there's enough staff to actually benefit (>4). Owner
                with 8+ barbers wants all columns visible at once on iPad
                without horizontal scroll; compact mode shrinks staff columns
                from 200px → 110px so ~9 fit on iPad-portrait. */}
            {viewMode === 'grid' && visibleStaffCount > 4 && (
              <button
                type="button"
                onClick={() => setGridDensity(gridDensity === 'compact' ? 'standard' : 'compact')}
                aria-label={gridDensity === 'compact' ? t('calendar.gridDensityStandard') : t('calendar.gridDensityCompact')}
                title={gridDensity === 'compact' ? t('calendar.gridDensityStandard') : t('calendar.gridDensityCompact')}
                className={cn(
                  'inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                  gridDensity === 'compact'
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                {gridDensity === 'compact'
                  ? <ArrowsPointingOutIcon className="h-4 w-4" />
                  : <ArrowsPointingInIcon className="h-4 w-4" />}
              </button>
            )}

            {/* View toggle — LayoutGroup + motion.span layoutId for the active
                pill, matching the role-tab underline pattern from /accounts. */}
            <LayoutGroup id="cal-view-toggle">
              <div className="flex items-center gap-0.5 rounded-xl border border-border bg-muted/60 p-1 backdrop-blur supports-[backdrop-filter]:bg-muted/50 shadow-sm">
                {([
                  { mode: 'day',  Icon: ListBulletIcon,  label: t('calendar.viewDay')  },
                  { mode: 'week', Icon: TableCellsIcon,  label: t('calendar.viewWeek') },
                  { mode: 'grid', Icon: Squares2X2Icon,  label: t('calendar.viewGrid') },
                ] as const).map(({ mode, Icon, label }) => {
                  const isActive = viewMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      title={label}
                      aria-label={label}
                      aria-pressed={isActive}
                      className={cn(
                        'relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors',
                        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="cal-view-toggle-pill"
                          className="absolute inset-0 rounded-lg bg-card shadow-md ring-1 ring-border/60"
                          transition={{ duration: MOTION_DUR.base, ease: MOTION_EASE }}
                        />
                      )}
                      <Icon className="relative z-10 h-4 w-4" />
                      <span className="relative z-10">{label}</span>
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>
          </div>

          {/* When focused, narrow the appointment list to that single barber
              so DayAgenda + WeekView render only their bookings. The grid view
              already handles focus via `visibleStaff` so nothing changes there.
              Banner only shown in week view — other views don't have a strip to
              pair it with. */}
          {focusedStaffId && viewMode === 'week' && (
            <FocusBanner
              staff={activeStaff.find(s => s.id === focusedStaffId)!}
              color={(() => {
                const idx = staffColorMap.get(focusedStaffId) ?? 0;
                const c = getStaffColor(idx);
                return { dot: c.dot, light: c.light, label: c.label };
              })()}
              onClear={() => setFocusedStaffId(null)}
              onJumpToShift={() => navigate(`/staff?focus=${focusedStaffId}`)}
              t={t}
            />
          )}

          {/* Week staff bar — replaces the old toolbar dropdown. Shows all
              visible barbers as clickable cards; active card = current week view.
              During focus mode, shows ALL active staff so the operator can
              quick-switch the focus target: clicking the active card clears focus,
              clicking another card shifts focus to them.
              Intentionally absent in day/grid views (those have their own controls). */}
          {viewMode === 'week' && (() => {
            const staffForBar = focusedStaffId ? activeStaff : visibleStaff;
            if (staffForBar.length === 0) return null;
            const sortedForBar = [...staffForBar].sort((a, b) =>
              `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
            );
            return (
              <div className="relative py-2 border-b border-border">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                  {sortedForBar.map(m => {
                    const colorIdx = staffColorMap.get(m.id) ?? 0;
                    const c = getStaffColor(colorIdx);
                    const isActive = focusedStaffId ? focusedStaffId === m.id : weekViewStaffId === m.id;
                    return (
                      <StaffCard
                        key={m.id}
                        variant="week"
                        staff={m}
                        count={weekStaffApptCount.get(m.id) ?? 0}
                        color={{ dot: c.dot, light: c.light, label: c.label }}
                        active={isActive}
                        onClick={() => {
                          if (focusedStaffId) {
                            if (focusedStaffId === m.id) {
                              setFocusedStaffId(null);
                            } else {
                              setFocusedStaffId(m.id);
                              setWeekViewStaffId(m.id);
                            }
                          } else {
                            setWeekViewStaffId(m.id);
                          }
                        }}
                        className="min-w-[72px] max-w-[100px] flex-1"
                      />
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Content */}
          {viewMode === 'day' ? (
            <DayAgenda
              appointments={dayApts}
              activeStaff={activeStaff}
              breaksByStaff={breaksByStaff}
              forcedStaffId={focusedStaffId}
              staffColorMap={staffColorMap}
              staffColors={STAFF_COLORS}
              statusMap={statusMap}
              onSelect={setDetailApt}
              onCreate={openCreateFromHeader}
              onQuickAction={(aptId, action) => {
                const status = action === 'complete' ? 'completed' : action === 'no_show' ? 'no_show' : 'cancelled';
                updateStatusMutation.mutate({ id: aptId, status });
              }}
              renderTileHoverCard={(apt) => appointmentHoverCardContent(apt, 'top', 'end')}
            />
          ) : viewMode === 'week' ? (
            <WeekView
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onJumpToDay={(d) => { setSelectedDate(d); setViewMode('grid'); }}
              appointments={weekViewStaffId ? appointments.filter(a => a.staffId === weekViewStaffId) : []}
              breaks={weekViewStaffId ? allBreaks.filter(b => b.staffId === weekViewStaffId) : []}
              staffColorMap={staffColorMap}
              staffColors={STAFF_COLORS}
              onSelectApt={setDetailApt}
              dayStartHour={DAY_START_HOUR}
              dayEndHour={DAY_END_HOUR}
              slotHeight={SLOT_HEIGHT}
              canOverride={canOverride}
              selectedStaff={(() => {
                const s = activeStaff.find(s => s.id === weekViewStaffId);
                return s ? { id: s.id, firstName: s.firstName, lastName: s.lastName } : null;
              })()}
              shifts={allShifts}
              overrides={allOverrides}
              onEditBreak={(brk) => setBlockState({ mode: 'edit-break', brk })}
              workingHours={tenant?.workingHours}
              bufferMinutes={tenant?.bookingRules?.bufferMinutes ?? 0}
              onCreateAt={(date, hour, minute) => {
                // Reuse the create-modal seeding pattern from openSlot.
                // Pre-seed staff to the Week-view-selected barber since the
                // entire week is filtered to them; columns are by-day so the
                // user can still override inside the modal.
                setSelectedSlot({ hour, minute, staffId: weekViewStaffId ?? '' });
                setFormData(f => ({ ...f, staffId: weekViewStaffId ?? '' }));
                setCreateDate(date);
                const hh = String(hour).padStart(2, '0');
                const mm = String(minute).padStart(2, '0');
                setCreateTime(`${hh}:${mm}`);
                setIsCreateOpen(true);
              }}
              onRequestDragConfirm={({ aptId, newStartIso, newEndIso }) => {
                const apt = appointments.find(a => a.id === aptId);
                if (!apt) return;
                setDragConfirm({
                  aptId,
                  oldStart: apt.startTime,
                  newStart: newStartIso,
                  oldEnd: apt.endTime,
                  newEnd: newEndIso,
                  oldStaffId: apt.staffId,
                  newStaffId: apt.staffId,
                });
              }}
              onRequestBreakDragConfirm={({ brkId, targetDateYmd }) => {
                const brk = allBreaks.find(b => b.id === brkId);
                if (!brk) return;
                setBreakDragConfirm({ brk, targetDate: targetDateYmd });
              }}
              renderTileHoverCard={(apt) => appointmentHoverCardContent(apt)}
              renderTileMenu={(apt, close) => (
                <PopoverContent align="end" className="w-[220px] p-1.5">
                  <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground truncate">
                    {apt.client.firstName} {apt.client.lastName}
                  </p>
                  <button
                    type="button"
                    onClick={() => { close(); setDetailApt(apt); }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <PencilSquareIcon className="h-4 w-4 text-muted-foreground" />
                    {t('calendar.contextEdit')}
                  </button>
                  {apt.status === 'scheduled' && (
                    <button
                      type="button"
                      onClick={() => { close(); updateStatusMutation.mutate({ id: apt.id, status: 'confirmed' }); }}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                      {t('common.confirm')}
                    </button>
                  )}
                  {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                    <>
                      <button
                        type="button"
                        onClick={() => { close(); updateStatusMutation.mutate({ id: apt.id, status: 'completed' }); }}
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        <CheckBadgeIcon className="h-4 w-4 text-muted-foreground" />
                        {t('status.completed')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { close(); updateStatusMutation.mutate({ id: apt.id, status: 'cancelled' }); }}
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        <XCircleIcon className="h-4 w-4 text-rose-500" />
                        {t('calendar.contextCancel')}
                      </button>
                    </>
                  )}
                  {apt.status === 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => { close(); updateStatusMutation.mutate({ id: apt.id, status: 'scheduled' }); }}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <CheckCircleIcon className="h-4 w-4 text-blue-500" />
                      {t('status.scheduled')}
                    </button>
                  )}
                  {canOverride && (
                    <button
                      type="button"
                      onClick={() => { close(); navigate(`/staff?focus=${apt.staffId}`); }}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 text-muted-foreground" />
                      {t('calendar.contextJumpShift')}
                    </button>
                  )}
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    onClick={() => { close(); handleDelete(apt.id, `${apt.client.firstName} ${apt.client.lastName}`); }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                    {t('calendar.contextDelete')}
                  </button>
                </PopoverContent>
              )}
            />
          ) : staffCount === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
              <p className="text-sm font-medium text-muted-foreground">{t('calendar.noActiveStaff')}</p>
              <p className="mt-1 text-xs text-muted-foreground/60">{t('calendar.noActiveStaffHint')}</p>
            </div>
          ) : (
            // bg-canvas (paper-tinted in light, near-card in dark) so white
            // tiles can earn elevation through shadow rather than through
            // luminance contrast against an identical bg.
            <div className="rounded-xl border border-border bg-canvas overflow-hidden">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="overflow-auto"
                style={{ maxHeight: 'calc(100vh - 300px)' }}
              >
                {appointmentsLoading && (
                  <CalendarGridSkeleton
                    visibleStaffCount={visibleStaffCount}
                    hours={hours}
                    gridH={gridH}
                    staffColWidth={staffColWidth}
                  />
                )}
                {!appointmentsLoading && (
                <>
                {/* Sticky staff header — Studio Score: hairline column
                    divider + uppercase tabular eyebrow + thin staff-tinted
                    accent rule under each header (color без ring-halo). */}
                <div className="sticky top-0 z-40 flex border-b border-border bg-canvas shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                  {/* Time-gutter spacer — sticky left-0 so it stays pinned during
                      horizontal scroll on mobile. Without this, scrolling right
                      drags the staff name labels under the body's pinned time
                      column, creating a visual jank. z-30 sits above body's gutter. */}
                  <div className="sticky left-0 z-50 shrink-0 border-r border-border bg-canvas" style={{ width: `${TIME_GUTTER_W}px` }} />
                  {visibleStaff.map((m, i) => {
                    const colorIdx = staffColorMap.get(m.id) ?? 0;
                    const c = getStaffColor(colorIdx);
                    const cnt = aptsByStaff.get(m.id)?.length ?? 0;
                    const shift = shiftsByStaff.get(m.id);
                    const isFocused = focusedStaffId === m.id;
                    // Load bead: encodes today's booking density at a glance so
                    // the operator can scan 8 columns in <200 ms and spot the one
                    // that's overbooked. Empty = muted, 1-3 = emerald (light),
                    // 4-7 = amber (steady), 8+ = rose (slammed).
                    const loadDot
                      = cnt === 0  ? 'bg-muted-foreground/30'
                      : cnt <= 3   ? 'bg-emerald-500'
                      : cnt <= 7   ? 'bg-amber-500'
                                   : 'bg-rose-500';
                    const shiftLabel = shift ? `${shift.startTime}–${shift.endTime}` : t('calendar.dayOff');
                    return (
                      <StaffCard
                        key={m.id}
                        variant="grid"
                        staff={m}
                        count={cnt}
                        color={{ dot: c.dot, light: c.light, label: c.label }}
                        focused={isFocused}
                        loadDot={loadDot}
                        shift={shiftLabel}
                        title={
                          isFocused
                            ? t('calendar.focusClear')
                            : `${m.firstName} ${m.lastName} · ${shiftLabel} · ${cnt} ${cnt === 1 ? t('calendar.booking') : t('calendar.bookings')}`
                        }
                        onClick={() => {
                          if (focusedStaffId === m.id) {
                            setFocusedStaffId(null);
                          } else {
                            setFocusedStaffId(m.id);
                            setViewMode('week');
                          }
                        }}
                        className={cn(
                          i < visibleStaffCount - 1 && 'border-r border-border',
                        )}
                        style={{ minWidth: `${staffColWidth}px` }}
                      />
                    );
                  })}
                </div>

                {/* Grid body */}
                <div className="relative flex" style={{ height: `${gridH}px` }}>

                  {/* Time gutter — sticky left-0 keeps the time-axis pinned during
                      horizontal scroll on mobile (when staff columns exceed viewport
                      width). z-20 sits below the staff-header spacer (z-30) so the
                      header's pinned cell paints over the gutter when both intersect. */}
                  <div className="sticky left-0 z-20 shrink-0 border-r border-border bg-card" style={{ width: `${TIME_GUTTER_W}px` }}>
                    {hours.map((hr, i) => (
                      <div key={hr} className="absolute left-0 right-0 pr-2 flex justify-end" style={{ top: `${i * SLOT_HEIGHT}px` }}>
                        <span className="relative -top-2 text-[10px] font-medium text-muted-foreground tabular-nums select-none leading-none">
                          {formatHourLabel(hr, timeFormat)}
                        </span>
                      </div>
                    ))}

                    {showNow && (
                      <div className="absolute left-0 right-0 z-20 flex justify-end pr-0.5" style={{ top: `${(nowMin / MINUTES_PER_SLOT) * SLOT_HEIGHT}px` }}>
                        <span className="relative -top-[7px] rounded bg-red-500 px-1 py-px text-[10px] font-bold text-white tabular-nums leading-none">
                          {formatTime(now, timeFormat)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Staff columns */}
                  {visibleStaff.map((member, ci) => {
                    const col = aptsByStaff.get(member.id) || [];
                    const laneMap = lanesByStaff.get(member.id);

                    // DnD reschedule: drop a booking OR a break into this column at the Y position → new start time.
                    // Gated by canOverride — only owner/manager can reassign.
                    const handleDrop = canOverride ? (ev: React.DragEvent<HTMLDivElement>) => {
                      ev.preventDefault();
                      const payload = ev.dataTransfer.getData('text/plain');
                      if (!payload) return;

                      // Compute target minute, snap to 15-min grid (shared between
                      // booking + break drop logic).
                      const rect = ev.currentTarget.getBoundingClientRect();
                      const y = ev.clientY - rect.top;
                      const rawMin = (y / SLOT_HEIGHT) * MINUTES_PER_SLOT;
                      const snapped = Math.max(0, Math.round(rawMin / 15) * 15);
                      const startMin = DAY_START_HOUR * 60 + snapped;

                      // ── BREAK drop (prefix `brk:`) ──────────────────────
                      // One-off → commit directly with new HH:mm range.
                      // Weekly → open confirm modal asking "Все / Только этот".
                      // Note: column = staff. Re-assigning a break to another
                      // staff via drag is not supported here (BlockDialog can
                      // do that explicitly); we keep the staff anchored.
                      if (payload.startsWith('brk:')) {
                        const brkId = payload.slice(4);
                        const brk = allBreaks.find(b => b.id === brkId);
                        if (!brk || brk.staffId !== member.id) return;
                        const durMin = parseTimeToMinutes(brk.endTime) - parseTimeToMinutes(brk.startTime);
                        const newStartMin = startMin;
                        const newEndMin = startMin + durMin;
                        const pad = (n: number) => String(n).padStart(2, '0');
                        const newStart = `${pad(Math.floor(newStartMin / 60))}:${pad(newStartMin % 60)}`;
                        const newEnd = `${pad(Math.floor(newEndMin / 60))}:${pad(newEndMin % 60)}`;
                        if (newStart === brk.startTime && newEnd === brk.endTime) return;
                        const targetDate = format(selectedDate, 'yyyy-MM-dd');
                        if (brk.recurrence === 'one-off') {
                          // Direct commit — no modal needed.
                          breakUpsertMut.mutate({
                            ...brk,
                            startTime: newStart,
                            endTime: newEnd,
                            startDate: targetDate, // re-anchor to the column's date
                          });
                        } else {
                          // Weekly → defer to confirm modal.
                          setBreakDragConfirm({
                            brkId: brk.id,
                            newStartTime: newStart,
                            newEndTime: newEnd,
                            targetDate,
                          });
                        }
                        return;
                      }

                      // ── APPOINTMENT drop (default) ──────────────────────
                      const aptId = payload;
                      const apt = appointments.find(a => a.id === aptId);
                      if (!apt) return;

                      const newStart = new Date(selectedDate);
                      newStart.setHours(0, 0, 0, 0);
                      newStart.setMinutes(startMin);
                      const durMin = differenceInMinutes(parseISO(apt.endTime), parseISO(apt.startTime));
                      const newEnd = new Date(newStart.getTime() + durMin * 60000);

                      // No-op if nothing changed
                      if (apt.staffId === member.id && parseISO(apt.startTime).getTime() === newStart.getTime()) return;

                      // Open the confirmation dialog instead of committing
                      // immediately. The dialog shows old → new for both time
                      // and staff; user clicks Save to commit or Cancel to
                      // dismiss. Prevents accidental drops from costing the
                      // operator a real reschedule.
                      const oldStaff = allStaff.find(s => s.id === apt.staffId);
                      const newStaff = allStaff.find(s => s.id === member.id);
                      setDragConfirm({
                        aptId: apt.id,
                        oldStartTime: apt.startTime,
                        newStartTime: newStart.toISOString(),
                        newEndTime: newEnd.toISOString(),
                        oldStaffId: apt.staffId,
                        newStaffId: member.id,
                        oldStaffName: oldStaff ? `${oldStaff.firstName} ${oldStaff.lastName}` : '—',
                        newStaffName: newStaff ? `${newStaff.firstName} ${newStaff.lastName}` : '—',
                      });
                    } : undefined;

                    return (
                      <div key={member.id}
                        onDragOver={(ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; }}
                        onDrop={handleDrop}
                        onMouseLeave={rebookingApt ? () => {
                          // Clear ghost only if it was for THIS column —
                          // otherwise we'd erase the cursor's actual position
                          // mid-traverse between adjacent columns.
                          setRebookHover((cur) => (cur && cur.staffId === member.id ? null : cur));
                        } : undefined}
                        className={cn('relative flex-1', ci < visibleStaffCount - 1 && 'border-r border-border')}
                        style={{ minWidth: `${staffColWidth}px` }}>

                        {hours.map((hr, i) => (
                          <div key={hr} className="absolute left-0 right-0 border-t border-dashed border-border" style={{ top: `${i * SLOT_HEIGHT}px` }} />
                        ))}

                        {/* Quarter-hour micro-ticks. :30 reads as a slightly bolder rule
                            so the half-hour rhythm survives at a glance; :15 + :45 are
                            airier dotted ticks that read as "scan markers", not lanes. */}
                        {Array.from({ length: totalSlots }).flatMap((_, hi) =>
                          [1, 2, 3].map(j => {
                            const isHalf = j === 2;
                            return (
                              <div
                                key={`${hi}-${j}`}
                                className={cn(
                                  'absolute left-3 right-3 border-t',
                                  isHalf ? 'border-dashed border-border/30' : 'border-dotted border-border/20',
                                )}
                                style={{ top: `${hi * SLOT_HEIGHT + (SLOT_HEIGHT * j) / SUB_SLOTS_PER_HOUR}px` }}
                              />
                            );
                          }),
                        )}

                        {renderOffDuty(member.id)}
                        {renderBreaks(member.id)}

                        {/* Rebook ghost preview — faded card showing where the
                            move will land. Renders only in rebook mode while
                            the cursor is over this staff column. Pointer-events
                            none so the slot cells beneath still receive clicks. */}
                        {rebookingApt && rebookHover && rebookHover.staffId === member.id && (() => {
                          const dur = differenceInMinutes(
                            parseISO(rebookingApt.endTime),
                            parseISO(rebookingApt.startTime),
                          );
                          const startMin = (rebookHover.hour - DAY_START_HOUR) * 60 + rebookHover.minute;
                          const top = (startMin / MINUTES_PER_SLOT) * SLOT_HEIGHT;
                          const h = (dur / MINUTES_PER_SLOT) * SLOT_HEIGHT;
                          const totalEndMin = rebookHover.hour * 60 + rebookHover.minute + dur;
                          const eh = Math.floor(totalEndMin / 60);
                          const em = totalEndMin % 60;
                          const fmt = (h: number, m: number) =>
                            `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                          return (
                            <motion.div
                              key={`ghost-${rebookHover.staffId}-${rebookHover.hour}-${rebookHover.minute}`}
                              initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.18, ease: MOTION_EASE }}
                              className="absolute left-1 right-1 z-[15] pointer-events-none rounded-md border-2 border-dashed border-foreground/40 bg-foreground/5 overflow-hidden"
                              style={{ top: `${top}px`, height: `${h}px` }}
                            >
                              <div className="px-2 pt-1.5 text-[10px] tabular-nums text-muted-foreground/85">
                                {fmt(rebookHover.hour, rebookHover.minute)} – {fmt(eh, em)}
                              </div>
                              <div className="px-2 text-[11px] font-semibold text-foreground/75 truncate">
                                {rebookingApt.client.firstName} {rebookingApt.client.lastName}
                              </div>
                              <div className="px-2 text-[10px] text-muted-foreground/80 truncate">
                                {rebookingApt.service.name}
                              </div>
                            </motion.div>
                          );
                        })()}

                        {Array.from({ length: totalSlots * SUB_SLOTS_PER_HOUR }, (_, i) => {
                          const hr = DAY_START_HOUR + Math.floor(i / SUB_SLOTS_PER_HOUR);
                          const mn = (i % SUB_SLOTS_PER_HOUR) * SLOT_MINUTES;
                          const timeVal = setMinutes(setHours(startOfDay(selectedDate), hr), mn);
                          const past = isToday(selectedDate) && isBefore(timeVal, now);
                          const unavailable = isUnavailable(hr, mn, member.id);
                          // Off-shift / break-covered slots are NOT clickable — the
                          // solid overlay communicates "no booking here"; owner moves
                          // the shift in /staff or removes the break first. Past in-shift
                          // slots stay owner-overridable (logging a forgotten appointment
                          // is a real workflow). Break tiles handle their own clicks via
                          // the BlockDialog overlay above this slot loop.
                          // In rebook mode, every in-shift slot is a valid drop target.
                          const clickable = !unavailable && (canOverride || !past);
                          return (
                            <div key={i}
                              onClick={() => {
                                if (!clickable) return;
                                if (past && canOverride && !rebookingApt) {
                                  toast.warning(`Logging a past appointment for ${member.firstName} (owner override)`);
                                }
                                openSlot(hr, mn, member.id);
                              }}
                              onMouseEnter={rebookingApt && clickable ? () => setRebookHover({ hour: hr, minute: mn, staffId: member.id }) : undefined}
                              className={cn(
                                'absolute left-0 right-0 transition-colors group/slot',
                                clickable && !past && !rebookingApt && 'hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer',
                                clickable && past && !rebookingApt && 'hover:bg-muted/60 cursor-pointer',
                                clickable && rebookingApt && 'hover:bg-foreground/[0.04] cursor-grab active:cursor-grabbing',
                                past && !unavailable && 'bg-muted/30',
                              )}
                              style={{ top: `${(i * SLOT_HEIGHT) / SUB_SLOTS_PER_HOUR}px`, height: `${SLOT_HEIGHT / SUB_SLOTS_PER_HOUR}px` }}
                              title={
                                past && canOverride && clickable && !rebookingApt
                                  ? `Log a past appointment for ${member.firstName} (owner override)`
                                  : undefined
                              }>
                              {clickable && !rebookingApt && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity">
                                  <PlusIcon className="h-3.5 w-3.5 text-blue-300 dark:text-blue-600" />
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
                </>
                )}
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
          creatorName={formatCreator(detailApt.createdBy)}
          creatorChip={renderCreatorChip(detailApt.createdBy, { uppercase: true })}
          onClose={() => setDetailApt(null)}
          onChangeStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
          onDelete={handleDelete}
          onFullUpdate={(id, changes) => fullUpdateMutation.mutate({ id, changes })}
          onCreatePending={async (clientId, slots) => {
            // Sequential creates so a partial failure leaves earlier slots
            // committed (consistent with how multi-day BlockDialog fans out).
            // `override: canOverride` matches the rest of the app — owner +
            // manager can deliberately stack a follow-up service against an
            // existing break (e.g. a second cut squeezed before lunch).
            // Receptionists hit the conflict and have to pick a clean slot.
            let created = 0;
            try {
              for (let i = 0; i < slots.length; i++) {
                const slot = slots[i];
                if (!slot.serviceId) continue;
                // slot.date/time are shop wall-clock — convert to the instant.
                const start = wallTimeToUtc(slot.date, slot.time);
                const end = new Date(start.getTime() + slot.durationMin * 60_000);
                try {
                  await appointmentsApi.create({
                    clientId,
                    staffId: slot.staffId,
                    serviceId: slot.serviceId,
                    startTime: start.toISOString(),
                    endTime: end.toISOString(),
                    status: 'scheduled',
                    notes: slot.notes || '',
                    locationId: officeId,
                    createdBy: currentUserId,
                    override: canOverride,
                  });
                  created++;
                } catch (err) {
                  // Re-throw with slot context so the modal toast is precise:
                  //   "Slot #2 (10:00) — booking conflicts with existing".
                  const slotLabel = `#${i + 2} · ${slot.time}`;
                  const baseMsg = (err as Error).message ?? 'Create failed';
                  throw new Error(`${slotLabel} — ${baseMsg}`);
                }
              }
              toast.success(t('calendar.scheduleUpdated'));
            } finally {
              // Invalidate even on partial success so the calendar reflects
              // however many slots did get committed.
              if (created > 0) {
                queryClient.invalidateQueries({ queryKey: ['appointments', officeId] });
                queryClient.invalidateQueries({ queryKey: ['appointments', 'all-offices'] });
              }
            }
          }}
          onRebook={(a) => {
            // Enter rebook mode — calendar becomes a slot picker. The next
            // slot click anywhere (any barber, any time) moves this apt
            // there. Banner at the top of the page makes the mode visible
            // and offers Cancel.
            setDetailApt(null);
            setRebookingApt(a);
          }}
          canEditFully={canOverride /* owner + manager */}
          staffList={allStaff}
          serviceList={services}
          categories={categories}
          isUpdating={updateStatusMutation.isPending || fullUpdateMutation.isPending}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {/* ─── Drag-reschedule confirmation — chip-pair diff design ───
          Status spine on the left edge identifies the appointment's status
          at a glance. Diff rows render as paired chips (faded old + bold
          new) with an animated arrow between them. Save button echoes the
          new time inline so the operator confirms by reading the action. */}
      {/* ─── Break drag-reschedule confirmation ─────────────────────
          When a *weekly* break is dragged, we don't know if the operator
          wants to move every {dayOfWeek} forever or just today. This Dialog
          asks. one-off breaks bypass the modal and commit directly. */}
      <Dialog open={!!breakDragConfirm} onOpenChange={(o) => { if (!o) setBreakDragConfirm(null); }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {breakDragConfirm && (() => {
            const brk = allBreaks.find(b => b.id === breakDragConfirm.brkId);
            if (!brk) return null;
            const labelKey = `break.${brk.type}` as TranslationKey;
            const typeLabel = brk.type === 'custom' && brk.customLabel ? brk.customLabel : t(labelKey);
            const dayLabel = t(`days.${brk.dayOfWeek}` as TranslationKey);
            const oldRange = `${brk.startTime}–${brk.endTime}`;
            const newRange = `${breakDragConfirm.newStartTime}–${breakDragConfirm.newEndTime}`;
            return (
              <div>
                <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t('break.dragConfirmEyebrow')}
                  </p>
                  <DialogTitle className="text-xl font-bold tracking-tight">
                    {typeLabel}
                  </DialogTitle>
                </DialogHeader>

                {/* Diff: old → new range */}
                <div className="px-6 py-4 flex items-center gap-3 border-b border-border">
                  <span className="text-[13px] tabular-nums text-muted-foreground line-through">{oldRange}</span>
                  <span className="text-muted-foreground/50">→</span>
                  <span className="text-[15px] font-bold tabular-nums text-foreground">{newRange}</span>
                </div>

                {/* Two options: only this date / all weekly occurrences */}
                <div className="px-6 py-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      breakSplitMut.mutate({
                        brk,
                        targetDate: breakDragConfirm.targetDate,
                        newStart: breakDragConfirm.newStartTime,
                        newEnd: breakDragConfirm.newEndTime,
                      });
                      setBreakDragConfirm(null);
                    }}
                    className="w-full rounded-md border border-border p-3.5 text-left hover:border-foreground/40 hover:bg-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <p className="text-[13px] font-bold text-foreground">
                      {t('break.dragOnlyThis').replace('{day}', dayLabel)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t('break.dragOnlyThisHint')}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      breakUpsertMut.mutate({
                        ...brk,
                        startTime: breakDragConfirm.newStartTime,
                        endTime: breakDragConfirm.newEndTime,
                      });
                      setBreakDragConfirm(null);
                    }}
                    className="w-full rounded-md border-2 border-foreground bg-foreground p-3.5 text-left text-background hover:bg-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <p className="text-[13px] font-bold">
                      {t('break.dragAll').replace('{day}', dayLabel)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-background/70">
                      {t('break.dragAllHint')}
                    </p>
                  </button>
                </div>

                <div className="px-6 py-3 border-t border-border bg-muted/25 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBreakDragConfirm(null)}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {dragConfirm && (() => {
        const oldStart = parseISO(dragConfirm.oldStartTime);
        const newStart = parseISO(dragConfirm.newStartTime);
        const timeChanged = oldStart.getTime() !== newStart.getTime();
        const staffChanged = dragConfirm.oldStaffId !== dragConfirm.newStaffId;
        const apt = appointments.find(a => a.id === dragConfirm.aptId);
        const status = apt?.status ?? 'scheduled';
        const spineCls =
          status === 'confirmed' ? 'bg-emerald-500'
            : status === 'completed' ? 'bg-foreground'
            : status === 'cancelled' ? 'bg-rose-500'
            : status === 'no-show' ? 'bg-amber-500'
            : 'bg-blue-500';
        const newTimeLabel = formatTime(newStart, timeFormat);
        const rowVariants = {
          hidden: reduceMotion ? { opacity: 1 } : { opacity: 0, x: -8 },
          visible: { opacity: 1, x: 0, transition: { duration: 0.32, ease: MOTION_EASE } },
        };

        const DiffRow = ({
          label, oldText, newText, big,
        }: { label: string; oldText: string; newText: string; big?: boolean }) => (
          <motion.div variants={rowVariants} className="space-y-1.5">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/75">{label}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                'inline-flex items-center rounded-md px-2.5 py-1 bg-muted/55 text-muted-foreground/75 line-through decoration-muted-foreground/40 tabular-nums truncate max-w-[45%]',
                big ? 'text-[15px] font-medium' : 'text-[13px] font-medium',
              )}>
                {oldText}
              </span>
              <motion.span
                aria-hidden
                animate={reduceMotion ? {} : { x: [0, 3, 0] }}
                transition={reduceMotion ? {} : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-flex"
              >
                <ArrowRightIcon className="h-4 w-4 text-foreground/55" />
              </motion.span>
              <span className={cn(
                'inline-flex items-center rounded-md px-2.5 py-1 bg-foreground/[0.06] ring-1 ring-foreground/15 text-foreground tabular-nums shadow-sm truncate',
                big ? 'text-[20px] font-bold tracking-tight' : 'text-[14px] font-bold',
              )}>
                {newText}
              </span>
            </div>
          </motion.div>
        );

        return (
          <Dialog open onOpenChange={(o) => { if (!o) setDragConfirm(null); }}>
            <DialogContent className="!w-[calc(100vw-2rem)] !max-w-[440px] p-0 gap-0 overflow-hidden [&>button]:hidden">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
                className="relative"
              >
                {/* Status spine — colored left edge mirroring the apt's tile */}
                <div className={cn('absolute left-0 top-0 bottom-0 w-1', spineCls)} />

                {/* Custom close — top-right, transparent over header */}
                <button
                  type="button"
                  onClick={() => setDragConfirm(null)}
                  aria-label="Close"
                  className="absolute top-3 right-3 inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 z-10"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>

                {/* Header eyebrow */}
                <div className="pl-7 pr-12 pt-6 pb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/85">
                    {t('calendar.confirmChangesEyebrow')}
                  </p>
                </div>
                <DialogHeader className="sr-only">
                  <DialogTitle>{t('calendar.confirmChangesEyebrow')}</DialogTitle>
                </DialogHeader>

                {/* Diff rows — stagger-fade in from left */}
                <motion.div
                  initial="hidden"
                  animate="visible"
                  transition={{ staggerChildren: reduceMotion ? 0 : 0.06, delayChildren: reduceMotion ? 0 : 0.04 }}
                  className="pl-7 pr-7 pb-5 space-y-3.5"
                >
                  {timeChanged && (
                    <DiffRow
                      label={t('calendar.changeTimeRow')}
                      oldText={formatTime(oldStart, timeFormat)}
                      newText={newTimeLabel}
                      big
                    />
                  )}
                  {staffChanged && (
                    <DiffRow
                      label={t('calendar.changeStaffRow')}
                      oldText={dragConfirm.oldStaffName}
                      newText={dragConfirm.newStaffName}
                    />
                  )}
                </motion.div>

                {/* Footer — Save echoes the new time, Cancel as outline */}
                <div className="border-t border-border bg-muted/20 px-6 py-4 flex flex-col gap-2.5">
                  <Button
                    onClick={() => {
                      // Snapshot OLD values for the Undo action — once the
                      // mutation fires, the cache holds the new state.
                      const oldStartTime = dragConfirm.oldStartTime;
                      const oldEndTime = parseISO(dragConfirm.oldStartTime).getTime() + (parseISO(dragConfirm.newEndTime).getTime() - parseISO(dragConfirm.newStartTime).getTime());
                      const oldStaffId = dragConfirm.oldStaffId;
                      const aptId = dragConfirm.aptId;
                      // Suppress the auto-toast so we can show our own with
                      // an Undo action.
                      suppressNextUpdateToast.current = true;
                      fullUpdateMutation.mutate({
                        id: aptId,
                        changes: {
                          startTime: dragConfirm.newStartTime,
                          endTime: dragConfirm.newEndTime,
                          staffId: dragConfirm.newStaffId,
                        },
                      });
                      // Custom toast with Undo. 6s window — long enough to
                      // catch a misclick, short enough not to clutter the screen.
                      toast.success(t('toast.appointmentUpdated'), {
                        duration: 6000,
                        action: {
                          label: 'Undo',
                          onClick: () => {
                            fullUpdateMutation.mutate({
                              id: aptId,
                              changes: {
                                startTime: oldStartTime,
                                endTime: new Date(oldEndTime).toISOString(),
                                staffId: oldStaffId,
                              },
                            });
                          },
                        },
                      });
                      setDragConfirm(null);
                    }}
                    className="w-full h-11 text-[14px] font-semibold gap-2"
                  >
                    <span>{t('common.saveChanges')}</span>
                    {timeChanged && (
                      <span className="text-[12px] tabular-nums opacity-85 px-1.5 py-0.5 rounded bg-primary-foreground/15">
                        {newTimeLabel}
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDragConfirm(null)}
                    className="w-full h-11 text-[14px] font-semibold border-border text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ─── Block dialog (lunch / dinner / rest / day-off / vacation / sick / training) ─── */}
      {blockState && (
        <BlockDialog
          state={blockState}
          onClose={() => setBlockState(null)}
          onSaved={() => setBlockState(null)}
          // Booking ↔ Block mode tab — only wired in create mode (BlockDialog
          // hides the tab in edit). Carries the chosen staff over so the
          // operator doesn't have to re-pick the column they were targeting.
          onSwitchToBooking={blockState.mode === 'create' ? ({ staffId }) => {
            setBlockState(null);
            closeCreate();
            // Pre-fill date+time so the booking flow has a starting point —
            // user picked a "general" intent, default to today + next 15 min.
            setCreateDate(format(selectedDate, 'yyyy-MM-dd'));
            const next = new Date();
            const m = Math.ceil(next.getMinutes() / 15) * 15;
            if (m >= 60) { next.setHours(next.getHours() + 1); next.setMinutes(0); }
            else next.setMinutes(m);
            setCreateTime(format(next, 'HH:mm'));
            if (staffId) setFormData(f => ({ ...f, staffId }));
            setIsCreateOpen(true);
          } : undefined}
          staffList={allStaff}
          isOwner={isOwner}
          defaultDow={currentDow}
          appointments={allAppointments}
        />
      )}

      {/* ─── Walk-in dialog ─── */}
      {walkInOpen && (
        <WalkInDialog
          open={walkInOpen}
          onClose={() => { setWalkInOpen(false); setWalkInPrefill(undefined); }}
          activeStaff={activeStaff}
          services={services}
          clients={clients}
          officeId={officeId}
          staffColorMap={staffColorMap}
          prefillName={walkInPrefill}
        />
      )}

      {/* ─── Edit-day shift override modal ───
          Click on any gray off-shift band for owner/manager opens this.
          Three modes: Day off / Standard (use weekly default) / Custom hours.
          Saves a per-date ShiftOverride; Standard removes any existing one. */}
      {editDayModal && (
        <EditDayShiftModal
          open
          staffId={editDayModal.staffId}
          staffName={editDayModal.staffName}
          selectedDate={selectedDate}
          weeklyShift={allShifts.find(sh => sh.staffId === editDayModal.staffId && sh.dayOfWeek === currentDow) ?? null}
          existingOverride={overrideByStaff.get(editDayModal.staffId) ?? null}
          onClose={() => setEditDayModal(null)}
        />
      )}

      {/* ─── Create Modal — editorial pattern ───────────
          Eyebrow + display title. When/Service/Barber/Notes
          as labelled fields with shadcn primitives (no native
          inputs, no blue-tinted "When" panel). */}
      <Dialog open={isCreateOpen} onOpenChange={open => { if (!open) closeCreate(); }}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('calendar.addToCalendar')}</p>
            <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t('calendar.newAppointment')}
            </DialogTitle>
          </DialogHeader>

          {/* Mode tabs — match the BlockDialog tab strip so the operator can
              flip intent without restarting the flow. Clicking "Block" closes
              this dialog and opens BlockDialog with the chosen staff carried
              over (currentDow as default day). */}
          {canOverride && (
            <div className="flex border-b border-border -mx-6 px-6 -mt-2 mb-2">
              <button
                type="button"
                className="relative px-3 py-2 text-sm font-semibold text-foreground"
                aria-pressed
              >
                {t('calendar.tabBooking')}
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const carryStaffId = formData.staffId || selectedSlot?.staffId;
                  closeCreate();
                  setBlockState({
                    mode: 'create',
                    staffId: carryStaffId || undefined,
                    dayOfWeek: currentDow,
                  });
                }}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('calendar.tabBlock')}
              </button>
            </div>
          )}

          <div className="space-y-5">
            {/* When — date and time triggers. Both open Popovers:
                - Date  → MiniCalendar with month navigation + day grid.
                          Locale-aware display ("6 мая 2026" instead of the
                          ambiguous browser-default "06/05/2026").
                - Time  → TimePickerField with the dark alarm-clock hero,
                          LayoutGroup-spring pill animations on hour/minute
                          cells, and "Now" shortcut. Honors the operator's
                          time-format and granularity settings. */}
            <div>
              <p className="mb-2 text-[11px] font-semibold text-muted-foreground tracking-wide">
                {t('calendar.sectionWhen')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Popover open={createDatePickerOpen} onOpenChange={setCreateDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="group flex w-full items-center justify-between gap-2 rounded-md border border-input bg-input-background px-3 h-10 text-sm font-medium tabular-nums text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      aria-label={t('calendar.sectionWhen')}
                    >
                      <span className="truncate">
                        {createDate
                          ? format(parseISO(createDate), 'd MMM yyyy', { locale: dateLocale })
                          : <span className="text-muted-foreground/60">—</span>}
                      </span>
                      <CalendarDaysIcon className="h-4 w-4 text-muted-foreground/70 group-hover:text-foreground transition-colors shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <MiniCalendar
                      selectedDate={createDate ? parseISO(createDate) : selectedDate}
                      onSelectDate={(d) => {
                        setCreateDate(format(d, 'yyyy-MM-dd'));
                        setCreateDatePickerOpen(false);
                      }}
                      appointments={appointments}
                    />
                  </PopoverContent>
                </Popover>
                <TimePickerField
                  value={createTime}
                  onChange={setCreateTime}
                  timeFormat={timeFormat}
                  ariaLabel={t('calendar.sectionWhen')}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground/50">
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
            </div>

            {/* ─── WHO section ───────────────────────────── */}
            <div className="border-t border-border pt-5">
              <p className="mb-3 text-[11px] font-semibold text-muted-foreground tracking-wide">{t('calendar.sectionWho')}</p>

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
                    ...EMPTY_NEW_CLIENT_DRAFT,
                    fullName: !looksLikePhone && !looksLikeEmail ? q : '',
                    phone: looksLikePhone ? q : '',
                    email: looksLikeEmail ? q : '',
                  });
                  setIsCreatingClient(true);
                }}
                onCancelCreate={() => setIsCreatingClient(false)}
                newClient={newClient}
                onNewClientChange={setNewClient}
                onSubmitNewClient={() => {
                  const { firstName, lastName } = splitFullName(newClient.fullName);
                  createClientMut.mutate({
                    firstName,
                    lastName,
                    phone:     newClient.phone.trim(),
                    email:     newClient.email.trim(),
                    notes:     newClient.notes.trim(),
                    avatarUrl: newClient.avatarUrl?.trim() || undefined,
                    officeIds: [officeId],
                  });
                }}
                isSubmittingClient={createClientMut.isPending}
                onWalkIn={(prefill) => {
                  closeCreate();
                  setWalkInPrefill(prefill);
                  setWalkInOpen(true);
                }}
                onOpenProfile={(id) => setProfileSheetClientId(id)}
              />

              {/* Barber as a horizontal avatar chip strip — visual, fast to
                  scan, replaces the cramped dropdown. Wraps on narrow widths. */}
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold text-muted-foreground/70 tracking-wide">{t('calendar.barber')}</p>
                <div className="flex flex-wrap gap-2">
                  {activeStaff.map((m, i) => {
                    const c = getStaffColor(i);
                    const isActive = formData.staffId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, staffId: m.id }))}
                        className={cn(
                          'group relative inline-flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 transition-all',
                          isActive
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-card hover:border-foreground/30 hover:bg-accent/40',
                        )}
                        aria-pressed={isActive}
                      >
                        <Avatar className="h-7 w-7 ring-2 ring-background">
                          {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.firstName} />}
                          <AvatarFallback className={cn('text-[10px] font-bold', c.light, c.label)}>
                            {m.firstName[0]}{m.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{m.firstName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── WHAT section — services (Image #170-172) ───
                Selected services render as full-width cards with a scissor
                tile + name + meta line (with staff and computed time) + price
                + remove. The "Add service" CTA below is a full-width primary-
                tinted button — opens a Dialog-based picker (ServicePickerSheet)
                with search + categorized list. */}
            <div className="border-t border-border pt-5">
              <p className="mb-3 text-[11px] font-semibold text-muted-foreground tracking-wide">{t('calendar.sectionWhat')}</p>
              {(() => {
                const picked = formData.serviceIds.map(id => services.find(s => s.id === id)).filter((s): s is Service => !!s);
                const totalDuration = picked.reduce((sum, s) => sum + s.duration, 0);
                const totalPrice    = picked.reduce((sum, s) => sum + s.price, 0);
                const staff = allStaff.find(s => s.id === formData.staffId);
                const staffShort = staff ? staff.firstName : '';
                // Compute sequential start times — each service starts where
                // the previous ended. baseHM matches the form's "When" field.
                const formatHM = (mins: number) => {
                  const h = Math.floor(mins / 60);
                  const m = mins % 60;
                  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                };
                const timeParts = createTime.match(/^(\d{2}):(\d{2})$/);
                const baseMin = timeParts ? Number(timeParts[1]) * 60 + Number(timeParts[2]) : 0;
                let cursorMin = baseMin;
                return (
                  <div className="space-y-2.5">
                    <AnimatePresence initial={false}>
                      {picked.map((svc, idx) => {
                        const startHM = formatHM(cursorMin);
                        cursorMin += svc.duration;
                        const palette = paletteForCategory(svc.categoryId);
                        const initials = svc.name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
                        return (
                          <motion.div
                            key={svc.id}
                            layout
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0, scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.6 }}
                            className="relative flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 overflow-hidden hover:border-foreground/20 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)] transition-[border-color,box-shadow] duration-200"
                          >
                            {/* Sequence index thread — small "1·2·3" mark on
                                left edge when multi-service. Helps operator
                                track which service runs in which order. */}
                            {picked.length > 1 && (
                              <span
                                aria-hidden
                                className={cn(
                                  'absolute left-0 top-2 bottom-2 w-1 rounded-r-full',
                                  palette.dot,
                                )}
                              />
                            )}
                            {/* Gradient thumbnail — same vocabulary as the picker
                                row. Two-letter initials reinforce service identity. */}
                            <div className={cn(
                              'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[14px] font-bold text-white shadow-[0_0_0_1px_rgba(0,0,0,0.04)]',
                              palette.grad,
                              picked.length > 1 && 'ml-1.5',
                            )}>
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {picked.length > 1 && (
                                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-[10px] font-bold tabular-nums text-muted-foreground shrink-0">
                                    {idx + 1}
                                  </span>
                                )}
                                <p className="text-[14px] font-semibold tracking-tight text-foreground truncate">
                                  {svc.name}
                                </p>
                              </div>
                              {/* Meta chips — staff + start-time + duration as
                                  paired pills with icons. Skim-friendly. */}
                              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                {staffShort && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    <UserIcon className="h-2.5 w-2.5" />
                                    {staffShort}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                                  <ClockIcon className="h-2.5 w-2.5" />
                                  {startHM}
                                </span>
                                <span className="inline-flex items-center rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                                  {svc.duration}m
                                </span>
                              </div>
                            </div>
                            {/* Stacked price column — BIG bold + small muted */}
                            <div className="shrink-0 text-right tabular-nums">
                              <p className="text-[15px] font-bold text-foreground leading-none">
                                €{svc.price}
                              </p>
                            </div>
                            {/* Remove — small, muted, scale-pulse on hover */}
                            <motion.button
                              type="button"
                              onClick={() => setFormData(f => ({ ...f, serviceIds: f.serviceIds.filter(id => id !== svc.id) }))}
                              aria-label={t('calendar.removeService')}
                              whileHover={{ scale: 1.1, rotate: 90 }}
                              whileTap={{ scale: 0.92 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                              className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </motion.button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    {/* Total line — only when 2+ services. Animated mount/unmount. */}
                    <AnimatePresence>
                      {picked.length > 1 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.2, ease: MOTION_EASE }}
                          className="flex items-center justify-between px-3 text-[12px]"
                        >
                          <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                            {t('calendar.servicesTotal').split('·')[0].trim()}
                          </span>
                          <span className="tabular-nums">
                            <span className="text-muted-foreground">{totalDuration}m</span>
                            <span className="mx-1.5 text-muted-foreground/50">·</span>
                            <span className="font-semibold text-foreground">€{totalPrice}</span>
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {/* Add (another) service trigger — Select-dropdown style
                        per Image #183 + motion polish. Plus-icon prefix when
                        empty (signals "create"); chevron rotates on hover to
                        signal "this opens something". */}
                    <motion.button
                      type="button"
                      onClick={() => setAddServiceOpen(true)}
                      whileHover={{ scale: 1.005 }}
                      whileTap={{ scale: 0.995 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                      className="group w-full inline-flex items-center justify-between gap-2 h-11 rounded-lg border border-border bg-card px-3 text-sm hover:bg-accent/40 hover:border-foreground/30 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)] transition-[border-color,background,box-shadow,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                          <PlusIcon className="h-3 w-3" strokeWidth={2.5} />
                        </span>
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                          {picked.length === 0 ? t('calendar.addService').replace('+ ', '') : t('calendar.addAnotherService').replace('+ ', '')}
                        </span>
                      </span>
                      <ChevronDownIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:rotate-180 transition-all duration-200" />
                    </motion.button>
                  </div>
                );
              })()}
            </div>

            {/* ─── REPEAT — pro-max with timeline visualization ─────
                Toggle ON unfolds steppers + visual occurrence timeline + end-
                date footer. Section gets a soft blue tint when active. The
                timeline strip turns abstract numbers ("every 1 week × 4")
                into concrete dates ("May 7 → 14 → 21 → 28") so operators see
                what they're scheduling. */}
            <div className={cn(
              'border-t border-border pt-5 -mx-1 px-1 rounded-md transition-colors duration-300',
              recurrenceEnabled && 'bg-blue-50/40 dark:bg-blue-950/15',
            )}>
              <div className="flex items-center justify-between gap-3 px-2">
                <div className="inline-flex items-center gap-2.5">
                  <span className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                    recurrenceEnabled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground/70',
                  )}>
                    <ArrowPathIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </span>
                  <p className="text-base font-bold tracking-tight text-foreground">
                    {t('calendar.repeatToggle')}
                  </p>
                </div>
                <Switch checked={recurrenceEnabled} onCheckedChange={setRecurrenceEnabled} aria-label={t('calendar.repeatToggle')} />
              </div>
              <AnimatePresence initial={false}>
                {recurrenceEnabled && (() => {
                  const wKey = pluralKey(language, recurrenceWeeks);
                  const tKey = pluralKey(language, recurrenceCount);
                  const weekUnit = t(wKey === 'One' ? 'calendar.weeksOne' : wKey === 'Few' ? 'calendar.weeksFew' : 'calendar.weeksMany');
                  const timeUnit = t(tKey === 'One' ? 'calendar.timesOne' : tKey === 'Few' ? 'calendar.timesFew' : 'calendar.timesMany');
                  const dateParts = createDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                  let occDates: Date[] = [];
                  let untilLabel = '';
                  if (dateParts) {
                    const base = new Date(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]));
                    occDates = Array.from({ length: Math.min(recurrenceCount, 52) }, (_, i) => addWeeks(base, i * recurrenceWeeks));
                    const last = occDates[occDates.length - 1];
                    untilLabel = format(last, 'EEEE, d MMMM yyyy', { locale: dateLocale });
                  }
                  // Timeline collapses "...···" middle when too many dots to fit
                  const visibleDots = occDates.length > 8
                    ? [...occDates.slice(0, 3), null, ...occDates.slice(-3)]
                    : occDates;
                  return (
                    <motion.div
                      key="recurrence-controls"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.32, ease: MOTION_EASE }}
                      className="overflow-hidden"
                    >
                      <div className="mt-5 px-2 space-y-5">
                        {/* Two stepper columns with stagger fade-in */}
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.08, duration: 0.28, ease: MOTION_EASE }}
                          className="grid grid-cols-2 gap-5"
                        >
                          <div>
                            <Label className="text-[13px] font-medium text-muted-foreground mb-2 block">
                              {t('calendar.repeatEvery')}
                            </Label>
                            <div className="flex items-center gap-2.5">
                              <Stepper value={recurrenceWeeks} onChange={setRecurrenceWeeks} min={1} max={12} ariaLabel={t('calendar.repeatEvery')} />
                              <span className="text-sm text-muted-foreground tabular-nums">{weekUnit}</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-[13px] font-medium text-muted-foreground mb-2 block">
                              {t('calendar.endsAfterLabel')}
                            </Label>
                            <div className="flex items-center gap-2.5">
                              <Stepper value={recurrenceCount} onChange={setRecurrenceCount} min={1} max={104} ariaLabel={t('calendar.endsAfterLabel')} />
                              <span className="text-sm text-muted-foreground tabular-nums">{timeUnit}</span>
                            </div>
                          </div>
                        </motion.div>

                        {/* Visual occurrence timeline — N dots evenly spaced
                            on a thin connector line, each labeled with its
                            date below. Operator instantly sees the schedule. */}
                        {visibleDots.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.16, duration: 0.32, ease: MOTION_EASE }}
                          >
                            <p className="text-[11px] font-semibold text-muted-foreground/80 mb-2.5 tracking-wide">
                              {t('calendar.scheduleLabel')}
                            </p>
                            {/* overflow-visible so edge labels aren't clipped; pb-8 keeps
                                space for the absolute date labels below each dot. */}
                            <div className="relative pt-2 pb-8 overflow-visible">
                              {/* Hairline connector — inset px-3 so it doesn't kiss the edge dots */}
                              <div className="absolute left-3 right-3 top-3 h-px bg-border" aria-hidden />
                              {/* Dots row — px-3 aligns first/last dot center with line endpoints */}
                              <div className="relative flex items-center justify-between px-3">
                                {visibleDots.map((d, i) => {
                                  if (d === null) {
                                    return (
                                      <span key={`gap-${i}`} className="text-muted-foreground/40 text-[10px] tabular-nums">···</span>
                                    );
                                  }
                                  const isFirst = i === 0;
                                  const isLast = i === visibleDots.length - 1;
                                  return (
                                    <motion.div
                                      key={d.toISOString()}
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ delay: 0.2 + i * 0.04, type: 'spring', stiffness: 460, damping: 20 }}
                                      className="relative flex flex-col items-center"
                                    >
                                      <span className={cn(
                                        'h-2.5 w-2.5 rounded-full ring-2',
                                        isFirst
                                          ? 'bg-primary ring-primary/25'
                                          : isLast
                                            ? 'bg-foreground ring-foreground/20'
                                            : 'bg-card ring-foreground/30',
                                      )} aria-hidden />
                                      {/* Center label under dot; first/last align to edges
                                          so they don't go out of bounds. */}
                                      <span className={cn(
                                        'absolute top-5 text-[10px] tabular-nums whitespace-nowrap',
                                        isFirst
                                          ? 'font-bold text-foreground left-0'
                                          : isLast
                                            ? 'font-semibold text-foreground right-0'
                                            : 'text-muted-foreground left-1/2 -translate-x-1/2',
                                      )}>
                                        {format(d, 'd MMM', { locale: dateLocale })}
                                      </span>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Footer chip — bigger and more prominent than v1.
                            Date is the main signal; refresh icon plays decorator. */}
                        {untilLabel && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.24, duration: 0.28, ease: MOTION_EASE }}
                            className="flex items-center gap-2.5 rounded-lg bg-card border border-border px-3.5 py-2.5"
                          >
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                              <ArrowPathIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                            </span>
                            <span className="text-[12.5px] text-muted-foreground">
                              {t('calendar.repeatsUntil').replace('{date}', '').trim().replace(/[,]?\s*$/, '')}
                              <span className="ml-1 font-bold text-foreground">{untilLabel}</span>
                            </span>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>

            {/* ─── NOTES — optional ─────────────────────── */}
            <div className="border-t border-border pt-5">
              <p className="mb-3 text-[11px] font-semibold text-muted-foreground tracking-wide">
                {t('calendar.sectionNotes')} <span className="text-muted-foreground/50 font-normal">· {t('calendar.notesOptional')}</span>
              </p>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                placeholder={t('calendar.specialRequests')}
                rows={2}
              />
            </div>

            {/* ─── Bottom action bar ──────────────────────
                Single hairline row. Live price + duration on the left
                (tabular-nums), Cancel + Save on the right. No more brutalist
                arrow + uppercase tracking — clean shadcn Button matches the
                competitor's restraint and stops competing visually with the
                form fields above. */}
            {(() => {
              const picked = formData.serviceIds.map(id => services.find(s => s.id === id)).filter((s): s is Service => !!s);
              const totalPrice = picked.reduce((sum, s) => sum + s.price, 0);
              const totalDuration = picked.reduce((sum, s) => sum + s.duration, 0);
              const summaryReady = picked.length > 0 && !!formData.staffId && !!formData.clientId && !!createDate && !!createTime;
              return (
                <div className="border-t border-border pt-5 flex items-center gap-3">
                  <div className="text-[11px] tabular-nums text-muted-foreground">
                    {picked.length > 0 ? (
                      <span><span className="font-semibold text-foreground">€{totalPrice}</span> · {totalDuration}m{picked.length > 1 && <span className="text-muted-foreground/60"> · {picked.length}×</span>}</span>
                    ) : (
                      <span className="text-muted-foreground/60">{t('calendar.selectService')}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={closeCreate}
                    className="ml-auto text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || !summaryReady}
                  >
                    {createMutation.isPending ? t('calendar.creating') : t('common.saveChanges')}
                  </Button>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Client Profile Sheet ──────────────────────
          Click on the selected-client tile inside the booking modal opens
          this. Edit pencil opens CreateClientModal stacked on top of the
          sheet (sheet stays mounted). Appointments are hydrated here at
          the data boundary because allAppointments is base Appointment[]
          (no joins) — passing it raw was the cause of the
          "Cannot read properties of undefined (reading 'name')" crash. */}
      <ClientProfileSheet
        open={!!profileSheetClientId}
        client={clients.find(c => c.id === profileSheetClientId) ?? null}
        appointments={
          profileSheetClientId
            ? allAppointments
                .filter(a => a.clientId === profileSheetClientId)
                .map(a => {
                  const service = services.find(s => s.id === a.serviceId);
                  const staff = allStaff.find(s => s.id === a.staffId);
                  const aptClient = clients.find(c => c.id === a.clientId);
                  if (!service || !staff || !aptClient) return null;
                  return { ...a, service, staff, client: aptClient } satisfies AppointmentWithDetails;
                })
                .filter((a): a is AppointmentWithDetails => a !== null)
                .sort((a, b) =>
                  parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime(),
                )
            : []
        }
        onClose={() => setProfileSheetClientId(null)}
        onEdit={() => {
          if (profileSheetClientId) setEditClientId(profileSheetClientId);
        }}
        t={t}
      />

      {/* ─── Edit-mode CreateClientModal ────────────
          Stacks on top of the profile sheet. Reuses the same modal as
          Create flow, with editingClient prop reseeding the draft and
          submit dispatching to clientsApi.update. */}
      <CreateClientModal
        open={!!editClientId}
        t={t}
        draft={editClientDraft}
        onChange={setEditClientDraft}
        onCancel={() => { setEditClientId(null); setEditClientDraft(EMPTY_NEW_CLIENT_DRAFT); }}
        onSubmit={() => {
          if (!editClientId) return;
          const { firstName, lastName } = splitFullName(editClientDraft.fullName);
          editClientMut.mutate({
            id: editClientId,
            data: {
              firstName,
              lastName,
              phone: editClientDraft.phone.trim(),
              email: editClientDraft.email.trim(),
              notes: editClientDraft.notes.trim(),
              ...(editClientDraft.avatarUrl?.trim()
                ? { avatarUrl: editClientDraft.avatarUrl.trim() }
                : {}),
            },
          });
        }}
        isSubmitting={editClientMut.isPending}
        editingClient={clients.find(c => c.id === editClientId) ?? null}
      />

      {/* ─── Service Picker Sheet — opened from booking modal "Add service" CTA */}
      <ServicePickerSheet
        open={addServiceOpen}
        onClose={() => setAddServiceOpen(false)}
        services={services}
        categories={categories}
        staffName={(() => {
          const s = allStaff.find(s => s.id === formData.staffId);
          return s ? s.firstName : '';
        })()}
        selectedIds={formData.serviceIds}
        onSelect={(serviceId) => setFormData(f => ({ ...f, serviceIds: [...f.serviceIds, serviceId] }))}
        t={t}
      />

      {/* ─── Conflict Dialog — editorial pattern ─────
          Amber eyebrow signals exception state. Conflict
          rows are hairline-divided list (no muted panels). */}
      <Dialog open={!!conflictState} onOpenChange={(open) => !open && setConflictState(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Conflict
            </p>
            <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
              Already booked
            </DialogTitle>
          </DialogHeader>
          {(() => {
            // Detect whether the conflicts are at the SAME office (true double-book)
            // or CROSS-OFFICE (barber works at two shops, can't be in two places at once).
            // The wording adapts so it's never misleading. Break-only conflicts get
            // their own message — "this slot overlaps a scheduled break."
            const conflicts = conflictState?.conflicts ?? [];
            const breakConflicts = conflictState?.breakConflicts ?? [];
            const pendingLocationId = conflictState?.pending[0]?.locationId;
            const allCrossOffice = conflicts.length > 0 && conflicts.every((c) => c.office.id !== pendingLocationId);
            const sameOffice = conflicts.length > 0 && conflicts.every((c) => c.office.id === pendingLocationId);
            const breakOnly = conflicts.length === 0 && breakConflicts.length > 0;
            return (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {breakOnly
                  ? 'This time slot overlaps a scheduled break for this barber.'
                  : allCrossOffice
                    ? 'This barber is already working at the other shop during this slot.'
                    : sameOffice
                      ? 'This time slot already has a booking with this barber.'
                      : 'This barber has overlapping bookings during this slot.'}
              </p>
            );
          })()}

          {/* Conflict rows — hairline-divided, full-bleed list (no muted panels).
              Tabular-nums on the date+time so the list reads as a ledger.
              Both appointment-conflicts and break-conflicts are rendered here. */}
          <div className="divide-y divide-border border-y border-border -mx-6 mt-1">
            {conflictState?.conflicts.map(({ appointment, office }) => {
              const cs = new Date(appointment.startTime);
              const ce = new Date(appointment.endTime);
              return (
                <div key={appointment.id} className="px-6 py-3.5">
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {format(cs, 'EEE, MMM d')} · {formatTime(cs, timeFormat)} — {formatTime(ce, timeFormat)}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    <MapPinIcon className="h-3 w-3 shrink-0" />
                    {office.name}
                    <span className="normal-case tracking-normal text-muted-foreground/70">· {office.address}</span>
                  </p>
                </div>
              );
            })}
            {conflictState?.breakConflicts.map(({ break: brk }) => {
              const Icon = BLOCK_ICON[brk.type];
              const breakLabel = brk.type === 'custom' && brk.customLabel?.trim()
                ? brk.customLabel.trim()
                : t(BLOCK_TKEY[brk.type]);
              return (
                <div key={brk.id} className="px-6 py-3.5">
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {brk.startTime} — {brk.endTime}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
                    <Icon className="h-3 w-3 shrink-0" />
                    {t('block.groupBreak')}
                    <span className="normal-case tracking-normal text-muted-foreground/70">· {breakLabel}</span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* Owner-only override note — sets context for the destructive button */}
          {canOverride && (
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-1">
              <span className="font-semibold text-foreground">Override</span> books this slot anyway —
              the existing appointment stays. Use only if you're knowingly double-booking.
            </p>
          )}

          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => setConflictState(null)}
              className="flex-1 inline-flex items-center justify-center rounded-md border border-border bg-card h-10 px-4 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Pick another time
            </button>
            {canOverride && (
              <button
                type="button"
                onClick={confirmOverride}
                disabled={createMutation.isPending}
                className="group inline-flex items-center bg-red-600 dark:bg-red-500 text-white py-0 pl-5 pr-0 text-sm font-semibold uppercase tracking-[0.18em] hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="py-3 text-left tabular-nums">
                  {createMutation.isPending ? 'Overriding…' : 'Override'}
                </span>
                <span className="border-l border-white/30 p-3 inline-flex items-center transition-transform duration-200 group-hover:translate-x-[2px]">
                  <ArrowRightIcon className="h-4 w-4" />
                </span>
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Floating Action Button — quick "new booking" entry point ─────
          Lives at fixed bottom-right so receptionists can fire a booking
          from any scroll position, even mid-call. Hidden when any modal is
          already open (avoid stacking) or in rebook mode (banner takes top).
          Spring entrance + press feedback give it the "primary action" weight
          competitor apps use. */}
      <AnimatePresence>
        {!isCreateOpen && !blockState && !conflictState && !rebookingApt && !detailApt && (
          <motion.button
            key="fab-new-booking"
            type="button"
            onClick={openCreateFromHeader}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.6, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            whileHover={reduceMotion ? undefined : { y: -2, scale: 1.04 }}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            className={cn(
              'fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-foreground text-background ring-1 ring-foreground/20 flex items-center justify-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-foreground/25 transition-shadow',
              ELEVATION.fab,
            )}
            aria-label={t('calendar.newAppointment')}
            title={t('calendar.newAppointment')}
          >
            <PlusIcon className="h-6 w-6" strokeWidth={2.4} />
          </motion.button>
        )}
      </AnimatePresence>
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
interface NewClientDraft {
  fullName: string;
  phone: string;
  email: string;
  notes: string;
  avatarUrl: string;
  marketingOk: boolean;
}

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
  newClient: NewClientDraft;
  onNewClientChange: (v: NewClientDraft) => void;
  onSubmitNewClient: () => void;
  isSubmittingClient: boolean;
  /** Optional. When provided, the empty-state dropdown surfaces a
   *  "Walk-in (no booking)" shortcut alongside "Create new client".
   *  When the user has typed a query, the shortcut label echoes that
   *  query and the prefill is forwarded — e.g., open WalkInDialog with
   *  the typed name pre-filled. Used by the booking dialog only —
   *  WalkInDialog's own ClientAutocomplete omits this to avoid a
   *  recursion of "walk-in inside walk-in." */
  onWalkIn?: (prefillName?: string) => void;
  /** Optional. When provided, clicking the selected-client tile body opens
   *  a focused profile sheet (contact info, notes, history). Threaded only
   *  by the booking dialog — WalkInDialog omits this for now. */
  onOpenProfile?: (id: string) => void;
}

// Highlight the matched substring inside a name. The whole name renders in
// `text-foreground`; the matched chunk gets `font-bold` so it pops out by
// weight (not color) — same trick the competitor uses.
function highlightMatch(text: string, query: string): React.ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const lower = text.toLowerCase();
  const q = trimmed.toLowerCase();
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      out.push(<span key={key++}>{text.slice(i)}</span>);
      break;
    }
    if (idx > i) out.push(<span key={key++}>{text.slice(i, idx)}</span>);
    out.push(
      <span key={key++} className="font-bold text-foreground">
        {text.slice(idx, idx + q.length)}
      </span>,
    );
    i = idx + q.length;
  }
  return <>{out}</>;
}

function ClientAutocomplete({
  t, clients, selectedClientId, onSelectClient, search, onSearchChange,
  isCreatingClient, onStartCreate, onCancelCreate,
  newClient, onNewClientChange, onSubmitNewClient, isSubmittingClient,
  onWalkIn, onOpenProfile,
}: ClientAutocompleteProps) {
  const [language] = useLanguage();
  const selected = clients.find(c => c.id === selectedClientId);

  // Wrapper-level focus tracking. The dropdown stays open while focus
  // moves between the input and any item button (relatedTarget inside
  // the wrapper); it closes only when focus leaves the wrapper entirely.
  // This is the canonical combobox pattern — beats setTimeout hacks.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!wrapperRef.current?.contains(e.relatedTarget as Node | null)) {
      setIsFocused(false);
    }
  };

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return clients
      .filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [clients, search]);

  // Selected-client surface — clicking the inner row opens the profile
  // dialog; the trailing X button clears the selection without bubbling.
  if (selected && !isCreatingClient) {
    const grad = AVATAR_GRADIENTS[hashToIndex(selected.id, AVATAR_GRADIENTS.length)];
    const tileLocale = language === 'ru' ? ruLocale : language === 'lt' ? ltLocale : enLocale;
    const lastVisit = selected.lastVisitAt
      ? format(new Date(selected.lastVisitAt), 'MMM d, yyyy', { locale: tileLocale })
      : null;
    const profileEnabled = !!onOpenProfile;
    const previousVisitsKey = (`clientSheet.previousVisits${pluralKey(language, selected.totalVisits)}`) as TranslationKey;
    const previousVisitsText = t(previousVisitsKey).replace('{count}', String(selected.totalVisits));
    const lastVisitLine = lastVisit
      ? `· ${t('clientSheet.metaLast').replace('{date}', lastVisit)}`
      : null;
    return (
      <div>
        <Label className="text-sm">{t('calendar.client')}</Label>
        <div className="mt-1.5 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!profileEnabled}
              onClick={() => onOpenProfile?.(selected.id)}
              className={cn(
                'flex min-w-0 flex-1 items-center gap-3 rounded-md text-left -m-1 p-1 transition-colors',
                profileEnabled
                  ? 'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 cursor-pointer'
                  : 'cursor-default',
              )}
              aria-label={profileEnabled
                ? t('clientSheet.openProfile').replace('{name}', `${selected.firstName} ${selected.lastName}`)
                : undefined}
            >
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white', grad)}>
                {selected.firstName[0]}{selected.lastName[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">{selected.firstName} {selected.lastName}</p>
                <p className="text-xs text-muted-foreground truncate tabular-nums">{selected.phone}</p>
              </div>
            </button>
            {/* Clear-selection X button. Replaces the prior "Change" text link —
                more iconic, smaller footprint. stopPropagation keeps the outer
                profile-open click target from also firing. */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelectClient(''); onSearchChange(''); }}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              aria-label={t('clientPicker.clearClient')}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          {(selected.totalVisits > 0 || lastVisit) && (
            <div className="mt-2 pt-2 border-t border-border/60 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="tabular-nums">{previousVisitsText}</span>
              {lastVisitLine && <span>{lastVisitLine}</span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Picker — Input + focus + query gated dropdown. Empty focused state shows
  // nothing extra (clean — operator just sees the input). Once they type, the
  // dropdown appears with query-echoed CTAs + Results. This keeps the modal
  // visually quiet at default and surfaces actions only when there's intent.
  const hasQuery = !!search.trim();
  const showDropdown = isFocused && hasQuery;

  return (
    <>
      <div ref={wrapperRef} onFocus={() => setIsFocused(true)} onBlur={handleBlur}>
        <Label className="text-sm">{t('calendar.client')}</Label>
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('calendar.searchClient')}
          className="mt-1.5"
          autoFocus
        />

        <AnimatePresence initial={false}>
          {showDropdown && (
            <motion.div
              key="autocomplete-dropdown"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: MOTION_EASE }}
              className="mt-1.5 rounded-lg border border-border bg-card overflow-hidden"
            >
              {/* CTA 1 — Create new client (echoes query when present) */}
              <button
                type="button"
                onClick={onStartCreate}
                className="group flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-accent transition-colors focus-visible:outline-none focus-visible:bg-accent"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                  <PlusIcon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm font-medium text-foreground truncate">
                  {hasQuery
                    ? t('clientPicker.createNewWith').replace('{query}', search.trim())
                    : t('calendar.createNewClient')}
                </span>
                <ArrowRightIcon className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/60 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* CTA 2 — Walk-in (echoes query when present) */}
              {onWalkIn && (
                <button
                  type="button"
                  onClick={() => onWalkIn(hasQuery ? search.trim() : undefined)}
                  className="group flex w-full items-center gap-3 px-3 py-3 text-left border-t border-border/60 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:bg-accent"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-foreground group-hover:bg-foreground/15 transition-colors">
                    <BoltIcon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-foreground truncate">
                    {hasQuery
                      ? t('clientPicker.saveWalkInWith').replace('{query}', search.trim())
                      : t('calendar.walkInShortcut')}
                  </span>
                  <ArrowRightIcon className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/60 group-hover:translate-x-0.5 transition-all" />
                </button>
              )}

              {/* Results — only when query has matches. Eyebrow header
                  separates the two CTAs above from the matched clients. */}
              {hasQuery && matches.length > 0 && (
                <div className="border-t border-border/60">
                  <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                    {t('clientPicker.results')}
                  </p>
                  <div className="max-h-72 overflow-y-auto">
                    {matches.map(c => {
                      const grad = AVATAR_GRADIENTS[hashToIndex(c.id, AVATAR_GRADIENTS.length)];
                      const fullName = `${c.firstName} ${c.lastName}`.trim();
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onSelectClient(c.id)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors focus-visible:outline-none focus-visible:bg-accent"
                        >
                          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white', grad)}>
                            {c.firstName[0]}{c.lastName[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground/85 truncate">
                              {highlightMatch(fullName, search)}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {c.phone}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dedicated create-client modal — opens above the booking dialog
          when the operator picks "Create new client". Single full-name
          field (split on save), LT-prefixed phone, optional notes,
          marketing toggle + GDPR link, Cancel/Save footer. */}
      <CreateClientModal
        open={isCreatingClient}
        t={t}
        draft={newClient}
        onChange={onNewClientChange}
        onCancel={onCancelCreate}
        onSubmit={onSubmitNewClient}
        isSubmitting={isSubmittingClient}
      />
    </>
  );
}

// ─── CreateClientModal ──────────────────────────────────────────
// Standalone Dialog opened from the booking flow's "Create new client"
// shortcut OR from the profile sheet's edit pencil. Single full-name
// field, LT phone prefix, email, notes, marketing toggle. When
// `editingClient` is present, the modal reseeds the draft from that
// client whenever its id changes, swaps title/eyebrow copy, and the
// parent dispatches `onSubmit` to clientsApi.update instead of create.
function CreateClientModal({
  open, t, draft, onChange, onCancel, onSubmit, isSubmitting, editingClient = null,
}: {
  open: boolean;
  t: (key: TranslationKey) => string;
  draft: NewClientDraft;
  onChange: (v: NewClientDraft) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  editingClient?: Client | null;
}) {
  const isEditMode = !!editingClient;
  const canSave = draft.fullName.trim().length > 0 && !isSubmitting;

  // When the modal is opened against a different client (or just opened
  // in edit mode for the first time), reseed the draft from that client.
  // Keying off `editingClient?.id` prevents an infinite loop while still
  // reacting to a swap-out across re-opens.
  useEffect(() => {
    if (!editingClient) return;
    onChange({
      fullName: `${editingClient.firstName} ${editingClient.lastName}`.trim(),
      phone: editingClient.phone ?? '',
      email: editingClient.email ?? '',
      notes: editingClient.notes ?? '',
      avatarUrl: editingClient.avatarUrl ?? '',
      marketingOk: false, // not stored on Client today; default off
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingClient?.id]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent
        className="!w-[calc(100vw-2rem)] !max-w-[480px] overflow-x-hidden p-0 gap-0 [&>button]:hidden"
      >
        {/* Header — eyebrow + display title, hairline divider below.
            In edit mode an identity anchor row (avatar + current name +
            phone) sits between the title and the divider so the operator
            never has to wonder which client they're editing. */}
        <div className="relative px-7 pt-6 pb-4 border-b border-border">
          <button
            type="button"
            onClick={onCancel}
            className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label={t('common.cancel')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {isEditMode ? t('clientSheet.editClientEyebrow') : t('calendar.newClient')}
          </p>
          <DialogTitle className="mt-1 text-2xl font-bold tracking-tight">
            {isEditMode ? t('clientSheet.editClient') : t('calendar.createClientTitle')}
          </DialogTitle>
          {isEditMode && editingClient && (
            <div className="mt-3 flex items-center gap-2.5 pt-3 border-t border-border/60">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[11px] font-bold text-white shadow-sm ring-1 ring-foreground/[0.06]',
                  AVATAR_GRADIENTS[hashToIndex(editingClient.id, AVATAR_GRADIENTS.length)],
                )}
              >
                {editingClient.firstName[0]}{editingClient.lastName[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate leading-tight">
                  {editingClient.firstName} {editingClient.lastName}
                </p>
                {editingClient.phone && (
                  <p className="text-[11px] text-muted-foreground truncate tabular-nums leading-tight mt-0.5">
                    {editingClient.phone}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-7 py-5 space-y-5">
          {/* Full name — single field, headline weight on focus */}
          <div className="min-w-0">
            <Label htmlFor="cc-full-name" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              {t('calendar.fullName')} <span className="text-primary">*</span>
            </Label>
            <Input
              id="cc-full-name"
              autoFocus
              value={draft.fullName}
              onChange={(e) => onChange({ ...draft, fullName: e.target.value })}
              className="mt-1.5 h-11 text-base"
            />
          </div>

          {/* Phone + Email — single full-width inputs. The LT prefix box
              was dropped because it conflicted with international numbers
              (e.g., +998 for an Uzbek client showed as "+370 +998..." which
              read as nonsense). Placeholder gives the LT format hint
              without lying about international values. */}
          <div className="grid grid-cols-2 gap-3 min-w-0">
            <div className="min-w-0">
              <Label htmlFor="cc-phone" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                {t('calendar.phoneNumber')}
              </Label>
              <Input
                id="cc-phone"
                value={draft.phone}
                onChange={(e) => onChange({ ...draft, phone: e.target.value })}
                placeholder="+370 6XX XXX XXX"
                inputMode="tel"
                className="mt-1.5 h-11 tabular-nums"
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="cc-email" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                {t('calendar.emailAddress')}
              </Label>
              <Input
                id="cc-email"
                type="email"
                value={draft.email}
                onChange={(e) => onChange({ ...draft, email: e.target.value })}
                className="mt-1.5 h-11"
              />
            </div>
          </div>

          {/* Note */}
          <div className="min-w-0">
            <Textarea
              value={draft.notes}
              onChange={(e) => onChange({ ...draft, notes: e.target.value })}
              placeholder={t('calendar.clientNotePlaceholder')}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Marketing toggle + GDPR link */}
          <div className="flex items-start gap-3 pt-1">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{t('calendar.marketingComms')}</p>
              <a
                href="https://gdpr.eu/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
              >
                {t('calendar.gdprLearnMore')}
                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              </a>
            </div>
            <Switch
              checked={draft.marketingOk}
              onCheckedChange={(v) => onChange({ ...draft, marketingOk: v })}
              aria-label={t('calendar.marketingComms')}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-border flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={!canSave}>
            {isSubmitting ? '…' : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── ClientProfileSheet ──────────────────────────────────────────
// Centered Dialog opened by clicking the selected-client tile in the
// booking flow. Editorial layout with hairline dividers between
// sections (no nested cards), icon-prefixed contact rows, compact
// inline empty states, and a stagger motion entrance. Edit pencil
// delegates back up to the parent so CreateClientModal can open in
// edit mode stacked on top (booking dialog → profile dialog → edit
// modal — three layers of Radix portals; ESC pops them in reverse).
type HistoryTab = 'all' | 'upcoming' | 'completed' | 'cancelled';

function ClientProfileSheet({
  open, client, appointments, onClose, onEdit, t,
}: {
  open: boolean;
  client: Client | null;
  appointments: AppointmentWithDetails[];
  onClose: () => void;
  onEdit: () => void;
  t: (key: TranslationKey) => string;
}) {
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
  const [language] = useLanguage();
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [historyTab, setHistoryTab] = useState<HistoryTab>('all');

  // Reset on (re)open or client swap so a previous client's draft note
  // never leaks into a fresh open against someone else.
  useEffect(() => {
    if (!open) return;
    setNoteEditing(false);
    setNoteDraft(client?.notes ?? '');
    setHistoryTab('all');
  }, [open, client?.id]);

  const updateNoteMut = useMutation({
    mutationFn: (notes: string) => clientsApi.update(client!.id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setNoteEditing(false);
      toast.success(t('toast.clientUpdated'));
    },
    onError: () => toast.error(t('toast.clientUpdateError')),
  });

  // Status buckets — feed both the tab counts and the visible list.
  const now = Date.now();
  const upcomingList = useMemo(() => appointments.filter(a =>
    (a.status === 'scheduled' || a.status === 'confirmed') &&
    parseISO(a.startTime).getTime() >= now,
  ), [appointments, now]);
  const completedList = useMemo(
    () => appointments.filter(a => a.status === 'completed'),
    [appointments],
  );
  const cancelledList = useMemo(
    () => appointments.filter(a => a.status === 'cancelled' || a.status === 'no_show'),
    [appointments],
  );
  const tabs: { id: HistoryTab; label: string; count: number }[] = [
    { id: 'all', label: t('clientSheet.tabAll'), count: appointments.length },
    { id: 'upcoming', label: t('clientSheet.tabUpcoming'), count: upcomingList.length },
    { id: 'completed', label: t('clientSheet.tabCompleted'), count: completedList.length },
    { id: 'cancelled', label: t('clientSheet.tabCancelled'), count: cancelledList.length },
  ];
  const visible =
    historyTab === 'all' ? appointments
    : historyTab === 'upcoming' ? upcomingList
    : historyTab === 'completed' ? completedList
    : cancelledList;

  if (!client) return null;
  const grad = AVATAR_GRADIENTS[hashToIndex(client.id, AVATAR_GRADIENTS.length)];
  const fullName = `${client.firstName} ${client.lastName}`.trim();

  // Locale-aware date format (matches the rest of calendar.tsx — see :2452+)
  const dateLocale = language === 'ru' ? ruLocale : language === 'lt' ? ltLocale : enLocale;

  // Meta eyebrow text — visits + (last visit OR joined). Plural forms
  // routed through CLDR-style category keys; date prefixes localized.
  const visitsKey = (`clientSheet.metaVisits${pluralKey(language, client.totalVisits)}`) as TranslationKey;
  const visitsText = t(visitsKey).replace('{count}', String(client.totalVisits));
  const lastVisitText = client.lastVisitAt
    ? t('clientSheet.metaLast').replace(
        '{date}',
        format(parseISO(client.lastVisitAt), 'MMM d, yyyy', { locale: dateLocale }),
      )
    : null;
  const joinedText = client.createdAt
    ? t('clientSheet.metaJoined').replace(
        '{date}',
        format(parseISO(client.createdAt), 'MMM yyyy', { locale: dateLocale }),
      )
    : null;
  const metaText = [visitsText, lastVisitText ?? joinedText].filter(Boolean).join(' · ');

  // Stagger motion variants — sections fade-up in sequence
  const containerVariants = reduce ? {} : {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.07, delayChildren: 0.05 },
    },
  };
  const sectionVariants = reduce ? {} : {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: MOTION_EASE } },
  };

  const sectionEyebrow = 'text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="!w-[calc(100vw-2rem)] !max-w-[520px] max-h-[88vh] overflow-hidden p-0 gap-0 flex flex-col [&>button]:hidden"
      >
        <DialogTitle className="sr-only">{fullName}</DialogTitle>

        {/* Header — eyebrow-driven editorial. Bigger gradient avatar
            anchors the layout; meta line sits above the display name as
            an editorial caption. */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onClose}
              className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              aria-label={t('clientSheet.back')}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            <div className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-base font-bold text-white shadow-sm ring-1 ring-foreground/[0.06]',
              grad,
            )}>
              {client.firstName[0]}{client.lastName[0]}
            </div>

            <div className="min-w-0 flex-1">
              <p className={cn(sectionEyebrow, 'tabular-nums')}>{metaText}</p>
              <h2 className="mt-0.5 truncate text-xl font-bold tracking-tight">{fullName}</h2>
            </div>

            <button
              type="button"
              onClick={onEdit}
              className="flex h-9 w-9 items-center justify-center rounded-md text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              aria-label={t('clientSheet.editClient')}
            >
              <PencilSquareIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              aria-label={t('clientSheet.close')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body — sections separated by hairlines, not card chrome.
            Stagger entrance uses Framer Motion variants. */}
        <motion.div
          key={client.id}
          className="flex-1 min-h-0 overflow-y-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* CONTACT SECTION — icon-prefixed rows */}
          <motion.section variants={sectionVariants} className="px-5 pt-5 pb-5">
            <h3 className={sectionEyebrow}>{t('clientSheet.contactInfo')}</h3>
            <div className="mt-2 -mx-2 divide-y divide-border/40">
              {client.phone && (
                <a
                  href={`tel:${client.phone}`}
                  className="group flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-accent/40 transition-colors"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground/80 group-hover:bg-muted group-hover:text-foreground transition-colors">
                    <PhoneIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm text-foreground tabular-nums truncate">
                    {client.phone}
                  </span>
                </a>
              )}
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="group flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-accent/40 transition-colors"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground/80 group-hover:bg-muted group-hover:text-foreground transition-colors">
                    <EnvelopeIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm text-foreground truncate">{client.email}</span>
                </a>
              )}
              {!client.phone && !client.email && (
                <p className="px-2 py-2.5 text-sm text-muted-foreground/60 italic">—</p>
              )}
            </div>
          </motion.section>

          <div className="border-t border-border/60" aria-hidden />

          {/* NOTES SECTION — compact. Inline "+ Add note" when empty,
              soft accent-bordered card when filled, editable in-place. */}
          <motion.section variants={sectionVariants} className="px-5 pt-5 pb-5">
            <div className="flex items-center justify-between">
              <h3 className={sectionEyebrow}>{t('clientSheet.notes')}</h3>
              {!noteEditing && !(client.notes && client.notes.trim()) && (
                <button
                  type="button"
                  onClick={() => { setNoteDraft(''); setNoteEditing(true); }}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  {t('clientSheet.addNote')}
                </button>
              )}
            </div>

            <div className="mt-2.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {noteEditing ? (
                  <motion.div
                    key="note-edit"
                    initial={reduce ? false : { opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: MOTION_EASE }}
                    className="rounded-lg border-l-2 border-l-primary border border-border bg-card pl-3 pr-2 py-2"
                  >
                    <Textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      autoFocus
                      rows={3}
                      placeholder={t('calendar.clientNotePlaceholder')}
                      className="resize-none border-0 px-0 py-1 focus-visible:ring-0 bg-transparent shadow-none"
                    />
                    <div className="mt-1.5 flex items-center justify-end gap-2 pt-1.5 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setNoteEditing(false); setNoteDraft(client.notes ?? ''); }}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateNoteMut.mutate(noteDraft.trim())}
                        disabled={updateNoteMut.isPending}
                      >
                        {updateNoteMut.isPending ? '…' : t('common.save')}
                      </Button>
                    </div>
                  </motion.div>
                ) : (client.notes && client.notes.trim()) ? (
                  <motion.div
                    key="note-card"
                    initial={reduce ? false : { opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: MOTION_EASE }}
                    className="group relative rounded-lg border-l-2 border-l-primary/60 border border-border bg-card pl-3 pr-3 py-3"
                  >
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words pr-12">
                      {client.notes}
                    </p>
                    <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => { setNoteDraft(client.notes); setNoteEditing(true); }}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        aria-label={t('clientSheet.editNote')}
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateNoteMut.mutate('')}
                        disabled={updateNoteMut.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                        aria-label={t('clientSheet.clearNote')}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.p
                    key="note-empty"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="text-sm text-muted-foreground/60 italic"
                  >
                    {t('clientSheet.noNotesSub')}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          <div className="border-t border-border/60" aria-hidden />

          {/* HISTORY SECTION — tab strip with LayoutGroup-animated underline */}
          <motion.section variants={sectionVariants} className="px-5 pt-5 pb-6">
            <h3 className={sectionEyebrow}>{t('clientSheet.history')}</h3>

            <LayoutGroup id="profile-history-tabs">
              <div className="mt-2 flex items-center gap-1 border-b border-border overflow-x-auto -mx-1 px-1 scrollbar-none">
                {tabs.map(tab => {
                  const active = historyTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setHistoryTab(tab.id)}
                      className={cn(
                        'relative inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:text-foreground',
                        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                      aria-pressed={active}
                    >
                      {tab.label}
                      <span className={cn(
                        'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums transition-colors',
                        active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
                      )}>
                        {tab.count}
                      </span>
                      {active && (
                        <motion.span
                          layoutId="profile-history-underline"
                          className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground"
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>

            <div className="mt-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {visible.length === 0 ? (
                  <motion.div
                    key={`empty-${historyTab}`}
                    initial={reduce ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: MOTION_EASE }}
                    className="flex items-center gap-2.5 px-1 py-2 text-sm text-muted-foreground/70 italic"
                  >
                    <CalendarDaysIcon className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    {t('clientSheet.appointmentsHint')}
                  </motion.div>
                ) : (
                  <motion.div
                    key={`list-${historyTab}`}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2"
                  >
                    {visible.map((apt, i) => (
                      <motion.div
                        key={apt.id}
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.24, delay: i * 0.04, ease: MOTION_EASE }}
                        className="relative overflow-hidden rounded-lg border border-border bg-card pl-4 pr-4 py-3 hover:border-foreground/20 transition-colors"
                      >
                        {/* Status accent rail — 3px left stripe in the
                            status hue, matching the calendar grid tile
                            vocabulary so the eye reads "scheduled / confirmed
                            / completed" instantly without parsing the chip. */}
                        <span
                          aria-hidden
                          className={cn('absolute left-0 top-0 bottom-0 w-[3px]', STATUS_STRIPE[apt.status])}
                        />
                        <div className="flex items-start justify-between gap-3 pl-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {apt.service?.name ?? '—'}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                              {format(parseISO(apt.startTime), 'MMM d, yyyy · HH:mm', { locale: dateLocale })}
                            </p>
                            <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
                              {apt.staff?.firstName ?? ''} {apt.staff?.lastName ?? ''}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <p className="text-sm font-bold text-foreground tabular-nums leading-none">
                              €{apt.service?.price ?? 0}
                            </p>
                            <span className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap',
                              STATUS_PILL[apt.status],
                            )}>
                              {t(STATUS_TKEY[apt.status])}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
