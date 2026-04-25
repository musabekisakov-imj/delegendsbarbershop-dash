import type { Office, Service, PublicStaff, ConfirmedBooking } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: unknown, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOpts {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Server-side fetch caching strategy. Default: no-store for live data. */
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = 'GET', body, query, cache, next } = opts;
  // Next.js disallows passing both `cache` and `next.revalidate`. Default to
  // no-store only when neither is set.
  const effectiveCache: RequestCache | undefined =
    cache ?? (next?.revalidate === undefined ? 'no-store' : undefined);

  const url = new URL(`${API_URL.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...(effectiveCache !== undefined && { cache: effectiveCache }),
    ...(next !== undefined && { next }),
  });

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const parsed = text ? safeJson(text) : undefined;

  if (!res.ok) {
    const message =
      (typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message: unknown }).message)
        : null) ?? res.statusText ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, parsed, message);
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ─── Public endpoints (no auth) ────────────────────────────────────

export const publicApi = {
  offices: () =>
    request<Office[]>('/public/offices', { next: { revalidate: 300 } }),

  services: (officeId?: string) =>
    request<Service[]>('/public/services', {
      query: { officeId },
      next: { revalidate: 60 },
    }),

  staff: (officeId?: string) =>
    request<PublicStaff[]>('/public/staff', {
      query: { officeId },
      next: { revalidate: 60 },
    }),

  availability: (params: { staffId: string; date: string; duration: number }) =>
    request<string[]>('/public/availability', {
      query: params,
      // Live-fresh — slot availability changes every booking.
      cache: 'no-store',
    }),

  createBooking: (body: {
    officeId: string;
    serviceId: string;
    staffId: string;
    startTime: string;
    client: { firstName: string; lastName: string; email: string; phone: string };
  }) =>
    request<ConfirmedBooking>('/public/appointments', {
      method: 'POST',
      body,
    }),
};
