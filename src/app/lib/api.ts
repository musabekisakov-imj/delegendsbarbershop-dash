// API layer.
//
// Two modes, picked at module load by an env var:
//   - VITE_API_URL set    → hit the NestJS backend at that URL (Phase 1)
//   - VITE_API_URL unset  → fall back to localStorage (legacy demo mode)
//
// The fallback exists so the Vercel preview stays alive while the backend
// rolls out. Once the backend is deployed and the env var is set in
// production, the fallback can be deleted in a follow-up cleanup.

import type {
  Client,
  Staff,
  Service,
  Category,
  Appointment,
  Shift,
  ShiftOverride,
  Break,
  Absence,
  AbsenceReason,
  Tenant,
  AppointmentWithDetails,
  LoginResponse,
  User,
  Account,
  StaffRole,
  DayOfWeek,
} from '../types';
import { findConflicts, type Conflict } from './booking-validation';
import { http, httpGet, httpPost, httpPatch, httpPut, httpDelete, HttpError, API_BASE_URL } from './http';

const REMOTE = !!(import.meta.env.VITE_API_URL as string | undefined);

export class BookingConflictError extends Error {
  code = 'BOOKING_CONFLICT' as const;
  conflicts: Conflict[];

  constructor(conflicts: Conflict[]) {
    super('Booking conflicts with existing appointment');
    this.conflicts = conflicts;
  }
}

// Re-export for callers that catch HTTP errors from the api layer.
export { HttpError, API_BASE_URL };

// ─── localStorage helpers (used only when REMOTE is false) ──────────

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

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

// ─── Server-shape coercion ──────────────────────────────────────────
//
// Prisma's Decimal columns serialize to strings over JSON ("25.00").
// Coerce to number so multiplication / comparison on the frontend works.
function coerceServicePrice<T extends { price: unknown }>(s: T): T & { price: number } {
  return { ...s, price: typeof s.price === 'string' ? Number(s.price) : (s.price as number) };
}
function coerceServicesList(rows: unknown): Service[] {
  return (rows as Array<{ price: unknown } & Service>).map(coerceServicePrice) as Service[];
}

// Reconstruct BookingConflictError from a server 409.
function tryThrowBookingConflict(err: unknown): never {
  if (err instanceof HttpError && err.status === 409) {
    const body = err.body as
      | { code?: string; conflicts?: Array<{ id: string; startTime: string; endTime: string; office: { id: string; name: string; address: string } }> }
      | undefined;
    if (body?.code === 'BOOKING_CONFLICT' && Array.isArray(body.conflicts)) {
      const conflicts: Conflict[] = body.conflicts.map(c => ({
        appointment: {
          id: c.id,
          startTime: c.startTime,
          endTime: c.endTime,
          locationId: c.office.id,
          // The 409 envelope is intentionally lean — the conflict modal only
          // needs id/time/office. The other Appointment fields are not read
          // from the conflict path; we keep them present to satisfy the type.
          clientId: '',
          staffId: '',
          serviceId: '',
          status: 'scheduled',
          notes: '',
          createdAt: new Date().toISOString(),
        } as Appointment,
        office: c.office,
      }));
      throw new BookingConflictError(conflicts);
    }
  }
  throw err;
}

// ─── Auth API ───────────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    if (REMOTE) {
      return http<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
        noAuth: true,
      });
    }
    await delay();

    // Look the email up in the accounts table so the role drives the permission model.
    // Demo mode: any password is accepted, and an unknown email logs in as a default owner.
    const accounts = getFromStorage<Account>('barberpro_accounts');
    const match = accounts.find(a => a.email.toLowerCase() === email.toLowerCase() && a.status !== 'disabled');

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
      const updated = accounts.map(a =>
        a.id === match.id ? { ...a, lastLoginAt: new Date().toISOString() } : a
      );
      setToStorage('barberpro_accounts', updated);
    }

    const token = 'mock-jwt-token-' + Math.random().toString(36).substring(2);
    return { token, user };
  },

  logout: async (): Promise<void> => {
    if (REMOTE) return;
    await delay(100);
  },
};

// ─── Tenant API ─────────────────────────────────────────────────────

export const tenantApi = {
  get: async (): Promise<Tenant> => {
    if (REMOTE) return httpGet<Tenant>('/tenants/current');
    await delay();
    const tenant = getSingleFromStorage<Tenant>('barberpro_tenant');
    if (!tenant) throw new Error('Tenant not found');
    return tenant;
  },

  update: async (data: Partial<Tenant>): Promise<Tenant> => {
    if (REMOTE) return httpPatch<Tenant>('/tenants/current', data);
    await delay();
    const tenant = getSingleFromStorage<Tenant>('barberpro_tenant');
    if (!tenant) throw new Error('Tenant not found');
    const updated = { ...tenant, ...data };
    setSingleToStorage('barberpro_tenant', updated);
    return updated;
  },
};

// ─── Clients API ────────────────────────────────────────────────────

export const clientsApi = {
  // Default queries exclude soft-deleted (`deletedAt` set) clients. Opt in with
  // { includeArchived: true } — useful for "Archived clients" admin view.
  getAll: async (officeId?: string, opts: { includeArchived?: boolean } = {}): Promise<Client[]> => {
    if (REMOTE) {
      return httpGet<Client[]>('/clients', { query: { officeId, includeArchived: opts.includeArchived } });
    }
    await delay();
    const clients = getFromStorage<Client>('barberpro_clients');
    const active = opts.includeArchived ? clients : clients.filter(c => !c.deletedAt);
    if (!officeId) return active;
    return active.filter(c => c.officeIds?.includes(officeId));
  },

  getById: async (id: string): Promise<Client | null> => {
    if (REMOTE) {
      try {
        return await httpGet<Client>(`/clients/${id}`);
      } catch (err) {
        if (err instanceof HttpError && err.status === 404) return null;
        throw err;
      }
    }
    await delay();
    const clients = getFromStorage<Client>('barberpro_clients');
    return clients.find(c => c.id === id) || null;
  },

  create: async (data: Omit<Client, 'id' | 'createdAt' | 'totalVisits' | 'lastVisitAt'>): Promise<Client> => {
    if (REMOTE) return httpPost<Client>('/clients', data);
    await delay();
    const clients = getFromStorage<Client>('barberpro_clients');
    const newClient: Client = {
      ...data,
      id: 'client-' + Math.random().toString(36).substring(2, 9),
      totalVisits: 0,
      lastVisitAt: null,
      createdAt: new Date().toISOString(),
    };
    clients.push(newClient);
    setToStorage('barberpro_clients', clients);
    return newClient;
  },

  update: async (id: string, data: Partial<Client>): Promise<Client> => {
    if (REMOTE) return httpPatch<Client>(`/clients/${id}`, data);
    await delay();
    const clients = getFromStorage<Client>('barberpro_clients');
    const index = clients.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Client not found');
    clients[index] = { ...clients[index], ...data };
    setToStorage('barberpro_clients', clients);
    return clients[index];
  },

  delete: async (id: string): Promise<void> => {
    if (REMOTE) {
      await httpDelete(`/clients/${id}`);
      return;
    }
    await delay();
    const clients = getFromStorage<Client>('barberpro_clients');
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return;
    clients[idx] = { ...clients[idx], deletedAt: new Date().toISOString() };
    setToStorage('barberpro_clients', clients);
  },

  restore: async (id: string): Promise<void> => {
    if (REMOTE) {
      await httpPost(`/clients/${id}/restore`);
      return;
    }
    await delay();
    const clients = getFromStorage<Client>('barberpro_clients');
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return;
    const { deletedAt: _, ...rest } = clients[idx];
    clients[idx] = rest;
    setToStorage('barberpro_clients', clients);
  },
};

// ─── Staff API ──────────────────────────────────────────────────────

export const staffApi = {
  getAll: async (officeId?: string): Promise<Staff[]> => {
    if (REMOTE) return httpGet<Staff[]>('/staff', { query: { officeId } });
    await delay();
    const staff = getFromStorage<Staff>('barberpro_staff');
    if (!officeId) return staff;
    return staff.filter(s => s.officeIds?.includes(officeId));
  },

  getById: async (id: string): Promise<Staff | null> => {
    if (REMOTE) {
      try {
        return await httpGet<Staff>(`/staff/${id}`);
      } catch (err) {
        if (err instanceof HttpError && err.status === 404) return null;
        throw err;
      }
    }
    await delay();
    const staff = getFromStorage<Staff>('barberpro_staff');
    return staff.find(s => s.id === id) || null;
  },

  create: async (data: Omit<Staff, 'id' | 'createdAt'>): Promise<Staff> => {
    if (REMOTE) return httpPost<Staff>('/staff', data);
    await delay();
    const staff = getFromStorage<Staff>('barberpro_staff');
    const newStaff: Staff = {
      ...data,
      id: 'staff-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    staff.push(newStaff);
    setToStorage('barberpro_staff', staff);
    return newStaff;
  },

  update: async (id: string, data: Partial<Staff>): Promise<Staff> => {
    if (REMOTE) return httpPatch<Staff>(`/staff/${id}`, data);
    await delay();
    const staff = getFromStorage<Staff>('barberpro_staff');
    const index = staff.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Staff not found');
    staff[index] = { ...staff[index], ...data };
    setToStorage('barberpro_staff', staff);
    return staff[index];
  },

  delete: async (id: string): Promise<void> => {
    if (REMOTE) {
      await httpDelete(`/staff/${id}`);
      return;
    }
    await delay();
    const staff = getFromStorage<Staff>('barberpro_staff');
    const filtered = staff.filter(s => s.id !== id);
    setToStorage('barberpro_staff', filtered);
  },
};

// ─── Categories API ─────────────────────────────────────────────────

export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    if (REMOTE) return httpGet<Category[]>('/categories');
    await delay();
    return getFromStorage<Category>('barberpro_categories');
  },

  create: async (data: Omit<Category, 'id' | 'createdAt'>): Promise<Category> => {
    if (REMOTE) return httpPost<Category>('/categories', data);
    await delay();
    const categories = getFromStorage<Category>('barberpro_categories');
    const newCategory: Category = {
      ...data,
      id: 'cat-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    categories.push(newCategory);
    setToStorage('barberpro_categories', categories);
    return newCategory;
  },

  update: async (id: string, data: Partial<Category>): Promise<Category> => {
    if (REMOTE) return httpPatch<Category>(`/categories/${id}`, data);
    await delay();
    const categories = getFromStorage<Category>('barberpro_categories');
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Category not found');
    categories[index] = { ...categories[index], ...data };
    setToStorage('barberpro_categories', categories);
    return categories[index];
  },

  delete: async (id: string): Promise<void> => {
    if (REMOTE) {
      await httpDelete(`/categories/${id}`);
      return;
    }
    await delay();
    const categories = getFromStorage<Category>('barberpro_categories');
    const filtered = categories.filter(c => c.id !== id);
    setToStorage('barberpro_categories', filtered);
  },
};

// ─── Services API ───────────────────────────────────────────────────
// Server returns Prisma Decimal as a JSON string; coerceServicePrice() fixes it.

export const servicesApi = {
  getAll: async (officeId?: string): Promise<Service[]> => {
    if (REMOTE) {
      const rows = await httpGet<unknown>('/services', { query: { officeId } });
      return coerceServicesList(rows);
    }
    await delay();
    const services = getFromStorage<Service>('barberpro_services');
    if (!officeId) return services;
    return services.filter(s => s.officeId === officeId);
  },

  getById: async (id: string): Promise<Service | null> => {
    if (REMOTE) {
      try {
        const row = await httpGet<{ price: unknown } & Service>(`/services/${id}`);
        return coerceServicePrice(row);
      } catch (err) {
        if (err instanceof HttpError && err.status === 404) return null;
        throw err;
      }
    }
    await delay();
    const services = getFromStorage<Service>('barberpro_services');
    return services.find(s => s.id === id) || null;
  },

  create: async (data: Omit<Service, 'id' | 'createdAt'>): Promise<Service> => {
    if (REMOTE) {
      const row = await httpPost<{ price: unknown } & Service>('/services', data);
      return coerceServicePrice(row);
    }
    await delay();
    const services = getFromStorage<Service>('barberpro_services');
    const newService: Service = {
      ...data,
      id: 'svc-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    services.push(newService);
    setToStorage('barberpro_services', services);
    return newService;
  },

  update: async (id: string, data: Partial<Service>): Promise<Service> => {
    if (REMOTE) {
      const row = await httpPatch<{ price: unknown } & Service>(`/services/${id}`, data);
      return coerceServicePrice(row);
    }
    await delay();
    const services = getFromStorage<Service>('barberpro_services');
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Service not found');
    services[index] = { ...services[index], ...data };
    setToStorage('barberpro_services', services);
    return services[index];
  },

  delete: async (id: string): Promise<void> => {
    if (REMOTE) {
      await httpDelete(`/services/${id}`);
      return;
    }
    await delay();
    const services = getFromStorage<Service>('barberpro_services');
    const filtered = services.filter(s => s.id !== id);
    setToStorage('barberpro_services', filtered);
  },
};

// ─── Appointments API ───────────────────────────────────────────────

export const appointmentsApi = {
  getAll: async (officeId?: string, opts: { includeArchived?: boolean } = {}): Promise<Appointment[]> => {
    if (REMOTE) {
      return httpGet<Appointment[]>('/appointments', { query: { officeId, includeArchived: opts.includeArchived } });
    }
    await delay();
    const all = getFromStorage<Appointment>('barberpro_appointments');
    const live = opts.includeArchived ? all : all.filter(a => !a.deletedAt);
    if (!officeId) return live;
    return live.filter(a => a.locationId === officeId);
  },

  getAllAcrossOffices: async (): Promise<Appointment[]> => {
    if (REMOTE) return httpGet<Appointment[]>('/appointments');
    await delay();
    return getFromStorage<Appointment>('barberpro_appointments').filter(a => !a.deletedAt);
  },

  getAllWithDetails: async (officeId?: string, opts: { includeArchived?: boolean } = {}): Promise<AppointmentWithDetails[]> => {
    if (REMOTE) {
      // Server already includes client/staff/service via Prisma include().
      return httpGet<AppointmentWithDetails[]>('/appointments', {
        query: { officeId, includeArchived: opts.includeArchived },
      });
    }
    await delay();
    const all = getFromStorage<Appointment>('barberpro_appointments');
    const live = opts.includeArchived ? all : all.filter(a => !a.deletedAt);
    const clients = getFromStorage<Client>('barberpro_clients');
    const staff = getFromStorage<Staff>('barberpro_staff');
    const services = getFromStorage<Service>('barberpro_services');

    const scoped = officeId ? live.filter(a => a.locationId === officeId) : live;

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
    if (REMOTE) {
      try {
        return await httpGet<Appointment>(`/appointments/${id}`);
      } catch (err) {
        if (err instanceof HttpError && err.status === 404) return null;
        throw err;
      }
    }
    await delay();
    const appointments = getFromStorage<Appointment>('barberpro_appointments');
    return appointments.find(a => a.id === id) || null;
  },

  create: async (data: Omit<Appointment, 'id' | 'createdAt'> & { override?: boolean }): Promise<Appointment> => {
    if (REMOTE) {
      try {
        return await httpPost<Appointment>('/appointments', data);
      } catch (err) {
        tryThrowBookingConflict(err);
      }
    }
    await delay();
    const appointments = getFromStorage<Appointment>('barberpro_appointments');
    const tenant = getSingleFromStorage<Tenant>('barberpro_tenant');
    const { override, ...payload } = data;

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
      createdAt: new Date().toISOString(),
    };

    appointments.push(newAppointment);
    setToStorage('barberpro_appointments', appointments);

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

  // `officeId` opt is enforced by the server via `req.user.tenantId` —
  // the client check is defense-in-depth for the localStorage fallback.
  update: async (id: string, data: Partial<Appointment>, opts: { officeId?: string } = {}): Promise<Appointment> => {
    if (REMOTE) {
      // The server has no PATCH /appointments/:id yet — only cancel + delete + restore.
      // Status changes (the only field the UI actually mutates) go through cancel for 'cancelled'.
      // Other partial updates fall through to a generic POST cancel for now; full PATCH endpoint
      // is a Phase 1 follow-up.
      if (data.status === 'cancelled') {
        return httpPost<Appointment>(`/appointments/${id}/cancel`, {});
      }
      // TODO(phase-1): add PATCH /appointments/:id on the server.
      throw new Error('Appointment partial-update endpoint not yet implemented on the server');
    }
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

  delete: async (id: string, opts: { officeId?: string } = {}): Promise<void> => {
    if (REMOTE) {
      await httpDelete(`/appointments/${id}`);
      return;
    }
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

  restore: async (id: string, opts: { officeId?: string } = {}): Promise<Appointment> => {
    if (REMOTE) return httpPost<Appointment>(`/appointments/${id}/restore`, {});
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

// ─── Shifts / Absences / Breaks ────────────────────────────────────
// REMOTE mode: per-staff endpoints. getAll() fans out across all staff.

async function fanOutByStaff<T>(path: (staffId: string) => string): Promise<T[]> {
  const all = await staffApi.getAll();
  const lists = await Promise.all(all.map(s => httpGet<T[]>(path(s.id))));
  return lists.flat();
}

export const shiftsApi = {
  getAll: async (): Promise<Shift[]> => {
    if (REMOTE) return fanOutByStaff<Shift>(id => `/staff/${id}/shifts`);
    await delay();
    return getFromStorage<Shift>('barberpro_shifts');
  },

  getByStaffId: async (staffId: string): Promise<Shift[]> => {
    if (REMOTE) return httpGet<Shift[]>(`/staff/${staffId}/shifts`);
    await delay();
    const shifts = getFromStorage<Shift>('barberpro_shifts');
    return shifts.filter(s => s.staffId === staffId);
  },

  upsert: async (data: { staffId: string; dayOfWeek: DayOfWeek; startTime: string; endTime: string }): Promise<Shift> => {
    if (REMOTE) {
      return httpPut<Shift>(`/staff/${data.staffId}/shifts/${data.dayOfWeek}`, {
        startTime: data.startTime,
        endTime: data.endTime,
      });
    }
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

  remove: async (params: { staffId: string; dayOfWeek: DayOfWeek }): Promise<void> => {
    if (REMOTE) {
      await httpDelete(`/staff/${params.staffId}/shifts/${params.dayOfWeek}`);
      return;
    }
    await delay();
    const shifts = getFromStorage<Shift>('barberpro_shifts');
    setToStorage('barberpro_shifts', shifts.filter(s => !(s.staffId === params.staffId && s.dayOfWeek === params.dayOfWeek)));
  },
};

export const absencesApi = {
  getAll: async (): Promise<Absence[]> => {
    if (REMOTE) return fanOutByStaff<Absence>(id => `/staff/${id}/absences`);
    await delay();
    return getFromStorage<Absence>('barberpro_absences');
  },
  upsert: async (data: {
    staffId: string;
    dayOfWeek: DayOfWeek;
    reason: AbsenceReason;
    recurrence?: 'weekly' | 'one-off';
    startDate?: string;
    endDate?: string;
    createdAt?: string;
    createdBy?: string;
  }): Promise<Absence> => {
    if (REMOTE) {
      return httpPut<Absence>(`/staff/${data.staffId}/absences/${data.dayOfWeek}`, { reason: data.reason });
    }
    await delay();
    const all = getFromStorage<Absence>('barberpro_absences');
    const idx = all.findIndex(a => a.staffId === data.staffId && a.dayOfWeek === data.dayOfWeek);
    const next: Absence = idx >= 0
      ? {
          ...all[idx],
          reason: data.reason,
          ...(data.recurrence ? { recurrence: data.recurrence } : {}),
          ...(data.startDate ? { startDate: data.startDate } : {}),
          ...(data.endDate ? { endDate: data.endDate } : {}),
          ...(data.createdBy ? { createdBy: data.createdBy } : {}),
        }
      : {
          id: `abs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          staffId: data.staffId,
          dayOfWeek: data.dayOfWeek,
          reason: data.reason,
          ...(data.recurrence ? { recurrence: data.recurrence } : {}),
          ...(data.startDate ? { startDate: data.startDate } : {}),
          ...(data.endDate ? { endDate: data.endDate } : {}),
          ...(data.createdAt ? { createdAt: data.createdAt } : { createdAt: new Date().toISOString() }),
          ...(data.createdBy ? { createdBy: data.createdBy } : {}),
        };
    const out = idx >= 0 ? all.map((a, i) => i === idx ? next : a) : [...all, next];
    setToStorage('barberpro_absences', out);
    return next;
  },
  remove: async (params: { staffId: string; dayOfWeek: DayOfWeek }): Promise<void> => {
    if (REMOTE) {
      await httpDelete(`/staff/${params.staffId}/absences/${params.dayOfWeek}`);
      return;
    }
    await delay();
    const all = getFromStorage<Absence>('barberpro_absences');
    setToStorage('barberpro_absences', all.filter(a => !(a.staffId === params.staffId && a.dayOfWeek === params.dayOfWeek)));
  },
};

export const breaksApi = {
  getAll: async (): Promise<Break[]> => {
    if (REMOTE) return fanOutByStaff<Break>(id => `/staff/${id}/breaks`);
    await delay();
    return getFromStorage<Break>('barberpro_breaks');
  },

  getByStaffId: async (staffId: string): Promise<Break[]> => {
    if (REMOTE) return httpGet<Break[]>(`/staff/${staffId}/breaks`);
    await delay();
    const breaks = getFromStorage<Break>('barberpro_breaks');
    return breaks.filter(b => b.staffId === staffId);
  },

  // Multiple breaks per dayOfWeek are valid (lunch + rest), so keyed by id —
  // unlike Shift/Absence which are keyed by {staffId, dayOfWeek}.
  upsert: async (data: Omit<Break, 'id'> & { id?: string }): Promise<Break> => {
    if (REMOTE) {
      if (data.id) return httpPut<Break>(`/staff/${data.staffId}/breaks/${data.id}`, data);
      return httpPost<Break>(`/staff/${data.staffId}/breaks`, data);
    }
    await delay();
    const breaks = getFromStorage<Break>('barberpro_breaks');
    if (data.id) {
      const idx = breaks.findIndex(b => b.id === data.id);
      if (idx === -1) throw new Error(`Break ${data.id} not found`);
      const next: Break = { ...breaks[idx], ...data, id: data.id };
      setToStorage('barberpro_breaks', breaks.map((b, i) => i === idx ? next : b));
      return next;
    }
    const next: Break = {
      id: `brk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      staffId: data.staffId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      type: data.type,
      // Carry through any optional free-text label for type='custom'.
      // Spread keeps undefined out of localStorage when not set.
      ...(data.customLabel ? { customLabel: data.customLabel } : {}),
      ...(data.recurrence ? { recurrence: data.recurrence } : {}),
      ...(data.startDate ? { startDate: data.startDate } : {}),
      ...(data.endDate ? { endDate: data.endDate } : {}),
      ...(data.createdAt ? { createdAt: data.createdAt } : { createdAt: new Date().toISOString() }),
      ...(data.createdBy ? { createdBy: data.createdBy } : {}),
    };
    setToStorage('barberpro_breaks', [...breaks, next]);
    return next;
  },

  remove: async (params: { id: string; staffId: string }): Promise<void> => {
    if (REMOTE) {
      await httpDelete(`/staff/${params.staffId}/breaks/${params.id}`);
      return;
    }
    await delay();
    const breaks = getFromStorage<Break>('barberpro_breaks');
    setToStorage('barberpro_breaks', breaks.filter(b => b.id !== params.id));
  },
};

// ─── Shift overrides ──────────────────────────────────────────────
// Per-date schedule changes that supersede the weekly Shift table.
// Keyed by (staffId, date). Calendar resolver reads these first.
export const shiftOverridesApi = {
  getAll: async (): Promise<ShiftOverride[]> => {
    if (REMOTE) return fanOutByStaff<ShiftOverride>(id => `/staff/${id}/shift-overrides`);
    await delay();
    return getFromStorage<ShiftOverride>('barberpro_shift_overrides');
  },

  getByStaffId: async (staffId: string): Promise<ShiftOverride[]> => {
    if (REMOTE) return httpGet<ShiftOverride[]>(`/staff/${staffId}/shift-overrides`);
    await delay();
    const all = getFromStorage<ShiftOverride>('barberpro_shift_overrides');
    return all.filter(o => o.staffId === staffId);
  },

  upsert: async (data: { staffId: string; date: string; kind: 'day-off' | 'custom'; startTime?: string; endTime?: string }): Promise<ShiftOverride> => {
    if (REMOTE) {
      return httpPut<ShiftOverride>(`/staff/${data.staffId}/shift-overrides/${data.date}`, {
        kind: data.kind,
        startTime: data.startTime,
        endTime: data.endTime,
      });
    }
    await delay();
    const all = getFromStorage<ShiftOverride>('barberpro_shift_overrides');
    const idx = all.findIndex(o => o.staffId === data.staffId && o.date === data.date);
    const next: ShiftOverride = idx >= 0
      ? { ...all[idx], kind: data.kind, startTime: data.startTime, endTime: data.endTime }
      : { id: `ovr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...data };
    const out = idx >= 0 ? all.map((o, i) => i === idx ? next : o) : [...all, next];
    setToStorage('barberpro_shift_overrides', out);
    return next;
  },

  remove: async (params: { staffId: string; date: string }): Promise<void> => {
    if (REMOTE) {
      await httpDelete(`/staff/${params.staffId}/shift-overrides/${params.date}`);
      return;
    }
    await delay();
    const all = getFromStorage<ShiftOverride>('barberpro_shift_overrides');
    setToStorage('barberpro_shift_overrides', all.filter(o => !(o.staffId === params.staffId && o.date === params.date)));
  },
};

// ─── Accounts API ───────────────────────────────────────────────────

export const accountsApi = {
  getAll: async (): Promise<Account[]> => {
    if (REMOTE) return httpGet<Account[]>('/accounts');
    await delay();
    return getFromStorage<Account>('barberpro_accounts');
  },

  getById: async (id: string): Promise<Account | null> => {
    if (REMOTE) {
      try {
        return await httpGet<Account>(`/accounts/${id}`);
      } catch (err) {
        if (err instanceof HttpError && err.status === 404) return null;
        throw err;
      }
    }
    await delay();
    const accounts = getFromStorage<Account>('barberpro_accounts');
    return accounts.find(a => a.id === id) ?? null;
  },

  invite: async (data: {
    email: string;
    firstName: string;
    lastName: string;
    role: StaffRole;
    officeIds: string[];
    staffId?: string;
    avatarUrl?: string;
  }): Promise<Account> => {
    if (REMOTE) return httpPost<Account>('/accounts', data);
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
    if (REMOTE) return httpPatch<Account>(`/accounts/${id}`, data);
    await delay();
    const accounts = getFromStorage<Account>('barberpro_accounts');
    const target = accounts.find(a => a.id === id);
    if (!target) throw new Error('Account not found');

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
    if (REMOTE) {
      await httpDelete(`/accounts/${id}`);
      return;
    }
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
