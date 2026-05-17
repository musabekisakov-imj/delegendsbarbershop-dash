// POST /api/v1/public/newsletter — simple email capture

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SUBS_FILE = path.join(process.cwd(), '..', 'data', 'newsletter-subscribers.json');

function loadSubs(): string[] {
  try {
    if (!fs.existsSync(SUBS_FILE)) return [];
    return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf-8')) as string[];
  } catch {
    return [];
  }
}

function saveSubs(subs: string[]) {
  const dir = path.dirname(SUBS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2), 'utf-8');
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email } = body as Record<string, string>;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const subs = loadSubs();
  if (!subs.includes(email.toLowerCase())) {
    subs.push(email.toLowerCase());
    saveSubs(subs);
  }

  return NextResponse.json({ data: { subscribed: true } });
}
