import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  CheckCircleIcon, ArrowRightIcon, XMarkIcon, ScissorsIcon,
  UsersIcon, ClockIcon, CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { staffApi, servicesApi, tenantApi, appointmentsApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { useOfficeStore } from '../../store/office-store';
import { cn } from '../ui/utils';

/**
 * First-run welcome card.
 *
 * Shows a progress checklist of the 4 things every new shop needs before the
 * dashboard is useful: team, services, working hours, first booking.
 *
 * Visibility rules:
 *   - Hidden after the user explicitly dismisses (per-user localStorage key)
 *   - Hidden automatically when all 4 steps are complete
 *   - Reappears if the user signs in as a different account (keyed by user.id)
 */
export function WelcomeCard() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const officeId = useOfficeStore(s => s.currentOfficeId);

  const dismissKey = `barberpro_welcome_dismissed_${user?.id ?? 'anon'}`;
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem(dismissKey) === '1'
  );

  // Fetch the minimum data needed to compute progress.
  const { data: staff = [] } = useQuery({
    queryKey: ['staff', officeId],
    queryFn: () => staffApi.getAll(officeId),
  });
  const { data: services = [] } = useQuery({
    queryKey: ['services', officeId],
    queryFn: () => servicesApi.getAll(officeId),
  });
  const { data: tenant } = useQuery({ queryKey: ['tenant'], queryFn: tenantApi.get });
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', officeId],
    queryFn: () => appointmentsApi.getAll(officeId),
  });

  const steps = useMemo(() => {
    const hasStaff = staff.some(s => s.isActive);
    const hasServices = services.length > 0;
    const hasHours = !!tenant?.workingHours && Object.values(tenant.workingHours).some(h => h.isOpen);
    const hasBookings = appointments.length > 0;
    return [
      { key: 'staff',    label: 'Add your team',          done: hasStaff,    icon: UsersIcon,        href: '/staff' },
      { key: 'services', label: 'Set up services',        done: hasServices, icon: ScissorsIcon,     href: '/services' },
      { key: 'hours',    label: 'Set working hours',      done: hasHours,    icon: ClockIcon,        href: '/settings' },
      { key: 'booking',  label: 'Create first booking',   done: hasBookings, icon: CalendarDaysIcon, href: '/bookings/new' },
    ];
  }, [staff, services, tenant, appointments]);

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;

  if (dismissed || allDone) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(dismissKey, '1'); } catch { /* storage full or disabled — skip persistence */ }
  };

  return (
    <div className="relative rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm overflow-hidden">
      {/* Accent stripe */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/80 via-primary/40 to-transparent" aria-hidden />

      <button
        onClick={dismiss}
        aria-label="Dismiss welcome card"
        className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>

      <div className="p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ScissorsIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">
              {user ? `Welcome, ${user.firstName}` : 'Welcome to BarberPro'}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {completedCount === 0
                ? 'Let\'s get your shop ready in 4 quick steps.'
                : `${completedCount} of ${steps.length} done — you're almost there.`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>

        {/* Step tiles */}
        <div className="grid gap-2 sm:grid-cols-2">
          {steps.map(step => {
            const Icon = step.icon;
            return (
              <button
                key={step.key}
                onClick={() => navigate(step.href)}
                className={cn(
                  'group flex items-center gap-3 rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                  step.done
                    ? 'border-border bg-muted/40 opacity-70'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5',
                )}
              >
                <div className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                  step.done
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-primary/10 text-primary group-hover:bg-primary/15',
                )}>
                  {step.done ? <CheckCircleIcon className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    'text-sm font-semibold truncate',
                    step.done ? 'text-muted-foreground line-through' : 'text-foreground',
                  )}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.done ? 'Done' : 'Not done yet'}
                  </p>
                </div>
                {!step.done && (
                  <ArrowRightIcon className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
