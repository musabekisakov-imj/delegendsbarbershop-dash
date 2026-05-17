import { NextResponse } from 'next/server';
import { OFFICES } from '../../../../../lib/mock-seed';

export async function GET() {
  return NextResponse.json(OFFICES);
}
