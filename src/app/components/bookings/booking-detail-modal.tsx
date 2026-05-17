import { useState } from 'react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { TimeWheelPicker } from '../ui/time-wheel-picker';
import { cn } from '../ui/utils';
import {
  ScissorsIcon, UserIcon, ClockIcon, PhoneIcon,
  ChatBubbleLeftEllipsisIcon, ArrowPathRoundedSquareIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { STATUS_DOT, STATUS_PILL, STATUS_NEXT, getClientAvatarColor } from '../../lib/tokens';
import { formatPrice, formatDurationLocalized } from '../../lib/format';
import { useT, useTimeFormat } from '../../hooks/use-t';
import { useDateLocale } from '../../hooks/use-date-locale';
import { useLanguageStore } from '../../store/language-store';
import type { AppointmentStatus, AppointmentWithDetails } from '../../types';

interface BookingDetailModalProps {
  apt: AppointmentWithDetails | undefined;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onDelete: (id: string, clientName: string) => void;
  onReschedule: (id: string, startTime: string, endTime: string) => void;
  canReschedule: boolean;
  statusPending: boolean;
  deletePending: boolean;
  reschedulePending: boolean;
}

export function BookingDetailModal({
  apt, open, onClose,
  onStatusChange, onDelete, onReschedule,
  canReschedule, statusPending, deletePending, reschedulePending,
}: BookingDetailModalProps) {
  const t = useT();
  const language = useLanguageStore(s => s.language);
  const dateLocale = useDateLocale();
  const [timeFormat] = useTimeFormat();
  const [rescheduleDraft, setRescheduleDraft] = useState<{ date: string; time: string } | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open) { onClose(); setRescheduleDraft(null); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-hidden p-0 flex flex-col">
        {apt && (
          <>
            <DialogHeader className="px-6 pt-6 pb-5 space-y-0 border-b border-border">
              <DialogDescription className="sr-only">
                {t('bookings.detailDescription')}
              </DialogDescription>
              <div className="flex items-start gap-4">
                {(() => {
                  const ac = getClientAvatarColor(apt.clientId);
                  return (
                    <div className={cn('flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold shadow-sm', ac.bg, ac.text)}>
                      {apt.client.firstName[0]}{apt.client.lastName[0]}
                    </div>
                  );
                })()}
                <div className="min-w-0 flex-1 pt-0.5">
                  <DialogTitle className="text-xl font-bold text-foreground truncate leading-tight">
                    {apt.client.firstName} {apt.client.lastName}
                  </DialogTitle>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      STATUS_PILL[apt.status],
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[apt.status])} />
                      {t(`status.${apt.status}` as const)}
                    </span>
                    {apt.client.totalVisits > 1 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground cursor-default">
                              <ArrowPathRoundedSquareIcon className="h-2.5 w-2.5" />
                              {apt.client.totalVisits}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{t('bookings.clientVisits', { count: apt.client.totalVisits })}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <a href={`tel:${apt.client.phone}`} onClick={(e) => e.stopPropagation()}>
                      <PhoneIcon className="h-4 w-4" />
                      {t('bookings.call')}
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <a href={`sms:${apt.client.phone}`} onClick={(e) => e.stopPropagation()}>
                      <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                      {t('bookings.sms')}
                    </a>
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="flex items-stretch gap-2 border-y border-border py-4">
                <IconStat
                  icon={ScissorsIcon}
                  label={t('bookings.detailService')}
                  value={apt.service.name}
                  sub={formatPrice(apt.service.price, language)}
                />
                <div className="w-px bg-border" aria-hidden />
                <IconStat
                  icon={UserIcon}
                  label={t('bookings.detailBarber')}
                  value={`${apt.staff.firstName} ${apt.staff.lastName}`}
                  sub={apt.staff.role}
                />
                <div className="w-px bg-border" aria-hidden />
                <IconStat
                  icon={ClockIcon}
                  label={t('bookings.detailDuration')}
                  value={formatDurationLocalized(differenceInMinutes(parseISO(apt.endTime), parseISO(apt.startTime)), language)}
                  sub={format(parseISO(apt.startTime), 'EEE, d MMM', { locale: dateLocale })}
                />
              </div>

              {/* When — editable when canReschedule */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('bookings.detailWhen')}</p>
                  {canReschedule && !rescheduleDraft && (
                    <button
                      type="button"
                      onClick={() => setRescheduleDraft({
                        date: format(parseISO(apt.startTime), 'yyyy-MM-dd'),
                        time: format(parseISO(apt.startTime), 'HH:mm'),
                      })}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {t('bookings.reschedule')}
                    </button>
                  )}
                </div>
                {canReschedule && rescheduleDraft ? (
                  <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t('bookings.reschedule')}
                    </p>
                    <div className="flex justify-center">
                      <TimeWheelPicker
                        value={rescheduleDraft.time}
                        onChange={(time) => setRescheduleDraft({ ...rescheduleDraft, time })}
                        startHour={8}
                        endHour={21}
                        minuteStep={5}
                        format={timeFormat}
                        ariaLabel={t('bookings.timePickerAria')}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('bookings.dateLabel')}</Label>
                      <Input
                        type="date"
                        value={rescheduleDraft.date}
                        onChange={(e) => setRescheduleDraft({ ...rescheduleDraft, date: e.target.value })}
                        className="mt-1.5 h-10 tabular-nums"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setRescheduleDraft(null)}>{t('common.cancel')}</Button>
                      <Button
                        size="sm"
                        disabled={reschedulePending}
                        onClick={() => {
                          const start = new Date(`${rescheduleDraft.date}T${rescheduleDraft.time}:00`);
                          if (isNaN(start.getTime())) { toast.error(t('bookings.rescheduleInvalidDate')); return; }
                          const duration = differenceInMinutes(parseISO(apt.endTime), parseISO(apt.startTime));
                          const end = new Date(start.getTime() + duration * 60_000);
                          onReschedule(apt.id, start.toISOString(), end.toISOString());
                          setRescheduleDraft(null);
                        }}
                      >
                        {t('bookings.rescheduleSave')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <p className="text-lg font-bold tabular-nums text-foreground">
                      {format(parseISO(apt.startTime), 'HH:mm')}
                      <span className="text-muted-foreground"> → </span>
                      {format(parseISO(apt.endTime), 'HH:mm')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(apt.startTime), 'EEEE, d MMM', { locale: dateLocale })}
                    </p>
                  </div>
                )}
              </div>

              {apt.client.notes && (
                <div className="border-l-2 border-border pl-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('bookings.clientNotes')}
                  </p>
                  <p className="mt-1 text-sm text-foreground leading-relaxed italic">
                    {apt.client.notes}
                  </p>
                </div>
              )}

              {apt.notes && (
                <div className="border-l-2 border-primary/60 pl-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('bookings.aptNotes')}
                  </p>
                  <p className="mt-1 text-sm text-foreground leading-relaxed">
                    {apt.notes}
                  </p>
                </div>
              )}

              {/* Status picker — logical next states highlighted, backwards dimmed */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('bookings.updateStatus')}</p>
                <div className="flex flex-wrap gap-2">
                  {(['scheduled', 'confirmed', 'completed', 'no_show', 'cancelled'] as const).map(status => {
                    const active = apt.status === status;
                    const isForward = STATUS_NEXT[apt.status]?.includes(status) ?? false;
                    const isBackward = !active && !isForward;
                    return (
                      <button
                        key={status}
                        onClick={() => onStatusChange(apt.id, status)}
                        disabled={active || statusPending}
                        className={cn(
                          'inline-flex flex-1 min-w-[6.5rem] items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'border-foreground bg-foreground text-background'
                            : isBackward
                              ? 'border-border bg-card text-foreground/45 hover:text-foreground hover:bg-accent'
                              : 'border-border bg-card text-foreground hover:bg-accent',
                          'disabled:cursor-not-allowed',
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-background' : STATUS_DOT[status])} />
                        {t(`status.${status}` as const)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sticky footer — delete lives here, not in inline row */}
            <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-6 py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(apt.id, `${apt.client.firstName} ${apt.client.lastName}`)}
                disabled={deletePending}
                className="text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
              >
                <TrashIcon className="mr-1.5 h-4 w-4" />
                {t('bookings.deleteAction')}
              </Button>
              <Button onClick={onClose}>
                {t('bookings.close')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function IconStat({
  icon: Icon, label, value, sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex-1 min-w-0 text-center px-2">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground truncate">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground truncate capitalize">{sub}</p>}
    </div>
  );
}
