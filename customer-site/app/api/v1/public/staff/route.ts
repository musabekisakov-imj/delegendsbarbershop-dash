import { NextResponse } from 'next/server';
import { STAFF } from '../../../../../lib/mock-seed';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const officeId  = searchParams.get('officeId');
  const serviceId = searchParams.get('serviceId');

  let staff = STAFF.filter(s => s.isActive);
  if (officeId) staff = staff.filter(s => s.officeIds.includes(officeId));

  // serviceId filter: if provided we still return all active staff for that office —
  // actual per-service assignment is handled on availability level.
  void serviceId;

  const publicStaff = staff.map(({ id, firstName, lastName, avatarUrl, isActive }) => ({
    id,
    firstName,
    lastName,
    avatarUrl,
    isActive,
  }));

  return NextResponse.json(publicStaff);
}
