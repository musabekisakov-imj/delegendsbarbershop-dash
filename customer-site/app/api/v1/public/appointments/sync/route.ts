// GET /api/v1/public/appointments/sync
// Internal endpoint — called by the dashboard to pull web bookings into the
// calendar. Returns all non-cancelled bookings from the website.

import { NextResponse } from 'next/server';
import { bookingStore } from '../../../../../../lib/mock-store';

export async function GET() {
  const bookings = bookingStore
    .getAll()
    .filter(b => b.status !== 'cancelled');

  return NextResponse.json({ data: bookings });
}
