// GET /api/v1/public/availability?serviceId=&staffId=&officeId=&date=YYYY-MM-DD
//
// Returns 30-minute slots for the requested date.
// Slots blocked when:
//  • staff not working that day (no matching shift)
//  • slot conflicts with an existing web booking

import { NextResponse } from 'next/server';
import { SERVICES, STAFF, SHIFTS, DOW_MAP } from '../../../../../lib/mock-seed';
import { bookingStore } from '../../../../../lib/mock-store';

function parseHHmm(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get('serviceId');
  const staffId   = searchParams.get('staffId');
  const officeId  = searchParams.get('officeId');
  const dateStr   = searchParams.get('date'); // YYYY-MM-DD

  if (!serviceId || !staffId || !dateStr) {
    return NextResponse.json({ error: 'serviceId, staffId, date required' }, { status: 400 });
  }

  const service = SERVICES.find(s => s.id === serviceId);
  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dow  = DOW_MAP[date.getDay()];

  // Find the staff member's shift for this day
  const shift = SHIFTS.find(sh => sh.staffId === staffId && sh.dayOfWeek === dow);
  if (!shift) {
    // Staff doesn't work that day — return empty
    return NextResponse.json({ data: [] });
  }

  const shiftStart = parseHHmm(shift.startTime);
  const shiftEnd   = parseHHmm(shift.endTime);
  const duration   = service.duration;

  // Build candidate slots (every 30 min within shift) — return available ISO start times only
  const availableSlots: string[] = [];
  const stepMin = 30;
  const now = new Date();

  for (let startMin = shiftStart; startMin + duration <= shiftEnd; startMin += stepMin) {
    const slotStart = new Date(year, month - 1, day, Math.floor(startMin / 60), startMin % 60, 0, 0);
    const slotEnd   = new Date(slotStart.getTime() + duration * 60_000);

    if (slotStart <= now) continue; // past
    if (bookingStore.getConflicts(staffId, slotStart, slotEnd).length > 0) continue;

    availableSlots.push(slotStart.toISOString());
  }

  return NextResponse.json(availableSlots);
}
