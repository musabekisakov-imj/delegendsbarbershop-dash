import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi, clientsApi, staffApi, accountsApi } from '../lib/api';
import { useOfficeStore } from '../store/office-store';
import { useAuthStore } from '../store/auth-store';
import { SectionHeading } from '../components/shared/section-heading';
import { WelcomeCard } from '../components/shared/welcome-card';
import { Button } from '../components/ui/button';
import {
  CalendarIcon,
  CheckCircleIcon,
  ScissorsIcon,
  PlusIcon,
  ArrowRightIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, startOfDay, endOfDay, isToday, differenceInMinutes } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useNavigate } from 'react-router';
import { cn } from '../components/ui/utils';
import { gradientFor, STATUS_DOT, STATUS_PILL, STATUS_LABEL } from '../lib/tokens';

export function OverviewPage() {
  const navigate = useNavigate();
  const officeId = useOfficeStore(s => s.currentOfficeId);
  const user = useAuthStore(s => s.user);
  const isBarber = user?.role === 'barber';

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

  // Calculate stats
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  
  const todayAppointments = appointments.filter(apt => 
    isWithinInterval(parseISO(apt.startTime), { start: todayStart, end: todayEnd })
  );

  const completedToday = todayAppointments.filter(apt => apt.status === 'completed');
  const pendingToday = todayAppointments.filter(apt => apt.status === 'scheduled' || apt.status === 'confirmed');
  const noShowToday = todayAppointments.filter(apt => apt.status === 'no_show');

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  
  const weekAppointments = appointments.filter(apt => 
    isWithinInterval(parseISO(apt.startTime), { start: weekStart, end: weekEnd }) &&
    apt.status === 'completed'
  );

  const weeklyRevenue = weekAppointments.reduce((sum, apt) => sum + apt.service.price, 0);
  const todayRevenue = completedToday.reduce((sum, apt) => sum + apt.service.price, 0);

  const activeStaff = staff.filter(s => s.isActive).length;
  const newClientsThisWeek = clients.filter(c => 
    isWithinInterval(parseISO(c.createdAt), { start: weekStart, end: weekEnd })
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
    
    return { day, revenue, appointments: count, isToday: isToday(dayDate) };
  });

  // STATUS_PILL / STATUS_LABEL imported from `lib/tokens` — same palette
  // as Bookings, Calendar, Accounts. Single source of truth.

  // Current office for the hero
  const offices = useOfficeStore(s => s.offices);
  const currentOffice = offices.find(o => o.id === officeId);

  // "Next up" — the imminent appointment(s) today that haven't started yet.
  const nextUp = todayAppointments
    .filter(a => parseISO(a.startTime).getTime() > today.getTime() && a.status !== 'cancelled' && a.status !== 'completed')
    .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime())[0];
  const minutesUntilNext = nextUp ? Math.max(0, Math.ceil((parseISO(nextUp.startTime).getTime() - today.getTime()) / 60_000)) : null;

  // Current-in-session appointment (right now is between start and end).
  const currentApt = todayAppointments.find(a => {
    const start = parseISO(a.startTime).getTime();
    const end = parseISO(a.endTime).getTime();
    return today.getTime() >= start && today.getTime() < end
      && a.status !== 'cancelled' && a.status !== 'no_show';
  });

  // Day booked total (all non-cancelled, non-no-show). The "potential" of the
  // day, regardless of what's actually been completed yet.
  const dayBooked = todayAppointments
    .filter(a => a.status !== 'cancelled' && a.status !== 'no_show')
    .reduce((sum, a) => sum + a.service.price, 0);
  const dayPending = dayBooked - todayRevenue;

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
  const hour = today.getHours();
  const greeting = hour < 5 ? 'Still up'
    : hour < 12 ? 'Good morning'
    : hour < 17 ? 'Good afternoon'
    : hour < 22 ? 'Good evening'
    : 'Late shift';

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* ─── Editorial hero — the date is the title ──
          Big display-size date, quiet "Today · Office · greeting" eyebrow
          above, actions right-aligned. This is the page's one confident
          visual statement. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>{isBarber ? 'Your day' : 'Today'}</span>
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
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-none tabular-nums">
            {format(today, 'EEEE, MMMM d')}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/calendar')}>
            <CalendarIcon className="mr-1.5 h-4 w-4" />
            Calendar
          </Button>
          <Button size="sm" onClick={() => navigate('/bookings/new')}>
            <PlusIcon className="mr-1 h-4 w-4" />
            New booking
          </Button>
        </div>
      </div>

      {/* Welcome / setup checklist — auto-hides when dismissed or all 4 steps done */}
      <WelcomeCard />

      {/* ─── Hero stat + day rail ──────────────────────────
          ONE number at display size ("booked today") + the breakdown
          (earned, pending) quiet beside it + a horizontal day-rail
          showing every slot colored by status. This single block
          answers "how's today going?" in a glance. */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Hero number + rail (3/5 on lg) */}
          <div className="lg:col-span-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {isBarber ? 'Your revenue today' : 'Booked today'}
            </p>
            <div className="mt-1 flex items-baseline gap-4 flex-wrap">
              <p className="text-5xl sm:text-6xl font-bold text-foreground tabular-nums leading-none tracking-tight">
                €{(isBarber ? todayRevenue : dayBooked).toLocaleString()}
              </p>
              {!isBarber && (
                <div className="flex items-baseline gap-3 text-sm">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    €{todayRevenue.toLocaleString()} earned
                  </span>
                  {dayPending > 0 && (
                    <span className="text-muted-foreground tabular-nums">
                      · €{dayPending.toLocaleString()} pending
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Day rail — each slot proportional to service duration */}
            {todaysScheduleAll.length > 0 ? (
              <div className="mt-5">
                <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-muted">
                  {todaysScheduleAll.map(apt => {
                    const minutes = differenceInMinutes(parseISO(apt.endTime), parseISO(apt.startTime));
                    const color =
                      apt.status === 'completed' ? 'bg-emerald-500'
                      : apt.status === 'cancelled' ? 'bg-muted-foreground/25'
                      : apt.status === 'no_show' ? 'bg-amber-500'
                      : apt.status === 'confirmed' ? 'bg-primary'
                      : 'bg-primary/40';
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
                  <RailLegend color="bg-primary" label="Confirmed" count={todayAppointments.filter(a => a.status === 'confirmed').length} />
                  <RailLegend color="bg-primary/40" label="Scheduled" count={todayAppointments.filter(a => a.status === 'scheduled').length} />
                  {noShowToday.length > 0 && <RailLegend color="bg-amber-500" label="No-show" count={noShowToday.length} />}
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">No bookings today — your schedule is clear.</p>
            )}
          </div>

          {/* Supporting stats (2/5 on lg, divider on lg+) */}
          <div className="grid grid-cols-3 gap-4 lg:col-span-2 lg:grid-cols-1 lg:gap-3 lg:pl-7 lg:border-l lg:border-border lg:justify-self-stretch">
            <HeroStat
              label="Bookings"
              value={todayAppointments.length}
              sub={pendingToday.length > 0 ? `${pendingToday.length} pending` : undefined}
            />
            <HeroStat
              label={isBarber ? 'Your clients' : 'Unique clients'}
              value={isBarber
                ? new Set(appointments.map(a => a.clientId)).size
                : new Set(todayAppointments.map(a => a.clientId)).size}
              sub={isBarber ? 'lifetime' : 'today'}
            />
            <HeroStat
              label={isBarber ? 'This week' : 'Staff on'}
              value={isBarber ? weekAppointments.length : activeStaff}
              sub={isBarber ? 'completed' : `of ${staff.length}`}
            />
          </div>
        </div>
      </div>

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
                {isBarber ? 'Your schedule today' : "Today's schedule"}
              </h2>
              <p className="text-xs text-muted-foreground tabular-nums">
                {todaysScheduleAll.length > todaysSchedule.length
                  ? `Showing ${todaysSchedule.length} of ${todaysScheduleAll.length}`
                  : `${todaysScheduleAll.length} ${todaysScheduleAll.length === 1 ? 'appointment' : 'appointments'}`}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/bookings')}>
              View all
              <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          {todaysSchedule.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                <CalendarIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Your day is clear</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-4">No appointments today — enjoy the quiet or add a booking.</p>
              <Button size="sm" onClick={() => navigate('/bookings/new')}>
                <PlusIcon className="mr-1 h-4 w-4" />
                New booking
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {todaysSchedule.map(apt => {
                const start = parseISO(apt.startTime);
                const end = parseISO(apt.endTime);
                const now = today.getTime();
                const isCurrent = now >= start.getTime() && now < end.getTime()
                  && apt.status !== 'cancelled' && apt.status !== 'no_show';
                const isPast = end.getTime() < now;
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
                            in session
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                        <ScissorsIcon className="h-3 w-3 shrink-0" />
                        <span className="truncate">{apt.service.name}</span>
                        {!isBarber && (
                          <>
                            <span className="text-muted-foreground/40 shrink-0">·</span>
                            <span className="truncate">with {apt.staff.firstName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {!isBarber && (
                      <span className="hidden sm:inline text-sm font-semibold tabular-nums text-foreground shrink-0">
                        €{apt.service.price}
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
          {/* Next Up card */}
          <div className={cn(
            'rounded-2xl border bg-card p-5 transition-colors',
            nextUp && minutesUntilNext !== null && minutesUntilNext <= 10
              ? 'border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20'
              : 'border-border',
          )}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {currentApt ? 'In session now' : 'Next up'}
            </p>
            {currentApt ? (
              <div className="mt-2">
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {format(parseISO(currentApt.startTime), 'HH:mm')}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    → {format(parseISO(currentApt.endTime), 'HH:mm')}
                  </span>
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground truncate">
                  {currentApt.client.firstName} {currentApt.client.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentApt.service.name} · with {currentApt.staff.firstName}
                </p>
              </div>
            ) : nextUp && minutesUntilNext !== null ? (
              <div className="mt-2">
                <p className={cn(
                  'text-3xl font-bold tabular-nums leading-none',
                  minutesUntilNext <= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
                )}>
                  {minutesUntilNext === 0 ? 'now' : `${minutesUntilNext} min`}
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground truncate">
                  {format(parseISO(nextUp.startTime), 'HH:mm')} · {nextUp.client.firstName} {nextUp.client.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {nextUp.service.name} · with {nextUp.staff.firstName}
                </p>
                {minutesUntilNext <= 10 && (
                  <button
                    type="button"
                    onClick={() => navigate('/bookings')}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    Open booking
                    <ArrowRightIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No more appointments today.</p>
            )}
          </div>

          {/* Top performer (non-barber only) */}
          {!isBarber && topByStaff && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Top performer today
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
                    {topByStaff.bookings} {topByStaff.bookings === 1 ? 'booking' : 'bookings'} · €{topByStaff.revenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Week sparkline */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                This week
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                €{weeklyRevenue.toLocaleString()}
                {!isBarber && newClientsThisWeek > 0 && (
                  <span className="ml-1.5">· +{newClientsThisWeek} new {newClientsThisWeek === 1 ? 'client' : 'clients'}</span>
                )}
              </p>
            </div>
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
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
          <SectionHeading title="Weekly revenue" subtitle="Completed bookings only" />
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
                formatter={(value: number) => [`€${value}`, 'Revenue']}
                cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
              />
              <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeading
            title="Appointments this week"
            subtitle="Completed per day"
            action={
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                <CheckCircleIcon className="h-3 w-3" />
                {weekAppointments.length}
              </span>
            }
          />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
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
                formatter={(value: number) => [value, 'Appointments']}
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
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

// ─── Hero stat (quiet, uppercase label + big tabular number + optional sub) ──
function HeroStat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground leading-none">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground tabular-nums truncate">{sub}</p>}
    </div>
  );
}

// Legend item under the day-progress rail.
function RailLegend({ color, label, count }: { color: string; label: string; count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span>{label} <span className="text-foreground font-semibold">{count}</span></span>
    </span>
  );
}