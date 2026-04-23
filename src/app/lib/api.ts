// Mock API layer with localStorage persistence

import type {
  Client,
  Staff,
  Service,
  Category,
  Appointment,
  Shift,
  Break,
  Absence,
  AbsenceReason,
  Tenant,
  AppointmentWithDetails,
  LoginResponse,
  User,
  Account,
  StaffRole
} from '../types';
import { findConflicts } from './booking-validation';

export class BookingConflictError extends Error {
  code = 'BOOKING_CONFLICT' as const;
  conflicts: ReturnType<typeof findConflicts>;

  constructor(conflicts: ReturnType<typeof findConflicts>) {
    super('Booking conflicts with existing appointment');
    this.conflicts = conflicts;
  }
}

// Helper to simulate API delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Generic storage helpers
function getFromStorage<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function setToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function getSingleFromStorage<T>(key: string): T | null {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

function setSingleToStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Auth API
export const authApi = {
  login: async (email: string, _password: string): Promise<LoginResponse> => {
    await delay();

    // Look the email up in the accounts table so the role drives the permission model.
    // Demo mode: any password is accepted, and an unknown email logs in as a default owner.
    const accounts = getFromStorage<Account>('barberpro_accounts');
    const match = accounts.find(a => a.email.toLowerCase() === email.toLowerCase() && a.status !== 'disabled');

    // ⚠️ TODO(backend-swap): this unknown-email fallback grants owner-level access.
    // It only exists because the current app is localStorage-only demo mode.
    // Before wiring a real auth backend:
    //   1. REMOVE the fallback branch entirely — unknown credentials must reject.
    //   2. Verify password against the server, not the accounts table here.
    //   3. Issue a real signed token, not a random string.
    const user: User = match
      ? {
          id: match.id,
          email: match.email,
          firstName: match.firstName,
          lastName: match.lastName,
          tenantId: 'tenant-1',
          role: match.role,
        }
      : {
          id: 'user-1',
          email,
          firstName: 'Admin',
          lastName: 'User',
          tenantId: 'tenant-1',
          role: 'owner',
        };

    if (match) {
      // Bump lastLoginAt so the accounts page reflects reality
      const updated = accounts.map(a =>
        a.id === match.id ? { ...a, lastLoginAt: new Date().toISOString() } : a
      );
      setToStorage('barberpro_accounts', updated);
    }

    const token = 'mock-jwt-token-' + Math.random().toString(36).substring(2);
    return { token, user };
  },

  logout: async (): Promise<void> => {
    await delay(100);
    // Clear auth data
  }
};

// Tenant API
export const tenantApi = {
  get: async (): Promise<Tenant> => {
    await delay();
    const tenant = getSingleFromStorage<Tenant>('barberpro_tenant');
    if (!tenant) throw new Error('Tenant not found');
    return tenant;
  },
  
  update: async (data: Partial<Tenant>): Promise<Tenant> => {
    await delay();
    const tenant = getSingleFromStorage<Tenant>('barberpro_tenant');
    if (!tenant) throw new Error('Tenant not found');
    
    const updated = { ...tenant, ...data };
    setSingleToStorage('barberpro_tenant', updated);
    return updated;
  }
};

// Clients API
export const clientsApi = {
  // Default queries exclude soft-deleted (`deletedAt` set) clients. Opt in with
  // { includeArchived: true } — useful for "Archived clients" admin view and for
  // detail lookups where an appointment might reference a deleted client.
  getAll: async (officeId?: string, opts: { includeArchived?: boolean } = {}): Promise<Client[]> => {
    await delay();
    const clients = getFromStorage<Client>('barberpro_clients');
    const active = opts.includeArchived ? clients : clients.filter(c => !c.deletedAt);
    if (!officeId) return active;
    return active.filter(c => c.officeIds?.includes(officeId));
  },

  getById: async (id: string): Promise<Client | null> => {
    await delay();
    const clients = getFromStorage<Client>('barberpro_clients');
    return clients.find(c => c.id === id) || null;
  },
  
  create: async (data: Omit<Client, 'id' | 'createdAt' | 'totalVisits' | 'lastVisitAt'>): Promise<Client> => {
    await delay();
    const clients = getFromStorage<Client>('barberpro_clients');
    
    const newClient: Client = {
      ...data,
      id: 'client-' + Math.random().toString(36).substring(2, 9),
      totalVisits: 0,
      lastVisitAt: null,
      createdAt: new Date().toISOString()
    };
    
    clients.push(newClient);
    setToStorage('barberpro_clients', clients);
    return newClient;
  },
  
  update: async (id: string, data: Partial<Client>): Promise<Client> => {
    await delay();
    const clients = getFromStorage<Client>('barberpro_clients');
    const index = clients.findIndex(c => c.id === id);
    
    if (index === -1) throw new Error('Client not found');
    
    clients[index] = { ...clients[index], ...data };
    setToStorage('barberpro_clients', clients);
    return clients[index];
  },
  
  // Soft delete — sets `deletedAt` instead of physically removing.
  // Preserves FK integrity: appointments still resolve their `clientId`,
  // totalVisits stays accurate, and an "Undo" on the toast is trivial
  // (clear `deletedAt`). Use `purge()` only from an admin console.
  delete: async (id: string): Promise<void> => {
    await delay();
    const clients = getFromStorage<Client>('barberpro_clients');
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return;
    clients[idx] = { ...clients[idx], deletedAt: new Date().toISOString() };
    setToStorage('barberpro_clients', clients);
  },

  // Restore a soft-deleted client. Used by the Undo toast and by the
  // Archived view's "Restore" action.
  restore: async (id: string): Promise<void> => {
    await delay();
    const clients = getFromStorage<Client>('barberpro_clients');
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return;
    const { deletedAt: _, ...rest } = clients[idx];
    clients[idx] = rest;
    setToStorage('barberpro_clients', clients);
  },
};

// Staff API
export const staffApi = {
  getAll: async (officeId?: string): Promise<Staff[]> => {
    await delay();
    const staff = getFromStorage<Staff>('barberpro_staff');
    if (!officeId) return staff;
    return staff.filter(s => s.officeIds?.includes(officeId));
  },
  
  getById: async (id: string): Promise<Staff | null> => {
    await delay();
    const staff = getFromStorage<Staff>('barberpro_staff');
    return staff.find(s => s.id === id) || null;
  },
  
  create: async (data: Omit<Staff, 'id' | 'createdAt'>): Promise<Staff> => {
    await delay();
    const staff = getFromStorage<Staff>('barberpro_staff');
    
    const newStaff: Staff = {
      ...data,
      id: 'staff-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    
    staff.push(newStaff);
    setToStorage('barberpro_staff', staff);
    return newStaff;
  },
  
  update: async (id: string, data: Partial<Staff>): Promise<Staff> => {
    await delay();
    const staff = getFromStorage<Staff>('barberpro_staff');
    const index = staff.findIndex(s => s.id === id);
    
    if (index === -1) throw new Error('Staff not found');
    
    staff[index] = { ...staff[index], ...data };
    setToStorage('barberpro_staff', staff);
    return staff[index];
  },
  
  delete: async (id: string): Promise<void> => {
    await delay();
    const staff = getFromStorage<Staff>('barberpro_staff');
    const filtered = staff.filter(s => s.id !== id);
    setToStorage('barberpro_staff', filtered);
  }
};

// Categories API
export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    await delay();
    return getFromStorage<Category>('barberpro_categories');
  },
  
  create: async (data: Omit<Category, 'id' | 'createdAt'>): Promise<Category> => {
    await delay();
    const categories = getFromStorage<Category>('barberpro_categories');
    
    const newCategory: Category = {
      ...data,
      id: 'cat-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    
    categories.push(newCategory);
    setToStorage('barberpro_categories', categories);
    return newCategory;
  },
  
  update: async (id: string, data: Partial<Category>): Promise<Category> => {
    await delay();
    const categories = getFromStorage<Category>('barberpro_categories');
    const index = categories.findIndex(c => c.id === id);
    
    if (index === -1) throw new Error('Category not found');
    
    categories[index] = { ...categories[index], ...data };
    setToStorage('barberpro_categories', categories);
    return categories[index];
  },
  
  delete: async (id: string): Promise<void> => {
    await delay();
    const categories = getFromStorage<Category>('barberpro_categories');
    const filtered = categories.filter(c => c.id !== id);
    setToStorage('barberpro_categories', filtered);
  }
};

// Services API
export const servicesApi = {
  getAll: async (officeId?: string): Promise<Service[]> => {
    await delay();
    const services = getFromStorage<Service>('barberpro_services');
    if (!officeId) return services;
    return services.filter(s => s.officeId === officeId);
  },
  
  getById: async (id: string): Promise<Service | null> => {
    await delay();
    const services = getFromStorage<Service>('barberpro_services');
    return services.find(s => s.id === id) || null;
  },
  
  create: async (data: Omit<Service, 'id' | 'createdAt'>): Promise<Service> => {
    await delay();
    const services = getFromStorage<Service>('barberpro_services');
    
    const newService: Service = {
      ...data,
      id: 'svc-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    
    services.push(newService);
    setToStorage('barberpro_services', services);
    return newService;
  },
  
  update: async (id: string, data: Partial<Service>): Promise<Service> => {
    await delay();
    const services = getFromStorage<Service>('barberpro_services');
    const index = services.findIndex(s => s.id === id);
    
    if (index === -1) throw new Error('Service not found');
    
    services[index] = { ...services[index], ...data };
    setToStorage('barberpro_services', services);
    return services[index];
  },
  
  delete: async (id: string): Promise<void> => {
    await delay();
    const services = getFromStorage<Service>('barberpro_services');
    const filtered = services.filter(s => s.id !== id);
    setToStorage('barberpro_services', filtered);
  }
};

// Appointments API
export const appointmentsApi = {
  getAll: async (officeId?: string, opts: { includeArchived?: boolean } = {}): Promise<Appointment[]> => {
    await delay();
    const all = getFromStorage<Appointment>('barberpro_appointments');
    const live = opts.includeArchived ? all : all.filter(a => !a.deletedAt);
    if (!officeId) return live;
    return live.filter(a => a.locationId === officeId);
  },

  // Used by global search and conflict detection — never filters by office.
  // Conflict detection MUST include soft-deleted rows? No — a deleted booking
  // doesn't occupy the slot anymore. Filter them out here too.
  getAllAcrossOffices: async (): Promise<Appointment[]> => {
    await delay();
    return getFromStorage<Appointment>('barberpro_appointments').filter(a => !a.deletedAt);
  },

  getAllWithDetails: async (officeId?: string, opts: { includeArchived?: boolean } = {}): Promise<AppointmentWithDetails[]> => {
    await delay();
    const all = getFromStorage<Appointment>('barberpro_appointments');
    const live = opts.includeArchived ? all : all.filter(a => !a.deletedAt);
    const clients = getFromStorage<Client>('barberpro_clients');
    const staff = getFromStorage<Staff>('barberpro_staff');
    const services = getFromStorage<Service>('barberpro_services');

    const scoped = officeId ? live.filter(a => a.locationId === officeId) : live;

    // Build lookup maps once instead of O(n·m) find() per appointment.
    // Filter out appointments with dangling FKs instead of `!`-asserting — a
    // deleted client/staff/service would otherwise crash every consumer downstream.
    const clientById = new Map(clients.map(c => [c.id, c]));
    const staffById = new Map(staff.map(s => [s.id, s]));
    const serviceById = new Map(services.map(s => [s.id, s]));

    return scoped
      .map(apt => {
        const client = clientById.get(apt.clientId);
        const staffMember = staffById.get(apt.staffId);
        const service = serviceById.get(apt.serviceId);
        if (!client || !staffMember || !service) return null;
        return { ...apt, client, staff: staffMember, service } satisfies AppointmentWithDetails;
      })
      .filter((a): a is AppointmentWithDetails => a !== null);
  },
  
  getById: async (id: string): Promise<Appointment | null> => {
    await delay();
    const appointments = getFromStorage<Appointment>('barberpro_appointments');
    return appointments.find(a => a.id === id) || null;
  },
  
  create: async (data: Omit<Appointment, 'id' | 'createdAt'> & { override?: boolean }): Promise<Appointment> => {
    await delay();
    const appointments = getFromStorage<Appointment>('barberpro_appointments');
    const tenant = getSingleFromStorage<Tenant>('barberpro_tenant');
    const { override, ...payload } = data;

    // Server-side defense-in-depth — check conflicts unless an authorized caller set override=true
    if (!override && tenant?.offices) {
      const conflicts = findConflicts(
        {
          staffId: payload.staffId,
          start: new Date(payload.startTime),
          end: new Date(payload.endTime),
        },
        appointments,
        tenant.offices,
      );
      if (conflicts.length > 0) {
        throw new BookingConflictError(conflicts);
      }
    }

    const newAppointment: Appointment = {
      ...payload,
      id: 'apt-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };

    appointments.push(newAppointment);
    setToStorage('barberpro_appointments', appointments);
    
    // Update client's totalVisits and lastVisitAt
    if (payload.status === 'completed') {
      const clients = getFromStorage<Client>('barberpro_clients');
      const clientIndex = clients.findIndex(c => c.id === payload.clientId);
      if (clientIndex !== -1) {
        clients[clientIndex].totalVisits += 1;
        clients[clientIndex].lastVisitAt = payload.startTime;
        setToStorage('barberpro_clients', clients);
      }
    }

    return newAppointment;
  },
  
  // `officeId` is optional but when passed, mutations assert the row belongs
  // to that office. This is defense-in-depth: the UI already filters by
  // office, but a stale id in memory (or a future HTTP transport) could
  // mutate across tenants. Server-side assertion is the only real guarantee.
  update: async (id: string, data: Partial<Appointment>, opts: { officeId?: string } = {}): Promise<Appointment> => {
    await delay();
    const appointments = getFromStorage<Appointment>('barberpro_appointments');
    const index = appointments.findIndex(a => a.id === id);

    if (index === -1) throw new Error('Appointment not found');
    if (opts.officeId && appointments[index].locationId !== opts.officeId) {
      throw new Error('Cross-office mutation blocked');
    }

    const oldStatus = appointments[index].status;
    appointments[index] = { ...appointments[index], ...data };
    setToStorage('barberpro_appointments', appointments);

    // Update client stats if status changed to completed
    if (oldStatus !== 'completed' && data.status === 'completed') {
      const clients = getFromStorage<Client>('barberpro_clients');
      const clientIndex = clients.findIndex(c => c.id === appointments[index].clientId);
      if (clientIndex !== -1) {
        clients[clientIndex].totalVisits += 1;
        clients[clientIndex].lastVisitAt = appointments[index].startTime;
        setToStorage('barberpro_clients', clients);
      }
    }

    return appointments[index];
  },

  // Soft-delete — appointment stays in storage with `deletedAt` set.
  // Audit, payroll, no-show disputes, and Undo all need the row to persist.
  delete: async (id: string, opts: { officeId?: string } = {}): Promise<void> => {
    await delay();
    const appointments = getFromStorage<Appointment>('barberpro_appointments');
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) return;
    if (opts.officeId && appointments[index].locationId !== opts.officeId) {
      throw new Error('Cross-office mutation blocked');
    }
    appointments[index] = { ...appointments[index], deletedAt: new Date().toISOString() };
    setToStorage('barberpro_appointments', appointments);
  },

  // Undo-side of soft-delete — clear `deletedAt` so the booking rejoins
  // default reads. Used by the Undo toast.
  restore: async (id: string, opts: { officeId?: string } = {}): Promise<Appointment> => {
    await delay();
    const appointments = getFromStorage<Appointment>('barberpro_appointments');
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Appointment not found');
    if (opts.officeId && appointments[index].locationId !== opts.officeId) {
      throw new Error('Cross-office mutation blocked');
    }
    appointments[index] = { ...appointments[index], deletedAt: null };
    setToStorage('barberpro_appointments', appointments);
    return appointments[index];
  },
};

// Shifts API
export const shiftsApi = {
  getAll: async (): Promise<Shift[]> => {
    await delay();
    return getFromStorage<Shift>('barberpro_shifts');
  },

  getByStaffId: async (staffId: string): Promise<Shift[]> => {
    await delay();
    const shifts = getFromStorage<Shift>('barberpro_shifts');
    return shifts.filter(s => s.staffId === staffId);
  },

  /** Upsert by (staffId, dayOfWeek) — there should only ever be one shift
   *  per staff per day, so this replaces if present, inserts otherwise. */
  upsert: async (data: { staffId: string; dayOfWeek: Shift['dayOfWeek']; startTime: string; endTime: string }): Promise<Shift> => {
    await delay();
    const shifts = getFromStorage<Shift>('barberpro_shifts');
    const idx = shifts.findIndex(s => s.staffId === data.staffId && s.dayOfWeek === data.dayOfWeek);
    const next: Shift = idx >= 0
      ? { ...shifts[idx], startTime: data.startTime, endTime: data.endTime }
      : { id: `shift-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...data };
    const out = idx >= 0 ? shifts.map((s, i) => i === idx ? next : s) : [...shifts, next];
    setToStorage('barberpro_shifts', out);
    return next;
  },

  /** Remove by (staffId, dayOfWeek) — used for "day off" toggle. */
  remove: async (params: { staffId: string; dayOfWeek: Shift['dayOfWeek'] }): Promise<void> => {
    await delay();
    const shifts = getFromStorage<Shift>('barberpro_shifts');
    setToStorage('barberpro_shifts', shifts.filter(s => !(s.staffId === params.staffId && s.dayOfWeek === params.dayOfWeek)));
  },
};

// Absences API — weekly-recurring "why off" reasons per (staff, day).
export const absencesApi = {
  getAll: async (): Promise<Absence[]> => {
    await delay();
    return getFromStorage<Absence>('barberpro_absences');
  },
  upsert: async (data: { staffId: string; dayOfWeek: Shift['dayOfWeek']; reason: AbsenceReason }): Promise<Absence> => {
    await delay();
    const all = getFromStorage<Absence>('barberpro_absences');
    const idx = all.findIndex(a => a.staffId === data.staffId && a.dayOfWeek === data.dayOfWeek);
    const next: Absence = idx >= 0
      ? { ...all[idx], reason: data.reason }
      : { id: `abs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...data };
    const out = idx >= 0 ? all.map((a, i) => i === idx ? next : a) : [...all, next];
    setToStorage('barberpro_absences', out);
    return next;
  },
  remove: async (params: { staffId: string; dayOfWeek: Shift['dayOfWeek'] }): Promise<void> => {
    await delay();
    const all = getFromStorage<Absence>('barberpro_absences');
    setToStorage('barberpro_absences', all.filter(a => !(a.staffId === params.staffId && a.dayOfWeek === params.dayOfWeek)));
  },
};

// Breaks API
export const breaksApi = {
  getAll: async (): Promise<Break[]> => {
    await delay();
    return getFromStorage<Break>('barberpro_breaks');
  },

  getByStaffId: async (staffId: string): Promise<Break[]> => {
    await delay();
    const breaks = getFromStorage<Break>('barberpro_breaks');
    return breaks.filter(b => b.staffId === staffId);
  }
};

// Accounts API — user accounts with roles. Drives the permission system.
export const accountsApi = {
  getAll: async (): Promise<Account[]> => {
    await delay();
    return getFromStorage<Account>('barberpro_accounts');
  },

  getById: async (id: string): Promise<Account | null> => {
    await delay();
    const accounts = getFromStorage<Account>('barberpro_accounts');
    return accounts.find(a => a.id === id) ?? null;
  },

  // Invite a new account (status = 'invited' until first login).
  invite: async (data: {
    email: string;
    firstName: string;
    lastName: string;
    role: StaffRole;
    officeIds: string[];
    staffId?: string;
    avatarUrl?: string;
  }): Promise<Account> => {
    await delay();
    const accounts = getFromStorage<Account>('barberpro_accounts');

    if (accounts.some(a => a.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error('An account with this email already exists');
    }

    const account: Account = {
      id: 'acc-' + Math.random().toString(36).substring(2, 9),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      status: 'invited',
      officeIds: data.officeIds,
      staffId: data.staffId,
      avatarUrl: data.avatarUrl,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
    };

    setToStorage('barberpro_accounts', [...accounts, account]);
    return account;
  },

  update: async (id: string, data: Partial<Account>): Promise<Account> => {
    await delay();
    const accounts = getFromStorage<Account>('barberpro_accounts');
    const target = accounts.find(a => a.id === id);
    if (!target) throw new Error('Account not found');

    // Owner is load-bearing — prevent demoting the last active owner so the tenant can't lock itself out.
    if (
      target.role === 'owner' &&
      data.role &&
      data.role !== 'owner' &&
      accounts.filter(a => a.role === 'owner' && a.status === 'active').length <= 1
    ) {
      throw new Error('Cannot remove the last active owner');
    }

    const updated = accounts.map(a => (a.id === id ? { ...a, ...data, id: a.id } : a));
    setToStorage('barberpro_accounts', updated);
    return updated.find(a => a.id === id)!;
  },

  remove: async (id: string): Promise<void> => {
    await delay();
    const accounts = getFromStorage<Account>('barberpro_accounts');
    const target = accounts.find(a => a.id === id);
    if (!target) return;

    if (
      target.role === 'owner' &&
      accounts.filter(a => a.role === 'owner' && a.status === 'active').length <= 1
    ) {
      throw new Error('Cannot remove the last active owner');
    }

    setToStorage('barberpro_accounts', accounts.filter(a => a.id !== id));
  },
};
