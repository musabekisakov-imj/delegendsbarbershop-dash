import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../store/auth-store';
import { authApi } from '../lib/api';
import { initializeMockData } from '../lib/mock-data';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ScissorsIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useT } from '../hooks/use-t';

export function LoginPage() {
  const navigate = useNavigate();
  const t = useT();
  const { isAuthenticated, login } = useAuthStore();
  const [email, setEmail] = useState('admin@barberpro.com');
  const [password, setPassword] = useState('password');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize mock data on first load
    initializeMockData();
    
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate('/overview');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authApi.login(email, password);
      login(response.user, response.token);
      toast.success(t('toast.welcome'));
      navigate('/overview');
    } catch (error) {
      toast.error(t('toast.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
      {/* Ambient gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 60% 50% at 20% 0%, rgba(59, 130, 246, 0.15), transparent), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(139, 92, 246, 0.15), transparent)',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 shadow-lg">
            <ScissorsIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground tracking-tight">BarberPro</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Barbershop management dashboard</p>
        </div>

        {/* Login Form */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          {/* Animated accent stripe — same as calendar/bookings */}
          <div className="h-1 bookings-accent-stripe" aria-hidden />

          <div className="p-7">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Sign in to your account</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use any credentials in demo mode.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="mt-1.5"
                />
              </div>

              <Button type="submit" className="w-full" loading={isLoading}>
                {isLoading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          BarberPro · April 2026
        </p>
      </div>
    </div>
  );
}
