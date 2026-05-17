import { describe, it, expect } from 'vitest';
import { getAppointmentWarning, type WarningContext } from './appointment-warning';
import type { AppointmentWithDetails } from '../types';

// All ISO timestamps in this file are WITHOUT a timezone suffix (no 'Z') so
// date-fns parseISO treats them as local time. This makes HH:mm comparisons
// against break times timezone-agnostic across CI and developer machines.

function makeApt(overrides: Partial<AppointmentWithDetails> = {}): AppointmentWithDetails {
  return {
    id: 'apt-1',
    tenantId: 'tenant-1',
    locationId: 'office-1',
    clientId: 'client-1',
    staffId: 'staff-1',
    serviceId: 'svc-1',
    startTime: '2025-06-10T10:00:00',
    endTime:   '2025-06-10T11:00:00',
    status: 'confirmed',
    notes: '',
    createdBy: 'user-1',
    createdAt: '2025-06-01T00:00:00',
    client: { id: 'client-1', tenantId: 'tenant-1', locationId: 'office-1', firstName: 'Ana', lastName: 'Doe', phone: '', email: '', notes: '', createdAt: '' },
    staff:  { id: 'staff-1', tenantId: 'tenant-1', firstName: 'Bob', lastName: 'Smith', role: 'barber', isActive: true, officeIds: ['office-1'], phone: '', email: '', specialties: [], bio: '', avatarUrl: undefined },
    service: { id: 'svc-1', tenantId: 'tenant-1', locationId: 'office-1', name: 'Haircut', price: 20, duration: 60, categoryId: 'cat-1', isActive: true },
    ...overrides,
  } as AppointmentWithDetails;
}

// baseCtx.now is 2 hours before apt start (08:00 local) so unconfirmed_soon doesn't spuriously fire.
function baseCtx(overrides: Partial<WarningContext> = {}): WarningContext {
  return {
    peerAppointments: [],
    staffBreaks: [],
    workingHours: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
    bufferMinutes: 0,
    now: new Date('2025-06-10T08:00:00'),
    t: (key) => key,
    ...overrides,
  };
}

// ─── Null case ────────────────────────────────────────────────────────────────

describe('null case', () => {
  it('returns null when no rule fires', () => {
    expect(getAppointmentWarning(makeApt(), baseCtx())).toBeNull();
  });

  it('returns null for cancelled appointments', () => {
    expect(getAppointmentWarning(makeApt({ status: 'cancelled' }), baseCtx())).toBeNull();
  });

  it('returns null for completed appointments', () => {
    expect(getAppointmentWarning(makeApt({ status: 'completed' }), baseCtx())).toBeNull();
  });
});

// ─── Rule 1: time_conflict ────────────────────────────────────────────────────

describe('time_conflict (high)', () => {
  it('fires when a peer overlaps the appointment', () => {
    const peer = makeApt({ id: 'apt-2', startTime: '2025-06-10T10:30:00', endTime: '2025-06-10T11:30:00' });
    const result = getAppointmentWarning(makeApt(), baseCtx({ peerAppointments: [peer] }));
    expect(result?.code).toBe('time_conflict');
    expect(result?.severity).toBe('high');
  });

  it('does not fire for self (same id in peer list)', () => {
    const self = makeApt();
    const result = getAppointmentWarning(self, baseCtx({ peerAppointments: [self] }));
    expect(result).toBeNull();
  });

  it('does not fire for back-to-back peers (half-open interval)', () => {
    // apt 10:00–11:00, peer 11:00–12:00 — exact touch, no overlap
    const peer = makeApt({ id: 'apt-2', startTime: '2025-06-10T11:00:00', endTime: '2025-06-10T12:00:00' });
    const result = getAppointmentWarning(makeApt(), baseCtx({ peerAppointments: [peer] }));
    expect(result).toBeNull();
  });
});

// ─── Rule 2: break_overlap ────────────────────────────────────────────────────

describe('break_overlap (high)', () => {
  it('fires when break overlap exceeds 50% of apt duration', () => {
    // apt 10:00–11:00 (60 min), break 10:20–11:00 = 40 min > 30
    const result = getAppointmentWarning(makeApt(), baseCtx({
      staffBreaks: [{ startTime: '10:20', endTime: '11:00' }],
    }));
    expect(result?.code).toBe('break_overlap');
    expect(result?.severity).toBe('high');
  });

  it('does not fire when overlap is exactly 50% (boundary)', () => {
    // apt 10:00–11:00 (60 min), break 10:30–11:00 = 30 min = 50%, NOT >50%
    const result = getAppointmentWarning(makeApt(), baseCtx({
      staffBreaks: [{ startTime: '10:30', endTime: '11:00' }],
    }));
    expect(result?.code).not.toBe('break_overlap');
  });
});

// ─── Rule 3: outside_hours ────────────────────────────────────────────────────

describe('outside_hours (medium)', () => {
  it('fires when salon is closed that day', () => {
    const result = getAppointmentWarning(makeApt(), baseCtx({
      workingHours: { isOpen: false, openTime: '09:00', closeTime: '19:00' },
    }));
    expect(result?.code).toBe('outside_hours');
    expect(result?.message).toBe('warning.outsideClosed');
  });

  it('fires when apt starts before opening time', () => {
    const earlyApt = makeApt({ startTime: '2025-06-10T06:00:00', endTime: '2025-06-10T07:00:00' });
    const result = getAppointmentWarning(earlyApt, baseCtx({
      workingHours: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
    }));
    expect(result?.code).toBe('outside_hours');
  });

  it('does not fire when apt is fully within hours', () => {
    const result = getAppointmentWarning(makeApt(), baseCtx({
      workingHours: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
    }));
    expect(result).toBeNull();
  });
});

// ─── Rule 4: unconfirmed_soon ─────────────────────────────────────────────────

describe('unconfirmed_soon (medium)', () => {
  it('fires when status=scheduled AND start within 2h', () => {
    // now = 09:00, apt = 10:00 → 60 min away, within [0,120]
    const now = new Date('2025-06-10T09:00:00');
    const result = getAppointmentWarning(
      makeApt({ status: 'scheduled' }),
      baseCtx({ now }),
    );
    expect(result?.code).toBe('unconfirmed_soon');
    expect(result?.severity).toBe('medium');
  });

  it('does not fire when start is more than 2h away', () => {
    // now = 07:00, apt = 10:00 → 180 min away
    const now = new Date('2025-06-10T07:00:00');
    const result = getAppointmentWarning(
      makeApt({ status: 'scheduled' }),
      baseCtx({ now }),
    );
    expect(result?.code).not.toBe('unconfirmed_soon');
  });

  it('does not fire for confirmed status even within 2h', () => {
    const now = new Date('2025-06-10T09:00:00');
    const result = getAppointmentWarning(
      makeApt({ status: 'confirmed' }),
      baseCtx({ now }),
    );
    expect(result).toBeNull();
  });
});

// ─── Rule 5: break_touch ──────────────────────────────────────────────────────

describe('break_touch (low)', () => {
  it('fires when break overlaps by ≤50% of apt duration', () => {
    // apt 10:00–11:00 (60 min), break 10:45–11:15 = 15 min ≤ 30
    const result = getAppointmentWarning(makeApt(), baseCtx({
      staffBreaks: [{ startTime: '10:45', endTime: '11:15' }],
    }));
    expect(result?.code).toBe('break_touch');
    expect(result?.severity).toBe('low');
  });

  it('fires when apt end equals break start (back-to-back touch)', () => {
    // apt 10:00–11:00, break 11:00–11:30 — back-to-back
    const result = getAppointmentWarning(makeApt(), baseCtx({
      staffBreaks: [{ startTime: '11:00', endTime: '11:30' }],
    }));
    expect(result?.code).toBe('break_touch');
  });
});

// ─── Rule 6: no_buffer ────────────────────────────────────────────────────────

describe('no_buffer (low)', () => {
  it('fires when gap to a peer is less than bufferMinutes', () => {
    // apt 10:00–11:00, peer 11:05–12:00 → 5 min gap < 10 min buffer
    const peer = makeApt({ id: 'apt-2', startTime: '2025-06-10T11:05:00', endTime: '2025-06-10T12:00:00' });
    const result = getAppointmentWarning(makeApt(), baseCtx({ peerAppointments: [peer], bufferMinutes: 10 }));
    expect(result?.code).toBe('no_buffer');
    expect(result?.severity).toBe('low');
  });

  it('does not fire when gap equals bufferMinutes (boundary)', () => {
    // gap exactly 10 min — NOT < 10
    const peer = makeApt({ id: 'apt-2', startTime: '2025-06-10T11:10:00', endTime: '2025-06-10T12:00:00' });
    const result = getAppointmentWarning(makeApt(), baseCtx({ peerAppointments: [peer], bufferMinutes: 10 }));
    expect(result).toBeNull();
  });

  it('does not fire when bufferMinutes is 0', () => {
    const peer = makeApt({ id: 'apt-2', startTime: '2025-06-10T11:01:00', endTime: '2025-06-10T12:00:00' });
    const result = getAppointmentWarning(makeApt(), baseCtx({ peerAppointments: [peer], bufferMinutes: 0 }));
    expect(result).toBeNull();
  });
});

// ─── Priority resolution ──────────────────────────────────────────────────────

describe('priority — higher rule wins', () => {
  it('time_conflict beats break_overlap', () => {
    const peer = makeApt({ id: 'apt-2', startTime: '2025-06-10T10:30:00', endTime: '2025-06-10T11:30:00' });
    const result = getAppointmentWarning(makeApt(), baseCtx({
      peerAppointments: [peer],
      staffBreaks: [{ startTime: '10:20', endTime: '11:00' }],
    }));
    expect(result?.code).toBe('time_conflict');
  });

  it('break_overlap beats outside_hours', () => {
    const result = getAppointmentWarning(makeApt(), baseCtx({
      staffBreaks: [{ startTime: '10:20', endTime: '11:00' }],
      workingHours: { isOpen: false, openTime: '09:00', closeTime: '19:00' },
    }));
    expect(result?.code).toBe('break_overlap');
  });
});
