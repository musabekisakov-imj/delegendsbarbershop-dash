// Sentry browser SDK — no-op when NEXT_PUBLIC_SENTRY_DSN is unset, which is
// the dev default. Safe to import unconditionally from instrumentation.

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NEXT_PUBLIC_ENV ?? 'production',
  });
}
