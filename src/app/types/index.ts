// Core data types for BarberPro Dashboard

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
export type StaffRole = 'owner' | 'manager' | 'barber' | 'receptionist';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type Theme = 'light' | 'dark';
export type Language = 'en' | 'lt' | 'ru';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  totalVisits: number;
  lastVisitAt: string | null;
  createdAt: string;
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
  createdAt: string;
}

export interface Shift {
  id: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface WorkingHours {
  [key: string]: {
    isOpen: boolean;
    openTime: string; // HH:mm format
    closeTime: string; // HH:mm format
  };
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
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
}

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
