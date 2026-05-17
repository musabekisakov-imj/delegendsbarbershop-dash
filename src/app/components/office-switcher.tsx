import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { isSameDay, parseISO } from 'date-fns';
import {
  BuildingStorefrontIcon, ChevronDownIcon, ChevronRightIcon, MapPinIcon,
} from '@heroicons/react/24/outline';

import { useOfficeStore } from '../store/office-store';
import { useAuthStore } from '../store/auth-store';
import { useT } from '../hooks/use-t';
import { CONTAINER_SHELL } from './layout/header';
import { staffApi, appointmentsApi, tenantApi } from '../lib/api';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { cn } from './ui/utils';
import type { Office, WorkingHoursDay } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function fmt12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getLocationStatus(day: WorkingHoursDay | undefined, now: Date) {
  if (!day) return { state: 'unknown' as const };
  if (!day.isOpen) return { state: 'closed' as const, variant: 'today' as const };
  const open = new Date(now);
  const [oh, om] = day.openTime.split(':').map(Number);
  open.setHours(oh, om, 0, 0);
  const close = new Date(now);
  const [ch, cm] = day.closeTime.split(':').map(Number);
  close.setHours(ch, cm, 0, 0);
  if (now < open) return { state: 'closed' as const, variant: 'opensAt' as const, time: fmt12(day.openTime) };
  if (now >= close) return { state: 'closed' as const, variant: 'today' as const };
  return { state: 'open' as const, time: fmt12(day.closeTime) };
}

// ─── Mobile breakpoint hook ───────────────────────────────────────────

function useIsMobile(bp = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < bp : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [bp]);
  return isMobile;
}

// ─── Single bulk fetch for all location stats ─────────────────────────

function useAllLocationStats() {
  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => tenantApi.get(),
    staleTime: 5 * 60_000,
  });
  const { data: allStaff } = useQuery({
    queryKey: ['staff-all'],
    queryFn: () => staffApi.getAll(),
    staleTime: 60_000,
  });
  const { data: allAppts } = useQuery({
    queryKey: ['appointments-all'],
    queryFn: () => appointmentsApi.getAllAcrossOffices(),
    staleTime: 60_000,
  });
  return { tenant, allStaff, allAppts };
}

// ─── LocationItem ─────────────────────────────────────────────────────

type LocationItemProps = {
  office: Office;
  isCurrent: boolean;
  onSelect: () => void;
  allStaff: { officeIds?: string[]; isActive: boolean }[] | undefined;
  allAppts: { locationId?: string; startTime: string }[] | undefined;
  workingHours: Record<string, WorkingHoursDay> | undefined;
  t: (key: string) => string;
};

function LocationItem({
  office, isCurrent, onSelect, allStaff, allAppts, workingHours, t,
}: LocationItemProps) {
  const now = new Date();
  const todayHours = workingHours?.[DAY_KEYS[now.getDay()]];
  const status = getLocationStatus(todayHours, now);

  const staffCount = useMemo(
    () => allStaff?.filter(s => s.officeIds?.includes(office.id) && s.isActive).length ?? null,
    [allStaff, office.id],
  );
  const bookingsToday = useMemo(
    () => allAppts?.filter(
      a => a.locationId === office.id && isSameDay(parseISO(a.startTime), now),
    ).length ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allAppts, office.id],
  );

  return (
    <button
      type="button"
      onClick={isCurrent ? undefined : onSelect}
      aria-current={isCurrent ? 'true' : undefined}
      className={cn(
        'w-full rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        isCurrent
          ? 'bg-emerald-50 dark:bg-emerald-950/30 cursor-default'
          : 'hover:bg-accent cursor-pointer',
      )}
    >
      {/* Name + active badge */}
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="text-sm font-medium truncate text-foreground">{office.name}</span>
        {isCurrent && (
          <span className="inline-flex items-center gap-1 shrink-0 rounded-full border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            {t('location.currentlyHere')}
          </span>
        )}
      </div>

      {/* Address */}
      {office.address && (
        <p className="text-xs text-muted-foreground leading-snug mb-1.5 line-clamp-2">
          {office.address}
        </p>
      )}

      {/* Status + stats */}
      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
        {status.state === 'unknown' ? (
          <span className="text-muted-foreground">{t('location.hoursNotSet')}</span>
        ) : status.state === 'open' ? (
          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            {t('location.openUntil')} {status.time}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
            {status.variant === 'opensAt'
              ? `${t('location.opensAt')} ${status.time}`
              : t('location.closedToday')}
          </span>
        )}

        {staffCount !== null && (
          <>
            <span className="text-border">·</span>
            <span className="text-muted-foreground">
              {staffCount} {t('location.staff')}
            </span>
          </>
        )}
        {bookingsToday !== null && (
          <>
            <span className="text-border">·</span>
            <span className="text-muted-foreground">
              {bookingsToday === 0
                ? t('location.noBookingsToday')
                : `${bookingsToday} ${t('location.bookingsToday')}`}
            </span>
          </>
        )}
      </div>
    </button>
  );
}

function LocationItemSkeleton() {
  return (
    <div className="rounded-lg px-3 py-2.5 space-y-1.5 animate-pulse">
      <div className="h-4 w-28 rounded bg-muted" />
      <div className="h-3 w-44 rounded bg-muted/70" />
      <div className="h-3 w-36 rounded bg-muted/50" />
    </div>
  );
}

// ─── Dropdown body (shared between popover + sheet) ───────────────────

function LocationDropdownContent({
  onClose,
  t,
}: {
  onClose: () => void;
  t: (key: string) => string;
}) {
  const navigate = useNavigate();
  const offices = useOfficeStore(s => s.offices);
  const currentOfficeId = useOfficeStore(s => s.currentOfficeId);
  const setOfficeId = useOfficeStore(s => s.setOfficeId);
  const user = useAuthStore(s => s.user);
  const { tenant, allStaff, allAppts } = useAllLocationStats();
  const canManage = user?.role === 'owner' || user?.role === 'manager';
  const isLoading = !allStaff || !allAppts;

  return (
    <div className="flex flex-col">
      <div className="px-3 pt-3 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('location.switchLocation')}
        </p>
      </div>

      <div className="flex flex-col gap-0.5 px-1.5 max-h-80 overflow-y-auto">
        {isLoading
          ? offices.map(o => <LocationItemSkeleton key={o.id} />)
          : offices.map(office => (
            <LocationItem
              key={office.id}
              office={office}
              isCurrent={office.id === currentOfficeId}
              onSelect={() => { setOfficeId(office.id); onClose(); }}
              allStaff={allStaff}
              allAppts={allAppts}
              workingHours={tenant?.workingHours}
              t={t}
            />
          ))}
      </div>

      <div className="mt-1 border-t border-border px-1.5 py-1.5">
        <button
          type="button"
          onClick={() => { onClose(); navigate('/settings'); }}
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <span className="flex items-center gap-1.5">
            <MapPinIcon className="h-3.5 w-3.5" />
            {canManage ? t('location.manageLocations') : t('location.viewLocations')}
          </span>
          <ChevronRightIcon className="h-3.5 w-3.5 opacity-50" />
        </button>
      </div>
    </div>
  );
}

// ─── OfficeSwitcher ───────────────────────────────────────────────────

export function OfficeSwitcher() {
  const offices = useOfficeStore(s => s.offices);
  const currentOfficeId = useOfficeStore(s => s.currentOfficeId);
  const current = offices.find(o => o.id === currentOfficeId) ?? offices[0];
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const t = useT();

  if (offices.length <= 1) return null;

  const triggerBtn = (
    <button
      type="button"
      onClick={() => setOpen(v => !v)}
      className={CONTAINER_SHELL}
      aria-label={t('location.switchLocation')}
      aria-expanded={open}
    >
      <BuildingStorefrontIcon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="hidden sm:inline max-w-[140px] truncate font-medium">
        {current?.name ?? t('location.selectOffice')}
      </span>
      <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
    </button>
  );

  if (isMobile) {
    return (
      <>
        {triggerBtn}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="p-0 rounded-t-2xl max-h-[80vh]">
            <SheetHeader className="px-4 pt-4 pb-0">
              <SheetTitle className="text-sm font-semibold">
                {t('location.switchLocation')}
              </SheetTitle>
            </SheetHeader>
            <LocationDropdownContent onClose={() => setOpen(false)} t={t} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerBtn}</PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-0 shadow-lg" sideOffset={6}>
        <LocationDropdownContent onClose={() => setOpen(false)} t={t} />
      </PopoverContent>
    </Popover>
  );
}
