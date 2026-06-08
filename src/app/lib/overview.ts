import { parseISO, startOfDay } from 'date-fns';
import type { WorkingHours } from '../types';

export type DayState = 'past' | 'today' | 'future';

export function getDayState(date: Date): DayState {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  if (target.getTime() === today.getTime()) return 'today';
  return target.getTime() < today.getTime() ? 'past' : 'future';
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export function dayOfWeekKey(date: Date): string {
  return DAY_NAMES[date.getDay()];
}

export function getShopStatus(
  workingHours: WorkingHours,
  now: Date,
): { state: 'open' | 'closed' | 'opens-later'; closesAt?: string; opensAt?: string } {
  const key = dayOfWeekKey(now);
  const day = workingHours[key];
  if (!day || !day.isOpen) return { state: 'closed' };

  const [openH, openM] = day.openTime.split(':').map(Number);
  const [closeH, closeM] = day.closeTime.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;

  if (nowMins < openMins) return { state: 'opens-later', opensAt: day.openTime };
  if (nowMins >= closeMins) return { state: 'closed' };
  return { state: 'open', closesAt: day.closeTime };
}

export function generateHourSlots(
  workingHours: WorkingHours,
  date: Date,
): Array<{ hour: number; label: string }> {
  const key = dayOfWeekKey(date);
  const day = workingHours[key];
  if (!day || !day.isOpen) return [];

  const [openH] = day.openTime.split(':').map(Number);
  const [closeH] = day.closeTime.split(':').map(Number);
  const slots: Array<{ hour: number; label: string }> = [];

  for (let h = openH; h < closeH; h++) {
    slots.push({ hour: h, label: `${String(h).padStart(2, '0')}:00` });
  }
  return slots;
}

type AppointmentWithTime = {
  id: string;
  startTime: string;
  status: string;
};

export function getNextAppointments<T extends AppointmentWithTime>(
  appointments: T[],
  count: number,
  now: Date,
): T[] {
  return appointments
    .filter(a => {
      if (a.status === 'cancelled' || a.status === 'completed') return false;
      return parseISO(a.startTime).getTime() > now.getTime();
    })
    .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime())
    .slice(0, count);
}

// A booking's charge. Public multi-service bookings carry an aggregate
// `totalPrice`; single bookings fall back to the resolved service price. The
// live backend sends BOTH as numeric strings (e.g. "67.00") and leaves
// `totalPrice` null on single-service rows — so the fallback must be coerced
// too, otherwise `0 + "18.00" + "22.00"` concatenates into "€NaN". Number()
// wraps the whole expression so every path returns a real number.
type AppointmentTotalLike = {
  totalPrice?: number | string | null;
  service?: { price: number | string };
};

export function aptTotal(a: AppointmentTotalLike): number {
  return Number(a.totalPrice ?? a.service?.price ?? 0);
}

type AppointmentLike = {
  startTime: string;
  status: string;
  totalPrice?: number | string | null;
  service: { price: number };
};

export function calculateTypicalDayRevenue(
  appointments: AppointmentLike[],
  date: Date,
  weeksLookback = 4,
): number | null {
  const targetDow = date.getDay();
  const todayStart = startOfDay(date);
  const cutoff = new Date(todayStart);
  cutoff.setDate(cutoff.getDate() - weeksLookback * 7);

  const revenueByDay = new Map<string, number>();

  for (const apt of appointments) {
    if (apt.status !== 'completed') continue;
    const d = parseISO(apt.startTime);
    if (d.getDay() !== targetDow) continue;

    const dayStart = startOfDay(d);
    if (dayStart.getTime() >= todayStart.getTime()) continue;
    if (dayStart.getTime() < cutoff.getTime()) continue;

    const key = dayStart.toISOString();
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + aptTotal(apt));
  }

  if (revenueByDay.size < 2) return null;

  const total = Array.from(revenueByDay.values()).reduce((s, v) => s + v, 0);
  return Math.round(total / revenueByDay.size);
}
