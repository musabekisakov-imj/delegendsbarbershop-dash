// Notifications bell — header surface that derives signals from existing
// data (appointments, accounts, clients) rather than a backend events table.
//
// Three sections, in priority order:
//   1. UPCOMING        — appointments starting in next 30 min (today only)
//   2. NEEDS ATTENTION — today's no-shows + cancellations + pending invites
//   3. TODAY'S ACTIVITY — bookings + clients created today
//
// Read state is per-user in localStorage (`barberpro_notif_seen_<userId>` =
// ISO timestamp). The bell shows an unread dot when at least one item has a
// `createdAt` newer than that timestamp. "Mark all read" sets it to now.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  BellIcon, ClockIcon, ExclamationTriangleIcon, SparklesIcon,
  ScissorsIcon, UserPlusIcon, EnvelopeIcon, CheckIcon,
} from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import {
  formatDistanceToNow, parseISO, differenceInMinutes,
  isToday, startOfDay, endOfDay, isWithinInterval,
} from 'date-fns';

import { appointmentsApi, accountsApi, clientsApi } from '../lib/api';
import { useAuthStore } from '../store/auth-store';
import { useOfficeStore } from '../store/office-store';
import { usePermission } from '../hooks/use-permission';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  AVATAR_GRADIENTS, hashToIndex,
  STATUS_DOT, MOTION_EASE, MOTION_DUR,
} from '../lib/tokens';
import { cn } from './ui/utils';

const SEEN_KEY = (userId: string) => `barberpro_notif_seen_${userId}`;

// Read the lastSeenAt timestamp from localStorage. Defaults to epoch so
// every existing item counts as unread on first load — that's intentional:
// a fresh user opening the app should see the dot.
function readLastSeen(userId: string): number {
  try {
    const raw = localStorage.getItem(SEEN_KEY(userId));
    if (!raw) return 0;
    const n = Date.parse(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeLastSeen(userId: string, ts: number) {
  try {
    localStorage.setItem(SEEN_KEY(userId), new Date(ts).toISOString());
  } catch {
    // localStorage is full or disabled — failing silently is fine, the dot
    // just stays on until the next attempt.
  }
}

export function NotificationsBell() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const userId = useAuthStore(s => s.user?.id) ?? '';
  const officeId = useOfficeStore(s => s.currentOfficeId);
  const { can } = usePermission();
  const canSeeInvites = can('accounts.view');

  // Re-renders force a fresh read of localStorage. We track via a tick state
  // bumped on "Mark all read" so the unread dot updates without remounting.
  const [seenTick, setSeenTick] = useState(0);
  const lastSeen = useMemo(() => readLastSeen(userId), [userId, seenTick]);

  // ── Data sources — only what we actually render below ──
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', officeId, 'with-details'],
    queryFn: () => appointmentsApi.getAllWithDetails(officeId),
    refetchInterval: 60_000, // re-evaluate "next 30 min" every minute
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', officeId],
    queryFn: () => clientsApi.getAll(officeId),
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAll,
    enabled: canSeeInvites,
  });

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // ── 1. UPCOMING — next 30 min, scheduled or confirmed ──
  const upcoming = useMemo(() => {
    return appointments
      .filter(a => {
        if (a.status === 'cancelled' || a.status === 'completed' || a.status === 'no_show') return false;
        const start = parseISO(a.startTime);
        const mins = differenceInMinutes(start, now);
        return mins >= 0 && mins <= 30;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments]);

  // ── 2. NEEDS ATTENTION — today's no-shows + cancellations + pending invites
  const noShows = useMemo(() => {
    return appointments.filter(a => {
      if (a.status !== 'no_show') return false;
      return isWithinInterval(parseISO(a.startTime), { start: todayStart, end: todayEnd });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments]);

  const cancelledToday = useMemo(() => {
    return appointments.filter(a => {
      if (a.status !== 'cancelled') return false;
      return isWithinInterval(parseISO(a.startTime), { start: todayStart, end: todayEnd });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments]);

  const pendingInvites = useMemo(
    () => canSeeInvites ? accounts.filter(a => a.status === 'invited') : [],
    [accounts, canSeeInvites],
  );

  // ── 3. TODAY'S ACTIVITY — items CREATED today (not scheduled today) ──
  const newBookingsToday = useMemo(() => {
    return appointments
      .filter(a => isToday(parseISO(a.createdAt)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [appointments]);

  const newClientsToday = useMemo(() => {
    return clients
      .filter(c => isToday(parseISO(c.createdAt)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [clients]);

  // Unread count — anything with a `createdAt` newer than lastSeen.
  // Pending invites use their own `createdAt` too. Upcoming intentionally
  // doesn't count toward unread; it's always relevant.
  const unreadCount = useMemo(() => {
    let n = 0;
    for (const a of newBookingsToday) if (Date.parse(a.createdAt) > lastSeen) n++;
    for (const c of newClientsToday) if (Date.parse(c.createdAt) > lastSeen) n++;
    for (const inv of pendingInvites) if (Date.parse(inv.createdAt) > lastSeen) n++;
    for (const ns of noShows) if (Date.parse(ns.createdAt) > lastSeen) n++;
    return n;
  }, [newBookingsToday, newClientsToday, pendingInvites, noShows, lastSeen]);

  // Severity of the highest-priority unread bucket.
  // critical > warning > positive > info — dot color changes accordingly.
  const severity = useMemo<'critical' | 'warning' | 'positive' | 'info' | null>(() => {
    if (unreadCount === 0) return null;
    if (cancelledToday.some(a => Date.parse(a.createdAt) > lastSeen)
        || noShows.some(a => Date.parse(a.createdAt) > lastSeen)) return 'critical';
    if (pendingInvites.some(p => Date.parse(p.createdAt) > lastSeen)) return 'warning';
    if (newClientsToday.some(c => Date.parse(c.createdAt) > lastSeen)) return 'positive';
    return 'info';
  }, [unreadCount, cancelledToday, noShows, pendingInvites, newClientsToday, lastSeen]);

  const SEVERITY_BG: Record<NonNullable<typeof severity>, string> = {
    critical: 'bg-destructive',
    warning: 'bg-warning',
    positive: 'bg-success',
    info: 'bg-brand',
  };

  const totalSignals =
    upcoming.length + noShows.length + cancelledToday.length +
    pendingInvites.length + newBookingsToday.length + newClientsToday.length;

  const markAllRead = () => {
    if (!userId) return;
    writeLastSeen(userId, Date.now());
    setSeenTick(t => t + 1);
  };

  const itemAnim = (i: number) => reduce ? {} : {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: MOTION_DUR.fast, ease: MOTION_EASE, delay: i * 0.03 },
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          aria-label={severity ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          {severity ? (
            <BellAlertIcon className="h-[18px] w-[18px]" />
          ) : (
            <BellIcon className="h-[18px] w-[18px]" />
          )}
          <AnimatePresence>
            {severity && !reduce && (
              <motion.span
                key={`dot-${severity}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: MOTION_DUR.fast, ease: MOTION_EASE }}
                className={cn(
                  'absolute top-[8px] right-[8px] h-[7px] w-[7px] rounded-full ring-2 ring-card',
                  SEVERITY_BG[severity],
                )}
              />
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] max-w-[calc(100vw-1rem)] p-0 overflow-hidden"
      >
        {/* ── Header ─────────────────────────────── */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Notifications
            </p>
            <p className="text-sm font-bold text-foreground tracking-tight">
              {unreadCount > 0 ? `${unreadCount} new` : 'You\'re up to date'}
            </p>
          </div>
          {totalSignals > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* ── Body — 3 sections, scrollable ─────── */}
        <div className="max-h-[480px] overflow-y-auto">
          {totalSignals === 0 ? (
            <EmptyPanel />
          ) : (
            <>
              {/* SECTION 1 — UPCOMING */}
              {upcoming.length > 0 && (
                <Section
                  eyebrow="Upcoming"
                  hint="Next 30 min"
                  count={upcoming.length}
                >
                  {upcoming.map((apt, i) => {
                    const start = parseISO(apt.startTime);
                    const minsUntil = differenceInMinutes(start, now);
                    const grad = AVATAR_GRADIENTS[hashToIndex(apt.client.id, AVATAR_GRADIENTS.length)];
                    return (
                      <motion.button
                        key={apt.id}
                        {...itemAnim(i)}
                        onClick={() => navigate('/calendar')}
                        className="group w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/40 transition-colors"
                      >
                        <div className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white',
                          grad,
                        )}>
                          {apt.client.firstName[0]}{apt.client.lastName[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {apt.client.firstName} {apt.client.lastName}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate inline-flex items-center gap-1">
                            <ScissorsIcon className="h-3 w-3" />
                            {apt.service.name}
                            <span className="text-muted-foreground/40">·</span>
                            {apt.staff.firstName}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-bold tabular-nums text-foreground inline-flex items-center gap-1">
                            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[apt.status])} />
                            {minsUntil <= 0 ? 'now' : `${minsUntil}m`}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 tabular-nums">
                            {start.getHours().toString().padStart(2, '0')}:{start.getMinutes().toString().padStart(2, '0')}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </Section>
              )}

              {/* SECTION 2 — NEEDS ATTENTION */}
              {(noShows.length > 0 || cancelledToday.length > 0 || pendingInvites.length > 0) && (
                <Section
                  eyebrow="Needs attention"
                  hint="Today"
                  count={noShows.length + cancelledToday.length + pendingInvites.length}
                  tone="warn"
                >
                  {noShows.map((apt, i) => (
                    <motion.button
                      key={`ns-${apt.id}`}
                      {...itemAnim(i)}
                      onClick={() => navigate('/bookings')}
                      className="group w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-accent/40 transition-colors"
                    >
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          No-show · {apt.client.firstName} {apt.client.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 truncate">
                          {apt.service.name} · {formatDistanceToNow(parseISO(apt.startTime))} ago
                        </p>
                      </div>
                    </motion.button>
                  ))}
                  {cancelledToday.map((apt, i) => (
                    <motion.button
                      key={`c-${apt.id}`}
                      {...itemAnim(noShows.length + i)}
                      onClick={() => navigate('/bookings')}
                      className="group w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-accent/40 transition-colors"
                    >
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          Cancelled · {apt.client.firstName} {apt.client.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 truncate">
                          {apt.service.name} · gap in schedule
                        </p>
                      </div>
                    </motion.button>
                  ))}
                  {pendingInvites.map((inv, i) => (
                    <motion.button
                      key={`inv-${inv.id}`}
                      {...itemAnim(noShows.length + cancelledToday.length + i)}
                      onClick={() => navigate('/accounts')}
                      className="group w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-accent/40 transition-colors"
                    >
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <EnvelopeIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          Invite pending · {inv.firstName} {inv.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 truncate">
                          {inv.email} · sent {formatDistanceToNow(parseISO(inv.createdAt))} ago
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </Section>
              )}

              {/* SECTION 3 — TODAY'S ACTIVITY */}
              {(newBookingsToday.length > 0 || newClientsToday.length > 0) && (
                <Section
                  eyebrow="Today's activity"
                  hint="Last 24h"
                  count={newBookingsToday.length + newClientsToday.length}
                >
                  {newBookingsToday.map((apt, i) => (
                    <motion.button
                      key={`nb-${apt.id}`}
                      {...itemAnim(i)}
                      onClick={() => navigate('/bookings')}
                      className="group w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-accent/40 transition-colors"
                    >
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <SparklesIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          New booking · {apt.client.firstName} {apt.client.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 truncate">
                          {apt.service.name} with {apt.staff.firstName} · {formatDistanceToNow(parseISO(apt.createdAt))} ago
                        </p>
                      </div>
                    </motion.button>
                  ))}
                  {newClientsToday.map((c, i) => (
                    <motion.button
                      key={`nc-${c.id}`}
                      {...itemAnim(newBookingsToday.length + i)}
                      onClick={() => navigate('/clients')}
                      className="group w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-accent/40 transition-colors"
                    >
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <UserPlusIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          New client · {c.firstName} {c.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 truncate">
                          {c.phone} · added {formatDistanceToNow(parseISO(c.createdAt))} ago
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </Section>
              )}
            </>
          )}
        </div>

        {/* ── Footer — quick links ────────────────── */}
        <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between">
          <button
            onClick={() => navigate('/bookings')}
            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            View all bookings
          </button>
          <button
            onClick={() => navigate('/calendar')}
            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Open calendar →
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Subcomponents ─────────────────────────────────

function Section({
  eyebrow, hint, count, tone = 'default', children,
}: {
  eyebrow: string;
  hint?: string;
  count: number;
  tone?: 'default' | 'warn';
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border last:border-b-0">
      <header className="px-4 pt-3 pb-1 flex items-baseline justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-1.5">
          {tone === 'warn' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
          {eyebrow}
          <span className="ml-1 text-muted-foreground/60 tabular-nums">·{count}</span>
        </p>
        {hint && (
          <span className="text-[10px] text-muted-foreground/60 tabular-nums">
            {hint}
          </span>
        )}
      </header>
      <div className="pb-1">{children}</div>
    </section>
  );
}

function EmptyPanel() {
  return (
    <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
        <ClockIcon className="h-6 w-6 text-muted-foreground/60" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">All quiet on the floor</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/70 max-w-[260px] mx-auto leading-snug">
          No upcoming appointments, no pending invites, and nothing new today. The bell will light up when something needs you.
        </p>
      </div>
    </div>
  );
}
