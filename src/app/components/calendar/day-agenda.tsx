import { useMemo } from 'react';
import { parseISO, differenceInMinutes } from 'date-fns';
import { PlusIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';
import { formatTime } from '../../lib/time';
import { useT, useTimeFormat } from '../../hooks/use-t';
import type { AppointmentWithDetails } from '../../types';

interface DayAgendaProps {
  appointments: AppointmentWithDetails[];
  staffColorMap: Map<string, number>;
  staffColors: {
    light: string;
    label: string;
    dot: string;
    border: string;
    bg: string;
    text: string;
    sub: string;
    ring: string;
  }[];
  statusMap: Record<string, { label: string; cls: string }>;
  onSelect: (a: AppointmentWithDetails) => void;
  onCreate?: () => void;
}

type Bucket = 'morning' | 'afternoon' | 'evening';
const BUCKET_FOR_HOUR = (h: number): Bucket => (h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening');

export function DayAgenda({ appointments, staffColorMap, staffColors, statusMap, onSelect, onCreate }: DayAgendaProps) {
  const t = useT();
  const [timeFormat] = useTimeFormat();

  const grouped = useMemo(() => {
    const byBucket: Record<Bucket, AppointmentWithDetails[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };
    const sorted = [...appointments].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (const a of sorted) {
      const h = parseISO(a.startTime).getHours();
      byBucket[BUCKET_FOR_HOUR(h)].push(a);
    }
    return byBucket;
  }, [appointments]);

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <CalendarIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">{t('calendar.noAppointments')}</p>
        <p className="mt-1 text-xs text-muted-foreground">Your day is clear — create the first booking below</p>
        {onCreate && (
          <Button size="sm" className="mt-4" onClick={onCreate}>
            <PlusIcon className="mr-1.5 h-4 w-4" />
            New appointment
          </Button>
        )}
      </div>
    );
  }

  const buckets: { key: Bucket; label: string }[] = [
    { key: 'morning', label: t('calendar.morning') },
    { key: 'afternoon', label: t('calendar.afternoon') },
    { key: 'evening', label: t('calendar.evening') },
  ];

  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      {buckets.map(b => {
        const items = grouped[b.key];
        if (items.length === 0) return null;
        return (
          <section key={b.key} className="px-4 py-3">
            <h3 className="mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {b.label}
              <span className="ml-2 text-muted-foreground/60 normal-case font-normal">{items.length}</span>
            </h3>
            <ul className="space-y-1.5">
              {items.map(apt => {
                const colorIdx = staffColorMap.get(apt.staffId) ?? 0;
                const c = staffColors[colorIdx % staffColors.length];
                const start = parseISO(apt.startTime);
                const end = parseISO(apt.endTime);
                const dur = differenceInMinutes(end, start);
                const status = statusMap[apt.status] || statusMap.scheduled;

                return (
                  <li key={apt.id}>
                    <button
                      onClick={() => onSelect(apt)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-accent/40',
                        apt.status === 'cancelled' && 'opacity-60',
                      )}
                    >
                      <div className="w-14 shrink-0 tabular-nums text-sm font-semibold text-foreground">
                        {formatTime(start, timeFormat)}
                      </div>
                      <div className={cn('h-10 w-1 rounded-full shrink-0', c.dot)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {apt.client.firstName} {apt.client.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {apt.service.name} · {dur}m
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Avatar className="h-6 w-6">
                          {apt.staff.avatarUrl && <AvatarImage src={apt.staff.avatarUrl} alt={apt.staff.firstName} />}
                          <AvatarFallback className={cn('text-[9px] font-bold', c.light, c.label)}>
                            {apt.staff.firstName[0]}{apt.staff.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn('hidden sm:inline rounded-full px-2 py-0.5 text-[10px] font-semibold', status.cls)}>
                          {status.label}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
