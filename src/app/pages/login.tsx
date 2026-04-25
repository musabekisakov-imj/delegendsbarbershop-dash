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
import { cn } from '../components/ui/utils';
import { useT } from '../hooks/use-t';

// Demo roles — click any to auto-fill the form. This is the
// fastest way for a client / reviewer to try every permission
// level without remembering 4 emails. Removed when real auth lands.
const DEMO_ROLES: { id: string; label: string; email: string; dot: string }[] = [
  { id: 'owner',        label: 'Owner',        email: 'admin@barberpro.com',   dot: 'bg-amber-500'   },
  { id: 'manager',      label: 'Manager',      email: 'manager@barberpro.com', dot: 'bg-violet-500'  },
  { id: 'receptionist', label: 'Receptionist', email: 'sarah@barberpro.com',   dot: 'bg-blue-500'    },
  { id: 'barber',       label: 'Barber',       email: 'maria@barberpro.com',   dot: 'bg-emerald-500' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const t = useT();
  const { isAuthenticated, login } = useAuthStore();
  const [email, setEmail] = useState('admin@barberpro.com');
  const [password, setPassword] = useState('password');
  const [isLoading, setIsLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<string>('owner');

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

  const pickRole = (role: typeof DEMO_ROLES[number]) => {
    setEmail(role.email);
    setPassword('password');
    setActiveRole(role.id);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10 overflow-hidden">
      {/* Single subtle radial accent — anchors the page without
          competing with the form. Was a two-color rainbow before. */}
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
            BarberPro · Demo
          </p>
        </div>

        {/* ─── Editorial hero ──────────────────────────── */}
        <h1 className="text-3xl font-bold text-foreground tracking-tight leading-tight">
          Sign in to your shop
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use any of the demo roles below — every login works with any password.
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
              placeholder="you@example.com"
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

        {/* ─── Demo role picker ─────────────────────────
            Click a chip → form fills with that role's
            credentials. Saves the reviewer from copy-pasting. */}
        <div className="mt-7">
          <div className="flex items-center gap-2">
            <span className="flex-1 border-t border-border" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em]">
              Try a role
            </p>
            <span className="flex-1 border-t border-border" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {DEMO_ROLES.map(role => {
              const active = activeRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => pickRole(role)}
                  className={cn(
                    'group relative flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all',
                    active
                      ? 'border-foreground bg-foreground/5'
                      : 'border-border hover:border-foreground/30 hover:bg-accent/40',
                  )}
                  aria-pressed={active}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', role.dot)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground leading-none">{role.label}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground truncate tabular-nums">
                      {role.email.split('@')[0]}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Footer ──────────────────────────────────── */}
        <p className="mt-8 text-center text-[11px] text-muted-foreground/70 tabular-nums">
          BarberPro · April 2026 · Lithuanian salon edition
        </p>
      </div>
    </div>
  );
}
