// POST /api/v1/public/appointments/:id/cancel

import { NextResponse } from 'next/server';
import { bookingStore } from '../../../../../../../lib/mock-store';

type Params = { params: { id: string } };

export async function POST(_req: Request, { params }: Params) {
  const booking = bookingStore.getById(params.id);
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Already cancelled' }, { status: 409 });
  }

  const updated = bookingStore.update(params.id, { status: 'cancelled' });
  return NextResponse.json({ data: { id: params.id, status: updated?.status } });
}
