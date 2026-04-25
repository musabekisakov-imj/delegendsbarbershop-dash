// Types mirror the public endpoints of the BarberPro NestJS backend.
// See: server/src/public/* — keep in sync with that controller.

export interface Office {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  timezone?: string | null;
}

export interface Category {
  id: string;
  name: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // minutes
  imageUrl?: string | null;
  officeId: string;
  categoryId: string;
  category?: Category | null;
}

export interface PublicStaff {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  isActive: boolean;
}

export interface ConfirmedBooking {
  appointmentId: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  staffName: string;
  officeName: string;
  officeAddress: string;
}
