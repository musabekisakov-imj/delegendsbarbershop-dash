// Seed data mirrored from dashboard's mock-data.ts — kept in sync manually.
// The customer-site API routes serve this data so the public booking widget
// shows the same offices, services, and staff as the dashboard.

export interface SeedOffice {
  id: string;
  name: string;
  address: string;
  phone: string;
  timezone: string;
}

export interface SeedCategory {
  id: string;
  name: string;
  color: string;
}

export interface SeedService {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  categoryId: string;
  officeId: string;
  imageUrl: string;
  isPublic: boolean;
}

export interface SeedStaff {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  isActive: boolean;
  officeIds: string[];
  role: string;
}

export interface SeedShift {
  staffId: string;
  dayOfWeek: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?w=800&q=80&auto=format&fit=crop`;

const PHOTO = {
  barbershop: unsplash('photo-1503951914875-452162b0f3f1'),
  fade:       unsplash('photo-1599351431202-1e0f0137899a'),
  beardTrim:  unsplash('photo-1622286342621-4bd786c2447c'),
  hotShave:   unsplash('photo-1585747860715-2ba37e788b70'),
  hairColor:  unsplash('photo-1522337360788-8b13dee7a37e'),
  highlights: unsplash('photo-1562322140-8baeececf3df'),
  styling:    unsplash('photo-1580618672591-eb180b1a973f'),
  barber2:    unsplash('photo-1605497788044-5a32c7078486'),
  beardShave: unsplash('photo-1599458448510-59aecaea4752'),
};

export const OFFICES: SeedOffice[] = [
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

export const CATEGORIES: SeedCategory[] = [
  { id: 'cat-1', name: 'Haircuts',       color: 'sky'     },
  { id: 'cat-2', name: 'Beard Grooming', color: 'amber'   },
  { id: 'cat-3', name: 'Hair Coloring',  color: 'violet'  },
  { id: 'cat-4', name: 'Styling',        color: 'emerald' },
];

export const SERVICES: SeedService[] = [
  { id: 'svc-1',  name: 'Classic Haircut', price: 35, duration: 30, categoryId: 'cat-1', description: 'Traditional haircut with scissors', officeId: 'office-1', imageUrl: PHOTO.barbershop, isPublic: true },
  { id: 'svc-2',  name: 'Fade Haircut',    price: 45, duration: 45, categoryId: 'cat-1', description: 'Modern fade with clippers',       officeId: 'office-1', imageUrl: PHOTO.fade,       isPublic: true },
  { id: 'svc-3',  name: 'Beard Trim',      price: 25, duration: 20, categoryId: 'cat-2', description: 'Precision beard trimming',        officeId: 'office-1', imageUrl: PHOTO.beardTrim,  isPublic: true },
  { id: 'svc-4',  name: 'Beard Shave',     price: 30, duration: 30, categoryId: 'cat-2', description: 'Hot towel shave',                 officeId: 'office-1', imageUrl: PHOTO.hotShave,   isPublic: true },
  { id: 'svc-5',  name: 'Hair Color',      price: 85, duration: 90, categoryId: 'cat-3', description: 'Full hair coloring service',      officeId: 'office-1', imageUrl: PHOTO.hairColor,  isPublic: true },
  { id: 'svc-6',  name: 'Highlights',      price: 95, duration: 120, categoryId: 'cat-3', description: 'Professional highlights',        officeId: 'office-1', imageUrl: PHOTO.highlights, isPublic: true },
  { id: 'svc-7',  name: 'Hair Styling',    price: 40, duration: 30, categoryId: 'cat-4', description: 'Professional styling for special events', officeId: 'office-1', imageUrl: PHOTO.styling, isPublic: true },
  { id: 'svc-8',  name: 'Classic Haircut', price: 32, duration: 30, categoryId: 'cat-1', description: 'Traditional haircut with scissors', officeId: 'office-2', imageUrl: PHOTO.barber2,   isPublic: true },
  { id: 'svc-9',  name: 'Fade Haircut',    price: 42, duration: 45, categoryId: 'cat-1', description: 'Modern fade with clippers',       officeId: 'office-2', imageUrl: PHOTO.fade,       isPublic: true },
  { id: 'svc-10', name: 'Beard Trim',      price: 22, duration: 20, categoryId: 'cat-2', description: 'Precision beard trimming',        officeId: 'office-2', imageUrl: PHOTO.beardShave, isPublic: true },
  { id: 'svc-11', name: 'Beard Shave',     price: 28, duration: 30, categoryId: 'cat-2', description: 'Hot towel shave',                 officeId: 'office-2', imageUrl: PHOTO.hotShave,   isPublic: true },
  { id: 'svc-12', name: 'Hair Color',      price: 80, duration: 90, categoryId: 'cat-3', description: 'Full hair coloring service',      officeId: 'office-2', imageUrl: PHOTO.hairColor,  isPublic: true },
];

export const STAFF: SeedStaff[] = [
  { id: 'staff-1', firstName: 'John',   lastName: 'Smith',    role: 'owner',        isActive: true,  avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',   officeIds: ['office-1', 'office-2'] },
  { id: 'staff-2', firstName: 'Maria',  lastName: 'Garcia',   role: 'barber',       isActive: true,  avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg', officeIds: ['office-1', 'office-2'] },
  { id: 'staff-3', firstName: 'David',  lastName: 'Johnson',  role: 'barber',       isActive: true,  avatarUrl: 'https://randomuser.me/api/portraits/men/68.jpg',   officeIds: ['office-1'] },
  { id: 'staff-4', firstName: 'Sarah',  lastName: 'Williams', role: 'receptionist', isActive: true,  avatarUrl: 'https://randomuser.me/api/portraits/women/26.jpg', officeIds: ['office-1'] },
  { id: 'staff-5', firstName: 'Michael',lastName: 'Brown',    role: 'barber',       isActive: false, avatarUrl: 'https://randomuser.me/api/portraits/men/47.jpg',   officeIds: ['office-2'] },
  { id: 'staff-6', firstName: 'Emma',   lastName: 'Davis',    role: 'barber',       isActive: true,  avatarUrl: 'https://randomuser.me/api/portraits/women/33.jpg', officeIds: ['office-2'] },
];

// Weekly shifts for availability calculation
export const SHIFTS: SeedShift[] = [
  // John Smith (owner) — Mon-Fri
  { staffId: 'staff-1', dayOfWeek: 'monday',    startTime: '09:00', endTime: '18:00' },
  { staffId: 'staff-1', dayOfWeek: 'tuesday',   startTime: '09:00', endTime: '18:00' },
  { staffId: 'staff-1', dayOfWeek: 'wednesday', startTime: '09:00', endTime: '18:00' },
  { staffId: 'staff-1', dayOfWeek: 'thursday',  startTime: '09:00', endTime: '18:00' },
  { staffId: 'staff-1', dayOfWeek: 'friday',    startTime: '09:00', endTime: '18:00' },
  // Maria Garcia — Tue-Sat
  { staffId: 'staff-2', dayOfWeek: 'tuesday',   startTime: '08:00', endTime: '16:00' },
  { staffId: 'staff-2', dayOfWeek: 'wednesday', startTime: '08:00', endTime: '16:00' },
  { staffId: 'staff-2', dayOfWeek: 'thursday',  startTime: '08:00', endTime: '16:00' },
  { staffId: 'staff-2', dayOfWeek: 'friday',    startTime: '08:00', endTime: '16:00' },
  { staffId: 'staff-2', dayOfWeek: 'saturday',  startTime: '09:00', endTime: '17:00' },
  // David Johnson — Mon-Fri
  { staffId: 'staff-3', dayOfWeek: 'monday',    startTime: '10:00', endTime: '20:00' },
  { staffId: 'staff-3', dayOfWeek: 'tuesday',   startTime: '10:00', endTime: '20:00' },
  { staffId: 'staff-3', dayOfWeek: 'wednesday', startTime: '10:00', endTime: '20:00' },
  { staffId: 'staff-3', dayOfWeek: 'thursday',  startTime: '10:00', endTime: '20:00' },
  { staffId: 'staff-3', dayOfWeek: 'friday',    startTime: '10:00', endTime: '20:00' },
  // Emma Davis — Tue-Sat
  { staffId: 'staff-6', dayOfWeek: 'tuesday',   startTime: '10:00', endTime: '19:00' },
  { staffId: 'staff-6', dayOfWeek: 'wednesday', startTime: '10:00', endTime: '19:00' },
  { staffId: 'staff-6', dayOfWeek: 'thursday',  startTime: '10:00', endTime: '19:00' },
  { staffId: 'staff-6', dayOfWeek: 'friday',    startTime: '10:00', endTime: '19:00' },
  { staffId: 'staff-6', dayOfWeek: 'saturday',  startTime: '10:00', endTime: '18:00' },
];

// Map JS getDay() → shift dayOfWeek string
export const DOW_MAP: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};
