import type { Permission, StaffRole } from '../types';

// Barbershop role model:
// - owner       full access, including account management and analytics
// - manager     runs the shop day-to-day; can manage everything except accounts (no hire/fire of other managers)
// - receptionist front-desk; books and edits appointments, manages clients, no staff/settings/analytics
// - barber      sees own calendar, marks appointments done; does not touch staff/clients list or settings

const OWNER: Permission[] = [
  'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.delete', 'bookings.override_conflict',
  'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
  'staff.view', 'staff.manage',
  'services.view', 'services.manage',
  'analytics.view',
  'settings.view', 'settings.edit',
  'accounts.view', 'accounts.manage',
];

const MANAGER: Permission[] = [
  'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.delete', 'bookings.override_conflict',
  'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
  'staff.view', 'staff.manage',
  'services.view', 'services.manage',
  'analytics.view',
  'settings.view', 'settings.edit',
  'accounts.view', // manager can see the team but cannot change roles
];

const RECEPTIONIST: Permission[] = [
  'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.delete',
  'clients.view', 'clients.create', 'clients.edit',
  'staff.view',
  'services.view',
  'settings.view',
];

const BARBER: Permission[] = [
  'bookings.view', 'bookings.edit', // can mark own bookings complete
  'clients.view',
  'staff.view',
  'services.view',
];

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: OWNER,
  manager: MANAGER,
  receptionist: RECEPTIONIST,
  barber: BARBER,
};

export function can(role: StaffRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAny(role: StaffRole | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}
