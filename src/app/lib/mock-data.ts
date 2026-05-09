// Mock data generator for BarberPro Dashboard

import type {
  Client,
  Staff,
  Service,
  Category,
  Appointment,
  Shift,
  ShiftOverride,
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

// Default tenant — schema v14 fields are seeded with sensible defaults so a
// fresh install doesn't have to run the migration step.
export const defaultTenant: Tenant = {
  id: 'tenant-1',
  name: 'DeLegends Barbershop',
  displayName: 'DeLegends',
  email: 'contact@delegendsbarbershop.com',
  phone: '+1 (555) 123-4567',
  website: '',
  instagram: '',
  currency: 'EUR',
  timezone: 'Europe/Vilnius',
  holidays: [],
  bookingRules: {},
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

// Clients — 30 names across both offices. Mixed gender, varied last-visit
// dates and totalVisits so the clients page shows a believable retention
// curve (a few VIPs, many regulars, a long tail of newcomers).
const CLIENT_FIRSTS_M = ['Robert', 'James', 'Daniel', 'Michael', 'David', 'Christopher', 'Matthew', 'Andrew', 'Joseph', 'Ryan', 'Brandon', 'Justin', 'Tyler', 'Kevin', 'Eric', 'Jason', 'Brian', 'Aaron', 'Sean', 'Patrick'];
const CLIENT_FIRSTS_F = ['Emma', 'Olivia', 'Sophia', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn', 'Abigail'];
const CLIENT_LASTS = ['Taylor', 'Anderson', 'Thomas', 'Martinez', 'Robinson', 'Walker', 'Hall', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Carter', 'Mitchell', 'Roberts', 'Phillips'];
const CLIENT_NOTES = ['', '', '', '', 'Prefers short cuts', 'Sensitive scalp', 'Regular — every 3 weeks', 'Likes morning slots', 'Allergic to scented products', 'Quiet client', ''];
const CLIENT_AVATARS = [
  'https://i.pravatar.cc/150?u=client-1', 'https://i.pravatar.cc/150?u=client-2',
  'https://i.pravatar.cc/150?u=client-3', 'https://i.pravatar.cc/150?u=client-4',
  'https://i.pravatar.cc/150?u=client-5', 'https://i.pravatar.cc/150?u=client-6',
  'https://i.pravatar.cc/150?u=client-7', 'https://i.pravatar.cc/150?u=client-8',
  'https://i.pravatar.cc/150?u=client-9', 'https://i.pravatar.cc/150?u=client-10',
];

function buildDefaultClients(): Client[] {
  const out: Client[] = [];
  // 20 male first × 1 last each (paired by index) — 20 clients
  // 10 female first × 1 last each (offset paired) — 10 clients
  // Total: 30 clients
  const allFirsts: { name: string; gender: 'male' | 'female' }[] = [
    ...CLIENT_FIRSTS_M.map(name => ({ name, gender: 'male' as const })),
    ...CLIENT_FIRSTS_F.map(name => ({ name, gender: 'female' as const })),
  ];
  for (let i = 0; i < allFirsts.length; i++) {
    const f = allFirsts[i];
    const last = CLIENT_LASTS[(i * 7) % CLIENT_LASTS.length];
    // 20% pattern: every 5th client books at both offices
    const officeIds = i % 5 === 0 ? ['office-1', 'office-2'] : [i % 2 === 0 ? 'office-1' : 'office-2'];
    // Loyalty curve: first ~30% are VIPs (15-30 visits), middle 50% regulars (5-15),
    // last 20% newcomers (0-3). Matches the 30/50/20 power-law of real shops.
    const tier = i / allFirsts.length;
    const totalVisits = tier < 0.3 ? 15 + Math.floor(Math.random() * 16)
                      : tier < 0.8 ? 5 + Math.floor(Math.random() * 11)
                      : Math.floor(Math.random() * 4);
    out.push({
      id: `client-${i + 1}`,
      firstName: f.name,
      lastName: last,
      email: `${f.name.toLowerCase()}.${last.toLowerCase()}@email.com`,
      phone: `+1 (555) 1${String(100000 + i * 137).slice(0, 6)}`,
      notes: CLIENT_NOTES[i % CLIENT_NOTES.length],
      gender: f.gender,
      avatarUrl: CLIENT_AVATARS[i % CLIENT_AVATARS.length],
      totalVisits,
      lastVisitAt: totalVisits > 0
        ? new Date(2026, 3, 1 + (i * 13) % 28, 9 + (i % 10), 0, 0).toISOString()
        : null,
      officeIds,
      createdAt: new Date().toISOString(),
    });
  }
  return out;
}

export const defaultClients: Client[] = buildDefaultClients();

// Appointments — full month of May 2026 with realistic volume curves.
// Mon-Thu carry 18-26 bookings, Fri 20-26, Sat 24-32 (peak), Sun closed.
// Status distribution by date: past = mostly completed + small cancel/no-show
// slice, today mixed, future = scheduled/confirmed.
function buildMayAppointments(
  clients: Client[],
  staff: Staff[],
  services: Service[],
): Appointment[] {
  const out: Appointment[] = [];
  const taken = new Set<string>(); // staff-day-startMin lock to avoid conflicts
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const nowHour = now.getHours();

  const office1Staff = staff.filter(s => s.officeIds.includes('office-1') && s.isActive);
  const office2Staff = staff.filter(s => s.officeIds.includes('office-2') && s.isActive);
  const office1Services = services.filter(s => s.officeId === 'office-1');
  const office2Services = services.filter(s => s.officeId === 'office-2');

  // 30/50/20 loyalty buckets — a few VIPs drive most volume.
  const regulars = clients.slice(0, Math.floor(clients.length * 0.30));
  const occasionals = clients.slice(Math.floor(clients.length * 0.30), Math.floor(clients.length * 0.80));
  const walkins = clients.slice(Math.floor(clients.length * 0.80));
  const pickClient = (): Client => {
    const r = Math.random();
    const pool = r < 0.70 ? regulars : r < 0.95 ? occasionals : walkins;
    return pool[Math.floor(Math.random() * pool.length)] || clients[0];
  };

  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  let id = 1;
  // Iterate every day in May 2026 (month index 4)
  for (let d = 1; d <= 31; d++) {
    const day = new Date(2026, 4, d);
    const dow = day.getDay(); // 0=Sun, 6=Sat
    if (dow === 0) continue; // shop closed Sunday

    let count: number;
    if (dow === 6) count = 24 + Math.floor(Math.random() * 9);     // Sat: 24-32
    else if (dow === 5) count = 20 + Math.floor(Math.random() * 7); // Fri: 20-26
    else count = 18 + Math.floor(Math.random() * 9);                 // Mon-Thu: 18-26

    for (let i = 0; i < count; i++) {
      const useOffice1 = i % 2 === 0;
      const officeId = useOffice1 ? 'office-1' : 'office-2';
      const officeStaff = useOffice1 ? office1Staff : office2Staff;
      const officeServices = useOffice1 ? office1Services : office2Services;
      if (officeStaff.length === 0 || officeServices.length === 0) continue;
      const member = pick(officeStaff);
      const svc = pick(officeServices);
      const client = pickClient();
      if (!client) continue;

      // Try up to 25 random slots before giving up — prevents collisions when
      // the same staff is already booked on the same hour:minute.
      let placed = false;
      for (let attempt = 0; attempt < 25 && !placed; attempt++) {
        const hour = 9 + Math.floor(Math.random() * 9); // 9..17
        if (hour === 13) continue; // lunch break
        const minute = Math.random() < 0.5 ? 0 : 30;
        const slotKey = `${member.id}-${d}-${hour * 60 + minute}`;
        if (taken.has(slotKey)) continue;
        taken.add(slotKey);

        const start = new Date(2026, 4, d, hour, minute, 0, 0);
        const end = new Date(start.getTime() + svc.duration * 60_000);
        const dayKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

        let status: Appointment['status'];
        if (dayKey < todayKey) {
          const r = Math.random();
          status = r < 0.88 ? 'completed' : r < 0.94 ? 'cancelled' : 'no_show';
        } else if (dayKey === todayKey) {
          status = hour < nowHour
            ? 'completed'
            : Math.random() < 0.6 ? 'confirmed' : 'scheduled';
        } else {
          status = Math.random() < 0.4 ? 'confirmed' : 'scheduled';
        }

        out.push({
          id: `apt-${id++}`,
          clientId: client.id,
          staffId: member.id,
          serviceId: svc.id,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          status,
          notes: '',
          locationId: officeId,
          createdAt: new Date().toISOString(),
        });
        placed = true;
      }
    }
  }
  return out;
}

export const defaultAppointments: Appointment[] = buildMayAppointments(
  defaultClients,
  defaultStaff,
  defaultServices,
);

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

// Shift overrides — empty by default. Operator creates them via the calendar
// "Edit day" modal when they need to change a single date's schedule without
// touching the weekly recurring shift.
export const defaultShiftOverrides: ShiftOverride[] = [];

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
const CURRENT_SCHEMA_VERSION = 14; // v14: settings expansion — Tenant gets displayName/website/instagram/currency/vatRate/timezone/logoUrl/holidays/bookingRules; WorkingHoursDay gets lunchStart/lunchEnd; legacy BarberPro email rewritten

// Initialize localStorage with default data
// Wrapped in try/catch so a corrupted localStorage entry can't white-screen the app.
export function initializeMockData() {
  // Safety guard — schema migrations re-seed user data from defaults, which
  // is *fine* in mock-data demo mode but would destroy real customer rows in
  // a remote-backed deployment. When VITE_API_URL is set (REMOTE=true), the
  // server owns its own schema lifecycle; client-side migrations are a no-op.
  // (Audit P2 #10.)
  if (import.meta.env.VITE_API_URL) {
    return;
  }
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
  if (!localStorage.getItem('barberpro_shift_overrides')) {
    localStorage.setItem('barberpro_shift_overrides', JSON.stringify(defaultShiftOverrides));
  }
  if (needsMigration || !localStorage.getItem('barberpro_accounts')) {
    localStorage.setItem('barberpro_accounts', JSON.stringify(defaultAccounts));
  }

  // v9 patch: ensure existing breaks/absences carry an explicit recurrence flag.
  // The validator treats absent recurrence as 'weekly', so this is cosmetic — it
  // just makes stored rows well-formed for read-back consistency.
  if (storedVersion < 9) {
    const breaksRaw = localStorage.getItem('barberpro_breaks');
    if (breaksRaw) {
      const breaks = JSON.parse(breaksRaw) as Array<Record<string, unknown>>;
      const patched = breaks.map(b => b.recurrence ? b : { ...b, recurrence: 'weekly' });
      localStorage.setItem('barberpro_breaks', JSON.stringify(patched));
    }
    const absencesRaw = localStorage.getItem('barberpro_absences');
    if (absencesRaw) {
      const absences = JSON.parse(absencesRaw) as Array<Record<string, unknown>>;
      const patched = absences.map(a => a.recurrence ? a : { ...a, recurrence: 'weekly' });
      localStorage.setItem('barberpro_absences', JSON.stringify(patched));
    }
  }

  // Audit-trail backfill — runs on EVERY load, not just on version bumps.
  // Each step is idempotent: only writes when a field is missing. Without
  // this always-run guarantee, a new schema bump (e.g. v11→v12) would
  // re-seed appointments from defaults that don't carry `createdBy`, and
  // the audit footer would silently degrade to the timestamp-only line on
  // those rows. Default attribution is the seeded owner ('acc-1') since
  // we have no historical signal for who took each call.
  const nowIso = new Date().toISOString();
  const apptsRaw = localStorage.getItem('barberpro_appointments');
  if (apptsRaw) {
    const appts = JSON.parse(apptsRaw) as Array<Record<string, unknown>>;
    let patched = false;
    const next = appts.map(a => {
      if (a.createdBy && a.createdAt) return a;
      patched = true;
      return { ...a, createdBy: a.createdBy ?? 'acc-1', createdAt: a.createdAt ?? nowIso };
    });
    if (patched) localStorage.setItem('barberpro_appointments', JSON.stringify(next));
  }
  const breaksRaw = localStorage.getItem('barberpro_breaks');
  if (breaksRaw) {
    const breaks = JSON.parse(breaksRaw) as Array<Record<string, unknown>>;
    let patched = false;
    const next = breaks.map(b => {
      if (b.createdBy && b.createdAt) return b;
      patched = true;
      return { ...b, createdBy: b.createdBy ?? 'acc-1', createdAt: b.createdAt ?? nowIso };
    });
    if (patched) localStorage.setItem('barberpro_breaks', JSON.stringify(next));
  }
  const absencesRaw = localStorage.getItem('barberpro_absences');
  if (absencesRaw) {
    const absences = JSON.parse(absencesRaw) as Array<Record<string, unknown>>;
    let patched = false;
    const next = absences.map(a => {
      if (a.createdBy && a.createdAt) return a;
      patched = true;
      return { ...a, createdBy: a.createdBy ?? 'acc-1', createdAt: a.createdAt ?? nowIso };
    });
    if (patched) localStorage.setItem('barberpro_absences', JSON.stringify(next));
  }

  // v13 — DeLegends rebrand. Idempotent: only rewrites the legacy literal.
  // Doesn't touch a tenant the user has already renamed manually.
  const tenantRaw = localStorage.getItem('barberpro_tenant');
  if (tenantRaw) {
    const tenant = JSON.parse(tenantRaw) as Record<string, unknown>;
    let touched = false;

    if (tenant.name === 'BarberPro Shop') {
      tenant.name = 'DeLegends Barbershop';
      touched = true;
    }

    // v14 — settings expansion. Each step is idempotent: only writes when the
    // field is missing OR matches the legacy literal. Won't override
    // user-customized values.
    if (tenant.email === 'contact@barberpro.com') {
      tenant.email = 'contact@delegendsbarbershop.com';
      touched = true;
    }
    if (typeof tenant.displayName !== 'string') {
      // Derive "DeLegends" from "DeLegends Barbershop" by stripping common
      // suffixes; fall back to the full name if no suffix matches.
      const fullName = String(tenant.name ?? '');
      tenant.displayName = fullName.replace(/\s+(Barbershop|Barber Shop|Shop)$/i, '') || fullName;
      touched = true;
    }
    if (typeof tenant.currency !== 'string') {
      tenant.currency = 'EUR';
      touched = true;
    }
    if (typeof tenant.timezone !== 'string') {
      tenant.timezone = 'Europe/Vilnius';
      touched = true;
    }
    if (!Array.isArray(tenant.holidays)) {
      tenant.holidays = [];
      touched = true;
    }
    if (typeof tenant.bookingRules !== 'object' || tenant.bookingRules === null) {
      tenant.bookingRules = {};
      touched = true;
    }

    if (touched) localStorage.setItem('barberpro_tenant', JSON.stringify(tenant));
  }

  localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
}
