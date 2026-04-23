import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi, clientsApi, staffApi, servicesApi } from '../lib/api';
import { useOfficeStore } from '../store/office-store';
import { SectionHeading } from '../components/shared/section-heading';
import { ArrowTrendingUpIcon, MapPinIcon } from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import {
  format, parseISO, startOfMonth, subMonths, eachDayOfInterval, startOfDay, endOfDay,
  subDays, differenceInDays,
} from 'date-fns';
import { cn } from '../components/ui/utils';

export function AnalyticsPage() {
  const officeId = useOfficeStore(s => s.currentOfficeId);

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

  // ── Revenue & core metrics ──
  // `totalRevenue` covers all time; `revenueLast30` + `revenuePrev30` power
  // the hero delta arrow. Cancel and no-show rates are split on purpose —
  // they mean different things (client cancelled vs didn't show up).
  const metrics = useMemo(() => {
    const completed = appointments.filter(a => a.status === 'completed');
    const cancelled = appointments.filter(a => a.status === 'cancelled');
    const noShow = appointments.filter(a => a.status === 'no_show');
    const totalRevenue = completed.reduce((sum, a) => sum + (a.service?.price ?? 0), 0);
    const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

    const now = Date.now();
    const day = 86_400_000;
    const last30Start = now - 30 * day;
    const prev30Start = now - 60 * day;
    const revenueLast30 = completed
      .filter(a => parseISO(a.startTime).getTime() >= last30Start)
      .reduce((s, a) => s + (a.service?.price ?? 0), 0);
    const revenuePrev30 = completed
      .filter(a => {
        const t = parseISO(a.startTime).getTime();
        return t >= prev30Start && t < last30Start;
      })
      .reduce((s, a) => s + (a.service?.price ?? 0), 0);
    const delta30Pct = revenuePrev30 > 0
      ? ((revenueLast30 - revenuePrev30) / revenuePrev30) * 100
      : revenueLast30 > 0 ? 100 : 0;

    return {
      totalRevenue,
      avgTicket,
      completed: completed.length,
      cancelRate: appointments.length > 0 ? (cancelled.length / appointments.length) * 100 : 0,
      noShowRate: appointments.length > 0 ? (noShow.length / appointments.length) * 100 : 0,
      totalBookings: appointments.length,
      revenueLast30,
      revenuePrev30,
      delta30Pct,
    };
  }, [appointments]);

  // ── Daily revenue — last 30 days ──
  const dailyRevenue = useMemo(() => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(end, 29));
    const days = eachDayOfInterval({ start, end });
    return days.map(day => {
      const key = format(day, 'yyyy-MM-dd');
      const dayRevenue = appointments
        .filter(a => a.status === 'completed' && format(parseISO(a.startTime), 'yyyy-MM-dd') === key)
        .reduce((sum, a) => sum + (a.service?.price ?? 0), 0);
      return { date: format(day, 'MMM d'), revenue: dayRevenue };
    });
  }, [appointments]);

  // ── Monthly revenue — last 6 months ──
  const monthlyRevenue = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), 5 - i));
      return d;
    });
    return months.map(m => {
      const ym = format(m, 'yyyy-MM');
      const sum = appointments
        .filter(a => a.status === 'completed' && format(parseISO(a.startTime), 'yyyy-MM') === ym)
        .reduce((s, a) => s + (a.service?.price ?? 0), 0);
      return { month: format(m, 'MMM'), revenue: sum };
    });
  }, [appointments]);

  // ── Top services by revenue ──
  const topServices = useMemo(() => {
    const byService = new Map<string, { name: string; revenue: number; count: number }>();
    appointments
      .filter(a => a.status === 'completed')
      .forEach(a => {
        const existing = byService.get(a.serviceId) ?? {
          name: a.service?.name ?? 'Unknown',
          revenue: 0,
          count: 0,
        };
        existing.revenue += a.service?.price ?? 0;
        existing.count += 1;
        byService.set(a.serviceId, existing);
      });
    return Array.from(byService.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [appointments]);

  // ── Revenue by staff ──
  const byStaff = useMemo(() => {
    const m = new Map<string, { name: string; revenue: number; bookings: number }>();
    staff.forEach(s => m.set(s.id, { name: `${s.firstName} ${s.lastName}`, revenue: 0, bookings: 0 }));
    appointments
      .filter(a => a.status === 'completed')
      .forEach(a => {
        const entry = m.get(a.staffId);
        if (!entry) return;
        entry.revenue += a.service?.price ?? 0;
        entry.bookings += 1;
      });
    return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue);
  }, [appointments, staff]);

  // ── Retention — % of clients returning within 60 days ──
  const retentionRate = useMemo(() => {
    if (clients.length === 0) return 0;
    const returning = clients.filter(c => {
      if (!c.lastVisitAt) return false;
      return differenceInDays(new Date(), parseISO(c.lastVisitAt)) <= 60;
    }).length;
    return (returning / clients.length) * 100;
  }, [clients]);

  // ── Status distribution — rendered as a horizontal stacked bar ──
  // Colors match the rest of the app (bookings STATUS_DOT palette).
  const statusDistribution = useMemo(() => {
    const counts = { scheduled: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
    appointments.forEach(a => { counts[a.status]++; });
    const total = appointments.length || 1;
    return [
      { name: 'Completed', value: counts.completed, color: 'bg-emerald-500',         raw: '#10b981' },
      { name: 'Confirmed', value: counts.confirmed, color: 'bg-blue-500',            raw: '#3b82f6' },
      { name: 'Scheduled', value: counts.scheduled, color: 'bg-blue-500/40',         raw: '#3b82f666' },
      { name: 'No-show',   value: counts.no_show,   color: 'bg-amber-500',           raw: '#f59e0b' },
      { name: 'Cancelled', value: counts.cancelled, color: 'bg-muted-foreground/30', raw: '#9ca3af' },
    ].map(d => ({ ...d, pct: (d.value / total) * 100 })).filter(d => d.value > 0);
  }, [appointments]);

  // ── Forecast — upcoming bookings × avg ticket ──
  const forecast = useMemo(() => {
    const upcoming = appointments.filter(a =>
      (a.status === 'scheduled' || a.status === 'confirmed') &&
      parseISO(a.startTime).getTime() > Date.now(),
    );
    const potential = upcoming.reduce((s, a) => s + (a.service?.price ?? 0), 0);
    return { count: upcoming.length, potential };
  }, [appointments]);

  // ── Three operational insights the shop owner actually asks about ──
  // Busiest hour: which hour-of-day has the most bookings → staffing decisions.
  // Top barber: which staff member generated the most revenue this month → bonuses.
  // Repeat-client rate: share of bookings from returning clients → retention health.
  const insights = useMemo(() => {
    const completed = appointments.filter(a => a.status === 'completed');

    // Busiest hour
    const hourCounts = new Array(24).fill(0) as number[];
    appointments.forEach(a => {
      if (a.status === 'cancelled') return;
      hourCounts[parseISO(a.startTime).getHours()]++;
    });
    let busiestHour = 0;
    let busiestCount = 0;
    for (let h = 0; h < 24; h++) {
      if (hourCounts[h] > busiestCount) { busiestCount = hourCounts[h]; busiestHour = h; }
    }

    // Top barber — this month
    const monthStart = startOfMonth(new Date()).getTime();
    const monthCompleted = completed.filter(a => parseISO(a.startTime).getTime() >= monthStart);
    const byStaff = new Map<string, { name: string; revenue: number }>();
    monthCompleted.forEach(a => {
      const key = a.staffId;
      const name = `${a.staff?.firstName ?? ''} ${a.staff?.lastName ?? ''}`.trim() || '—';
      const prev = byStaff.get(key) ?? { name, revenue: 0 };
      prev.revenue += a.service?.price ?? 0;
      byStaff.set(key, prev);
    });
    const topBarber = [...byStaff.values()].sort((a, b) => b.revenue - a.revenue)[0] ?? null;

    // Repeat-client rate
    const clientAppointmentCounts = new Map<string, number>();
    completed.forEach(a => {
      clientAppointmentCounts.set(a.clientId, (clientAppointmentCounts.get(a.clientId) ?? 0) + 1);
    });
    const repeatBookings = completed.filter(a => (clientAppointmentCounts.get(a.clientId) ?? 0) > 1).length;
    const repeatRate = completed.length > 0 ? (repeatBookings / completed.length) * 100 : 0;

    return {
      busiestHour: busiestCount > 0 ? `${String(busiestHour).padStart(2, '0')}:00` : '—',
      busiestCount,
      topBarberName: topBarber?.name ?? '—',
      topBarberRevenue: topBarber?.revenue ?? 0,
      repeatRate,
    };
  }, [appointments]);

  const offices = useOfficeStore(s => s.offices);
  const currentOffice = offices.find(o => o.id === officeId);

  const deltaPositive = metrics.delta30Pct >= 0;
  const deltaAbs = Math.abs(metrics.delta30Pct);

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* ─── Editorial hero — office eyebrow + display number + delta ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>Analytics</span>
            {currentOffice && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center gap-1 normal-case tracking-normal font-medium">
                  <MapPinIcon className="h-3 w-3" />
                  {currentOffice.name}
                </span>
              </>
            )}
            <span className="text-muted-foreground/40">·</span>
            <span className="normal-case tracking-normal">Last 30 days</span>
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-none">
            Performance &amp; revenue
          </h1>
        </div>
      </div>

      {/* ─── Hero financial figure + 30-day sparkline ──
          Bloomberg-style: one display number answers "how much" with a
          delta arrow for "vs before" and the sparkline shows the shape
          of the period. Everything else on the page is footnotes. */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-5 lg:items-end">
          <div className="lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Revenue · last 30 days
            </p>
            <div className="mt-1 flex items-baseline gap-3 flex-wrap">
              <p className="text-5xl sm:text-6xl font-bold text-foreground tabular-nums leading-none tracking-tight">
                €{metrics.revenueLast30.toLocaleString()}
              </p>
              {metrics.revenuePrev30 > 0 && (
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                  deltaPositive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                )}>
                  {deltaPositive ? <ArrowTrendingUpIcon className="h-3 w-3" /> : <ArrowTrendingUpIcon className="h-3 w-3 rotate-180" />}
                  {deltaAbs.toFixed(1)}%
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">
              vs €{metrics.revenuePrev30.toLocaleString()} in the previous 30 days
            </p>
            {forecast.count > 0 && (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                + €{forecast.potential.toLocaleString()} potential from {forecast.count} upcoming booking{forecast.count === 1 ? '' : 's'}
              </p>
            )}
          </div>

          {/* Sparkline (3/5 on lg) */}
          <div className="lg:col-span-3">
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={dailyRevenue} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--primary)"
                  strokeWidth={1.75}
                  dot={false}
                  activeDot={{ r: 3, fill: 'var(--primary)' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [`€${v}`, 'Revenue']}
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
          <TickerStat label="Bookings" value={metrics.totalBookings.toString()} sub="all time" />
          <TickerStat label="Avg ticket" value={`€${Math.round(metrics.avgTicket)}`} sub="per visit" />
          <TickerStat label="Completed" value={metrics.completed.toString()} sub={`${metrics.totalBookings > 0 ? Math.round((metrics.completed / metrics.totalBookings) * 100) : 0}% of all`} />
          <TickerStat label="Cancel rate" value={`${metrics.cancelRate.toFixed(1)}%`} sub={metrics.cancelRate > 10 ? 'above healthy' : 'within healthy range'} tone={metrics.cancelRate > 10 ? 'warn' : undefined} />
          <TickerStat label="No-show rate" value={`${metrics.noShowRate.toFixed(1)}%`} sub={metrics.noShowRate > 8 ? 'review clients' : 'under control'} tone={metrics.noShowRate > 8 ? 'warn' : undefined} />
          <TickerStat label="Retention 60d" value={`${Math.round(retentionRate)}%`} sub={`${clients.length} clients`} />
          <TickerStat label="Busiest" value={insights.busiestHour} sub={insights.busiestCount > 0 ? `${insights.busiestCount} bookings` : '—'} />
        </div>
      </div>

      {/* ─── Revenue chart row ─── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Daily revenue chart — 30 days */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <SectionHeading size="sm" title="Daily revenue · Last 30 days" subtitle="Completed appointments only" />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyRevenue} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} interval={4} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickFormatter={v => `€${v}`} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`€${v}`, 'Revenue']}
                cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
              />
              <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status mix — donut with center total + mini-table legend.
            Donut (not full pie) so the thin ring reads as a ratio, not
            a territory. Center caption is the total booking count so
            the chart tells you "how many" at a glance. */}
        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeading size="sm" title="Status mix" subtitle="All appointments" />
          <div className="relative mt-2" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={1.5}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {statusDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.raw} />
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
            {/* Center label — total bookings. pointer-events-none so the
                donut remains hoverable through it. */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold tabular-nums text-foreground leading-none">
                {metrics.totalBookings}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Bookings
              </p>
            </div>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {statusDistribution.map(d => (
              <li key={d.name} className="flex items-center gap-3 py-2 text-xs">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.raw }} />
                <span className="flex-1 text-muted-foreground">{d.name}</span>
                <span className="tabular-nums text-muted-foreground w-10 text-right">
                  {d.pct.toFixed(1)}%
                </span>
                <span className="font-semibold tabular-nums text-foreground w-8 text-right">
                  {d.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ─── Monthly trend + top services ─── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeading size="sm" title="Revenue trend · Last 6 months" subtitle="Monthly total" />
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyRevenue} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={v => `€${v}`} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`€${v}`, 'Revenue']}
                cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeading size="sm" title="Top services by revenue" subtitle={`${services.length} services available`} />
          {topServices.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No completed appointments yet
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
                        €{s.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] tabular-nums text-muted-foreground w-12 text-right">
                        {s.count} {s.count === 1 ? 'visit' : 'visits'}
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
            <h2 className="text-sm font-bold text-foreground">Staff performance</h2>
            <p className="text-xs text-muted-foreground">Revenue and bookings per staff member</p>
          </div>
          {insights.topBarberRevenue > 0 && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              This month: <span className="text-foreground normal-case tracking-normal">{insights.topBarberName}</span> · €{insights.topBarberRevenue.toLocaleString()}
            </span>
          )}
        </div>
        {byStaff.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No staff data yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left px-5 py-2.5">Staff</th>
                <th className="text-right px-5 py-2.5">Bookings</th>
                <th className="text-right px-5 py-2.5">Revenue</th>
                <th className="text-left px-5 py-2.5 w-56">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byStaff.map((s, i) => {
                const total = byStaff.reduce((sum, x) => sum + x.revenue, 0) || 1;
                const share = (s.revenue / total) * 100;
                const isLead = i === 0 && s.revenue > 0;
                return (
                  <tr key={s.name} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold tabular-nums text-muted-foreground w-4">#{i + 1}</span>
                        <span className="font-medium text-foreground">{s.name}</span>
                        {isLead && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            lead
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-foreground">{s.bookings}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-foreground">
                      €{s.revenue.toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn('h-full', isLead ? 'bg-emerald-500' : 'bg-primary/60')} style={{ width: `${share}%` }} />
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

