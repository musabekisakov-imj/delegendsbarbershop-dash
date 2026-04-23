// Mock data generator for BarberPro Dashboard

import type {
  Client,
  Staff,
  Service,
  Category,
  Appointment,
  Shift,
  Break,
  Tenant,
  WorkingHours,
  Office,
  Account
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

// Offices — the client operates two locations
export const defaultOffices: Office[] = [
  {
    id: 'office-1',
    name: 'Downtown',
    address: '123 Main Street, New York, NY 10001',
    phone: '+1 (555) 123-4567',
    timezone: 'America/New_York',
  },
  {
    id: 'office-2',
    name: 'Brooklyn',
    address: '456 Bedford Ave, Brooklyn, NY 11211',
    phone: '+1 (555) 987-6543',
    timezone: 'America/New_York',
  },
];

// Default tenant
export const defaultTenant: Tenant = {
  id: 'tenant-1',
  name: 'BarberPro Shop',
  email: 'contact@barberpro.com',
  phone: '+1 (555) 123-4567',
  offices: defaultOffices,
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

// Curated Unsplash photo URLs — real barbershop / hair imagery.
// If any URL 404s, ServiceCard's onError handler falls back to the gradient tile.
const unsplash = (id: string) => `https://images.unsplash.com/${id}?w=800&q=80&auto=format&fit=crop`;

// All IDs manually verified against images.unsplash.com at seed time.
// Each URL points to a real barbershop / hair-care photo — no stock
// abstractions, no stale references. The two that used to 404 have been
// replaced with verified barbershop interior + beard grooming shots.
const PHOTO = {
  barbershop:   unsplash('photo-1503951914875-452162b0f3f1'),  // classic barber shop — chair + tools
  fade:         unsplash('photo-1599351431202-1e0f0137899a'),  // fade haircut close-up
  beardTrim:    unsplash('photo-1622286342621-4bd786c2447c'),  // beard trim in progress
  hotShave:     unsplash('photo-1585747860715-2ba37e788b70'),  // hot towel shave / chair
  hairColor:    unsplash('photo-1522337360788-8b13dee7a37e'),  // hair color application
  highlights:   unsplash('photo-1562322140-8baeececf3df'),     // highlights in salon
  styling:      unsplash('photo-1580618672591-eb180b1a973f'),  // professional styling
  barber2:      unsplash('photo-1605497788044-5a32c7078486'),  // barbershop interior (Office 2 hero)
  beardShave:   unsplash('photo-1599458448510-59aecaea4752'),  // beard grooming close-up
};

// Services — each office has its own menu (duplicated so pricing can diverge per location)
export const defaultServices: Service[] = [
  { id: 'svc-1', name: 'Classic Haircut', price: 35, duration: 30, categoryId: 'cat-1', description: 'Traditional haircut with scissors', officeId: 'office-1', imageUrl: PHOTO.barbershop, createdAt: new Date().toISOString() },
  { id: 'svc-2', name: 'Fade Haircut', price: 45, duration: 45, categoryId: 'cat-1', description: 'Modern fade with clippers', officeId: 'office-1', imageUrl: PHOTO.fade, createdAt: new Date().toISOString() },
  { id: 'svc-3', name: 'Beard Trim', price: 25, duration: 20, categoryId: 'cat-2', description: 'Precision beard trimming', officeId: 'office-1', imageUrl: PHOTO.beardTrim, createdAt: new Date().toISOString() },
  { id: 'svc-4', name: 'Beard Shave', price: 30, duration: 30, categoryId: 'cat-2', description: 'Hot towel shave', officeId: 'office-1', imageUrl: PHOTO.hotShave, createdAt: new Date().toISOString() },
  { id: 'svc-5', name: 'Hair Color', price: 85, duration: 90, categoryId: 'cat-3', description: 'Full hair coloring service', officeId: 'office-1', imageUrl: PHOTO.hairColor, createdAt: new Date().toISOString() },
  { id: 'svc-6', name: 'Highlights', price: 95, duration: 120, categoryId: 'cat-3', description: 'Professional highlights', officeId: 'office-1', imageUrl: PHOTO.highlights, createdAt: new Date().toISOString() },
  { id: 'svc-7', name: 'Hair Styling', price: 40, duration: 30, categoryId: 'cat-4', description: 'Professional styling for special events', officeId: 'office-1', imageUrl: PHOTO.styling, createdAt: new Date().toISOString() },
  // Brooklyn menu — same services, slightly different pricing, distinct photos
  { id: 'svc-8', name: 'Classic Haircut', price: 32, duration: 30, categoryId: 'cat-1', description: 'Traditional haircut with scissors', officeId: 'office-2', imageUrl: PHOTO.barber2, createdAt: new Date().toISOString() },
  { id: 'svc-9', name: 'Fade Haircut', price: 42, duration: 45, categoryId: 'cat-1', description: 'Modern fade with clippers', officeId: 'office-2', imageUrl: PHOTO.fade, createdAt: new Date().toISOString() },
  { id: 'svc-10', name: 'Beard Trim', price: 22, duration: 20, categoryId: 'cat-2', description: 'Precision beard trimming', officeId: 'office-2', imageUrl: PHOTO.beardShave, createdAt: new Date().toISOString() },
  { id: 'svc-11', name: 'Beard Shave', price: 28, duration: 30, categoryId: 'cat-2', description: 'Hot towel shave', officeId: 'office-2', imageUrl: PHOTO.hotShave, createdAt: new Date().toISOString() },
  { id: 'svc-12', name: 'Hair Color', price: 80, duration: 90, categoryId: 'cat-3', description: 'Full hair coloring service', officeId: 'office-2', imageUrl: PHOTO.hairColor, createdAt: new Date().toISOString() },
];

// Staff — Maria floats between both offices to demonstrate cross-location conflict detection
export const defaultStaff: Staff[] = [
  { id: 'staff-1', firstName: 'John', lastName: 'Smith', email: 'john@barberpro.com', phone: '+1 (555) 111-1111', role: 'owner', isActive: true, avatarUrl: 'https://i.pravatar.cc/150?u=john-smith', officeIds: ['office-1', 'office-2'], createdAt: new Date().toISOString() },
  { id: 'staff-2', firstName: 'Maria', lastName: 'Garcia', email: 'maria@barberpro.com', phone: '+1 (555) 222-2222', role: 'barber', isActive: true, avatarUrl: 'https://i.pravatar.cc/150?u=maria-garcia', officeIds: ['office-1', 'office-2'], createdAt: new Date().toISOString() },
  { id: 'staff-3', firstName: 'David', lastName: 'Johnson', email: 'david@barberpro.com', phone: '+1 (555) 333-3333', role: 'barber', isActive: true, avatarUrl: 'https://i.pravatar.cc/150?u=david-johnson', officeIds: ['office-1'], createdAt: new Date().toISOString() },
  { id: 'staff-4', firstName: 'Sarah', lastName: 'Williams', email: 'sarah@barberpro.com', phone: '+1 (555) 444-4444', role: 'receptionist', isActive: true, avatarUrl: 'https://i.pravatar.cc/150?u=sarah-williams', officeIds: ['office-1'], createdAt: new Date().toISOString() },
  { id: 'staff-5', firstName: 'Michael', lastName: 'Brown', email: 'michael@barberpro.com', phone: '+1 (555) 555-5555', role: 'barber', isActive: false, avatarUrl: 'https://i.pravatar.cc/150?u=michael-brown', officeIds: ['office-2'], createdAt: new Date().toISOString() },
  { id: 'staff-6', firstName: 'Emma', lastName: 'Davis', email: 'emma@barberpro.com', phone: '+1 (555) 666-6666', role: 'barber', isActive: true, avatarUrl: 'https://i.pravatar.cc/150?u=emma-davis', officeIds: ['office-2'], createdAt: new Date().toISOString() }
];

// Clients — some loyal to one office, some cross-visiting
export const defaultClients: Client[] = [
  { id: 'client-1', firstName: 'Robert', lastName: 'Taylor', email: 'robert.taylor@email.com', phone: '+1 (555) 101-1001', notes: 'Prefers short cuts', gender: 'male', totalVisits: 12, lastVisitAt: '2026-04-10T10:00:00Z', officeIds: ['office-1'], createdAt: new Date().toISOString() },
  { id: 'client-2', firstName: 'James', lastName: 'Anderson', email: 'james.anderson@email.com', phone: '+1 (555) 101-1002', notes: 'Sensitive scalp', gender: 'male', totalVisits: 8, lastVisitAt: '2026-04-12T14:00:00Z', officeIds: ['office-1', 'office-2'], createdAt: new Date().toISOString() },
  { id: 'client-3', firstName: 'Emma', lastName: 'Thomas', email: 'emma.thomas@email.com', phone: '+1 (555) 101-1003', notes: '', gender: 'female', totalVisits: 5, lastVisitAt: '2026-04-09T16:00:00Z', officeIds: ['office-1'], createdAt: new Date().toISOString() },
  { id: 'client-4', firstName: 'Daniel', lastName: 'Martinez', email: 'daniel.martinez@email.com', phone: '+1 (555) 101-1004', notes: 'Regular customer - every 3 weeks', gender: 'male', totalVisits: 15, lastVisitAt: '2026-04-14T11:00:00Z', officeIds: ['office-2'], createdAt: new Date().toISOString() },
  { id: 'client-5', firstName: 'Olivia', lastName: 'Robinson', email: 'olivia.robinson@email.com', phone: '+1 (555) 101-1005', notes: '', gender: 'female', totalVisits: 3, lastVisitAt: '2026-04-08T09:00:00Z', officeIds: ['office-2'], createdAt: new Date().toISOString() }
];

// Appointments — distributed across both offices
export const defaultAppointments: Appointment[] = [
  { id: 'apt-1', clientId: 'client-1', staffId: 'staff-2', serviceId: 'svc-1', startTime: '2026-04-16T10:00:00Z', endTime: '2026-04-16T10:30:00Z', status: 'confirmed', notes: '', locationId: 'office-1', createdAt: new Date().toISOString() },
  { id: 'apt-2', clientId: 'client-2', staffId: 'staff-3', serviceId: 'svc-2', startTime: '2026-04-16T11:00:00Z', endTime: '2026-04-16T11:45:00Z', status: 'scheduled', notes: '', locationId: 'office-1', createdAt: new Date().toISOString() },
  { id: 'apt-3', clientId: 'client-3', staffId: 'staff-2', serviceId: 'svc-3', startTime: '2026-04-16T14:00:00Z', endTime: '2026-04-16T14:20:00Z', status: 'confirmed', notes: '', locationId: 'office-1', createdAt: new Date().toISOString() },
  { id: 'apt-4', clientId: 'client-4', staffId: 'staff-1', serviceId: 'svc-11', startTime: '2026-04-16T15:30:00Z', endTime: '2026-04-16T16:00:00Z', status: 'scheduled', notes: '', locationId: 'office-2', createdAt: new Date().toISOString() },
  { id: 'apt-5', clientId: 'client-1', staffId: 'staff-2', serviceId: 'svc-1', startTime: '2026-04-15T10:00:00Z', endTime: '2026-04-15T10:30:00Z', status: 'completed', notes: '', locationId: 'office-1', createdAt: new Date().toISOString() },
  { id: 'apt-6', clientId: 'client-2', staffId: 'staff-3', serviceId: 'svc-5', startTime: '2026-04-14T13:00:00Z', endTime: '2026-04-14T14:30:00Z', status: 'completed', notes: '', locationId: 'office-1', createdAt: new Date().toISOString() },
  { id: 'apt-7', clientId: 'client-5', staffId: 'staff-6', serviceId: 'svc-9', startTime: '2026-04-13T09:00:00Z', endTime: '2026-04-13T09:45:00Z', status: 'completed', notes: '', locationId: 'office-2', createdAt: new Date().toISOString() },
  { id: 'apt-8', clientId: 'client-4', staffId: 'staff-6', serviceId: 'svc-8', startTime: '2026-04-12T16:00:00Z', endTime: '2026-04-12T16:30:00Z', status: 'completed', notes: '', locationId: 'office-2', createdAt: new Date().toISOString() }
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
  { id: 'shift-21', staffId: 'staff-4', dayOfWeek: 'saturday', startTime: '09:00', endTime: '18:00' },

  // Emma Davis (Brooklyn barber)
  { id: 'shift-22', staffId: 'staff-6', dayOfWeek: 'tuesday', startTime: '10:00', endTime: '19:00' },
  { id: 'shift-23', staffId: 'staff-6', dayOfWeek: 'wednesday', startTime: '10:00', endTime: '19:00' },
  { id: 'shift-24', staffId: 'staff-6', dayOfWeek: 'thursday', startTime: '10:00', endTime: '19:00' },
  { id: 'shift-25', staffId: 'staff-6', dayOfWeek: 'friday', startTime: '10:00', endTime: '19:00' },
  { id: 'shift-26', staffId: 'staff-6', dayOfWeek: 'saturday', startTime: '10:00', endTime: '18:00' }
];

// Breaks
export const defaultBreaks: Break[] = [
  // John Smith - lunch on working days
  { id: 'brk-1', staffId: 'staff-1', dayOfWeek: 'monday', startTime: '13:00', endTime: '14:00', type: 'lunch' },
  { id: 'brk-2', staffId: 'staff-1', dayOfWeek: 'tuesday', startTime: '13:00', endTime: '14:00', type: 'lunch' },
  { id: 'brk-3', staffId: 'staff-1', dayOfWeek: 'wednesday', startTime: '13:00', endTime: '14:00', type: 'lunch' },
  { id: 'brk-4', staffId: 'staff-1', dayOfWeek: 'thursday', startTime: '13:00', endTime: '14:00', type: 'lunch' },
  { id: 'brk-5', staffId: 'staff-1', dayOfWeek: 'friday', startTime: '13:00', endTime: '14:00', type: 'lunch' },

  // Maria Garcia - lunch on working days
  { id: 'brk-6', staffId: 'staff-2', dayOfWeek: 'tuesday', startTime: '12:00', endTime: '12:30', type: 'lunch' },
  { id: 'brk-7', staffId: 'staff-2', dayOfWeek: 'wednesday', startTime: '12:00', endTime: '12:30', type: 'lunch' },
  { id: 'brk-8', staffId: 'staff-2', dayOfWeek: 'thursday', startTime: '12:00', endTime: '12:30', type: 'lunch' },
  { id: 'brk-9', staffId: 'staff-2', dayOfWeek: 'friday', startTime: '12:00', endTime: '12:30', type: 'lunch' },
  { id: 'brk-10', staffId: 'staff-2', dayOfWeek: 'saturday', startTime: '12:30', endTime: '13:00', type: 'lunch' },

  // David Johnson - lunch + dinner (long shift 10-20)
  { id: 'brk-11', staffId: 'staff-3', dayOfWeek: 'monday', startTime: '13:00', endTime: '13:30', type: 'lunch' },
  { id: 'brk-12', staffId: 'staff-3', dayOfWeek: 'monday', startTime: '17:30', endTime: '18:00', type: 'dinner' },
  { id: 'brk-13', staffId: 'staff-3', dayOfWeek: 'tuesday', startTime: '13:00', endTime: '13:30', type: 'lunch' },
  { id: 'brk-14', staffId: 'staff-3', dayOfWeek: 'tuesday', startTime: '17:30', endTime: '18:00', type: 'dinner' },
  { id: 'brk-15', staffId: 'staff-3', dayOfWeek: 'wednesday', startTime: '13:00', endTime: '13:30', type: 'lunch' },
  { id: 'brk-16', staffId: 'staff-3', dayOfWeek: 'wednesday', startTime: '17:30', endTime: '18:00', type: 'dinner' },
  { id: 'brk-17', staffId: 'staff-3', dayOfWeek: 'thursday', startTime: '13:00', endTime: '13:30', type: 'lunch' },
  { id: 'brk-18', staffId: 'staff-3', dayOfWeek: 'thursday', startTime: '17:30', endTime: '18:00', type: 'dinner' },
  { id: 'brk-19', staffId: 'staff-3', dayOfWeek: 'friday', startTime: '13:00', endTime: '13:30', type: 'lunch' },
  { id: 'brk-20', staffId: 'staff-3', dayOfWeek: 'friday', startTime: '17:30', endTime: '18:00', type: 'dinner' },

  // Sarah Williams - lunch on working days
  { id: 'brk-21', staffId: 'staff-4', dayOfWeek: 'monday', startTime: '12:00', endTime: '13:00', type: 'lunch' },
  { id: 'brk-22', staffId: 'staff-4', dayOfWeek: 'tuesday', startTime: '12:00', endTime: '13:00', type: 'lunch' },
  { id: 'brk-23', staffId: 'staff-4', dayOfWeek: 'wednesday', startTime: '12:00', endTime: '13:00', type: 'lunch' },
  { id: 'brk-24', staffId: 'staff-4', dayOfWeek: 'thursday', startTime: '12:00', endTime: '13:00', type: 'lunch' },
  { id: 'brk-25', staffId: 'staff-4', dayOfWeek: 'friday', startTime: '12:00', endTime: '13:00', type: 'lunch' },
  { id: 'brk-26', staffId: 'staff-4', dayOfWeek: 'saturday', startTime: '12:30', endTime: '13:30', type: 'lunch' },
];

// Accounts — who can actually sign in. Linked to Staff via optional staffId.
// In a real app the owner may not be staff (off-site); receptionist + managers usually are.
export const defaultAccounts: Account[] = [
  {
    id: 'acc-1',
    email: 'admin@barberpro.com',
    firstName: 'John',
    lastName: 'Smith',
    role: 'owner',
    status: 'active',
    officeIds: ['office-1', 'office-2'],
    staffId: 'staff-1',
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc-2',
    email: 'manager@barberpro.com',
    firstName: 'Elena',
    lastName: 'Petrov',
    role: 'manager',
    status: 'active',
    officeIds: ['office-1'],
    lastLoginAt: '2026-04-15T09:20:00Z',
    createdAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 'acc-3',
    email: 'sarah@barberpro.com',
    firstName: 'Sarah',
    lastName: 'Williams',
    role: 'receptionist',
    status: 'active',
    officeIds: ['office-1'],
    staffId: 'staff-4',
    lastLoginAt: '2026-04-17T08:15:00Z',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'acc-4',
    email: 'maria@barberpro.com',
    firstName: 'Maria',
    lastName: 'Garcia',
    role: 'barber',
    status: 'active',
    officeIds: ['office-1', 'office-2'],
    staffId: 'staff-2',
    lastLoginAt: '2026-04-16T17:45:00Z',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'acc-5',
    email: 'tomas@barberpro.com',
    firstName: 'Tomas',
    lastName: 'Jonaitis',
    role: 'receptionist',
    status: 'invited',
    officeIds: ['office-2'],
    lastLoginAt: null,
    createdAt: '2026-04-15T14:00:00Z',
  },
];

// Schema version — bump to force re-seed when the data shape changes
const SCHEMA_VERSION_KEY = 'barberpro_schema_version';
const CURRENT_SCHEMA_VERSION = 7; // v7: add `gender` to Client + re-seed (client-3 & client-5 changed)

// Initialize localStorage with default data
// Wrapped in try/catch so a corrupted localStorage entry can't white-screen the app.
export function initializeMockData() {
  try {
    _initializeMockData();
  } catch (err) {
    console.warn('[mock-data] migration failed, resetting storage', err);
    // Last resort: clear our namespace and re-seed from scratch.
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('barberpro_')) localStorage.removeItem(key);
    }
    _initializeMockData();
  }
}

function _initializeMockData() {
  const storedVersion = Number(localStorage.getItem(SCHEMA_VERSION_KEY) || '0');
  const needsMigration = storedVersion < CURRENT_SCHEMA_VERSION;

  if (needsMigration || !localStorage.getItem('barberpro_tenant')) {
    localStorage.setItem('barberpro_tenant', JSON.stringify(defaultTenant));
  }
  if (!localStorage.getItem('barberpro_categories')) {
    localStorage.setItem('barberpro_categories', JSON.stringify(defaultCategories));
  }
  if (needsMigration || !localStorage.getItem('barberpro_services')) {
    localStorage.setItem('barberpro_services', JSON.stringify(defaultServices));
  }
  if (needsMigration || !localStorage.getItem('barberpro_staff')) {
    localStorage.setItem('barberpro_staff', JSON.stringify(defaultStaff));
  }
  if (needsMigration || !localStorage.getItem('barberpro_clients')) {
    localStorage.setItem('barberpro_clients', JSON.stringify(defaultClients));
  }
  if (needsMigration || !localStorage.getItem('barberpro_appointments')) {
    localStorage.setItem('barberpro_appointments', JSON.stringify(defaultAppointments));
  }
  if (needsMigration || !localStorage.getItem('barberpro_shifts')) {
    localStorage.setItem('barberpro_shifts', JSON.stringify(defaultShifts));
  }
  if (!localStorage.getItem('barberpro_breaks')) {
    localStorage.setItem('barberpro_breaks', JSON.stringify(defaultBreaks));
  }
  if (needsMigration || !localStorage.getItem('barberpro_accounts')) {
    localStorage.setItem('barberpro_accounts', JSON.stringify(defaultAccounts));
  }

  localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
}
