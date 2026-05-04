// Next 14 instrumentation hook — picks the right runtime config at boot.
// Only runs once per process; SDKs themselves no-op without a DSN.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
