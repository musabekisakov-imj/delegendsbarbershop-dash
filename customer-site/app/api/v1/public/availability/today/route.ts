// GET /api/v1/public/availability/today?officeId=
//
// Returns a summary: how many staff are working today and how many open slots remain.

import { NextResponse } from 'next/server';
import { STAFF, SHIFTS, SERVICES, DOW_MAP } from '../../../../../../lib/mock-seed';
import { bookingStore } from '../../../../../../lib/mock-store';

function parseHHmm(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const officeId = searchParams.get('officeId');

  const now = new Date();
  const dow = DOW_MAP[now.getDay()];
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day   = now.getDate();

  let staff = STAFF.filter(s => s.isActive);
  if (officeId) staff = staff.filter(s => s.officeIds.includes(officeId));

  const result: { staffId: string; firstName: string; slots: string[] }[] = [];

  for (const member of staff) {
    const shift = SHIFTS.find(sh => sh.staffId === member.id && sh.dayOfWeek === dow);
    if (!shift) continue;

    const shiftStart = parseHHmm(shift.startTime);
    const shiftEnd   = parseHHmm(shift.endTime);

    const slots: string[] = [];
    for (let m = shiftStart; m + 30 <= shiftEnd; m += 30) {
      const slotStart = new Date(year, month - 1, day, Math.floor(m / 60), m % 60, 0, 0);
      const slotEnd   = new Date(slotStart.getTime() + 30 * 60_000);
      if (slotStart <= now) continue;
      if (bookingStore.getConflicts(member.id, slotStart, slotEnd).length === 0) {
        slots.push(slotStart.toISOString());
      }
    }

    result.push({ staffId: member.id, firstName: member.firstName, slots });
  }

  return NextResponse.json(result);
}
