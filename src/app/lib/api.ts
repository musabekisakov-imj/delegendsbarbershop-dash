// Mock API layer with localStorage persistence

import type {
  Client,
  Staff,
  Service,
  Category,
  Appointment,
  Shift,
  Tenant,
  AppointmentWithDetails,
  LoginResponse,
  User
} from '../types';

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
  login: async (email: string, password: string): Promise<LoginResponse> => {
    await delay();
    
    // Mock authentication - accept any email/password
    const user: User = {
      id: 'user-1',
      email,
      firstName: 'Admin',
      lastName: 'User',
      tenantId: 'tenant-1'
    };
    
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
  getAll: async (): Promise<Client[]> => {
    await delay();
    return getFromStorage<Client>('barberpro_clients');
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
  
  delete: async (id: string): Promise<void> => {
    await delay();
    const clients = getFromStorage<Client>('barberpro_clients');
    const filtered = clients.filter(c => c.id !== id);
    setToStorage('barberpro_clients', filtered);
  }
};

// Staff API
export const staffApi = {
  getAll: async (): Promise<Staff[]> => {
    await delay();
    return getFromStorage<Staff>('barberpro_staff');
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
  getAll: async (): Promise<Service[]> => {
    await delay();
    return getFromStorage<Service>('barberpro_services');
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
  getAll: async (): Promise<Appointment[]> => {
    await delay();
    return getFromStorage<Appointment>('barberpro_appointments');
  },
  
  getAllWithDetails: async (): Promise<AppointmentWithDetails[]> => {
    await delay();
    const appointments = getFromStorage<Appointment>('barberpro_appointments');
    const clients = getFromStorage<Client>('barberpro_clients');
    const staff = getFromStorage<Staff>('barberpro_staff');
    const services = getFromStorage<Service>('barberpro_services');
    
    return appointments.map(apt => {
      const client = clients.find(c => c.id === apt.clientId)!;
      const staffMember = staff.find(s => s.id === apt.staffId)!;
      const service = services.find(s => s.id === apt.serviceId)!;
      
      return {
        ...apt,
        client,
        staff: staffMember,
        service
      };
    });
  },
  
  getById: async (id: string): Promise<Appointment | null> => {
    await delay();
    const appointments = getFromStorage<Appointment>('barberpro_appointments');
    return appointments.find(a => a.id === id) || null;
  },
  
  create: async (data: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> => {
    await delay();
    const appointments = getFromStorage<Appointment>('barberpro_appointments');
    
    const newAppointment: Appointment = {
      ...data,
      id: 'apt-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    
    appointments.push(newAppointment);
    setToStorage('barberpro_appointments', appointments);
    
    // Update client's totalVisits and lastVisitAt
    if (data.status === 'completed') {
      const clients = getFromStorage<Client>('barberpro_clients');
      const clientIndex = clients.findIndex(c => c.id === data.clientId);
      if (clientIndex !== -1) {
        clients[clientIndex].totalVisits += 1;
        clients[clientIndex].lastVisitAt = data.startTime;
        setToStorage('barberpro_clients', clients);
      }
    }
    
    return newAppointment;
  },
  
  update: async (id: string, data: Partial<Appointment>): Promise<Appointment> => {
    await delay();
    const appointments = getFromStorage<Appointment>('barberpro_appointments');
    const index = appointments.findIndex(a => a.id === id);
    
    if (index === -1) throw new Error('Appointment not found');
    
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
  
  delete: async (id: string): Promise<void> => {
    await delay();
    const appointments = getFromStorage<Appointment>('barberpro_appointments');
    const filtered = appointments.filter(a => a.id !== id);
    setToStorage('barberpro_appointments', filtered);
  }
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
  }
};
