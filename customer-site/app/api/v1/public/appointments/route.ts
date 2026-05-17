// GET  /api/v1/public/appointments?email= — look up bookings by client email
// POST /api/v1/public/appointments       — create a new booking

import { NextResponse } from 'next/server';
import { SERVICES, STAFF, OFFICES } from '../../../../../lib/mock-seed';
import { bookingStore, generateId } from '../../../../../lib/mock-store';
import type { WebBooking } from '../../../../../lib/mock-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  const bookings = bookingStore
    .getAll()
    .filter(b => b.clientEmail.toLowerCase() === email.toLowerCase());

  const enriched = bookings.map(b => enrichBooking(b));
  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const { serviceId, staffId, officeId, startTime, notes } = b as Record<string, string>;
  // Support both flat (clientName/clientEmail) and nested (client.firstName etc.) shapes
  const clientObj = b.client as Record<string, string> | undefined;
  const clientName  = (b.clientName as string) ?? (clientObj ? `${clientObj.firstName} ${clientObj.lastName}` : '');
  const clientEmail = (b.clientEmail as string) ?? clientObj?.email ?? '';
  const clientPhone = (b.clientPhone as string) ?? clientObj?.phone ?? undefined;

  if (!serviceId || !staffId || !officeId || !startTime || !clientName.trim() || !clientEmail) {
    return NextResponse.json({ error: 'serviceId, staffId, officeId, startTime, client are required' }, { status: 400 });
  }

  const service = SERVICES.find(s => s.id === serviceId);
  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

  const staff = STAFF.find(s => s.id === staffId && s.isActive);
  if (!staff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });

  const start = new Date(startTime);
  if (isNaN(start.getTime())) {
    return NextResponse.json({ error: 'Invalid startTime' }, { status: 400 });
  }
  if (start < new Date()) {
    return NextResponse.json({ error: 'Cannot book in the past' }, { status: 400 });
  }

  const end = new Date(start.getTime() + service.duration * 60_000);

  // Conflict check
  const conflicts = bookingStore.getConflicts(staffId, start, end);
  if (conflicts.length > 0) {
    return NextResponse.json({ error: 'This time slot is no longer available' }, { status: 409 });
  }

  const booking: WebBooking = {
    id: generateId(),
    serviceId,
    staffId,
    officeId,
    startTime: start.toISOString(),
    endTime:   end.toISOString(),
    clientName,
    clientEmail,
    clientPhone: clientPhone ?? undefined,
    notes: notes ?? undefined,
    status: 'scheduled',
    source: 'web',
    createdAt: new Date().toISOString(),
  };

  bookingStore.add(booking);

  return NextResponse.json(enrichBooking(booking), { status: 201 });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function enrichBooking(b: WebBooking) {
  const service = SERVICES.find(s => s.id === b.serviceId);
  const staff   = STAFF.find(s => s.id === b.staffId);
  const office  = OFFICES.find(o => o.id === b.officeId);

  return {
    appointmentId:  b.id,
    startTime:      b.startTime,
    endTime:        b.endTime,
    status:         b.status,
    clientName:     b.clientName,
    clientEmail:    b.clientEmail,
    serviceName:    service?.name ?? '',
    servicePrice:   service?.price ?? 0,
    staffName:      staff ? `${staff.firstName} ${staff.lastName}` : '',
    officeName:     office?.name ?? '',
    officeAddress:  office?.address ?? '',
    notes:          b.notes ?? '',
    createdAt:      b.createdAt,
  };
}
