import { useId, createContext, useContext } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useT, useTimeGranularity, useBreakCutMode } from '../../hooks/use-t';
import { cn } from '../../components/ui/utils';
import { MOTION_EASE } from '../../lib/tokens';
import type { Tenant, BookingRules } from '../../types';
import type { TimeGranularity, BreakCutMode } from '../../store/language-store';

interface SectionProps {
  tenant: Tenant;
  onUpdate: (patch: Partial<Tenant>) => void;
}

const GRANULARITY_OPTIONS: { value: TimeGranularity; label: string }[] = [
  { value: 1, label: '1' },
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  { value: 30, label: '30' },
  { value: 60, label: '60' },
];

export function BookingRulesSection({ tenant, onUpdate }: SectionProps) {
  const t = useT();
  const [granularity, setGranularity] = useTimeGranularity();
  const [breakCutMode, setBreakCutMode] = useBreakCutMode();

  const rules = tenant.bookingRules ?? {};
  const updateRules = (patch: Partial<BookingRules>) =>
    onUpdate({ bookingRules: { ...rules, ...patch } });

  return (
    <div className="space-y-5">
      {/* ─── Time picker interval ──── */}
      <Card title={t('settings.bookingRules.timeGranularity')} hint={t('settings.bookingRules.timeGranularityHint')}>
        <PillGroup>
          {GRANULARITY_OPTIONS.map((opt) => (
            <PillButton
              key={opt.value}
              active={granularity === opt.value}
              onClick={() => setGranularity(opt.value)}
            >
              <span className="font-bold tabular-nums">{opt.label}</span>
              <span className="text-[10px] uppercase tracking-[0.14em] opacity-70">
                {t('settings.bookingRules.minutes')}
              </span>
            </PillButton>
          ))}
        </PillGroup>
      </Card>

      {/* ─── Break overlay style ──── */}
      <Card title={t('settings.bookingRules.breakCutMode')} hint={t('settings.bookingRules.breakCutModeHint')}>
        <PillGroup>
          <PillButton
            active={breakCutMode === 'vertical'}
            onClick={() => setBreakCutMode('vertical' as BreakCutMode)}
          >
            <span className="font-mono text-[13px] tracking-tight">▌█▌</span>
            <span>{t('settings.bookingRules.breakCutVertical')}</span>
          </PillButton>
          <PillButton
            active={breakCutMode === 'horizontal'}
            onClick={() => setBreakCutMode('horizontal' as BreakCutMode)}
          >
            <span className="font-mono text-[13px] tracking-tight">████</span>
            <span>{t('settings.bookingRules.breakCutHorizontal')}</span>
          </PillButton>
        </PillGroup>
      </Card>

      {/* ─── Lead time / cutoff / buffer ──── */}
      <Card title={t('settings.bookingRules.policy')}>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label={t('settings.bookingRules.leadTime')}
            hint={t('settings.bookingRules.leadTimeHint')}
            suffix={t('settings.bookingRules.minutes')}
            value={rules.leadTimeMinutes}
            onChange={(v) => updateRules({ leadTimeMinutes: v })}
          />
          <NumberField
            label={t('settings.bookingRules.cancellationCutoff')}
            hint={t('settings.bookingRules.cancellationCutoffHint')}
            suffix={t('settings.bookingRules.hours')}
            value={rules.cancellationCutoffHours}
            onChange={(v) => updateRules({ cancellationCutoffHours: v })}
          />
          <NumberField
            label={t('settings.bookingRules.buffer')}
            hint={t('settings.bookingRules.bufferHint')}
            suffix={t('settings.bookingRules.minutes')}
            value={rules.bufferMinutes}
            onChange={(v) => updateRules({ bufferMinutes: v })}
          />
        </div>
      </Card>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="px-5 pt-4 pb-3 border-b border-border">
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
        {hint && <p className="mt-0.5 text-[12px] text-muted-foreground">{hint}</p>}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

// ─── PillGroup + PillButton — shared-element layoutId morph ──────

const PillGroupContext = createContext<string | null>(null);

/** Wraps a row of pills so the active background can morph between them via
 *  Framer Motion's `layoutId`. When the user clicks a different pill, the
 *  solid-black background visibly flies from the old position to the new
 *  one — Apple-style segmented control rhythm. */
export function PillGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  const id = useId();
  return (
    <PillGroupContext.Provider value={id}>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>
    </PillGroupContext.Provider>
  );
}

/** Solid-black active state pill. Active pill renders an absolutely-
 *  positioned `motion.span` carrying the group's shared `layoutId` so
 *  switching pills morphs the bg + border across positions. */
export function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const groupId = useContext(PillGroupContext);
  const reduceMotion = useReducedMotion();
  // Each group needs a unique layoutId so multiple PillGroups on the same
  // page (e.g. Theme + Language + Density on Appearance) don't morph into
  // each other. Falls back to a per-button id when no group context exists
  // (still animates, just no cross-pill morph).
  const layoutId = groupId ? `pill-active-${groupId}` : undefined;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      className={cn(
        'relative inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        active
          ? 'text-background border-foreground'
          : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/40',
      )}
    >
      {/* Shared-element black bg — only on active. Spring transition
          makes it fly between pills. Reduced-motion users get an instant
          color flip via the Tailwind utility (no motion.span). */}
      {active && !reduceMotion && layoutId && (
        <motion.span
          layoutId={layoutId}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="absolute inset-0 -z-0 rounded-full bg-foreground"
          aria-hidden
        />
      )}
      {/* When motion is disabled, fall back to a static black bg. */}
      {active && (reduceMotion || !layoutId) && (
        <span aria-hidden className="absolute inset-0 -z-0 rounded-full bg-foreground" />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
    </motion.button>
  );
}

function NumberField({
  label,
  hint,
  suffix,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  suffix: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-medium text-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          value={value ?? ''}
          onChange={(e) => {
            const n = e.target.value === '' ? undefined : Number(e.target.value);
            onChange(typeof n === 'number' && !Number.isNaN(n) ? n : undefined);
          }}
          className="w-20 tabular-nums"
        />
        <span className="text-[12px] text-muted-foreground">{suffix}</span>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
