// Thin fetch wrapper for the NestJS backend at VITE_API_URL.
//
// Used by the Phase 1 swap of `lib/api.ts` from localStorage to real REST.
// Until that swap lands across every endpoint, both layers coexist — the
// presence of this file is not a signal that any given API method has
// migrated yet. Check `lib/api.ts` for the actual mode.

import { useAuthStore } from '../store/auth-store';

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api/v1';

/** Server-shaped error from a non-2xx response. `body` is the parsed JSON
 *  envelope (or undefined if the response was empty / not JSON). */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

type QueryValue = string | number | boolean | null | undefined;

interface RequestOpts {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
  /** Set to true on the login endpoint where no token exists yet. */
  noAuth?: boolean;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${suffix}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function http<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = 'GET', body, query, signal, noAuth } = opts;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (!noAuth) {
    const token = useAuthStore.getState().token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  // 204 No Content — used by DELETE etc.
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const parsed: unknown = text ? safeJson(text) : undefined;

  if (!res.ok) {
    // 401 → log out so the route guard kicks in. Avoids stale-token zombie state.
    if (res.status === 401) {
      useAuthStore.getState().logout();
    }
    const message =
      (typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message: unknown }).message)
        : null) ?? res.statusText ?? `HTTP ${res.status}`;
    throw new HttpError(res.status, parsed, message);
  }

  if (parsed !== null && typeof parsed === 'object' && 'data' in parsed) {
    return (parsed as { data: T }).data;
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

/** Convenience helpers — same signature as http() but with method baked in. */
export const httpGet  = <T>(path: string, opts?: Omit<RequestOpts, 'method' | 'body'>) =>
  http<T>(path, { ...opts, method: 'GET' });
export const httpPost = <T>(path: string, body?: unknown, opts?: Omit<RequestOpts, 'method' | 'body'>) =>
  http<T>(path, { ...opts, method: 'POST', body });
export const httpPatch = <T>(path: string, body?: unknown, opts?: Omit<RequestOpts, 'method' | 'body'>) =>
  http<T>(path, { ...opts, method: 'PATCH', body });
export const httpPut = <T>(path: string, body?: unknown, opts?: Omit<RequestOpts, 'method' | 'body'>) =>
  http<T>(path, { ...opts, method: 'PUT', body });
export const httpDelete = <T = void>(path: string, opts?: Omit<RequestOpts, 'method' | 'body'>) =>
  http<T>(path, { ...opts, method: 'DELETE' });
