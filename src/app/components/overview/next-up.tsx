import { parseISO, differenceInMinutes } from 'date-fns';
import { ArrowRightIcon, ScissorsIcon } from '@heroicons/react/24/outline';
import { cn } from '../ui/utils';
import { gradientFor, STATUS_PILL, STATUS_DOT, STATUS_LABEL } from '../../lib/tokens';
import { formatPrice } from '../../lib/format';
import { getNextAppointments, aptTotal } from '../../lib/overview';
import { formatTime } from '../../lib/time';
import { useT, useTimeFormat } from '../../hooks/use-t';
import type { AppointmentWithDetails, Language } from '../../types';
import { useNavigate } from 'react-router';

interface NextUpProps {
  todayAppointments: AppointmentWithDetails[];
  currentApt: AppointmentWithDetails | undefined;
  now: Date;
  language: Language;
  isBarber: boolean;
}

export function NextUp({ todayAppointments, currentApt, now, language, isBarber }: NextUpProps) {
  const t = useT();
  const [timeFormat] = useTimeFormat();
  const navigate = useNavigate();

  const upcoming = getNextAppointments(todayAppointments, 3, now);

  // Build display list: current-in-session first (if any), then upcoming
  const rows: Array<{ apt: AppointmentWithDetails; isCurrent: boolean }> = [];
  if (currentApt) rows.push({ apt: currentApt, isCurrent: true });
  for (const apt of upcoming) {
    if (!currentApt || apt.id !== currentApt.id) rows.push({ apt, isCurrent: false });
    if (rows.length >= 3) break;
  }

  const hasAnything = rows.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {currentApt ? t('overview.inSessionNow') : t('overview.nextUp')}
        </p>
        {hasAnything && (
          <button
            type="button"
            onClick={() => navigate('/bookings')}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 cursor-pointer"
          >
            {t('overview.nextUp.viewAll')}
            <ArrowRightIcon className="h-3 w-3" />
          </button>
        )}
      </div>

      {!hasAnything ? (
        <p className="mt-2 text-sm text-muted-foreground">{t('overview.noMoreAppointments')}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map(({ apt, isCurrent }) => {
            const start = parseISO(apt.startTime);
            const end = parseISO(apt.endTime);
            const minsUntil = isCurrent ? 0 : Math.max(0, Math.ceil((start.getTime() - now.getTime()) / 60_000));
            const isImminent = !isCurrent && minsUntil <= 15;

            return (
              <li
                key={apt.id}
                onClick={() => navigate('/bookings')}
                className={cn(
                  'relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer transition-colors',
                  isCurrent && 'bg-primary/[0.05] border border-primary/20',
                  isImminent && !isCurrent && 'bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20',
                  !isCurrent && !isImminent && 'hover:bg-accent/40',
                )}
              >
                {/* Left stripe for in-session */}
                {isCurrent && (
                  <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-primary" />
                )}

                {/* Time tile */}
                <div className={cn(
                  'flex h-9 w-12 shrink-0 flex-col items-center justify-center rounded-md text-center leading-tight',
                  isCurrent ? 'bg-primary/10' : isImminent ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-muted/50',
                )}>
                  <span className={cn(
                    'text-[11px] font-bold tabular-nums',
                    isCurrent ? 'text-primary' : isImminent ? 'text-amber-700 dark:text-amber-400' : 'text-foreground',
                  )}>
                    {formatTime(start, timeFormat)}
                  </span>
                  <span className="text-[9px] text-muted-foreground tabular-nums">
                    {differenceInMinutes(end, start)}m
                  </span>
                </div>

                {/* Avatar */}
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white',
                  gradientFor(apt.clientId),
                )}>
                  {apt.client.firstName[0]}{apt.client.lastName[0]}
                </div>

                {/* Name + service */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {apt.client.firstName} {apt.client.lastName}
                    </p>
                    {isCurrent && (
                      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-primary">
                        {t('overview.inSession')}
                      </span>
                    )}
                    {isImminent && (
                      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        {t('overview.nextUp.imminent')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <ScissorsIcon className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{apt.service.name}</span>
                    {!isBarber && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="truncate">{apt.staff.firstName}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Countdown or price */}
                <div className="shrink-0 text-right">
                  {isCurrent ? (
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                      STATUS_PILL[apt.status],
                    )}>
                      <span className={cn('h-1 w-1 rounded-full', STATUS_DOT[apt.status])} />
                      {STATUS_LABEL[apt.status]}
                    </span>
                  ) : isImminent ? (
                    <span className="text-[11px] font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                      {minsUntil === 0 ? t('overview.nextUp.imminent') : `${minsUntil}m`}
                    </span>
                  ) : !isBarber ? (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {formatPrice(aptTotal(apt), language)}
                    </span>
                  ) : (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {formatTime(start, timeFormat)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
