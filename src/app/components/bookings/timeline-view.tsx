import { useEffect, useRef, useState } from 'react';
import { parseISO, differenceInMinutes, isSameDay, format } from 'date-fns';
import { cn } from '../ui/utils';
import { STATUS_STRIPE, STATUS_DOT, getClientAvatarColor } from '../../lib/tokens';
import { formatPrice } from '../../lib/format';
import { getHoursInTz, getMinutesInTz } from '../../lib/time';
import { useT } from '../../hooks/use-t';
import { useLanguageStore } from '../../store/language-store';
import type { AppointmentWithDetails, WorkingHoursDay } from '../../types';
import type { BookingsDensity } from '../../store/bookings-prefs-store';

interface TimelineViewProps {
  appointments: AppointmentWithDetails[];
  workingHours: WorkingHoursDay | undefined;
  selectedDate: Date;
  density: BookingsDensity;
  onSelect: (id: string) => void;
}

function parseHHmm(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function TimelineView({ appointments, workingHours, selectedDate, density, onSelect }: TimelineViewProps) {
  const t = useT();
  const language = useLanguageStore(s => s.language);
  const pxPerMin = density === 'comfortable' ? 1 : 0.667;
  const pxPerHour = pxPerMin * 60;

  const [nowMinutes, setNowMinutes] = useState<number | null>(null);
  const nowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSameDay(selectedDate, new Date())) { setNowMinutes(null); return; }
    const tick = () => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [selectedDate]);

  if (!workingHours || !workingHours.isOpen) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <p className="text-sm font-semibold text-foreground">{t('bookings.closedDay')}</p>
      </div>
    );
  }

  const openMin = parseHHmm(workingHours.openTime);
  const closeMin = parseHHmm(workingHours.closeTime);
  const totalMin = closeMin - openMin;
  const totalPx = totalMin * pxPerMin;

  const hours: number[] = [];
  for (let m = openMin; m <= closeMin; m += 60) hours.push(m);

  const isTodayView = isSameDay(selectedDate, new Date());

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <div className="relative flex min-w-[600px]" style={{ height: totalPx + 32 }}>

          {/* Left rail — hour labels */}
          <div className="sticky left-0 z-10 w-14 shrink-0 bg-card border-r border-border">
            {hours.map(m => (
              <div
                key={m}
                className="absolute left-0 w-14 flex items-center justify-end pr-2"
                style={{ top: (m - openMin) * pxPerMin, height: pxPerHour }}
              >
                <span className="text-[10px] font-medium tabular-nums text-muted-foreground/70 leading-none">
                  {String(Math.floor(m / 60)).padStart(2, '0')}:{String(m % 60).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>

          {/* Grid lines */}
          <div className="flex-1 relative">
            {hours.map(m => (
              <div
                key={m}
                className="absolute left-0 right-0 border-t border-border/40"
                style={{ top: (m - openMin) * pxPerMin }}
              />
            ))}
            {/* Half-hour dashes */}
            {hours.slice(0, -1).map(m => (
              <div
                key={`h${m}`}
                className="absolute left-0 right-0 border-t border-dashed border-border/20"
                style={{ top: (m - openMin + 30) * pxPerMin }}
              />
            ))}

            {/* Now line */}
            {isTodayView && nowMinutes !== null && nowMinutes >= openMin && nowMinutes <= closeMin && (
              <div
                ref={nowRef}
                className="absolute left-0 right-0 z-20 flex items-center"
                style={{ top: (nowMinutes - openMin) * pxPerMin }}
              >
                <span className="shrink-0 rounded-full bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 leading-none whitespace-nowrap">
                  {t('bookings.nowLabel', { time: `${String(Math.floor(nowMinutes / 60)).padStart(2, '0')}:${String(nowMinutes % 60).padStart(2, '0')}` })}
                </span>
                <div className="flex-1 h-px bg-rose-500" />
              </div>
            )}

            {/* Appointment cards */}
            {appointments.map(apt => {
              const start = parseISO(apt.startTime);
              const end = parseISO(apt.endTime);
              const startMin = getHoursInTz(start) * 60 + getMinutesInTz(start);
              const dur = differenceInMinutes(end, start);
              const top = (startMin - openMin) * pxPerMin;
              const height = Math.max(dur * pxPerMin, 24);
              const isPast = isTodayView && nowMinutes !== null && startMin + dur < nowMinutes;
              const color = getClientAvatarColor(apt.clientId);

              return (
                <button
                  key={apt.id}
                  type="button"
                  onClick={() => onSelect(apt.id)}
                  className={cn(
                    'absolute left-2 right-2 rounded-md border border-border bg-card text-left overflow-hidden flex transition-opacity hover:border-foreground/20 hover:shadow-sm cursor-pointer',
                    isPast && 'opacity-50',
                  )}
                  style={{ top, height }}
                >
                  {/* Status stripe */}
                  <span className={cn('w-1 shrink-0', STATUS_STRIPE[apt.status])} aria-hidden />

                  <div className="flex-1 min-w-0 px-2 py-1 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate leading-tight">
                        {apt.client.firstName} {apt.client.lastName}
                      </p>
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full mt-1', STATUS_DOT[apt.status])} />
                    </div>
                    {height >= 36 && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {apt.service.name}
                      </p>
                    )}
                    {height >= 52 && (
                      <div className="flex items-center gap-1 mt-auto">
                        <span className={cn('h-4 w-4 rounded-full shrink-0 flex items-center justify-center text-[7px] font-bold text-white', color.bg)}>
                          {apt.client.firstName[0]}{apt.client.lastName[0]}
                        </span>
                        <span className="text-[10px] font-semibold tabular-nums text-foreground">
                          {formatPrice(apt.service.price, language)}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
