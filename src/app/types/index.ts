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

export interface Category {
  id: string;
  name: string;
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
  /** Soft-delete timestamp. Appointments are preserved in storage so that
   *  audit (payroll, no-show disputes, receipts) stays intact. Default reads
   *  filter this out; an "Archived" view can opt in. */
  deletedAt?: string | null;
}

export interface Shift {
  id: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export type AbsenceReason = 'day-off' | 'vacation' | 'sick' | 'training';

/** A recurring weekly absence reason. Stored only when there is no Shift
 *  for that day — the Shift is the source of truth for "working." */
export interface Absence {
  id: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
  reason: AbsenceReason;
}

export type BreakType = 'lunch' | 'dinner' | 'rest';

export interface Break {
  id: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  type: BreakType;
}

export interface WorkingHours {
  [key: string]: {
    isOpen: boolean;
    openTime: string; // HH:mm format
    closeTime: string; // HH:mm format
  };
}

export interface Office {
  id: string;
  name: string;
  address: string;
  phone?: string;
  timezone?: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
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
}
