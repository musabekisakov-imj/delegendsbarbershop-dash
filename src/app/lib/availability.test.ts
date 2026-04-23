import { describe, it, expect } from 'vitest';
import { computeAvailableSlots } from './availability';
import type { Shift, Break, Appointment } from '../types';

// Helper: build a Monday date that we can control.
const MON = new Date(2026, 3, 20); // Apr 20 2026 is a Monday

const shift09to18 = (staffId = 's1'): Shift[] => [
  { id: 'sh1', staffId, dayOfWeek: 'monday', startTime: '09:00', endTime: '18:00' },
];

describe('computeAvailableSlots', () => {
  it('returns no slots if staff has no shift that day', () => {
    const slots = computeAvailableSlots({
      date: MON,
      serviceMin: 30,
      shifts: [],
      breaks: [],
      appointments: [],
    });
    expect(slots).toHaveLength(0);
  });

  it('generates 30-min slots from 09:00 to 17:30 for a 30-min service on a 9-18 shift', () => {
    const slots = computeAvailableSlots({
      date: MON,
      serviceMin: 30,
      shifts: shift09to18(),
      breaks: [],
      appointments: [],
    });
    expect(slots[0].label).toBe('09:00');
    // Last slot that fits a 30-min service must start at 17:30 (ends at 18:00)
    expect(slots[slots.length - 1].label).toBe('17:30');
    expect(slots).toHaveLength(18);
  });

  it('excludes slots during a break', () => {
    const breaks: Break[] = [
      { id: 'b1', staffId: 's1', dayOfWeek: 'monday', startTime: '12:00', endTime: '13:00', type: 'lunch' },
    ];
    const slots = computeAvailableSlots({
      date: MON,
      serviceMin: 30,
      shifts: shift09to18(),
      breaks,
      appointments: [],
    });
    const labels = slots.map(s => s.label);
    // Half-open intervals: 11:30–12:00 ends exactly when the break starts → NOT overlapping, still bookable
    expect(labels).toContain('11:30');
    // 12:00 and 12:30 slots fall inside the break → excluded
    expect(labels).not.toContain('12:00');
    expect(labels).not.toContain('12:30');
    // 13:00 starts right when the break ends → available again
    expect(labels).toContain('13:00');
  });

  it('excludes slots that collide with existing appointments', () => {
    const appointments: Appointment[] = [
      {
        id: 'a1', clientId: 'c1', staffId: 's1', serviceId: 'sv1',
        startTime: new Date(2026, 3, 20, 10, 0).toISOString(),
        endTime:   new Date(2026, 3, 20, 10, 45).toISOString(),
        status: 'confirmed', notes: '', locationId: 'o1',
        createdAt: new Date().toISOString(),
      },
    ];
    const slots = computeAvailableSlots({
      date: MON,
      serviceMin: 30,
      shifts: shift09to18(),
      breaks: [],
      appointments,
    });
    const labels = slots.map(s => s.label);
    expect(labels).not.toContain('10:00');
    expect(labels).not.toContain('10:30'); // 10:30–11:00 overlaps 10:45 existing end
    expect(labels).toContain('11:00');     // 11:00–11:30 is clear
  });

  it('respects service duration so the last slot fits before shift end', () => {
    // 90-min service on 9-18 shift: last slot must start at 16:30 (ends at 18:00)
    const slots = computeAvailableSlots({
      date: MON,
      serviceMin: 90,
      shifts: shift09to18(),
      breaks: [],
      appointments: [],
    });
    expect(slots[slots.length - 1].label).toBe('16:30');
  });

  it('handles appointments that span midnight — forbidden window covers shift remainder', () => {
    // 23:00 → 00:30 next day; the old implementation would turn end into 30
    // (minutes of next day) and miss the forbidden window entirely.
    const appointments: Appointment[] = [
      {
        id: 'a1', clientId: 'c1', staffId: 's1', serviceId: 'sv1',
        startTime: new Date(2026, 3, 20, 23, 0).toISOString(),
        endTime:   new Date(2026, 3, 21, 0, 30).toISOString(),
        status: 'confirmed', notes: '', locationId: 'o1',
        createdAt: new Date().toISOString(),
      },
    ];
    // Shift until 23:30 so slots near end-of-day are in range otherwise.
    const shifts: Shift[] = [
      { id: 'sh1', staffId: 's1', dayOfWeek: 'monday', startTime: '22:00', endTime: '23:30' },
    ];
    const slots = computeAvailableSlots({
      date: MON,
      serviceMin: 30,
      shifts,
      breaks: [],
      appointments,
    });
    const labels = slots.map(s => s.label);
    // 22:00 and 22:30 are clear; 23:00 overlaps the appointment → excluded.
    expect(labels).toContain('22:00');
    expect(labels).toContain('22:30');
    expect(labels).not.toContain('23:00');
  });

  it('ignores cancelled appointments (slot stays available)', () => {
    const appointments: Appointment[] = [
      {
        id: 'a1', clientId: 'c1', staffId: 's1', serviceId: 'sv1',
        startTime: new Date(2026, 3, 20, 10, 0).toISOString(),
        endTime:   new Date(2026, 3, 20, 10, 30).toISOString(),
        status: 'cancelled', notes: '', locationId: 'o1',
        createdAt: new Date().toISOString(),
      },
    ];
    const slots = computeAvailableSlots({
      date: MON,
      serviceMin: 30,
      shifts: shift09to18(),
      breaks: [],
      appointments,
    });
    expect(slots.map(s => s.label)).toContain('10:00');
  });
});
