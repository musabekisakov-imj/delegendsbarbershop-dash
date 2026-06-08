import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from './http';
import { useAuthStore } from '../store/auth-store';

/**
 * Subscribes to the backend SSE stream and refetches data when a booking
 * changes anywhere (another staff member, the public website, a webhook). The
 * token rides in the query string because EventSource cannot set headers.
 *
 * On any appointment change we invalidate all queries — changes are infrequent
 * and this keeps the calendar/bookings/overview in sync without tracking every
 * affected query key.
 */
export function useLiveEvents(): void {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    const base = API_BASE_URL.replace(/\/+$/, '');
    const source = new EventSource(`${base}/events/stream?token=${encodeURIComponent(token)}`);

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string };
        if (payload?.type === 'appointment.changed') {
          queryClient.invalidateQueries();
        }
      } catch {
        // Ignore malformed frames.
      }
    };

    // EventSource reconnects on its own after a drop; no manual retry needed.
    return () => source.close();
  }, [token, queryClient]);
}
