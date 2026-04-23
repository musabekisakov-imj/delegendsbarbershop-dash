import type { Shift, Break, Appointment, DayOfWeek } from '../types';

// Refactoring UI: show the user what's *actually* possible, never a menu of dead-ends.
// This helper returns the real bookable start times for a specific staff member
// on a specific date, given the service's duration.
//
// Inputs:
//   date          — the day being booked (will derive day-of-week from it)
//   serviceMin    — service duration in minutes; the whole slot must fit before shift end
//   shifts        — ALL shifts for the staff member (we filter to dayOfWeek)
//   breaks        — ALL breaks for the staff member (we filter to dayOfWeek)
//   appointments  — existing appointments for that staff (across offices! booking cross-site)
//   granularity   — stride between slot starts, minutes (default 30)
//
// Output: array of ISO strings (slot start times), sorted ascending.

const DAY_ORDER: DayOfWeek[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

// "HH:mm" -> total minutes since 00:00
function hmToMin(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

// Set hh:mm on a Date without timezone drift.
function atTime(date: Date, min: number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(min);
  return d;
}

// Half-open overlap: `a.start < b.end && b.start < a.end`
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export interface SlotQuery {
  date: Date;
  serviceMin: number;
  shifts: Shift[];
  breaks: Break[];
  appointments: Appointment[];
  granularityMin?: number;
}

export interface Slot {
  start: Date;
  end: Date;
  iso: string;       // ISO string of start — convenient as state value
  label: string;     // "HH:mm" 24h label
}

export function computeAvailableSlots({
  date,
  serviceMin,
  shifts,
  breaks,
  appointments,
  granularityMin = 30,
}: SlotQuery): Slot[] {
  const dow = DAY_ORDER[date.getDay()];

  // Shifts define the range of workable time; if the staff isn't rostered, empty.
  const dayShifts = shifts.filter(s => s.dayOfWeek === dow);
  if (dayShifts.length === 0) return [];

  // Pre-compute forbidden windows (breaks + existing appointments) in minutes-from-midnight
  // so the inner loop is a cheap numeric comparison.
  const dayBreaks = breaks
    .filter(b => b.dayOfWeek === dow)
    .map(b => ({ start: hmToMin(b.startTime), end: hmToMin(b.endTime) }));

  const startOfDay = atTime(date, 0).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

  // Build minute-since-midnight windows from each appointment. Anchored to `date`
  // so an appointment spanning midnight (23:30 → 00:30 next day) resolves to
  // [1410, 1470] rather than [1410, 30] — the old math silently lost half the
  // forbidden window. We still skip cancelled appointments (their slots free up).
  const dayAppts = appointments
    .filter(a => {
      const t = new Date(a.startTime).getTime();
      return t >= startOfDay && t < endOfDay && a.status !== 'cancelled';
    })
    .map(a => {
      const s = new Date(a.startTime);
      const e = new Date(a.endTime);
      const startMin = s.getHours() * 60 + s.getMinutes();
      // If end is on a later calendar date, push it past 1440 so it covers the
      // remainder of the shift. Only matters for rare overnight services.
      const endMin = e.getDate() !== s.getDate() || e.getTime() < s.getTime()
        ? 24 * 60
        : e.getHours() * 60 + e.getMinutes();
      return { start: startMin, end: endMin };
    });

  const results: Slot[] = [];

  for (const shift of dayShifts) {
    const shiftStart = hmToMin(shift.startTime);
    const shiftEnd = hmToMin(shift.endTime);

    // Align the first slot to the granularity grid (e.g. 09:15 shift starts → 09:30 slot if 30-min).
    const firstSlot = Math.ceil(shiftStart / granularityMin) * granularityMin;

    for (let m = firstSlot; m + serviceMin <= shiftEnd; m += granularityMin) {
      const slotStart = m;
      const slotEnd = m + serviceMin;

      // Skip if the slot hits any break.
      if (dayBreaks.some(b => overlaps(slotStart, slotEnd, b.start, b.end))) continue;

      // Skip if the slot collides with an existing booking.
      if (dayAppts.some(a => overlaps(slotStart, slotEnd, a.start, a.end))) continue;

      const startDate = atTime(date, slotStart);
      const endDate = atTime(date, slotEnd);
      const hh = String(Math.floor(slotStart / 60)).padStart(2, '0');
      const mm = String(slotStart % 60).padStart(2, '0');

      results.push({
        start: startDate,
        end: endDate,
        iso: startDate.toISOString(),
        label: `${hh}:${mm}`,
      });
    }
  }

  // Dedupe (in case of overlapping shifts) and sort.
  const seen = new Set<string>();
  return results
    .filter(s => (seen.has(s.iso) ? false : seen.add(s.iso)))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}
