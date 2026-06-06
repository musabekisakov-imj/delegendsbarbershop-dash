/**
 * Integration tests for the NestJS public API endpoints.
 *
 * These hit the real server on localhost:3001. Run `npm run dev` (or
 * `node dist/src/main.js`) in barber-Dash/server before running these.
 *
 * They are automatically skipped when the server is unreachable so CI
 * passes without a live backend.
 */
import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'http://localhost:3001/api/v1';
const OFFICE_ID = 'cmoq59mc70002l690j0jgi14n';

// ─── helpers ──────────────────────────────────────────────
async function tryFetch(url: string): Promise<Response | null> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(3000) });
  } catch {
    return null;
  }
}

let serverOnline = false;

beforeAll(async () => {
  const probe = await tryFetch(`${BASE}/public/offices`);
  serverOnline = probe !== null && probe.ok;
  if (!serverOnline) {
    console.warn('[integration] NestJS server not reachable — tests skipped');
  }
});

// ─── /public/offices ──────────────────────────────────────
describe('GET /public/offices', () => {
  it('returns an array of offices with id and name', async () => {
    if (!serverOnline) return;

    const res = await fetch(`${BASE}/public/offices`);
    expect(res.ok).toBe(true);

    const data = await res.json() as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const office = data[0] as Record<string, unknown>;
    expect(typeof office.id).toBe('string');
    expect(typeof office.name).toBe('string');
  });
});

// ─── /public/services ─────────────────────────────────────
describe('GET /public/services', () => {
  it('requires officeId — returns 400 without it', async () => {
    if (!serverOnline) return;
    const res = await fetch(`${BASE}/public/services`);
    expect(res.status).toBe(400);
  });

  it('returns services array with expected shape', async () => {
    if (!serverOnline) return;

    const res = await fetch(`${BASE}/public/services?officeId=${OFFICE_ID}`);
    expect(res.ok).toBe(true);

    const data = await res.json() as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const svc = data[0] as Record<string, unknown>;
    expect(typeof svc.id).toBe('string');
    expect(typeof svc.name).toBe('string');
    expect(typeof svc.duration).toBe('number');
    expect(typeof svc.price === 'number' || typeof svc.price === 'string').toBe(true);
    // category is a nested object { id, name }
    expect(typeof (svc.category as Record<string, unknown>)?.name).toBe('string');
  });
});

// ─── /public/staff ────────────────────────────────────────
describe('GET /public/staff', () => {
  it('requires officeId — returns 400 without it', async () => {
    if (!serverOnline) return;
    const res = await fetch(`${BASE}/public/staff`);
    expect(res.status).toBe(400);
  });

  it('returns staff array with firstName/lastName/id', async () => {
    if (!serverOnline) return;

    const res = await fetch(`${BASE}/public/staff?officeId=${OFFICE_ID}`);
    expect(res.ok).toBe(true);

    const data = await res.json() as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const member = data[0] as Record<string, unknown>;
    expect(typeof member.id).toBe('string');
    expect(typeof member.firstName).toBe('string');
    expect(typeof member.lastName).toBe('string');
    expect(member.isActive).toBe(true);
  });
});

// ─── /public/availability ─────────────────────────────────
describe('GET /public/availability', () => {
  it('returns 400 when required params are missing', async () => {
    if (!serverOnline) return;
    const res = await fetch(`${BASE}/public/availability`);
    expect(res.status).toBe(400);
  });

  it('returns array of time strings for a valid future date', async () => {
    if (!serverOnline) return;

    const staffRes = await fetch(`${BASE}/public/staff?officeId=${OFFICE_ID}`);
    const staff = await staffRes.json() as Array<{ id: string }>;
    const staffId = staff[0]?.id;
    if (!staffId) return;

    const svcRes = await fetch(`${BASE}/public/services?officeId=${OFFICE_ID}`);
    const services = await svcRes.json() as Array<{ id: string }>;
    const serviceId = services[0]?.id;
    if (!serviceId) return;

    const res = await fetch(
      `${BASE}/public/availability?staffId=${staffId}&serviceId=${serviceId}&date=2026-06-08&officeId=${OFFICE_ID}`,
    );
    expect(res.ok).toBe(true);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

// ─── /public/appointments (POST) ──────────────────────────
describe('POST /public/appointments', () => {
  it('returns 400 when body is missing required fields', async () => {
    if (!serverOnline) return;

    const res = await fetch(`${BASE}/public/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when startTime is not ISO8601', async () => {
    if (!serverOnline) return;

    const res = await fetch(`${BASE}/public/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        officeId: OFFICE_ID,
        serviceId: 'fake',
        staffId: 'fake',
        startTime: 'not-a-date',
        client: { firstName: 'Test', lastName: 'User', email: 'test@test.com', phone: '+37060000000' },
      }),
    });
    expect([400, 422]).toContain(res.status);
  });
});
