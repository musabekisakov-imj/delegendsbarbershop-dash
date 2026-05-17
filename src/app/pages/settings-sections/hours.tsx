import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { PlusIcon, XMarkIcon, ArrowDownOnSquareIcon } from '@heroicons/react/24/outline';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { useT } from '../../hooks/use-t';
import { cn } from '../../components/ui/utils';
import { MOTION_EASE } from '../../lib/tokens';
import type { Tenant, DayOfWeek, WorkingHoursDay, Holiday } from '../../types';
import type { TranslationKey } from '../../i18n';

interface SectionProps {
  tenant: Tenant;
  onUpdate: (patch: Partial<Tenant>) => void;
}

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WEEKDAYS = new Set<DayOfWeek>(['tuesday', 'wednesday', 'thursday', 'friday']);

export function HoursSection({ tenant, onUpdate }: SectionProps) {
  const t = useT();

  const updateDay = (day: DayOfWeek, patch: Partial<WorkingHoursDay>) => {
    const cur = tenant.workingHours[day] ?? { isOpen: false, openTime: '09:00', closeTime: '18:00' };
    onUpdate({ workingHours: { ...tenant.workingHours, [day]: { ...cur, ...patch } } });
  };

  const copyMondayToWeekdays = () => {
    const monday = tenant.workingHours['monday'];
    if (!monday) return;
    const next = { ...tenant.workingHours };
    DAYS.forEach((d) => {
      if (WEEKDAYS.has(d)) next[d] = { ...monday };
    });
    onUpdate({ workingHours: next });
  };

  return (
    <div className="space-y-5">
      <Card
        title={t('settings.hours.weeklySchedule')}
        delay={0}
        actions={
          <Button variant="ghost" size="sm" onClick={copyMondayToWeekdays} className="text-[12px]">
            <ArrowDownOnSquareIcon className="h-3.5 w-3.5 mr-1.5" />
            {t('settings.hours.copyMonday')}
          </Button>
        }
      >
        <div className="space-y-1">
          {DAYS.map((day) => (
            <DayRow key={day} day={day} hours={tenant.workingHours[day]} onUpdate={(p) => updateDay(day, p)} />
          ))}
        </div>
      </Card>

      <HolidaysCard
        holidays={tenant.holidays ?? []}
        onChange={(holidays) => onUpdate({ holidays })}
        delay={0.08}
      />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────

function Card({
  title,
  actions,
  children,
  delay = 0,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: MOTION_EASE, delay }}
      className="rounded-xl border border-border bg-card"
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border">
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
        {actions}
      </header>
      <div className="px-5 py-4">{children}</div>
    </motion.section>
  );
}

function DayRow({
  day,
  hours,
  onUpdate,
}: {
  day: DayOfWeek;
  hours: WorkingHoursDay | undefined;
  onUpdate: (p: Partial<WorkingHoursDay>) => void;
}) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const [showLunch, setShowLunch] = useState(!!hours?.lunchStart);
  const dayLabel = t(`days.${day}` as TranslationKey);
  const open = hours?.isOpen ?? false;

  const fadeVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const fadeTrans = reduceMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: MOTION_EASE };

  return (
    <div className="flex flex-col gap-1.5 py-2 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <Switch checked={open} onCheckedChange={(v) => onUpdate({ isOpen: v })} aria-label={`Toggle ${dayLabel}`} />
        <span className="w-24 text-[13px] font-medium text-foreground capitalize">{dayLabel}</span>

        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="open"
              className="flex flex-wrap items-center gap-3"
              variants={fadeVariants}
              initial={reduceMotion ? false : 'initial'}
              animate="animate"
              exit={reduceMotion ? undefined : 'exit'}
              transition={fadeTrans}
            >
              <Input
                type="time"
                value={hours?.openTime ?? '09:00'}
                onChange={(e) => onUpdate({ openTime: e.target.value })}
                className="w-28"
              />
              <span className="text-[12px] text-muted-foreground">–</span>
              <Input
                type="time"
                value={hours?.closeTime ?? '18:00'}
                onChange={(e) => onUpdate({ closeTime: e.target.value })}
                className="w-28"
              />
              {!showLunch && (
                <button
                  type="button"
                  onClick={() => setShowLunch(true)}
                  className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                >
                  + {t('settings.hours.addLunchBreak')}
                </button>
              )}
            </motion.div>
          ) : (
            <motion.span
              key="closed"
              className="text-[12px] text-muted-foreground italic"
              variants={fadeVariants}
              initial={reduceMotion ? false : 'initial'}
              animate="animate"
              exit={reduceMotion ? undefined : 'exit'}
              transition={fadeTrans}
            >
              {t('settings.hours.closed')}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {open && showLunch && (
          <motion.div
            className="ml-[7.5rem] flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: MOTION_EASE }}
            style={{ overflow: 'hidden' }}
          >
            <span>{t('settings.hours.lunchFrom')}</span>
            <Input
              type="time"
              value={hours?.lunchStart ?? '12:00'}
              onChange={(e) => onUpdate({ lunchStart: e.target.value })}
              className="w-24 h-7 text-[12px]"
            />
            <span>{t('settings.hours.lunchTo')}</span>
            <Input
              type="time"
              value={hours?.lunchEnd ?? '13:00'}
              onChange={(e) => onUpdate({ lunchEnd: e.target.value })}
              className="w-24 h-7 text-[12px]"
            />
            <button
              type="button"
              onClick={() => {
                setShowLunch(false);
                onUpdate({ lunchStart: undefined, lunchEnd: undefined });
              }}
              className="ml-1 text-[11px] hover:text-foreground hover:underline"
            >
              {t('common.remove')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HolidaysCard({
  holidays,
  onChange,
  delay,
}: {
  holidays: Holiday[];
  onChange: (next: Holiday[]) => void;
  delay?: number;
}) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const [adding, setAdding] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const submit = () => {
    if (!newDate || !newLabel.trim()) return;
    onChange([...holidays, { date: newDate, label: newLabel.trim() }].sort((a, b) => a.date.localeCompare(b.date)));
    setAdding(false);
    setNewDate('');
    setNewLabel('');
  };

  return (
    <Card
      title={t('settings.hours.holidays')}
      delay={delay}
      actions={
        !adding && (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)} className="text-[12px]">
            <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
            {t('settings.hours.addDate')}
          </Button>
        )
      }
    >
      <AnimatePresence>
        {adding && (
          <motion.div
            className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: MOTION_EASE }}
            style={{ overflow: 'hidden' }}
          >
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-44" />
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder={t('settings.hours.holidayLabelPlaceholder')}
              className="flex-1 min-w-[180px]"
            />
            <Button size="sm" onClick={submit} disabled={!newDate || !newLabel.trim()}>
              {t('common.add')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              {t('common.cancel')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {holidays.length === 0 ? (
        <p className="text-[12px] text-muted-foreground italic py-2">{t('settings.hours.holidaysEmpty')}</p>
      ) : (
        <motion.ul className="flex flex-wrap gap-2">
          <AnimatePresence>
            {holidays.map((h, i) => (
              <motion.li
                key={`${h.date}-${h.label}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[12px]"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.88 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: MOTION_EASE, delay: i * 0.04 }}
              >
                <span className="font-semibold tabular-nums text-foreground">
                  {format(parseISO(h.date), 'MMM d')}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground">{h.label}</span>
                <button
                  type="button"
                  onClick={() => onChange(holidays.filter((x) => x !== h))}
                  className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={t('common.remove')}
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </Card>
  );
}
