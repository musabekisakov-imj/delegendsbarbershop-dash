import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from './components/ui/sonner';
import { ConfirmProvider } from './hooks/use-confirm';
import { useDensity } from './hooks/use-t';
import { useLiveEvents } from './lib/use-live-events';
import { tenantApi } from './lib/api';
import { useOfficeStore } from './store/office-store';
import { setDisplayTimezone } from './lib/time';
import { router } from './routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  }
});

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  const sonnerTheme = resolvedTheme === 'light' ? 'light' : 'dark';
  return <Toaster position="top-right" theme={sonnerTheme} />;
}

// Mirrors `density` preference onto <html> as `density-comfortable` so global
// CSS rules in theme.css can bump small body copy by one step. Compact (default)
// removes the class entirely so existing tokens stand.
function DensityClass() {
  const [density] = useDensity();
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('density-comfortable', density === 'comfortable');
    return () => { root.classList.remove('density-comfortable'); };
  }, [density]);
  return null;
}

// Connects the SSE stream so the dashboard updates live when bookings change.
function LiveEvents() {
  useLiveEvents();
  return null;
}

// The calendar renders in the shop's timezone, not the viewer's, so a booking
// made for 14:00 reads 14:00 everywhere regardless of where staff log in from.
// Prefer the current office's timezone, fall back to the tenant's, then to the
// shop's home zone. Default before the tenant query resolves avoids a flash of
// browser-local time on first paint.
function TimezoneSync() {
  const { data: tenant } = useQuery({ queryKey: ['tenant'], queryFn: () => tenantApi.get(), staleTime: 5 * 60_000 });
  const currentOfficeId = useOfficeStore(s => s.currentOfficeId);
  const offices = useOfficeStore(s => s.offices);
  const officeTz = offices.find(o => o.id === currentOfficeId)?.timezone;
  const tz = officeTz || tenant?.timezone || 'Europe/Vilnius';
  useEffect(() => { setDisplayTimezone(tz); }, [tz]);
  return null;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} themes={['light', 'dark']}>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <DensityClass />
          <LiveEvents />
          <TimezoneSync />
          <RouterProvider router={router} />
          <ThemedToaster />
        </ConfirmProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
