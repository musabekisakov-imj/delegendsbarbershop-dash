import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from './components/ui/sonner';
import { ConfirmProvider } from './hooks/use-confirm';
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
  return <Toaster position="top-right" theme={resolvedTheme === 'dark' ? 'dark' : 'light'} />;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <RouterProvider router={router} />
          <ThemedToaster />
        </ConfirmProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
