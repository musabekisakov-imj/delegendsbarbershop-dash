import { NextResponse } from 'next/server';
import { SERVICES, CATEGORIES } from '../../../../../lib/mock-seed';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const officeId = searchParams.get('officeId');
  const categoryId = searchParams.get('categoryId');

  let services = SERVICES.filter(s => s.isPublic);
  if (officeId) services = services.filter(s => s.officeId === officeId);
  if (categoryId) services = services.filter(s => s.categoryId === categoryId);

  // Attach category object to each service
  const categoryMap = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
  const enriched = services.map(s => ({
    ...s,
    category: categoryMap[s.categoryId] ?? null,
  }));

  return NextResponse.json(enriched);
}
