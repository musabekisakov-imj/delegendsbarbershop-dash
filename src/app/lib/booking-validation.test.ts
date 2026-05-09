import { describe, it, expect } from 'vitest';
import { findConflicts, findBreakConflicts } from './booking-validation';
import type { Appointment, Office, Break } from '../types';

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

const brk = (o: Partial<Break>): Break => ({
  id: 'brk-x',
  staffId: 'staff-1',
  dayOfWeek: 'thursday',  // 2026-04-16 is a Thursday
  startTime: '13:00',
  endTime: '14:00',
  type: 'lunch',
  ...o,
});

describe('findBreakConflicts', () => {
  it('flags an appointment that overlaps a lunch break', () => {
    // Candidate: 2026-04-16 (Thursday) 13:30-14:30 local. Break: 13:00-14:00.
    // 30 min of overlap → conflict.
    const candidateStart = new Date(2026, 3, 16, 13, 30);
    const candidateEnd = new Date(2026, 3, 16, 14, 30);
    const conflicts = findBreakConflicts(
      { staffId: 'staff-1', start: candidateStart, end: candidateEnd },
      [brk({ id: 'lunch-thu' })],
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].break.id).toBe('lunch-thu');
  });

  it('does NOT flag back-to-back bookings (half-open intervals)', () => {
    // Candidate: 14:00-15:00 local. Break: 13:00-14:00. Endpoint touch only.
    const candidateStart = new Date(2026, 3, 16, 14, 0);
    const candidateEnd = new Date(2026, 3, 16, 15, 0);
    const conflicts = findBreakConflicts(
      { staffId: 'staff-1', start: candidateStart, end: candidateEnd },
      [brk({ id: 'lunch-thu' })],
    );
    expect(conflicts).toEqual([]);
  });

  it('one-off break flags only on the exact date', () => {
    // One-off break on 2026-04-16 (Thursday). Candidate same date + overlapping time → conflict.
    const candidateStart = new Date(2026, 3, 16, 13, 30);
    const candidateEnd = new Date(2026, 3, 16, 14, 30);
    const conflicts = findBreakConflicts(
      { staffId: 'staff-1', start: candidateStart, end: candidateEnd },
      [brk({ id: 'one-off-apr16', recurrence: 'one-off', startDate: '2026-04-16' })],
    );
    expect(conflicts).toHaveLength(1);
  });

  it('one-off break is ignored on other Thursdays in the same time slot', () => {
    // One-off break on 2026-04-16. Candidate is the next Thursday (2026-04-23) at the same time → no conflict.
    const candidateStart = new Date(2026, 3, 23, 13, 30);
    const candidateEnd = new Date(2026, 3, 23, 14, 30);
    const conflicts = findBreakConflicts(
      { staffId: 'staff-1', start: candidateStart, end: candidateEnd },
      [brk({ id: 'one-off-apr16', recurrence: 'one-off', startDate: '2026-04-16' })],
    );
    expect(conflicts).toEqual([]);
  });

  it('weekly-bounded break is ignored before startDate', () => {
    // Weekly Thursday break, range 2026-04-16 → 2026-05-14. Candidate on 2026-04-09 (before range) → no conflict.
    const candidateStart = new Date(2026, 3, 9, 13, 30);
    const candidateEnd = new Date(2026, 3, 9, 14, 30);
    const conflicts = findBreakConflicts(
      { staffId: 'staff-1', start: candidateStart, end: candidateEnd },
      [brk({ id: 'ranged', recurrence: 'weekly', startDate: '2026-04-16', endDate: '2026-05-14' })],
    );
    expect(conflicts).toEqual([]);
  });

  it('weekly-bounded break is ignored after endDate', () => {
    // Same range. Candidate on 2026-05-21 (after range) → no conflict.
    const candidateStart = new Date(2026, 4, 21, 13, 30);
    const candidateEnd = new Date(2026, 4, 21, 14, 30);
    const conflicts = findBreakConflicts(
      { staffId: 'staff-1', start: candidateStart, end: candidateEnd },
      [brk({ id: 'ranged', recurrence: 'weekly', startDate: '2026-04-16', endDate: '2026-05-14' })],
    );
    expect(conflicts).toEqual([]);
  });
});
