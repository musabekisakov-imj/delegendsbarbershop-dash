import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi, clientsApi, staffApi, productsApi } from '../lib/api';
import { useOfficeStore } from '../store/office-store';
import { SectionHeading } from '../components/shared/section-heading';
import {
  ArrowTrendingUpIcon,
  ArrowDownTrayIcon,
  MapPinIcon,
  PrinterIcon,
  CalendarDaysIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';
import {
  format, parseISO, startOfMonth, subMonths, eachDayOfInterval, eachHourOfInterval,
  eachMonthOfInterval, startOfDay, endOfDay, differenceInDays,
} from 'date-fns';
import { cn } from '../components/ui/utils';
import { useT, useLanguage } from '../hooks/use-t';
import { formatPrice } from '../lib/format';
import { exportCsv } from '../lib/csv';
import { aptTotal } from '../lib/overview';
import { PeriodNavigator } from '../components/analytics/date-range-selector';
import { PageHeader } from '../components/shared/page-header';
import { getPeriodRange, getPreviousPeriod, bucketUnit, formatPeriodLabel } from '../lib/date-range';
import type { Granularity } from '../lib/date-range';
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

const LOCALE_MAP: Record<string, string> = { en: 'en-US', ru: 'ru-RU', lt: 'lt-LT' };

export function AnalyticsPage() {
  const t = useT();
  const [language] = useLanguage();
  const intlLocale = LOCALE_MAP[language] ?? 'en-US';
  const officeId = useOfficeStore(s => s.currentOfficeId);

  const [granularity, setGranularity] = useState<Granularity>('month');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [tab, setTab] = useState<'performance' | 'services' | 'staff' | 'products'>('performance');

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
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
  });

  // ── Date range derivation ──
  const { rangeStart, rangeEnd, compStart } = useMemo(() => {
    const range = getPeriodRange(granularity, anchor);
    const prev = getPreviousPeriod(granularity, anchor);
    return { rangeStart: range.start, rangeEnd: range.end, compStart: prev.start };
  }, [granularity, anchor]);

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

    const revenueCurrent = completed.reduce((s, a) => s + aptTotal(a), 0);
    const revenuePrev = prevCompleted.reduce((s, a) => s + aptTotal(a), 0);
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

  // ── Revenue series — bucketed by range span ──
  // ≤2 days → hourly, ≤120 days → daily, else monthly. One aggregation
  // pass into a Map keyed by the bucket's format string, then we walk the
  // interval so empty buckets still render as zero-height bars.
  const unit = bucketUnit(granularity);
  const bucketFmt = unit === 'hour' ? 'yyyy-MM-dd-HH'
    : unit === 'day' ? 'yyyy-MM-dd' : 'yyyy-MM';

  const chartData = useMemo(() => {
    const rs = rangeStart.getTime();
    const re = rangeEnd.getTime();
    const revByKey = new Map<string, number>();
    appointments.forEach(a => {
      if (a.status !== 'completed') return;
      const d = parseISO(a.startTime);
      const ts = d.getTime();
      if (ts < rs || ts > re) return;
      const k = format(d, bucketFmt);
      revByKey.set(k, (revByKey.get(k) ?? 0) + aptTotal(a));
    });

    const interval = { start: rangeStart, end: rangeEnd };
    const points = unit === 'hour' ? eachHourOfInterval(interval)
      : unit === 'day' ? eachDayOfInterval(interval)
      : eachMonthOfInterval(interval);

    return points.map(p => {
      const dateKey = format(p, bucketFmt);
      const date = unit === 'hour'
        ? format(p, 'HH:00')
        : unit === 'month'
        ? new Intl.DateTimeFormat(intlLocale, { month: 'short', year: '2-digit' }).format(p)
        : new Intl.DateTimeFormat(intlLocale, { month: 'short', day: 'numeric' }).format(p);
      return { date, dateKey, revenue: revByKey.get(dateKey) ?? 0 };
    });
  }, [appointments, rangeStart, rangeEnd, unit, bucketFmt, intlLocale]);

  // The bucket that contains "now" — marked on the bar chart with a reference line.
  const nowKey = useMemo(() => format(new Date(), bucketFmt), [bucketFmt]);

  // ── Monthly revenue — always last 6 months (trend, not range-scoped) ──
  const monthlyRevenue = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
    return months.map(m => {
      const ym = format(m, 'yyyy-MM');
      const sum = appointments
        .filter(a => a.status === 'completed' && format(parseISO(a.startTime), 'yyyy-MM') === ym)
        .reduce((s, a) => s + aptTotal(a), 0);
      return {
        month: new Intl.DateTimeFormat(intlLocale, { month: 'short' }).format(m),
        revenue: sum,
      };
    });
  }, [appointments, intlLocale]);

  // ── Service performance — every service with completed bookings in range ──
  // Share is computed against the range total (slices sum to 100%), avg ticket
  // is per-completed-visit. Sorted by revenue so the leader sits on top.
  const serviceStats = useMemo(() => {
    const rs = rangeStart.getTime();
    const re = rangeEnd.getTime();
    const byService = new Map<string, { name: string; revenue: number; count: number }>();
    appointments.forEach(a => {
      if (a.status !== 'completed') return;
      const ts = parseISO(a.startTime).getTime();
      if (ts < rs || ts > re) return;
      const existing = byService.get(a.serviceId) ?? { name: a.service?.name ?? '—', revenue: 0, count: 0 };
      existing.revenue += aptTotal(a);
      existing.count += 1;
      byService.set(a.serviceId, existing);
    });
    const ranked = Array.from(byService.values()).sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = ranked.reduce((s, r) => s + r.revenue, 0);
    const totalCount = ranked.reduce((s, r) => s + r.count, 0);
    return {
      rows: ranked.map(r => ({
        ...r,
        avgTicket: r.count > 0 ? r.revenue / r.count : 0,
        share: totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0,
      })),
      totalRevenue,
      totalCount,
    };
  }, [appointments, rangeStart, rangeEnd]);

  // ── Staff performance — joins staff roster with completed bookings in range ──
  // Seeded from the roster first so idle barbers still surface (zero revenue).
  const staffStats = useMemo(() => {
    const rs = rangeStart.getTime();
    const re = rangeEnd.getTime();
    const m = new Map<string, { id: string; name: string; avatarUrl?: string; revenue: number; bookings: number }>();
    staff.forEach(s => m.set(s.id, {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      avatarUrl: s.avatarUrl,
      revenue: 0,
      bookings: 0,
    }));
    appointments.forEach(a => {
      if (a.status !== 'completed') return;
      const ts = parseISO(a.startTime).getTime();
      if (ts < rs || ts > re) return;
      const entry = m.get(a.staffId);
      if (!entry) return;
      entry.revenue += aptTotal(a);
      entry.bookings += 1;
    });
    const ranked = Array.from(m.values()).sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = ranked.reduce((s, r) => s + r.revenue, 0);
    const totalBookings = ranked.reduce((s, r) => s + r.bookings, 0);
    return {
      rows: ranked.map(r => ({
        ...r,
        avgTicket: r.bookings > 0 ? r.revenue / r.bookings : 0,
        share: totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0,
      })),
      totalRevenue,
      totalBookings,
    };
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
    const potential = upcoming.reduce((s, a) => s + aptTotal(a), 0);
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
      prev.revenue += aptTotal(a);
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

  // ── Product inventory snapshot (catalog-wide, not range-scoped) ──
  // Products are sold through the website, not booked — so analytics here is
  // inventory health (value on hand, low/out-of-stock) rather than sales.
  const productStats = useMemo(() => {
    const units = products.reduce((s, p) => s + Math.max(p.stock, 0), 0);
    const inventoryValue = products.reduce((s, p) => s + p.price * Math.max(p.stock, 0), 0);
    return {
      totalProducts: products.length,
      units,
      inventoryValue,
      outOfStock: products.filter(p => p.stock <= 0).length,
      lowStock: products.filter(p => p.stock > 0 && p.stock <= 5).length,
    };
  }, [products]);

  const productsByCategory = useMemo(() => {
    const cats = ['hair-care', 'face-body', 'beards', 'hairdressing-supplies'] as const;
    return cats
      .map(key => {
        const inCat = products.filter(p => p.category === key);
        return {
          key,
          count: inCat.length,
          value: inCat.reduce((s, p) => s + p.price * Math.max(p.stock, 0), 0),
        };
      })
      .filter(c => c.count > 0)
      .sort((a, b) => b.value - a.value);
  }, [products]);

  // ── Restock list — out-of-stock first, then low (≤5), most urgent on top ──
  const lowStockProducts = useMemo(() =>
    products
      .filter(p => p.stock <= 5)
      .map(p => ({ ...p, lowStatus: (p.stock <= 0 ? 'out' : 'low') as 'out' | 'low' }))
      .sort((a, b) => a.stock - b.stock),
  [products]);

  const offices = useOfficeStore(s => s.offices);
  const currentOffice = offices.find(o => o.id === officeId);

  const rangeLabel = formatPeriodLabel(granularity, anchor, intlLocale);
  const chartTitleKey: TranslationKey = unit === 'hour'
    ? 'analytics.hourlyRevenue'
    : unit === 'month'
    ? 'analytics.monthlyRevenue'
    : 'analytics.dailyRevenue';
  const generatedAt = new Intl.DateTimeFormat(intlLocale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
  const asOf = new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit' }).format(new Date());
  const handlePrint = () => window.print();

  // ── CSV export — exports the active tab's data as raw numbers (no currency
  // glyphs or locale separators) so spreadsheets can compute on it. Headers
  // are translated; the filename carries the tab + range for at-a-glance ID. ──
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const slug = `${tab}-${format(rangeStart, 'yyyy-MM-dd')}_${format(rangeEnd, 'yyyy-MM-dd')}`;

  const canExport =
    tab === 'performance' ? chartData.some(d => d.revenue > 0)
    : tab === 'services' ? serviceStats.rows.length > 0
    : tab === 'staff' ? staffStats.rows.length > 0
    : products.length > 0;

  const handleExport = () => {
    if (tab === 'performance') {
      exportCsv(`analytics-${slug}`, chartData, [
        { key: 'date', header: t('analytics.export.period') },
        { key: d => round2(d.revenue), header: t('analytics.col.revenue') },
      ]);
    } else if (tab === 'services') {
      exportCsv(`analytics-${slug}`, serviceStats.rows, [
        { key: 'name', header: t('analytics.export.service') },
        { key: r => round2(r.revenue), header: t('analytics.col.revenue') },
        { key: 'count', header: t('analytics.visits') },
        { key: r => round2(r.avgTicket), header: t('analytics.avgTicket') },
        { key: r => round2(r.share), header: `${t('analytics.col.share')} %` },
      ]);
    } else if (tab === 'staff') {
      exportCsv(`analytics-${slug}`, staffStats.rows, [
        { key: 'name', header: t('analytics.col.staff') },
        { key: r => round2(r.revenue), header: t('analytics.col.revenue') },
        { key: 'bookings', header: t('analytics.col.bookings') },
        { key: r => round2(r.avgTicket), header: t('analytics.avgTicket') },
        { key: r => round2(r.share), header: `${t('analytics.col.share')} %` },
      ]);
    } else {
      const rows = products
        .map(p => ({ ...p, inventoryValue: p.price * Math.max(p.stock, 0) }))
        .sort((a, b) => b.inventoryValue - a.inventoryValue);
      exportCsv(`analytics-products-${format(rangeEnd, 'yyyy-MM-dd')}`, rows, [
        { key: 'name', header: t('analytics.export.product') },
        { key: 'brand', header: t('analytics.export.brand') },
        { key: p => t(`products.category.${p.category}` as TranslationKey), header: t('analytics.export.category') },
        { key: 'stock', header: t('analytics.export.stock') },
        { key: p => round2(p.price), header: t('analytics.export.price') },
        { key: p => round2(p.inventoryValue), header: t('analytics.products.inventoryValue') },
        {
          key: p => p.stock <= 0
            ? t('analytics.products.outOfStock')
            : p.stock <= 5 ? t('analytics.products.lowStock') : t('analytics.export.inStock'),
          header: t('analytics.export.status'),
        },
      ]);
    }
  };

  const serviceAvgTicket = serviceStats.totalCount > 0
    ? serviceStats.totalRevenue / serviceStats.totalCount
    : 0;
  const serviceLeader = serviceStats.rows[0] ?? null;
  const activeServiceCount = serviceStats.rows.filter(s => s.count > 0).length;
  const staffAvgTicket = staffStats.totalBookings > 0
    ? staffStats.totalRevenue / staffStats.totalBookings
    : 0;
  const staffLeader = staffStats.rows[0] ?? null;
  const activeStaffCount = staffStats.rows.filter(s => s.bookings > 0).length;
  const stockRiskPct = productStats.totalProducts > 0
    ? ((productStats.lowStock + productStats.outOfStock) / productStats.totalProducts) * 100
    : 0;
  const topInventoryProducts = products
    .map(p => ({ ...p, inventoryValue: p.price * Math.max(p.stock, 0) }))
    .sort((a, b) => b.inventoryValue - a.inventoryValue)
    .slice(0, 5);

  return (
    <div id="analytics-print" className="space-y-6">

      {/* ─── Print-only report header ──
          Screen-hidden; surfaces on paper so the printout is self-describing:
          shop name, which view, the date range, and when it was generated. */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold text-foreground">{t('analytics.printReport')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentOffice ? `${currentOffice.name} · ` : ''}
          {t(`analytics.tab.${tab}` as Parameters<typeof t>[0])} · {rangeLabel}
        </p>
        <p className="text-xs text-muted-foreground">{t('analytics.generated')}: {generatedAt}</p>
      </div>

      {/* ─── Eyebrow + h1 + range selector ── */}
      <PageHeader
        eyebrow={(
          <>
            <span>{t('analytics.eyebrow')}</span>
            {currentOffice && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium normal-case tracking-normal text-foreground shadow-sm">
                <MapPinIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {currentOffice.name}
              </span>
            )}
            {tab !== 'products' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium normal-case tracking-normal text-muted-foreground capitalize">
                <CalendarDaysIcon className="h-3.5 w-3.5" />
                {rangeLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 normal-case tracking-normal font-medium text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              {t('analytics.asOf')} {asOf}
            </span>
          </>
        )}
        title={t('analytics.heroTitle')}
        action={(
          <div className="flex items-center gap-2 print:hidden">
            <PeriodNavigator
              granularity={granularity}
              anchor={anchor}
              onGranularityChange={setGranularity}
              onAnchorChange={setAnchor}
              locale={intlLocale}
            />
            <button
              type="button"
              onClick={handleExport}
              disabled={!canExport}
              aria-label={t('analytics.export')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card disabled:hover:text-muted-foreground"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t('analytics.export')}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              aria-label={t('analytics.print')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <PrinterIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t('analytics.print')}</span>
            </button>
          </div>
        )}
      />

      {/* ─── View toggle: performance vs product inventory ── */}
      <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1 print:hidden">
        {(['performance', 'services', 'staff', 'products'] as const).map(k => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
              tab === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`analytics.tab.${k}` as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      {tab === 'performance' && (
      <>
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
              <LineChart data={chartData} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
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
          <SectionHeading size="sm" title={`${t(chartTitleKey)} · ${rangeLabel}`} subtitle={t('analytics.completedOnly')} />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="var(--muted-foreground)"
                fontSize={10}
                interval={Math.max(0, Math.ceil(chartData.length / 8) - 1)}
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
              {chartData.some(d => d.dateKey === nowKey) && (
                <ReferenceLine
                  x={chartData.find(d => d.dateKey === nowKey)!.date}
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

      {/* ─── Monthly revenue trend ─── */}
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
      </>
      )}

      {/* ─── Services ─── */}
      {tab === 'services' && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
            <div>
              <h2 className="text-sm font-bold text-foreground">{t('analytics.topServices')}</h2>
              <p className="text-xs text-muted-foreground">{t('analytics.servicesSubtitle')} · {rangeLabel}</p>
            </div>
            {serviceStats.totalRevenue > 0 && (
              <div className="text-right">
                <p className="text-lg font-bold leading-none tabular-nums text-foreground">
                  {formatPrice(serviceStats.totalRevenue, language)}
                </p>
                <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                  {serviceStats.totalCount} {serviceStats.totalCount === 1 ? t('analytics.visit') : t('analytics.visits')}
                </p>
              </div>
            )}
          </div>
          {serviceStats.rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t('analytics.noCompleted')}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                <TickerStat
                  label={t('analytics.revenueLabel')}
                  value={formatPrice(Math.round(serviceStats.totalRevenue), language)}
                  sub={rangeLabel}
                />
                <TickerStat
                  label={t('analytics.visits')}
                  value={serviceStats.totalCount.toString()}
                  sub={`${serviceStats.rows.length} ${t('analytics.servicesAvailable')}`}
                />
                <TickerStat
                  label={t('analytics.avgTicket')}
                  value={formatPrice(Math.round(serviceAvgTicket), language)}
                  sub={t('analytics.ticker.perVisit')}
                />
              </div>
              {serviceLeader && (
                <div className="grid gap-4 border-b border-border px-5 py-4 lg:grid-cols-3">
                  <InsightCell
                    label={t('analytics.services.leader')}
                    value={serviceLeader.name}
                    sub={`${formatPrice(serviceLeader.revenue, language)} · ${serviceLeader.count} ${serviceLeader.count === 1 ? t('analytics.visit') : t('analytics.visits')}`}
                  />
                  <InsightCell
                    label={t('analytics.services.mix')}
                    value={`${activeServiceCount}/${serviceStats.rows.length}`}
                    sub={t('analytics.servicesAvailable')}
                  />
                  <InsightCell
                    label={t('analytics.services.concentration')}
                    value={`${serviceLeader.share.toFixed(1)}%`}
                    sub={t('analytics.col.share')}
                    tone={serviceLeader.share > 55 ? 'warn' : undefined}
                  />
                </div>
              )}
              <ul className="divide-y divide-border">
                {serviceStats.rows.map((s, i) => {
                  const isLead = i === 0 && s.revenue > 0;
                  return (
                    <li
                      key={s.name}
                      className={cn('px-5 py-3.5 transition-colors hover:bg-accent/30', isLead && 'bg-emerald-500/[0.04]')}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums',
                          isLead ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground',
                        )}>
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">{s.name}</span>
                            {isLead && (
                              <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/10 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                {t('analytics.lead')}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                            {s.count} {s.count === 1 ? t('analytics.visit') : t('analytics.visits')} · {t('analytics.avgTicket')} {formatPrice(Math.round(s.avgTicket), language)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums text-foreground">{formatPrice(s.revenue, language)}</p>
                          <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">{s.share.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full rounded-full', isLead ? 'bg-emerald-500' : 'bg-emerald-500/40')}
                          style={{ width: `${s.share}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}

      {/* ─── Staff ─── */}
      {tab === 'staff' && (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-3.5">
          <div>
            <h2 className="text-sm font-bold text-foreground">{t('analytics.staffPerformance')}</h2>
            <p className="text-xs text-muted-foreground">{t('analytics.staffSubtitle')} · {rangeLabel}</p>
          </div>
          {staffStats.totalRevenue > 0 && (
            <div className="text-right">
              <p className="text-lg font-bold leading-none tabular-nums text-foreground">
                {formatPrice(staffStats.totalRevenue, language)}
              </p>
              <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                {staffStats.totalBookings} {t('analytics.col.bookings').toLowerCase()}
              </p>
            </div>
          )}
        </div>
        {staffStats.rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
            {t('analytics.noStaffData')}
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="grid grid-cols-3 divide-x divide-border">
                <TickerStat
                  label={t('analytics.col.revenue')}
                  value={formatPrice(Math.round(staffStats.totalRevenue), language)}
                  sub={rangeLabel}
                />
                <TickerStat
                  label={t('analytics.col.bookings')}
                  value={staffStats.totalBookings.toString()}
                  sub={`${staffStats.rows.length} ${t('analytics.col.staff').toLowerCase()}`}
                />
                <TickerStat
                  label={t('analytics.avgTicket')}
                  value={formatPrice(Math.round(staffAvgTicket), language)}
                  sub={t('analytics.ticker.perVisit')}
                />
              </div>
            </div>
            {staffLeader && (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="grid gap-4 px-5 py-4 lg:grid-cols-3">
                  <InsightCell
                    label={t('analytics.staff.leader')}
                    value={staffLeader.name || '—'}
                    sub={`${formatPrice(staffLeader.revenue, language)} · ${staffLeader.bookings} ${t('analytics.col.bookings').toLowerCase()}`}
                  />
                  <InsightCell
                    label={t('analytics.staff.active')}
                    value={`${activeStaffCount}/${staffStats.rows.length}`}
                    sub={t('staff.onDuty')}
                  />
                  <InsightCell
                    label={t('analytics.staff.contribution')}
                    value={`${staffLeader.share.toFixed(1)}%`}
                    sub={t('analytics.col.share')}
                    tone={staffLeader.share > 60 ? 'warn' : undefined}
                  />
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {staffStats.rows.map((s, i) => {
                const isLead = i === 0 && s.revenue > 0;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      'rounded-xl border bg-card p-4 transition-colors',
                      isLead ? 'border-emerald-500/40' : 'border-border hover:border-muted-foreground/30',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <StaffAvatar name={s.name} avatarUrl={s.avatarUrl} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-foreground">{s.name || '—'}</span>
                          {isLead && (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/10 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              {t('analytics.lead')}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] tabular-nums text-muted-foreground">
                          #{i + 1} · {s.share.toFixed(0)}% {t('analytics.col.share').toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                      <div>
                        <p className="text-sm font-bold tabular-nums text-foreground">{formatPrice(s.revenue, language)}</p>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{t('analytics.col.revenue')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold tabular-nums text-foreground">{s.bookings}</p>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{t('analytics.col.bookings')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold tabular-nums text-foreground">{formatPrice(Math.round(s.avgTicket), language)}</p>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{t('analytics.avgTicket')}</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', isLead ? 'bg-emerald-500' : 'bg-blue-500/40')}
                        style={{ width: `${s.share}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      )}

      {/* ─── Products & inventory ─── */}
      {tab === 'products' && (
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-bold text-foreground">{t('analytics.products.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('analytics.products.subtitle')}</p>
        </div>
        {products.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">{t('analytics.products.empty')}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0 lg:grid-cols-5">
              <TickerStat
                label={t('analytics.products.inventoryValue')}
                value={formatPrice(Math.round(productStats.inventoryValue), language)}
                sub={`${productStats.units} ${t('analytics.products.units')}`}
              />
              <TickerStat label={t('analytics.products.totalProducts')} value={productStats.totalProducts.toString()} />
              <TickerStat label={t('analytics.products.unitsInStock')} value={productStats.units.toString()} />
              <TickerStat
                label={t('analytics.products.lowStock')}
                value={productStats.lowStock.toString()}
                tone={productStats.lowStock > 0 ? 'warn' : undefined}
              />
              <TickerStat
                label={t('analytics.products.outOfStock')}
                value={productStats.outOfStock.toString()}
                tone={productStats.outOfStock > 0 ? 'warn' : undefined}
              />
            </div>
            <div className="grid gap-5 p-5 lg:grid-cols-2">
              <div>
                <SectionHeading size="sm" title={t('analytics.products.byCategory')} />
                <ul className="mt-1 space-y-2.5">
                  {productsByCategory.map(c => {
                    const max = productsByCategory[0].value || 1;
                    const pct = (c.value / max) * 100;
                    return (
                      <li key={c.key}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            {t(`products.category.${c.key}` as Parameters<typeof t>[0])}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {formatPrice(c.value, language)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-sky-500/80" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-16 text-right text-[11px] tabular-nums text-muted-foreground">
                            {c.count} {c.count === 1 ? t('products.hero.itemOne') : t('products.hero.itemMany')}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <SectionHeading
                  size="sm"
                  title={t('analytics.products.healthTitle')}
                  subtitle={`${stockRiskPct.toFixed(0)}% ${t('analytics.products.stockRisk')}`}
                />
                <ul className="mt-1 divide-y divide-border">
                  {topInventoryProducts.map(p => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <CubeIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {p.stock} {t('analytics.products.units')} · {formatPrice(p.price, language)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                        {formatPrice(Math.round(p.inventoryValue), language)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {lowStockProducts.length > 0 && (
              <div className="border-t border-border p-5">
                <SectionHeading
                  size="sm"
                  title={t('analytics.products.restockTitle')}
                  subtitle={t('analytics.products.restockSubtitle')}
                />
                <ul className="mt-1 divide-y divide-border">
                  {lowStockProducts.map(p => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <CubeIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {p.brand} · {t(`products.category.${p.category}` as Parameters<typeof t>[0])}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                        {formatPrice(p.price, language)}
                      </span>
                      <span className={cn(
                        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider tabular-nums',
                        p.lowStatus === 'out'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                      )}>
                        {p.lowStatus === 'out'
                          ? t('analytics.products.outOfStock')
                          : `${p.stock} ${t('analytics.products.left')}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
      )}
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

function InsightCell({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'warn';
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={cn(
        'mt-1 truncate text-lg font-bold tabular-nums leading-none',
        tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
      )}>
        {value}
      </p>
      {sub && <p className="mt-1 truncate text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Staff avatar — photo when available, gradient initials fallback ──
function StaffAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase() || '—';

  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-accent text-xs font-bold text-muted-foreground">
      {initials}
    </div>
  );
}
