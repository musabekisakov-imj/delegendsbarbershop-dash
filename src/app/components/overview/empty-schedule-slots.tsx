import { parseISO } from 'date-fns';
import { useNavigate } from 'react-router';
import { PlusIcon } from '@heroicons/react/24/outline';
import { cn } from '../ui/utils';
import { generateHourSlots } from '../../lib/overview';
import { useT } from '../../hooks/use-t';
import type { AppointmentWithDetails, WorkingHours } from '../../types';
import { format } from 'date-fns';

interface EmptyScheduleSlotsProps {
  workingHours: WorkingHours;
  viewDate: Date;
  existingAppointments: AppointmentWithDetails[];
}

export function EmptyScheduleSlots({ workingHours, viewDate, existingAppointments }: EmptyScheduleSlotsProps) {
  const t = useT();
  const navigate = useNavigate();
  const slots = generateHourSlots(workingHours, viewDate);
  const dateStr = format(viewDate, 'yyyy-MM-dd');

  // Determine which hours are already occupied
  const takenHours = new Set<number>();
  for (const apt of existingAppointments) {
    const startHour = parseISO(apt.startTime).getHours();
    const endHour = parseISO(apt.endTime).getHours();
    for (let h = startHour; h < endHour; h++) takenHours.add(h);
  }

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
        <p className="text-sm font-medium text-foreground">{t('overview.schedule.closedToday')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('overview.schedule.closedMsg')}</p>
      </div>
    );
  }

  return (
    <div className="py-4 px-5">
      <p className="mb-3 text-xs text-muted-foreground">{t('overview.schedule.helpText')}</p>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-4">
        {slots.map(({ hour, label }) => {
          const taken = takenHours.has(hour);
          return (
            <button
              key={hour}
              type="button"
              disabled={taken}
              onClick={() => navigate(`/bookings/new?date=${dateStr}&time=${label}`)}
              className={cn(
                'flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors',
                taken
                  ? 'bg-muted/40 text-muted-foreground/50 cursor-not-allowed'
                  : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer',
              )}
            >
              {taken ? (
                <span className="truncate">{t('overview.schedule.takenSlot')}</span>
              ) : (
                <>
                  <PlusIcon className="h-3 w-3 shrink-0" aria-hidden />
                  <span>{label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
