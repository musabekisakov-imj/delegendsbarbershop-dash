import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi, clientsApi, staffApi, servicesApi } from '../lib/api';
import { useOfficeStore } from '../store/office-store';
import { SectionHeading } from '../components/shared/section-heading';
import { ArrowTrendingUpIcon, MapPinIcon } from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';
import {
  format, parseISO, startOfMonth, subMonths, eachDayOfInterval, startOfDay, endOfDay,
  subDays, differenceInDays,
} from 'date-fns';
import { cn } from '../components/ui/utils';
import { useT, useLanguage } from '../hooks/use-t';
import { formatPrice } from '../lib/format';
import { DateRangeSelector } from '../components/analytics/date-range-selector';
import { PageHeader, PageHeaderDivider } from '../components/shared/page-header';
import { getPresetRange, getPreviousRange } from '../lib/date-range';
import type { RangePreset } from '../lib/date-range';
import type { TranslationKey } from '../i18n';

// Resolved CSS colours aligned with the STATUS_DOT semantic palette in tokens.ts.
// Recharts Cell.fill requires a real colour value, not a Tailwind class — so we
// maintain this small map rather than trying to read CSS variables at runtime.
const STATUS_COLOR: Record<string, string> = {
  completed: '#10b981', // emerald-500 — revenue-generating
  confirmed:  '#3b82f6', // blue-500 — upcoming confirmed
  scheduled:  '#94a3b8', // slate-400 — neutral pending
  no_show:    '#f59e0b', // amber-500 — attention needed
  cancelled:  '#f43f5e', // rose-500 — problem
};

const STATUS_LABEL_KEY: Record<string, TranslationKey> = {
  completed: 'analytics.status.completed',
  confirmed:  'analytics.status.confirmed',
  scheduled:  'analytics.status.scheduled',
  no_show:    'analytics.status.noShow',
  cancelled:  'analytics.status.cancelled',
};

const PRESET_KEY: Record<RangePreset, TranslationKey> = {
  '7d':         'dateRange.last7d',
  '30d':        'dateRange.last30d',
  '90d':        'dateRange.last90d',
  'this-month': 'dateRange.thisMonth',
};

export function AnalyticsPage() {
  const t = useT();
  const [language] = useLanguage();
  const officeId = useOfficeStore(s => s.currentOfficeId);

  const [preset, setPreset] = useState<RangePreset>('30d');

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', officeId],
    queryFn: () => appointmentsApi.getAllWithDetails(officeId),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', officeId],
    queryFn: () => clientsApi.getAll(officeId),
  });
  const { data: staff = [] } = useQuery({
    queryKey: ['staff', officeId],
    queryFn: () => staffApi.getAll(officeId),
  });
  const { data: services = [] } = useQuery({
    queryKey: ['services', officeId],
    queryFn: () => servicesApi.getAll(officeId),
  });

  // ── Date range derivation ──
  const { rangeStart, rangeEnd, compStart } = useMemo(() => {
    const range = getPresetRange(preset);
    const prev = getPreviousRange(range);
    return { rangeStart: range.start, rangeEnd: range.end, compStart: prev.start };
  }, [preset]);

  // ── Revenue & core metrics — scoped to selected range ──
  const metrics = useMemo(() => {
    const rs = rangeStart.getTime();
    const re = rangeEnd.getTime();
    const cs = compStart.getTime();

    const rangeApts = appointments.filter(a => {
      const t = parseISO(a.startTime).getTime();
      return t >= rs && t <= re;
    });
    const prevApts = appointments.filter(a => {
      const t = parseISO(a.startTime).getTime();
      return t >= cs && t < rs;
    });

    const completed = rangeApts.filter(a => a.status === 'completed');
    const prevCompleted = prevApts.filter(a => a.status === 'completed');

    const revenueCurrent = completed.reduce((s, a) => s + (a.service?.price ?? 0), 0);
    const revenuePrev = prevCompleted.reduce((s, a) => s + (a.service?.price ?? 0), 0);
    const deltaPct = revenuePrev > 0
      ? ((revenueCurrent - revenuePrev) / revenuePrev) * 100
      : revenueCurrent > 0 ? 100 : 0;

    const total = rangeApts.length || 1;
    const cancelRate = (rangeApts.filter(a => a.status === 'cancelled').length / total) * 100;
    const noShowRate = (rangeApts.filter(a => a.status === 'no_show').length / total) * 100;
    const avgTicket = completed.length > 0 ? revenueCurrent / completed.length : 0;

    return {
      revenueCurrent,
      revenuePrev,
      deltaPct,
      deltaPositive: deltaPct >= 0,
      deltaAbs: Math.abs(deltaPct),
      completed: completed.length,
      totalBookings: rangeApts.length,
      cancelRate,
      noShowRate,
      avgTicket,
    };
  }, [appointments, rangeStart, rangeEnd, compStart]);

  // ── Daily revenue — every day in the selected range ──
  const dailyRevenue = useMemo(() => {
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    return days.map(day => {
      const key = format(day, 'yyyy-MM-dd');
      const revenue = appointments
        .filter(a => a.status === 'completed' && format(parseISO(a.startTime), 'yyyy-MM-dd') === key)
        .reduce((sum, a) => sum + (a.service?.price ?? 0), 0);
      return { date: format(day, 'MMM d'), revenue };
    });
  }, [appointments, rangeStart, rangeEnd]);

  // ── Monthly revenue — always last 6 months (trend, not range-scoped) ──
  const monthlyRevenue = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
    return months.map(m => {
      const ym = format(m, 'yyyy-MM');
      const sum = appointments
        .filter(a => a.status === 'completed' && format(parseISO(a.startTime), 'yyyy-MM') === ym)
        .reduce((s, a) => s + (a.service?.price ?? 0), 0);
      return { month: format(m, 'MMM'), revenue: sum };
    });
  }, [appointments]);

  // ── Top services by revenue — range-scoped ──
  const topServices = useMemo(() => {
    const rs = rangeStart.getTime();
    const re = rangeEnd.getTime();
    const byService = new Map<string, { name: string; revenue: number; count: number }>();
    appointments
      .filter(a => a.status === 'completed' && parseISO(a.startTime).getTime() >= rs && parseISO(a.startTime).getTime() <= re)
      .forEach(a => {
        const existing = byService.get(a.serviceId) ?? { name: a.service?.name ?? 'Unknown', revenue: 0, count: 0 };
        existing.revenue += a.service?.price ?? 0;
        existing.count += 1;
        byService.set(a.serviceId, existing);
      });
    return Array.from(byService.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [appointments, rangeStart, rangeEnd]);

  // ── Revenue by staff — range-scoped ──
  const byStaff = useMemo(() => {
    const rs = rangeStart.getTime();
    const re = rangeEnd.getTime();
    const m = new Map<string, { id: string; name: string; revenue: number; bookings: number }>();
    staff.forEach(s => m.set(s.id, { id: s.id, name: `${s.firstName} ${s.lastName}`, revenue: 0, bookings: 0 }));
    appointments
      .filter(a => a.status === 'completed' && parseISO(a.startTime).getTime() >= rs && parseISO(a.startTime).getTime() <= re)
      .forEach(a => {
        const entry = m.get(a.staffId);
        if (!entry) return;
        entry.revenue += a.service?.price ?? 0;
        entry.bookings += 1;
      });
    return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue);
  }, [appointments, staff, rangeStart, rangeEnd]);

  // ── Retention — % of clients returning within 60 days (all-time) ──
  const retentionRate = useMemo(() => {
    if (clients.length === 0) return 0;
    const returning = clients.filter(c => {
      if (!c.lastVisitAt) return false;
      return differenceInDays(new Date(), parseISO(c.lastVisitAt)) <= 60;
    }).length;
    return (returning / clients.length) * 100;
  }, [clients]);

  // ── Status distribution — range-scoped ──
  const statusDistribution = useMemo(() => {
    const rs = rangeStart.getTime();
    const re = rangeEnd.getTime();
    const rangeApts = appointments.filter(a => {
      const t = parseISO(a.startTime).getTime();
      return t >= rs && t <= re;
    });
    const counts = { scheduled: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
    rangeApts.forEach(a => { counts[a.status as keyof typeof counts]++; });
    const total = rangeApts.length || 1;
    return [
      { key: 'completed', value: counts.completed },
      { key: 'confirmed',  value: counts.confirmed },
      { key: 'scheduled',  value: counts.scheduled },
      { key: 'no_show',    value: counts.no_show },
      { key: 'cancelled',  value: counts.cancelled },
    ].map(d => ({ ...d, pct: (d.value / total) * 100 })).filter(d => d.value > 0);
  }, [appointments, rangeStart, rangeEnd]);

  // Adds translated names for Recharts Tooltip and legend (separate memo so
  // language switches trigger a re-render without re-aggregating data).
  const statusDisplayData = useMemo(
    () => statusDistribution.map(d => ({ ...d, name: t(STATUS_LABEL_KEY[d.key]) })),
    [statusDistribution, t],
  );

  // ── Forecast — upcoming bookings × service price ──
  const forecast = useMemo(() => {
    const upcoming = appointments.filter(a =>
      (a.status === 'scheduled' || a.status === 'confirmed') &&
      parseISO(a.startTime).getTime() > Date.now(),
    );
    const potential = upcoming.reduce((s, a) => s + (a.service?.price ?? 0), 0);
    return { count: upcoming.length, potential };
  }, [appointments]);

  // ── Operational insights — range-scoped busiest hour, this-month top barber ──
  const insights = useMemo(() => {
    const rs = rangeStart.getTime();
    const re = rangeEnd.getTime();
    const rangeApts = appointments.filter(a => {
      const t = parseISO(a.startTime).getTime();
      return t >= rs && t <= re && a.status !== 'cancelled';
    });

    const hourCounts = new Array(24).fill(0) as number[];
    rangeApts.forEach(a => { hourCounts[parseISO(a.startTime).getHours()]++; });
    let busiestHour = 0;
    let busiestCount = 0;
    for (let h = 0; h < 24; h++) {
      if (hourCounts[h] > busiestCount) { busiestCount = hourCounts[h]; busiestHour = h; }
    }

    const monthStart = startOfMonth(new Date()).getTime();
    const monthCompleted = appointments.filter(a => a.status === 'completed' && parseISO(a.startTime).getTime() >= monthStart);
    const byStaffMap = new Map<string, { name: string; revenue: number }>();
    monthCompleted.forEach(a => {
      const key = a.staffId;
      const name = `${a.staff?.firstName ?? ''} ${a.staff?.lastName ?? ''}`.trim() || '—';
      const prev = byStaffMap.get(key) ?? { name, revenue: 0 };
      prev.revenue += a.service?.price ?? 0;
      byStaffMap.set(key, prev);
    });
    const topBarber = [...byStaffMap.values()].sort((a, b) => b.revenue - a.revenue)[0] ?? null;

    return {
      busiestHour: busiestCount > 0 ? `${String(busiestHour).padStart(2, '0')}:00` : '—',
      busiestCount,
      topBarberName: topBarber?.name ?? '—',
      topBarberRevenue: topBarber?.revenue ?? 0,
    };
  }, [appointments, rangeStart, rangeEnd]);

  const offices = useOfficeStore(s => s.offices);
  const currentOffice = offices.find(o => o.id === officeId);

  const rangeLabel = t(PRESET_KEY[preset]);
  const todayLabel = format(new Date(), 'MMM d');

  return (
    <div className="space-y-6 max-w-[1600px]">

      {/* ─── Eyebrow + h1 + range selector ── */}
      <PageHeader
        eyebrow={(
          <>
            <span>{t('analytics.eyebrow')}</span>
            {currentOffice && (
              <>
                <PageHeaderDivider />
                <span className="inline-flex items-center gap-1 normal-case tracking-normal font-medium">
                  <MapPinIcon className="h-3 w-3" />
                  {currentOffice.name}
                </span>
              </>
            )}
          </>
        )}
        title={t('analytics.heroTitle')}
        action={<DateRangeSelector value={preset} onChange={setPreset} />}
      />

      {/* ─── Hero financial figure + sparkline ──
          One display number anchors the page: revenue for the chosen
          period. Sparkline shows the daily shape. Delta badge compares
          to the preceding equal-length window. */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-5 lg:items-end">
          <div className="lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t('analytics.revenueLabel')} · {rangeLabel}
            </p>
            <div className="mt-1 flex items-baseline gap-3 flex-wrap">
              <p className="text-5xl sm:text-6xl font-bold text-foreground tabular-nums leading-none tracking-tight">
                {formatPrice(metrics.revenueCurrent, language)}
              </p>
              {metrics.revenuePrev > 0 && (
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                  metrics.deltaPositive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                )}>
                  <ArrowTrendingUpIcon className={cn('h-3 w-3', !metrics.deltaPositive && 'rotate-180')} />
                  {metrics.deltaAbs.toFixed(1)}%
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">
              {t('analytics.vsPrev')} {formatPrice(metrics.revenuePrev, language)}
            </p>
            {forecast.count > 0 && (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                + {formatPrice(forecast.potential, language)} {t('analytics.upcomingRevenue')} ({forecast.count})
              </p>
            )}
          </div>

          {/* Sparkline — 30-day shape. --chart-1 avoids the near-black --primary. */}
          <div className="lg:col-span-3">
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={dailyRevenue} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--chart-1)"
                  strokeWidth={1.75}
                  dot={false}
                  activeDot={{ r: 3, fill: 'var(--chart-1)' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [formatPrice(v, language), t('analytics.revenueLabel')]}
                  cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── Newspaper-ticker metrics row ──
          7 quiet numbers separated by hairline dividers. No icon badges,
          no tone colors — just the data, tabular, uppercase labels. */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 divide-x divide-y divide-border sm:divide-y-0">
          <TickerStat label={t('analytics.ticker.bookings')} value={metrics.totalBookings.toString()} sub={rangeLabel} />
          <TickerStat
            label={t('analytics.ticker.avgTicket')}
            value={formatPrice(Math.round(metrics.avgTicket), language)}
            sub={t('analytics.ticker.perVisit')}
          />
          <TickerStat
            label={t('analytics.ticker.completed')}
            value={metrics.completed.toString()}
            sub={`${metrics.totalBookings > 0 ? Math.round((metrics.completed / metrics.totalBookings) * 100) : 0}${t('analytics.ticker.ofAll')}`}
          />
          <TickerStat
            label={t('analytics.ticker.cancelRate')}
            value={`${metrics.cancelRate.toFixed(1)}%`}
            sub={metrics.cancelRate > 10 ? t('analytics.ticker.aboveHealthy') : t('analytics.ticker.withinHealthy')}
            tone={metrics.cancelRate > 10 ? 'warn' : undefined}
          />
          <TickerStat
            label={t('analytics.ticker.noShowRate')}
            value={`${metrics.noShowRate.toFixed(1)}%`}
            sub={metrics.noShowRate > 8 ? t('analytics.ticker.reviewClients') : t('analytics.ticker.underControl')}
            tone={metrics.noShowRate > 8 ? 'warn' : undefined}
          />
          <TickerStat
            label={t('analytics.ticker.retention')}
            value={`${Math.round(retentionRate)}%`}
            sub={`${clients.length} ${t('analytics.ticker.clientsTotal')}`}
          />
          <TickerStat
            label={t('analytics.ticker.busiest')}
            value={insights.busiestHour}
            sub={insights.busiestCount > 0 ? `${insights.busiestCount} ${t('analytics.ticker.bookings').toLowerCase()}` : '—'}
          />
        </div>
      </div>

      {/* ─── Revenue chart row ─── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Daily revenue bars — today is marked with a reference line so the
            user sees at a glance where the current period ends. */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <SectionHeading size="sm" title={`${t('analytics.dailyRevenue')} · ${rangeLabel}`} subtitle={t('analytics.completedOnly')} />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyRevenue} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="var(--muted-foreground)"
                fontSize={10}
                interval={Math.max(0, Math.ceil(dailyRevenue.length / 8) - 1)}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickFormatter={v => formatPrice(v, language)} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatPrice(v, language), t('analytics.revenueLabel')]}
                cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
              />
              <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              {dailyRevenue.some(d => d.date === todayLabel) && (
                <ReferenceLine
                  x={todayLabel}
                  stroke="var(--primary)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.4}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status mix donut — shows the health of bookings in the range.
            Ring (innerRadius > 0) reads as "proportion of a whole" more
            clearly than a filled pie. */}
        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeading size="sm" title={t('analytics.statusMix')} subtitle={t('analytics.allAppointments')} />
          <div className="relative mt-2" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDisplayData}
                  dataKey="value"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={1.5}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {statusDisplayData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLOR[entry.key] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, _n, item) => {
                    const pct = item?.payload?.pct ?? 0;
                    return [`${v} · ${pct.toFixed(1)}%`, item?.payload?.name ?? ''];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold tabular-nums text-foreground leading-none">
                {metrics.totalBookings}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('analytics.ticker.bookings')}
              </p>
            </div>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {statusDisplayData.map(d => (
              <li key={d.key} className="flex items-center gap-3 py-2 text-xs">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[d.key] ?? '#94a3b8' }} />
                <span className="flex-1 text-muted-foreground">{d.name}</span>
                <span className="tabular-nums text-muted-foreground w-10 text-right">{d.pct.toFixed(1)}%</span>
                <span className="font-semibold tabular-nums text-foreground w-8 text-right">{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ─── Monthly trend + top services ─── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeading size="sm" title={t('analytics.revenueTrend')} subtitle={t('analytics.monthlyTotal')} />
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyRevenue} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={v => formatPrice(v, language)} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatPrice(v, language), t('analytics.revenueLabel')]}
                cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={{ fill: 'var(--chart-2)', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeading size="sm" title={t('analytics.topServices')} subtitle={`${services.length} ${t('analytics.servicesAvailable')}`} />
          {topServices.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t('analytics.noCompleted')}
            </div>
          ) : (
            <ul className="space-y-2.5">
              {topServices.map((s, i) => {
                const max = topServices[0].revenue || 1;
                const pct = (s.revenue / max) * 100;
                return (
                  <li key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        <span className="text-muted-foreground tabular-nums mr-2">#{i + 1}</span>
                        {s.name}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatPrice(s.revenue, language)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-emerald-500/80" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] tabular-nums text-muted-foreground w-16 text-right">
                        {s.count} {s.count === 1 ? t('analytics.visit') : t('analytics.visits')}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ─── Staff performance ─── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div>
            <h2 className="text-sm font-bold text-foreground">{t('analytics.staffPerformance')}</h2>
            <p className="text-xs text-muted-foreground">{t('analytics.staffSubtitle')} · {rangeLabel}</p>
          </div>
          {insights.topBarberRevenue > 0 && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:block">
              {t('analytics.thisMonth')}: <span className="text-foreground normal-case tracking-normal">{insights.topBarberName}</span> · {formatPrice(insights.topBarberRevenue, language)}
            </span>
          )}
        </div>
        {byStaff.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">{t('analytics.noStaffData')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left px-5 py-2.5">{t('analytics.col.staff')}</th>
                <th className="text-right px-5 py-2.5">{t('analytics.col.bookings')}</th>
                <th className="text-right px-5 py-2.5">{t('analytics.col.revenue')}</th>
                <th className="text-left px-5 py-2.5 w-56">{t('analytics.col.share')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byStaff.map((s, i) => {
                const total = byStaff.reduce((sum, x) => sum + x.revenue, 0) || 1;
                const share = (s.revenue / total) * 100;
                const isLead = i === 0 && s.revenue > 0;
                return (
                  <tr key={s.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold tabular-nums text-muted-foreground w-4">#{i + 1}</span>
                        <span className="font-medium text-foreground">{s.name}</span>
                        {isLead && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            {t('analytics.lead')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-foreground">{s.bookings}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-foreground">
                      {formatPrice(s.revenue, language)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn('h-full', isLead ? 'bg-emerald-500' : 'bg-blue-500/40')} style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-[11px] tabular-nums text-muted-foreground w-10 text-right">
                          {share.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Ticker stat — newspaper-style inline metric cell ──
// Tiny uppercase label, big tabular value, faint sub. Hairline dividers
// come from the parent grid's `divide-x divide-y`. No icon, no badge.
function TickerStat({
  label, value, sub, tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'warn';
}) {
  return (
    <div className="p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={cn(
        'mt-1 text-xl font-bold tabular-nums leading-none',
        tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
      )}>
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground truncate">{sub}</p>}
    </div>
  );
}
