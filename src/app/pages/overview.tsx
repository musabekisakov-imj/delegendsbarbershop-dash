import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi, clientsApi, staffApi, accountsApi, tenantApi } from '../lib/api';
import { TodaySummary } from '../components/overview/today-summary';
import { EmptyScheduleSlots } from '../components/overview/empty-schedule-slots';
import { NextUp } from '../components/overview/next-up';
import { ShopStatus } from '../components/shared/shop-status';
import { getShopStatus } from '../lib/overview';
import { useOfficeStore } from '../store/office-store';
import { useAuthStore } from '../store/auth-store';
import { SectionHeading } from '../components/shared/section-heading';
import { Button } from '../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { DatePickerPopover } from '../components/shared/DatePickerPopover';
import {
  CalendarDaysIcon,
  ScissorsIcon,
  PlusIcon,
  ArrowRightIcon,
  MapPinIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, startOfDay, endOfDay, isToday, differenceInMinutes, addDays, isSameDay } from 'date-fns';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { formatPrice } from '../lib/format';
import { useNavigate } from 'react-router';
import { cn } from '../components/ui/utils';
import { gradientFor, STATUS_DOT, STATUS_PILL, STATUS_LABEL, STAFF_COLORS, hashToIndex } from '../lib/tokens';
import { useT, useLanguage } from '../hooks/use-t';

// ─── Date utilities (Overview-local) ──────────────────────
// Intl-based formatter: shows weekday + month + day; adds year only if ≠ current.
function formatLongDate(date: Date, locale: string): string {
  const isCurrentYear = date.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(isCurrentYear ? {} : { year: 'numeric' }),
  }).format(date);
}

type DateContext = 'today' | 'past' | 'future';
function getDateContext(date: Date): DateContext {
  const tod = new Date(); tod.setHours(0, 0, 0, 0);
  const tgt = new Date(date); tgt.setHours(0, 0, 0, 0);
  if (tgt.getTime() === tod.getTime()) return 'today';
  if (tgt.getTime() < tod.getTime()) return 'past';
  return 'future';
}

const LOCALE_MAP: Record<string, string> = { en: 'en-US', ru: 'ru-RU', lt: 'lt-LT' };

export function OverviewPage() {
  const navigate = useNavigate();
  const officeId = useOfficeStore(s => s.currentOfficeId);
  const user = useAuthStore(s => s.user);
  const isBarber = user?.role === 'barber';
  const t = useT();
  const [language] = useLanguage();
  const intlLocale = LOCALE_MAP[language] ?? 'en-US';

  const [viewDateStr, setViewDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const viewDate = useMemo(() => {
    const d = new Date(viewDateStr + 'T12:00:00');
    return d;
  }, [viewDateStr]);
  const isViewToday = isSameDay(viewDate, new Date());
  const dateCtx = getDateContext(viewDate);

  const goPrevDay = () => setViewDateStr(format(addDays(viewDate, -1), 'yyyy-MM-dd'));
  const goNextDay = () => setViewDateStr(format(addDays(viewDate, 1), 'yyyy-MM-dd'));
  const goToToday = () => setViewDateStr(format(new Date(), 'yyyy-MM-dd'));

  // Allow up to 365 days forward on Overview (operators plan ahead)
  const MAX_FORWARD = 365;
  const daysFromToday = Math.round((viewDate.getTime() - new Date().setHours(12, 0, 0, 0)) / 86_400_000);
  const canGoForward = daysFromToday < MAX_FORWARD;

  // Keyboard shortcuts: ← → for prev/next day, T for today
  // Guard: disabled when user is typing in an input / textarea
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrevDay(); }
      else if (e.key === 'ArrowRight' && canGoForward) { e.preventDefault(); goNextDay(); }
      else if (e.key === 't' || e.key === 'T') { e.preventDefault(); goToToday(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDateStr, canGoForward]);

  // Barber-scoped view: resolve the Account for this user so we know which
  // staff record owns their schedule. Only fetched when user is a barber.
  const { data: myAccount } = useQuery({
    queryKey: ['account', user?.id],
    queryFn: () => user ? accountsApi.getById(user.id) : null,
    enabled: !!user?.id && isBarber,
  });
  const myStaffId = myAccount?.staffId;

  const { data: rawAppointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointments', officeId],
    queryFn: () => appointmentsApi.getAllWithDetails(officeId)
  });

  // Barbers only see their own bookings on Overview; owners/managers/receptionists
  // see the full shop schedule. No manual refetch — the filter is pure.
  const appointments = isBarber && myStaffId
    ? rawAppointments.filter(a => a.staffId === myStaffId)
    : rawAppointments;

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', officeId],
    queryFn: () => clientsApi.getAll(officeId)
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', officeId],
    queryFn: () => staffApi.getAll(officeId)
  });

  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => tenantApi.get(),
  });
  const workingHours = tenant?.workingHours ?? {};

  // Calculate stats
  const today = viewDate;
  const now = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  
  const todayAppointments = appointments.filter(apt => 
    isWithinInterval(parseISO(apt.startTime), { start: todayStart, end: todayEnd })
  );

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  
  const weekAppointments = appointments.filter(apt => 
    isWithinInterval(parseISO(apt.startTime), { start: weekStart, end: weekEnd }) &&
    apt.status === 'completed'
  );

  const weeklyRevenue = weekAppointments.reduce((sum, apt) => sum + apt.service.price, 0);

  const activeStaff = staff.filter(s => s.isActive).length;
  const newClientsThisWeek = clients.filter(c =>
    isWithinInterval(parseISO(c.createdAt), { start: weekStart, end: weekEnd })
  ).length;
  const prevWeekStart = addDays(weekStart, -7);
  const prevWeekEnd = addDays(weekEnd, -7);
  const newClientsLastWeek = clients.filter(c =>
    isWithinInterval(parseISO(c.createdAt), { start: prevWeekStart, end: prevWeekEnd })
  ).length;

  // Today's appointments sorted by time
  // Slice to 8 so the page doesn't become a mile long on busy days.
  // "View all" CTA on the section handles the overflow case.
  const todaysScheduleAll = todayAppointments
    .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
  const todaysSchedule = todaysScheduleAll.slice(0, 8);

  // Weekly revenue chart data
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartData = days.map((day, index) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + index);
    const dayStart = startOfDay(dayDate);
    const dayEnd = endOfDay(dayDate);
    
    const dayAppointments = appointments.filter(apt =>
      isWithinInterval(parseISO(apt.startTime), { start: dayStart, end: dayEnd }) &&
      apt.status === 'completed'
    );
    
    const revenue = dayAppointments.reduce((sum, apt) => sum + apt.service.price, 0);
    const count = dayAppointments.length;
    
    const isFutureDay = startOfDay(dayDate) > startOfDay(now);
    return { day, revenue, appointments: count, isToday: isToday(dayDate), isFuture: isFutureDay };
  });

  // STATUS_PILL / STATUS_LABEL imported from `lib/tokens` — same palette
  // as Bookings, Calendar, Accounts. Single source of truth.

  // Current office for the hero
  const offices = useOfficeStore(s => s.offices);
  const currentOffice = offices.find(o => o.id === officeId);

  // Current-in-session appointment (right now is between start and end).
  const currentApt = todayAppointments.find(a => {
    const start = parseISO(a.startTime).getTime();
    const end = parseISO(a.endTime).getTime();
    return now.getTime() >= start && now.getTime() < end
      && a.status !== 'cancelled' && a.status !== 'no_show';
  });

  // Top performer today (owner/manager view only). Who earned the most by now.
  const topByStaff = useMemo(() => {
    if (isBarber) return null;
    const sums = new Map<string, { staff: typeof todayAppointments[number]['staff']; revenue: number; bookings: number }>();
    for (const a of todayAppointments) {
      if (a.status !== 'completed') continue;
      const e = sums.get(a.staffId) ?? { staff: a.staff, revenue: 0, bookings: 0 };
      e.revenue += a.service.price;
      e.bookings += 1;
      sums.set(a.staffId, e);
    }
    return Array.from(sums.values()).sort((a, b) => b.revenue - a.revenue)[0] ?? null;
  }, [todayAppointments, isBarber]);

  // Time-of-day greeting for the hero.
  const hour = now.getHours();
  const greeting = hour < 5 ? t('overview.greetingStillUp')
    : hour < 12 ? t('overview.greetingMorning')
    : hour < 17 ? t('overview.greetingAfternoon')
    : hour < 22 ? t('overview.greetingEvening')
    : t('overview.greetingLateShift');

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* ─── Editorial hero — the date is the title ──
          Big display-size date, quiet "Today · Office · greeting" eyebrow
          above, actions right-aligned. This is the page's one confident
          visual statement. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>{isBarber ? t('overview.yourDay') : ({ today: t('overview.nav.badgeToday'), past: t('overview.nav.badgeArchive'), future: t('overview.nav.badgeUpcoming') }[dateCtx])}</span>
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
            <span className="normal-case tracking-normal">{greeting}</span>
            {dateCtx === 'today' && Object.keys(workingHours).length > 0 && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <ShopStatus {...getShopStatus(workingHours, now)} />
              </>
            )}
          </div>
          {/* ── Date navigation row ─────────────────────────────
              [<]  Sunday, May 10 📅  ● Today  [>]  [Today]
              Arrow buttons have explicit bg+border (not ghost) so
              non-technical users see immediately they're clickable.
              Status badge gives instant orientation. [Today] pill
              appears only when viewing a non-today date. */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Prev day */}
            <button
              type="button"
              onClick={goPrevDay}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm hover:bg-accent active:scale-[0.97] transition-all duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 cursor-pointer"
              aria-label={t('overview.nav.prevDay')}
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>

            {/* Date trigger → opens calendar popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="group inline-flex items-center gap-2 rounded-lg px-2 py-1 -ml-1 hover:bg-accent transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 cursor-pointer"
                  aria-label={t('overview.nav.pickDate')}
                >
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-none capitalize">
                    {formatLongDate(today, intlLocale)}
                  </h1>
                  <CalendarDaysIcon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" sideOffset={6} className="p-3 w-auto">
                <DatePickerPopover
                  value={viewDate}
                  onChange={(d) => setViewDateStr(format(d, 'yyyy-MM-dd'))}
                  locale={intlLocale}
                />
              </PopoverContent>
            </Popover>

            {/* Status badge: Today / Archive / Upcoming */}
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap',
              dateCtx === 'today'   && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
              dateCtx === 'past'    && 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
              dateCtx === 'future'  && 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
            )}>
              <span className={cn(
                'h-1.5 w-1.5 rounded-full',
                dateCtx === 'today'  && 'bg-emerald-500',
                dateCtx === 'past'   && 'bg-slate-400',
                dateCtx === 'future' && 'bg-blue-500',
              )} aria-hidden />
              {{ today: t('overview.nav.badgeToday'), past: t('overview.nav.badgeArchive'), future: t('overview.nav.badgeUpcoming') }[dateCtx]}
            </span>

            {/* Next day */}
            <button
              type="button"
              onClick={goNextDay}
              disabled={!canGoForward}
              title={!canGoForward ? t('overview.nav.nextDay') : undefined}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm hover:bg-accent active:scale-[0.97] transition-all duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
              aria-label={t('overview.nav.nextDay')}
            >
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </button>

            {/* Today shortcut — visible only when not viewing today */}
            {!isViewToday && (
              <button
                type="button"
                onClick={goToToday}
                className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground shadow-sm hover:bg-accent active:scale-[0.97] transition-all duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 cursor-pointer"
              >
                {t('overview.nav.today')}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={() => navigate('/bookings/new')}>
            <PlusIcon className="mr-1 h-4 w-4" />
            {t('overview.newBooking')}
          </Button>
        </div>
      </div>

      <TodaySummary
        todayAppointments={todayAppointments}
        allAppointments={appointments}
        viewDate={viewDate}
        language={language}
        isBarber={isBarber}
        activeStaff={activeStaff}
        totalStaff={staff.length}
        weekApptCount={weekAppointments.length}
      />

      {/* ─── Schedule + sidebar (12-col grid on lg) ──
          Left 8/12: Today's Schedule with temporal styling (past dimmed,
          current highlighted + pulsing). Right 4/12: Next up + Top barber +
          Weekly sparkline. The sidebar is the "pulse" of the day. */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Today's Schedule */}
        <div className="lg:col-span-8 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {isBarber ? t('overview.yourScheduleToday') : t('overview.todaysSchedule')}
              </h2>
              <p className="text-xs text-muted-foreground tabular-nums">
                {todaysScheduleAll.length > todaysSchedule.length
                  ? `Showing ${todaysSchedule.length} of ${todaysScheduleAll.length}`
                  : `${todaysScheduleAll.length} ${todaysScheduleAll.length === 1 ? 'appointment' : 'appointments'}`}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/bookings')}>
              {t('overview.viewAll')}
              <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          {todaysSchedule.length === 0 ? (
            <EmptyScheduleSlots
              workingHours={workingHours}
              viewDate={viewDate}
              existingAppointments={todayAppointments}
            />
          ) : (
            <ul className="divide-y divide-border">
              {todaysSchedule.map(apt => {
                const start = parseISO(apt.startTime);
                const end = parseISO(apt.endTime);
                const nowMs = now.getTime();
                const isCurrent = nowMs >= start.getTime() && nowMs < end.getTime()
                  && apt.status !== 'cancelled' && apt.status !== 'no_show';
                const isPast = end.getTime() < nowMs;
                return (
                  <li
                    key={apt.id}
                    onClick={() => navigate('/bookings')}
                    className={cn(
                      'group relative flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors',
                      'hover:bg-accent/30',
                      isCurrent && 'overview-current bg-primary/[0.04]',
                      isPast && !isCurrent && 'opacity-55',
                    )}
                  >
                    {/* Current-appointment left stripe */}
                    {isCurrent && (
                      <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-primary" />
                    )}

                    {/* Time tile */}
                    <div className={cn(
                      'flex h-10 w-14 shrink-0 flex-col items-center justify-center rounded-md text-center leading-tight',
                      isCurrent ? 'bg-primary/10' : 'bg-muted/50',
                    )}>
                      <span className={cn(
                        'text-xs font-bold tabular-nums',
                        isCurrent ? 'text-primary' : 'text-foreground',
                      )}>
                        {format(start, 'HH:mm')}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {differenceInMinutes(end, start)}m
                      </span>
                    </div>

                    {/* Avatar */}
                    <div className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white',
                      gradientFor(apt.clientId),
                    )}>
                      {apt.client.firstName[0]}{apt.client.lastName[0]}
                    </div>

                    {/* Name + service */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {apt.client.firstName} {apt.client.lastName}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
                            {t('overview.inSession')}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                        <ScissorsIcon className="h-3 w-3 shrink-0" />
                        <span className="truncate">{apt.service.name}</span>
                        {!isBarber && (
                          <>
                            <span className="text-muted-foreground/40 shrink-0">·</span>
                            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', staffDot(apt.staffId))} />
                            <span className="truncate">{apt.staff.firstName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {!isBarber && (
                      <span className="hidden sm:inline text-sm font-semibold tabular-nums text-foreground shrink-0">
                        {formatPrice(apt.service.price, language)}
                      </span>
                    )}

                    <span className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      STATUS_PILL[apt.status],
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[apt.status])} />
                      {STATUS_LABEL[apt.status]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Sidebar — Next up + Top today + mini weekly */}
        <aside className="lg:col-span-4 space-y-4">
          <NextUp
            todayAppointments={todayAppointments}
            currentApt={currentApt}
            now={now}
            language={language}
            isBarber={isBarber}
          />

          {/* Top performer (non-barber only) */}
          {!isBarber && topByStaff && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('overview.topPerformer')}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white',
                  gradientFor(topByStaff.staff.id),
                )}>
                  {topByStaff.staff.firstName[0]}{topByStaff.staff.lastName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {topByStaff.staff.firstName} {topByStaff.staff.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {topByStaff.bookings} {t('overview.bookingsCount')} · {formatPrice(topByStaff.revenue, language)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Week sparkline */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('overview.thisWeek')}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatPrice(weeklyRevenue, language)}
                {!isBarber && newClientsThisWeek > 0 && (
                  <span className="ml-1.5">
                    · +{newClientsThisWeek} {t('overview.newClients')}
                    {newClientsLastWeek > 0 && (
                      <span className={cn(
                        'ml-1',
                        newClientsThisWeek >= newClientsLastWeek ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500',
                      )}>
                        {newClientsThisWeek >= newClientsLastWeek ? '↑' : '↓'} {t('overview.vsLastWeek')}
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>
            <ResponsiveContainer width="100%" height={60}>
              <LineChart
                data={chartData.map(d => ({
                  ...d,
                  revenueActual: !d.isFuture ? d.revenue : null,
                  revenueFuture: d.isFuture || d.isToday ? d.revenue : null,
                }))}
                margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
              >
                <Line
                  type="monotone"
                  dataKey="revenueActual"
                  stroke="#16a34a"
                  strokeWidth={1.75}
                  dot={false}
                  activeDot={{ r: 3, fill: '#16a34a' }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="revenueFuture"
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number, name: string) => [formatPrice(v, language), name === 'revenueActual' ? t('overview.revenue') : t('overview.vsLastWeek')]}
                  labelFormatter={(l) => l}
                  cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
              {chartData.map(d => <span key={d.day} className={cn(d.isToday && 'text-primary font-semibold')}>{d.day}</span>)}
            </div>
          </div>
        </aside>
      </div>

      {/* ─── Charts — smaller, cleaner, no gradient fills ──
          Flat solid bars / line beat decorative gradients on a dashboard
          you stare at 5× a day. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeading title={t('overview.weeklyRevenue')} subtitle={t('overview.completedOnly')} />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  color: 'var(--popover-foreground)',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [formatPrice(value, language), t('overview.revenue')]}
                cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isFuture ? 'var(--muted)' : '#16a34a'}
                    fillOpacity={entry.isToday ? 0.65 : 1}
                  />
                ))}
              </Bar>
              {chartData.find(d => d.isToday) && (
                <ReferenceLine
                  x={chartData.find(d => d.isToday)!.day}
                  stroke="var(--primary)"
                  strokeDasharray="3 3"
                  opacity={0.4}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeading
            title={t('overview.appointmentsThisWeek')}
            subtitle={t('overview.completedPerDay')}
            action={
              <span className="text-xs tabular-nums text-muted-foreground">
                {weekAppointments.length} {t('overview.completed')}
              </span>
            }
          />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData.filter(d => !d.isFuture)} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  color: 'var(--popover-foreground)',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [value, t('overview.appointmentsTooltip')]}
                cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="appointments"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 5, fill: '#10b981' }}
              />
              {chartData.find(d => d.isToday) && (
                <ReferenceLine
                  x={chartData.find(d => d.isToday)!.day}
                  stroke="var(--primary)"
                  strokeDasharray="3 3"
                  opacity={0.4}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

function staffDot(id: string): string {
  return STAFF_COLORS[hashToIndex(id, STAFF_COLORS.length)].dot;
}

