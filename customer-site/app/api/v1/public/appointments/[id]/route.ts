// GET   /api/v1/public/appointments/:id
// PATCH /api/v1/public/appointments/:id  — update notes / status (limited)

import { NextResponse } from 'next/server';
import { SERVICES, STAFF, OFFICES } from '../../../../../../lib/mock-seed';
import { bookingStore } from '../../../../../../lib/mock-store';

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const booking = bookingStore.getById(params.id);
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(enrich(booking));
}

export async function PATCH(request: Request, { params }: Params) {
  const booking = bookingStore.getById(params.id);
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only allow patching notes field through this endpoint
  const { notes } = body as Record<string, string>;
  const updated = bookingStore.update(params.id, { notes });
  if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 });

  return NextResponse.json(enrich(updated));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function enrich(b: ReturnType<typeof bookingStore.getById>) {
  if (!b) return null;
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
