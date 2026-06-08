// Core data types for BarberPro Dashboard

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type StaffRole = 'owner' | 'manager' | 'barber' | 'receptionist';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type Theme = 'light' | 'dark';
export type Language = 'en' | 'ru' | 'lt';
export type Gender = 'male' | 'female' | 'other';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  gender?: Gender;
  avatarUrl?: string;
  totalVisits: number;
  lastVisitAt: string | null;
  officeIds: string[];
  createdAt: string;
  /** Soft-delete timestamp. Appointments keep a valid `clientId` even after
   *  "delete", so data integrity stays intact. Default queries filter out
   *  archived clients; an "Archived" view can opt in. */
  deletedAt?: string | null;
}

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: StaffRole;
  isActive: boolean;
  avatarUrl?: string;
  officeIds: string[];
  createdAt: string;
}

export type CategoryColorKey =
  | 'slate' | 'rose' | 'amber' | 'emerald' | 'sky'
  | 'violet' | 'fuchsia' | 'teal' | 'orange' | 'indigo';

export interface Category {
  id: string;
  name: string;
  color: CategoryColorKey;
  sortOrder: number;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  categoryId: string;
  description: string;
  officeId: string;
  imageUrl?: string;
  createdAt: string;
  staffIds?: string[];
  prepMinutes?: number;
  cleanupMinutes?: number;
  isPublic?: boolean;
}

export interface Appointment {
  id: string;
  clientId: string;
  staffId: string;
  serviceId: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  status: AppointmentStatus;
  notes: string;
  locationId: string;
  createdAt: string;
  /** Sibling rows from a multi-service booking share this id, generated at
   *  submit-time. Tile rendering groups siblings into one stacked card; edit
   *  and cancel propagate via groupId lookup. Absent on standalone bookings. */
  groupId?: string;
  /** Soft-delete timestamp. Appointments are preserved in storage so that
   *  audit (payroll, no-show disputes, receipts) stays intact. Default reads
   *  filter this out; an "Archived" view can opt in. */
  deletedAt?: string | null;
  /** Account.id of the operator who created this booking (receptionist /
   *  manager / owner). Stamped at create-time from `useAuthStore.user.id`.
   *  Optional so existing rows in storage still load; resolved to a display
   *  name via `accountsApi.getAll()` at render-time. */
  createdBy?: string;
  /** Multi-service bookings from the public website are a single row carrying
   *  every selected service id (the dashboard's own multi-service flow uses
   *  sibling rows + `groupId` instead). Absent on legacy/localStorage rows. */
  serviceIds?: string[];
  /** Aggregate price for a multi-service booking. The numeric DB column
   *  serializes as a string over the wire. Falls back to `service.price`. */
  totalPrice?: number | string;
  /** Real payment state from the backend. The dashboard previously inferred
   *  this from `status`; prefer this field when present. */
  paymentStatus?: 'unpaid' | 'paid' | 'pay_at_shop' | 'refunded';
}

export interface Shift {
  id: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

/** A date-specific override for a staff member's daily schedule.
 *  When present for (staffId, date), it supersedes the weekly Shift lookup
 *  in the calendar — letting the operator change just one day without
 *  touching the recurring weekly schedule.
 *  - kind='day-off': barber is off this date (regardless of weekly shift).
 *  - kind='custom':  barber works startTime–endTime this date only. */
export interface ShiftOverride {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  kind: 'day-off' | 'custom';
  startTime?: string; // HH:mm — required when kind='custom'
  endTime?: string;   // HH:mm — required when kind='custom'
}

export type AbsenceReason = 'day-off' | 'vacation' | 'sick' | 'training';

/** A weekly or one-off absence reason. Stored only when there is no Shift
 *  for that day — the Shift is the source of truth for "working."
 *  Recurrence semantics:
 *  - `recurrence: 'weekly'` (default): repeats every {dayOfWeek} forever, or
 *    bounded by [startDate, endDate] if provided.
 *  - `recurrence: 'one-off'`: applies only on `startDate` (single date). */
export interface Absence {
  id: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
  reason: AbsenceReason;
  recurrence?: 'weekly' | 'one-off';
  startDate?: string; // YYYY-MM-DD; one-off uses this as the date, ranged-weekly uses this as range start
  endDate?: string;   // YYYY-MM-DD; ranged-weekly only
  /** ISO timestamp + Account.id of the operator who created this block.
   *  Optional so legacy rows still load; backfilled to the seeded owner via
   *  schema-v11 migration. New blocks stamp the real current user. */
  createdAt?: string;
  createdBy?: string;
  /** Dates (YYYY-MM-DD) on which this weekly absence is overridden — mirror
   *  of `Break.exceptionDates`, populated by drag-to-reschedule "Only this".
   *  (Schema v12.) */
  exceptionDates?: string[];
}

export type BreakType = 'lunch' | 'dinner' | 'rest' | 'custom';

export interface Break {
  id: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  type: BreakType;
  /** ISO timestamp + Account.id of the operator who created this block.
   *  Optional so legacy rows still load; backfilled to the seeded owner via
   *  schema-v11 migration. New blocks stamp the real current user. */
  createdAt?: string;
  createdBy?: string;
  /** Optional free-text label for `type === 'custom'`. Used when the
   *  preset categories (lunch/dinner/rest) don't fit — e.g. "Coffee run",
   *  "Equipment maintenance". Ignored for non-custom types. */
  customLabel?: string;
  /** Recurrence semantics — see Absence for the same shape.
   *  - 'weekly' (default): repeats every {dayOfWeek}, optionally bounded.
   *  - 'one-off': applies only on `startDate`. */
  recurrence?: 'weekly' | 'one-off';
  startDate?: string; // YYYY-MM-DD; one-off uses this as the date, ranged-weekly uses this as range start
  endDate?: string;   // YYYY-MM-DD; ranged-weekly only
  /** Dates (YYYY-MM-DD) on which this weekly break is overridden by a one-off
   *  block. Drag-to-reschedule populates this when the operator picks "Only
   *  this {day}" — the original weekly stays intact, today's date is excluded
   *  from rendering and conflict checks, and a new one-off Break is created
   *  with the dropped time range. (Schema v12.) */
  exceptionDates?: string[];
}

export interface WorkingHoursDay {
  isOpen: boolean;
  openTime: string;          // HH:mm format
  closeTime: string;
  /** Optional shop-wide lunch break — separate from per-staff Break records.
   *  Both fields must be set for the lunch to render. (Schema v14.) */
  lunchStart?: string;
  lunchEnd?: string;
}

export interface WorkingHours {
  [key: string]: WorkingHoursDay;
}

export interface Office {
  id: string;
  name: string;
  address: string;
  phone?: string;
  timezone?: string;
}

/** Shop-level holiday or one-off closure. Separate from staff Absence
 *  records (which are per-staff full-day blocks). Schema v14. */
export interface Holiday {
  date: string;            // YYYY-MM-DD
  label: string;           // human-readable, e.g. "National holiday"
}

/** Booking-level rules — applied at create time in the booking flow. All
 *  fields optional; falsy means "no constraint". Schema v14. */
export interface BookingRules {
  leadTimeMinutes?: number;          // min advance notice for a new booking
  cancellationCutoffHours?: number;  // free-cancel window before start
  bufferMinutes?: number;            // auto-gap between adjacent bookings
}

export interface Tenant {
  id: string;
  name: string;                      // full legal name (DeLegends Barbershop)
  /** Short version used in the top nav. Falls back to `name` when missing.
   *  Schema v14. */
  displayName?: string;
  email: string;
  phone: string;
  /** Optional contact + brand fields. All Schema v14. */
  website?: string;
  instagram?: string;
  /** Currency for prices throughout the app. Default 'EUR'. Schema v14. */
  currency?: 'EUR' | 'USD' | 'GBP' | 'UZS';
  vatRate?: number;                  // VAT % e.g. 20 for 20%
  timezone?: string;                 // IANA, e.g. 'Europe/Vilnius'
  /** Reserved for future logo upload UI. Schema v14 (field only, no UI yet). */
  logoUrl?: string;
  /** Shop-wide closure dates. Schema v14. */
  holidays?: Holiday[];
  /** Booking-time policy. Schema v14. */
  bookingRules?: BookingRules;
  /** Custom roles beyond the built-in StaffRole set. Schema v17. */
  customRoles?: CustomRole[];
  offices: Office[];
  workingHours: WorkingHours;
  theme: Theme;
  language: Language;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  role: StaffRole;
}

export type AccountStatus = 'active' | 'invited' | 'disabled';

export type RoleColorKey =
  | 'fuchsia' | 'indigo' | 'teal' | 'slate'
  | 'lime' | 'pink' | 'sky' | 'stone';

export interface CustomRole {
  id: string;
  name: string;
  color: RoleColorKey;
  permissions: Permission[];
  createdAt: string;
}

export interface Account {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  status: AccountStatus;
  officeIds: string[];
  /** Uploaded photo (data URL after compression) OR URL. Falls back to the
   *  linked staff member's `avatarUrl` if unset, then to a gradient initials. */
  avatarUrl?: string;
  staffId?: string;
  phone?: string;
  positionTitle?: string;
  startDate?: string;
  lastLoginAt?: string | null;
  createdAt: string;
}

export type Permission =
  // Bookings
  | 'bookings.view'
  | 'bookings.create'
  | 'bookings.edit'
  | 'bookings.delete'
  | 'bookings.override_conflict'
  // Clients
  | 'clients.view'
  | 'clients.create'
  | 'clients.edit'
  | 'clients.delete'
  // Staff (as team members, shifts, schedules)
  | 'staff.view'
  | 'staff.manage'
  // Services
  | 'services.view'
  | 'services.manage'
  // Analytics
  | 'analytics.view'
  // Settings (shop info, working hours)
  | 'settings.view'
  | 'settings.edit'
  // Accounts (who can log in, what role)
  | 'accounts.view'
  | 'accounts.manage';

// API response types
export interface LoginResponse {
  token: string;
  user: User;
}

// Extended types with relations
export interface AppointmentWithDetails extends Appointment {
  client: Client;
  staff: Staff;
  service: Service;
  /** Resolved line items for a multi-service booking, in selection order. The
   *  backend resolves these from `serviceIds`; the primary `service` above
   *  stays for backward-compat. Single-service rows carry one entry or none. */
  services?: Service[];
}
