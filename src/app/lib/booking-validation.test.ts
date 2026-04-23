import { describe, it, expect } from 'vitest';
import { findConflicts } from './booking-validation';
import type { Appointment, Office } from '../types';

const offices: Office[] = [
  { id: 'office-1', name: 'Downtown', address: '1 Main St' },
  { id: 'office-2', name: 'Brooklyn', address: '2 Bedford Ave' },
];

const apt = (o: Partial<Appointment>): Appointment => ({
  id: 'apt-x',
  clientId: 'c1',
  staffId: 'staff-1',
  serviceId: 'svc-1',
  startTime: '2026-04-16T10:00:00Z',
  endTime: '2026-04-16T10:30:00Z',
  status: 'scheduled',
  notes: '',
  locationId: 'office-1',
  createdAt: '2026-04-01T00:00:00Z',
  ...o,
});

describe('findConflicts', () => {
  it('returns empty when there are no bookings', () => {
    const conflicts = findConflicts(
      { staffId: 'staff-1', start: new Date('2026-04-16T10:00:00Z'), end: new Date('2026-04-16T10:30:00Z') },
      [],
      offices,
    );
    expect(conflicts).toEqual([]);
  });

  it('ignores bookings for different staff', () => {
    const conflicts = findConflicts(
      { staffId: 'staff-1', start: new Date('2026-04-16T10:00:00Z'), end: new Date('2026-04-16T10:30:00Z') },
      [apt({ id: 'existing', staffId: 'staff-2' })],
      offices,
    );
    expect(conflicts).toEqual([]);
  });

  it('flags cross-office conflicts — same staff at different offices in same time slot', () => {
    const conflicts = findConflicts(
      { staffId: 'staff-1', start: new Date('2026-04-16T10:00:00Z'), end: new Date('2026-04-16T10:30:00Z') },
      [apt({ id: 'existing', locationId: 'office-2' })],
      offices,
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].office.id).toBe('office-2');
  });

  it('uses half-open intervals — back-to-back bookings do NOT conflict', () => {
    // Existing: 10:00–10:30. Candidate: 10:30–11:00. These should not conflict.
    const conflicts = findConflicts(
      { staffId: 'staff-1', start: new Date('2026-04-16T10:30:00Z'), end: new Date('2026-04-16T11:00:00Z') },
      [apt({ id: 'existing' })],
      offices,
    );
    expect(conflicts).toEqual([]);
  });

  it('flags overlapping intervals', () => {
    // Existing: 10:00–10:30. Candidate: 10:15–10:45. Overlaps.
    const conflicts = findConflicts(
      { staffId: 'staff-1', start: new Date('2026-04-16T10:15:00Z'), end: new Date('2026-04-16T10:45:00Z') },
      [apt({ id: 'existing' })],
      offices,
    );
    expect(conflicts).toHaveLength(1);
  });

  it('excludes the booking being edited via excludeId', () => {
    const conflicts = findConflicts(
      { staffId: 'staff-1', start: new Date('2026-04-16T10:00:00Z'), end: new Date('2026-04-16T10:30:00Z'), excludeId: 'self' },
      [apt({ id: 'self' })],
      offices,
    );
    expect(conflicts).toEqual([]);
  });

  it('ignores cancelled bookings', () => {
    const conflicts = findConflicts(
      { staffId: 'staff-1', start: new Date('2026-04-16T10:00:00Z'), end: new Date('2026-04-16T10:30:00Z') },
      [apt({ id: 'existing', status: 'cancelled' })],
      offices,
    );
    expect(conflicts).toEqual([]);
  });

  it('resolves unknown locationId to a placeholder office', () => {
    const conflicts = findConflicts(
      { staffId: 'staff-1', start: new Date('2026-04-16T10:00:00Z'), end: new Date('2026-04-16T10:30:00Z') },
      [apt({ id: 'existing', locationId: 'office-ghost' })],
      offices,
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].office.name).toBe('Unknown');
  });
});
