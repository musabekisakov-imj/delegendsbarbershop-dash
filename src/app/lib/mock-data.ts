// Mock data generator for BarberPro Dashboard

import type { 
  Client, 
  Staff, 
  Service, 
  Category, 
  Appointment, 
  Shift, 
  Tenant,
  WorkingHours
} from '../types';

// Generate IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

// Default working hours
const defaultWorkingHours: WorkingHours = {
  monday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
  tuesday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
  wednesday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
  thursday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
  friday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
  saturday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  sunday: { isOpen: false, openTime: '10:00', closeTime: '16:00' }
};

// Default tenant
export const defaultTenant: Tenant = {
  id: 'tenant-1',
  name: 'BarberPro Shop',
  email: 'contact@barberpro.com',
  phone: '+1 (555) 123-4567',
  address: '123 Main Street, New York, NY 10001',
  workingHours: defaultWorkingHours,
  theme: 'light',
  language: 'en'
};

// Categories
export const defaultCategories: Category[] = [
  { id: 'cat-1', name: 'Haircuts', createdAt: new Date().toISOString() },
  { id: 'cat-2', name: 'Beard Grooming', createdAt: new Date().toISOString() },
  { id: 'cat-3', name: 'Hair Coloring', createdAt: new Date().toISOString() },
  { id: 'cat-4', name: 'Styling', createdAt: new Date().toISOString() }
];

// Services
export const defaultServices: Service[] = [
  { id: 'svc-1', name: 'Classic Haircut', price: 35, duration: 30, categoryId: 'cat-1', description: 'Traditional haircut with scissors', createdAt: new Date().toISOString() },
  { id: 'svc-2', name: 'Fade Haircut', price: 45, duration: 45, categoryId: 'cat-1', description: 'Modern fade with clippers', createdAt: new Date().toISOString() },
  { id: 'svc-3', name: 'Beard Trim', price: 25, duration: 20, categoryId: 'cat-2', description: 'Precision beard trimming', createdAt: new Date().toISOString() },
  { id: 'svc-4', name: 'Beard Shave', price: 30, duration: 30, categoryId: 'cat-2', description: 'Hot towel shave', createdAt: new Date().toISOString() },
  { id: 'svc-5', name: 'Hair Color', price: 85, duration: 90, categoryId: 'cat-3', description: 'Full hair coloring service', createdAt: new Date().toISOString() },
  { id: 'svc-6', name: 'Highlights', price: 95, duration: 120, categoryId: 'cat-3', description: 'Professional highlights', createdAt: new Date().toISOString() },
  { id: 'svc-7', name: 'Hair Styling', price: 40, duration: 30, categoryId: 'cat-4', description: 'Professional styling for special events', createdAt: new Date().toISOString() }
];

// Staff
export const defaultStaff: Staff[] = [
  { id: 'staff-1', firstName: 'John', lastName: 'Smith', email: 'john@barberpro.com', phone: '+1 (555) 111-1111', role: 'owner', isActive: true, createdAt: new Date().toISOString() },
  { id: 'staff-2', firstName: 'Maria', lastName: 'Garcia', email: 'maria@barberpro.com', phone: '+1 (555) 222-2222', role: 'barber', isActive: true, createdAt: new Date().toISOString() },
  { id: 'staff-3', firstName: 'David', lastName: 'Johnson', email: 'david@barberpro.com', phone: '+1 (555) 333-3333', role: 'barber', isActive: true, createdAt: new Date().toISOString() },
  { id: 'staff-4', firstName: 'Sarah', lastName: 'Williams', email: 'sarah@barberpro.com', phone: '+1 (555) 444-4444', role: 'receptionist', isActive: true, createdAt: new Date().toISOString() },
  { id: 'staff-5', firstName: 'Michael', lastName: 'Brown', email: 'michael@barberpro.com', phone: '+1 (555) 555-5555', role: 'barber', isActive: false, createdAt: new Date().toISOString() }
];

// Clients
export const defaultClients: Client[] = [
  { id: 'client-1', firstName: 'Robert', lastName: 'Taylor', email: 'robert.taylor@email.com', phone: '+1 (555) 101-1001', notes: 'Prefers short cuts', totalVisits: 12, lastVisitAt: '2026-04-10T10:00:00Z', createdAt: new Date().toISOString() },
  { id: 'client-2', firstName: 'James', lastName: 'Anderson', email: 'james.anderson@email.com', phone: '+1 (555) 101-1002', notes: 'Sensitive scalp', totalVisits: 8, lastVisitAt: '2026-04-12T14:00:00Z', createdAt: new Date().toISOString() },
  { id: 'client-3', firstName: 'William', lastName: 'Thomas', email: 'william.thomas@email.com', phone: '+1 (555) 101-1003', notes: '', totalVisits: 5, lastVisitAt: '2026-04-09T16:00:00Z', createdAt: new Date().toISOString() },
  { id: 'client-4', firstName: 'Daniel', lastName: 'Martinez', email: 'daniel.martinez@email.com', phone: '+1 (555) 101-1004', notes: 'Regular customer - every 3 weeks', totalVisits: 15, lastVisitAt: '2026-04-14T11:00:00Z', createdAt: new Date().toISOString() },
  { id: 'client-5', firstName: 'Christopher', lastName: 'Robinson', email: 'chris.robinson@email.com', phone: '+1 (555) 101-1005', notes: '', totalVisits: 3, lastVisitAt: '2026-04-08T09:00:00Z', createdAt: new Date().toISOString() }
];

// Appointments
export const defaultAppointments: Appointment[] = [
  { id: 'apt-1', clientId: 'client-1', staffId: 'staff-2', serviceId: 'svc-1', startTime: '2026-04-16T10:00:00Z', endTime: '2026-04-16T10:30:00Z', status: 'confirmed', notes: '', createdAt: new Date().toISOString() },
  { id: 'apt-2', clientId: 'client-2', staffId: 'staff-3', serviceId: 'svc-2', startTime: '2026-04-16T11:00:00Z', endTime: '2026-04-16T11:45:00Z', status: 'scheduled', notes: '', createdAt: new Date().toISOString() },
  { id: 'apt-3', clientId: 'client-3', staffId: 'staff-2', serviceId: 'svc-3', startTime: '2026-04-16T14:00:00Z', endTime: '2026-04-16T14:20:00Z', status: 'confirmed', notes: '', createdAt: new Date().toISOString() },
  { id: 'apt-4', clientId: 'client-4', staffId: 'staff-1', serviceId: 'svc-4', startTime: '2026-04-16T15:30:00Z', endTime: '2026-04-16T16:00:00Z', status: 'scheduled', notes: '', createdAt: new Date().toISOString() },
  { id: 'apt-5', clientId: 'client-1', staffId: 'staff-2', serviceId: 'svc-1', startTime: '2026-04-15T10:00:00Z', endTime: '2026-04-15T10:30:00Z', status: 'completed', notes: '', createdAt: new Date().toISOString() },
  { id: 'apt-6', clientId: 'client-2', staffId: 'staff-3', serviceId: 'svc-5', startTime: '2026-04-14T13:00:00Z', endTime: '2026-04-14T14:30:00Z', status: 'completed', notes: '', createdAt: new Date().toISOString() },
  { id: 'apt-7', clientId: 'client-5', staffId: 'staff-1', serviceId: 'svc-2', startTime: '2026-04-13T09:00:00Z', endTime: '2026-04-13T09:45:00Z', status: 'completed', notes: '', createdAt: new Date().toISOString() },
  { id: 'apt-8', clientId: 'client-4', staffId: 'staff-2', serviceId: 'svc-1', startTime: '2026-04-12T16:00:00Z', endTime: '2026-04-12T16:30:00Z', status: 'completed', notes: '', createdAt: new Date().toISOString() }
];

// Shifts
export const defaultShifts: Shift[] = [
  // John Smith (owner) - works Mon-Fri
  { id: 'shift-1', staffId: 'staff-1', dayOfWeek: 'monday', startTime: '09:00', endTime: '18:00' },
  { id: 'shift-2', staffId: 'staff-1', dayOfWeek: 'tuesday', startTime: '09:00', endTime: '18:00' },
  { id: 'shift-3', staffId: 'staff-1', dayOfWeek: 'wednesday', startTime: '09:00', endTime: '18:00' },
  { id: 'shift-4', staffId: 'staff-1', dayOfWeek: 'thursday', startTime: '09:00', endTime: '18:00' },
  { id: 'shift-5', staffId: 'staff-1', dayOfWeek: 'friday', startTime: '09:00', endTime: '18:00' },
  
  // Maria Garcia - works Tue-Sat
  { id: 'shift-6', staffId: 'staff-2', dayOfWeek: 'tuesday', startTime: '08:00', endTime: '16:00' },
  { id: 'shift-7', staffId: 'staff-2', dayOfWeek: 'wednesday', startTime: '08:00', endTime: '16:00' },
  { id: 'shift-8', staffId: 'staff-2', dayOfWeek: 'thursday', startTime: '08:00', endTime: '16:00' },
  { id: 'shift-9', staffId: 'staff-2', dayOfWeek: 'friday', startTime: '08:00', endTime: '16:00' },
  { id: 'shift-10', staffId: 'staff-2', dayOfWeek: 'saturday', startTime: '09:00', endTime: '17:00' },
  
  // David Johnson - works Mon-Fri
  { id: 'shift-11', staffId: 'staff-3', dayOfWeek: 'monday', startTime: '10:00', endTime: '20:00' },
  { id: 'shift-12', staffId: 'staff-3', dayOfWeek: 'tuesday', startTime: '10:00', endTime: '20:00' },
  { id: 'shift-13', staffId: 'staff-3', dayOfWeek: 'wednesday', startTime: '10:00', endTime: '20:00' },
  { id: 'shift-14', staffId: 'staff-3', dayOfWeek: 'thursday', startTime: '10:00', endTime: '20:00' },
  { id: 'shift-15', staffId: 'staff-3', dayOfWeek: 'friday', startTime: '10:00', endTime: '20:00' },
  
  // Sarah Williams (receptionist) - works Mon-Sat
  { id: 'shift-16', staffId: 'staff-4', dayOfWeek: 'monday', startTime: '08:00', endTime: '17:00' },
  { id: 'shift-17', staffId: 'staff-4', dayOfWeek: 'tuesday', startTime: '08:00', endTime: '17:00' },
  { id: 'shift-18', staffId: 'staff-4', dayOfWeek: 'wednesday', startTime: '08:00', endTime: '17:00' },
  { id: 'shift-19', staffId: 'staff-4', dayOfWeek: 'thursday', startTime: '08:00', endTime: '17:00' },
  { id: 'shift-20', staffId: 'staff-4', dayOfWeek: 'friday', startTime: '08:00', endTime: '17:00' },
  { id: 'shift-21', staffId: 'staff-4', dayOfWeek: 'saturday', startTime: '09:00', endTime: '18:00' }
];

// Initialize localStorage with default data
export function initializeMockData() {
  if (!localStorage.getItem('barberpro_tenant')) {
    localStorage.setItem('barberpro_tenant', JSON.stringify(defaultTenant));
  }
  if (!localStorage.getItem('barberpro_categories')) {
    localStorage.setItem('barberpro_categories', JSON.stringify(defaultCategories));
  }
  if (!localStorage.getItem('barberpro_services')) {
    localStorage.setItem('barberpro_services', JSON.stringify(defaultServices));
  }
  if (!localStorage.getItem('barberpro_staff')) {
    localStorage.setItem('barberpro_staff', JSON.stringify(defaultStaff));
  }
  if (!localStorage.getItem('barberpro_clients')) {
    localStorage.setItem('barberpro_clients', JSON.stringify(defaultClients));
  }
  if (!localStorage.getItem('barberpro_appointments')) {
    localStorage.setItem('barberpro_appointments', JSON.stringify(defaultAppointments));
  }
  if (!localStorage.getItem('barberpro_shifts')) {
    localStorage.setItem('barberpro_shifts', JSON.stringify(defaultShifts));
  }
}
