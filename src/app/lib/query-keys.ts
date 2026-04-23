import type { QueryClient } from '@tanstack/react-query';

/**
 * Centralized cache-invalidation for booking mutations.
 *
 * A status change on a single appointment doesn't only affect the Bookings
 * page: it moves revenue on the Overview dashboard, can update the client's
 * `totalVisits` / `lastVisitAt`, and shifts lane colors on the Calendar.
 * Rather than every mutation remembering which keys to touch (and getting it
 * subtly wrong in each place), mutations call this one function.
 *
 * Pass `officeId` when the caller knows it — lets us match only scoped keys.
 * When `undefined`, every office's cache gets hit (safe, just over-inclusive).
 */
export function invalidateBookingGraph(qc: QueryClient, officeId?: string) {
  // Appointments — both the scoped variant (Bookings, Calendar, Overview)
  // and unscoped variants (global search, conflict detection, analytics).
  qc.invalidateQueries({ queryKey: officeId ? ['appointments', officeId] : ['appointments'] });

  // Client stats — `totalVisits` / `lastVisitAt` flip when a booking is
  // completed, so both the list and per-client reads need refresh.
  qc.invalidateQueries({ queryKey: ['clients'] });

  // Overview / analytics KPIs read from appointments + clients and roll them
  // into tiles. They don't share a root key, so invalidate by best-effort
  // prefix matches.
  qc.invalidateQueries({ queryKey: ['overview'] });
  qc.invalidateQueries({ queryKey: ['analytics'] });

  // Calendar reads the same appointments but some consumers key separately.
  qc.invalidateQueries({ queryKey: ['calendar'] });

  // Staff revenue/utilization stats derive from appointments, same reason.
  qc.invalidateQueries({ queryKey: ['staff-stats'] });
}
