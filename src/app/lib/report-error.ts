/**
 * Central error reporter.
 *
 * Today: logs to console with a prefix + optional context.
 * When a real backend + Sentry/Bugsnag are wired, replace the body of
 * `reportError` with a call to their client — every caller across the app
 * stays the same.
 *
 * Usage:
 *   try { ... } catch (err) { reportError(err, { route: 'bookings', id }); }
 */

type ErrorContext = Record<string, unknown>;

export function reportError(error: unknown, context: ErrorContext = {}): void {
  const err = error instanceof Error ? error : new Error(String(error));

  // Dev: loud, with stack + context so the developer sees it immediately.
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error('[reportError]', err.message, { ...context, stack: err.stack });
    return;
  }

  // Prod: compact structured log. Swap in Sentry.captureException here later.
  const payload = {
    message: err.message,
    stack: err.stack,
    ...context,
    ts: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  };
  // eslint-disable-next-line no-console
  console.error('[error]', JSON.stringify(payload));

  // When a real endpoint is available, POST payload to it (fire-and-forget).
  // Example:
  //   fetch('/api/log', { method: 'POST', body: JSON.stringify(payload) }).catch(() => {});
}

/**
 * Convenience for React Query mutations / async handlers:
 *   onError: toastAndReport('toast.somethingFailed', { where: 'bookings' })
 */
export function wrapAsync<T>(
  promise: Promise<T>,
  context: ErrorContext,
): Promise<T> {
  return promise.catch(err => {
    reportError(err, context);
    throw err;
  });
}
