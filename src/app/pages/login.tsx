import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../store/auth-store';
import { authApi } from '../lib/api';
import { initializeMockData } from '../lib/mock-data';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ScissorsIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useT } from '../hooks/use-t';

export function LoginPage() {
  const navigate = useNavigate();
  const t = useT();
  const { isAuthenticated, login } = useAuthStore();
  const [email, setEmail] = useState('admin@delegends.com');
  const [password, setPassword] = useState('demo1234');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initializeMockData();
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
    } catch {
      toast.error(t('toast.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10 overflow-hidden">
      {/* Single subtle radial accent — anchors the page without
          competing with the form. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
        style={{
          backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, var(--primary), transparent)',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* ─── Editorial brand mark ────────────────────────
            Monochrome scissors in a clean squircle. Sized
            small enough to feel like a mark, not a hero. */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
            <ScissorsIcon className="h-5 w-5" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            De Legends · Owner Console
          </p>
        </div>

        {/* ─── Editorial hero ──────────────────────────── */}
        <h1 className="text-3xl font-bold text-foreground tracking-tight leading-tight">
          Sign in to your shop
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Owner access only — sign in with your salon credentials.
        </p>

        {/* ─── Form card ───────────────────────────────── */}
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <Label htmlFor="email" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.lt"
              required
              className="mt-1.5 h-10"
              autoComplete="email"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em]">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="mt-1.5 h-10"
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full h-10" loading={isLoading}>
            {isLoading ? 'Signing in…' : (
              <>
                Sign in
                <ArrowRightIcon className="ml-1.5 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* ─── Footer ──────────────────────────────────── */}
        <p className="mt-8 text-center text-[11px] text-muted-foreground/70 tabular-nums">
          De Legends Barbershop · May 2026 · Vilnius
        </p>
      </div>
    </div>
  );
}
