import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from './components/ui/sonner';
import { ConfirmProvider } from './hooks/use-confirm';
import { useDensity } from './hooks/use-t';
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

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} themes={['light', 'dark']}>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <DensityClass />
          <RouterProvider router={router} />
          <ThemedToaster />
        </ConfirmProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
