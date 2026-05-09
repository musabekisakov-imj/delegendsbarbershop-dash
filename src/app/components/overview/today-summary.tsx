import { useMemo } from 'react';
import { parseISO, differenceInMinutes, format } from 'date-fns';
import { cn } from '../ui/utils';
import { ProgressBar } from '../shared/progress-bar';
import { STATUS_LABEL } from '../../lib/tokens';
import { calculateTypicalDayRevenue } from '../../lib/overview';
import { formatPrice } from '../../lib/format';
import { useT } from '../../hooks/use-t';
import type { AppointmentWithDetails, Language } from '../../types';

interface TodaySummaryProps {
  todayAppointments: AppointmentWithDetails[];
  allAppointments: AppointmentWithDetails[];
  viewDate: Date;
  language: Language;
  isBarber: boolean;
  activeStaff: number;
  totalStaff: number;
  weekApptCount: number;
}

export function TodaySummary({
  todayAppointments,
  allAppointments,
  viewDate,
  language,
  isBarber,
  activeStaff,
  totalStaff,
  weekApptCount,
}: TodaySummaryProps) {
  const t = useT();

  const completedToday = todayAppointments.filter(a => a.status === 'completed');
  const pendingToday = todayAppointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed');
  const noShowToday = todayAppointments.filter(a => a.status === 'no_show');

  const todayRevenue = completedToday.reduce((s, a) => s + a.service.price, 0);
  const dayBooked = todayAppointments
    .filter(a => a.status !== 'cancelled' && a.status !== 'no_show')
    .reduce((s, a) => s + a.service.price, 0);
  const dayPending = dayBooked - todayRevenue;
  const avgTicket = completedToday.length > 0 ? Math.round(todayRevenue / completedToday.length) : null;
  const uniqueClients = new Set(todayAppointments.map(a => a.clientId)).size;

  const heroAmount = isBarber ? todayRevenue : dayBooked;

  const typical = useMemo(
    () => calculateTypicalDayRevenue(allAppointments, viewDate),
    [allAppointments, viewDate],
  );

  const delta = typical !== null && typical > 0
    ? Math.round(((heroAmount - typical) / typical) * 100)
    : null;

  const dayDow = viewDate.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-7">
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Left: hero number + progress + day rail */}
        <div className="lg:col-span-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {isBarber ? t('overview.yourRevenueToday') : t('overview.bookedToday')}
          </p>

          {/* Hero row: big number + comparison badge */}
          <div className="mt-1 flex items-baseline gap-3 flex-wrap">
            <p className="text-5xl sm:text-6xl font-bold text-foreground tabular-nums leading-none tracking-tight">
              {formatPrice(heroAmount, language)}
            </p>
            {/* Inline comparison badge — Phase 3 will extract to ComparisonBadge */}
            {delta !== null ? (
              <span className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                delta >= 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
              )}>
                {delta >= 0 ? '+' : ''}{delta}% {t('overview.summary.vsTypical')} {dayDow}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground/70 italic">
                {t('overview.summary.noHistory')}
              </span>
            )}
          </div>

          {/* Earned / pending breakdown (owner only) */}
          {!isBarber && (
            <div className="mt-2 flex items-center gap-3 text-sm">
              <span className={cn(
                'font-semibold tabular-nums',
                todayRevenue > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
              )}>
                {formatPrice(todayRevenue, language)} {t('overview.earned')}
              </span>
              {dayPending > 0 && (
                <span className="text-muted-foreground tabular-nums">
                  · {formatPrice(dayPending, language)} {t('overview.pending')}
                </span>
              )}
            </div>
          )}

          {/* Progress bar: earned vs booked */}
          {dayBooked > 0 && (
            <div className="mt-3">
              <ProgressBar value={todayRevenue} max={dayBooked} />
              <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                {dayBooked > 0 ? Math.round((todayRevenue / dayBooked) * 100) : 0}%{' '}
                {t('overview.earned').toLowerCase()}
              </p>
            </div>
          )}

          {/* Day rail */}
          {todayAppointments.length > 0 && (
            <div className="mt-5">
              <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-muted">
                {todayAppointments
                  .slice()
                  .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime())
                  .map(apt => {
                    const minutes = differenceInMinutes(parseISO(apt.endTime), parseISO(apt.startTime));
                    const color =
                      apt.status === 'completed'  ? 'bg-emerald-500'
                      : apt.status === 'cancelled'  ? 'bg-muted-foreground/25'
                      : apt.status === 'no_show'    ? 'bg-amber-500'
                      : apt.status === 'confirmed'  ? 'bg-emerald-400'
                      : 'bg-zinc-300 dark:bg-zinc-600';
                    return (
                      <div
                        key={apt.id}
                        className={cn('transition-colors', color)}
                        style={{ flex: minutes }}
                        title={`${format(parseISO(apt.startTime), 'HH:mm')} · ${apt.client.firstName} ${apt.client.lastName} · ${STATUS_LABEL[apt.status]}`}
                      />
                    );
                  })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                <RailLegend color="bg-emerald-500" label="Completed" count={completedToday.length} />
                <RailLegend color="bg-emerald-400" label="Confirmed" count={todayAppointments.filter(a => a.status === 'confirmed').length} />
                <RailLegend color="bg-zinc-300 dark:bg-zinc-600" label="Scheduled" count={todayAppointments.filter(a => a.status === 'scheduled').length} />
                {noShowToday.length > 0 && <RailLegend color="bg-amber-500" label="No-show" count={noShowToday.length} />}
              </div>
            </div>
          )}
        </div>

        {/* Right: 4-metric strip */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 lg:col-span-2 lg:grid-cols-1 lg:gap-3 lg:pl-7 lg:border-l lg:border-border">
          <StatCell
            label={t('overview.bookings')}
            value={todayAppointments.length}
            sub={pendingToday.length > 0 ? `${pendingToday.length} ${t('overview.pendingCount')}` : undefined}
          />
          <StatCell
            label={isBarber ? t('overview.yourClients') : t('overview.uniqueClients')}
            value={isBarber ? '—' : uniqueClients}
            sub={isBarber ? undefined : t('overview.nav.badgeToday').toLowerCase()}
          />
          <StatCell
            label={isBarber ? t('overview.thisWeek') : t('overview.staffOn')}
            value={isBarber ? weekApptCount : activeStaff}
            sub={isBarber ? t('overview.completed') : `of ${totalStaff}`}
          />
          <StatCell
            label={t('overview.summary.avgTicket')}
            value={avgTicket !== null ? formatPrice(avgTicket, language) : '—'}
            sub={completedToday.length > 0 ? `${completedToday.length} ${t('overview.completed')}` : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground leading-none">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground tabular-nums truncate">{sub}</p>}
    </div>
  );
}

function RailLegend({ color, label, count }: { color: string; label: string; count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span>{label} <span className="text-foreground font-semibold">{count}</span></span>
    </span>
  );
}
