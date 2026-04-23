import { describe, it, expect } from 'vitest';
import { can, canAny, ROLE_PERMISSIONS } from './permissions';

describe('permissions', () => {
  it('owner can do everything', () => {
    expect(can('owner', 'accounts.manage')).toBe(true);
    expect(can('owner', 'bookings.delete')).toBe(true);
    expect(can('owner', 'analytics.view')).toBe(true);
    expect(can('owner', 'settings.edit')).toBe(true);
  });

  it('manager cannot manage accounts but can manage everything else', () => {
    expect(can('manager', 'accounts.manage')).toBe(false);
    expect(can('manager', 'accounts.view')).toBe(true);
    expect(can('manager', 'staff.manage')).toBe(true);
    expect(can('manager', 'analytics.view')).toBe(true);
    expect(can('manager', 'settings.edit')).toBe(true);
  });

  it('receptionist can book/edit but not manage staff or settings', () => {
    expect(can('receptionist', 'bookings.create')).toBe(true);
    expect(can('receptionist', 'clients.edit')).toBe(true);
    expect(can('receptionist', 'clients.delete')).toBe(false);
    expect(can('receptionist', 'staff.manage')).toBe(false);
    expect(can('receptionist', 'settings.edit')).toBe(false);
    expect(can('receptionist', 'analytics.view')).toBe(false);
  });

  it('barber is read-mostly except own bookings', () => {
    expect(can('barber', 'bookings.view')).toBe(true);
    expect(can('barber', 'bookings.edit')).toBe(true); // mark own appointments complete
    expect(can('barber', 'bookings.create')).toBe(false);
    expect(can('barber', 'bookings.delete')).toBe(false);
    expect(can('barber', 'clients.create')).toBe(false);
    expect(can('barber', 'settings.edit')).toBe(false);
    expect(can('barber', 'accounts.view')).toBe(false);
  });

  it('returns false for null/undefined role', () => {
    expect(can(null, 'bookings.view')).toBe(false);
    expect(can(undefined, 'bookings.view')).toBe(false);
  });

  it('canAny works across multiple permissions', () => {
    expect(canAny('receptionist', ['settings.edit', 'bookings.create'])).toBe(true);
    expect(canAny('barber', ['settings.edit', 'accounts.manage'])).toBe(false);
  });

  it('only owner has accounts.manage — critical invariant', () => {
    const roles = Object.keys(ROLE_PERMISSIONS) as Array<keyof typeof ROLE_PERMISSIONS>;
    const withAccountsManage = roles.filter(r => ROLE_PERMISSIONS[r].includes('accounts.manage'));
    expect(withAccountsManage).toEqual(['owner']);
  });
});
