import { useT } from '../../hooks/use-t';
import { cn } from '../ui/utils';
import type { RangePreset } from '../../lib/date-range';
import type { TranslationKey } from '../../i18n';

interface DateRangeSelectorProps {
  value: RangePreset;
  onChange: (preset: RangePreset) => void;
}

const PRESETS: RangePreset[] = ['today', 'this-week', 'this-month', '90d', '12m', '365d'];

const PRESET_KEY: Record<RangePreset, TranslationKey> = {
  'today': 'dateRange.today',
  'this-week': 'dateRange.thisWeek',
  'this-month': 'dateRange.thisMonth',
  '90d': 'dateRange.last90d',
  '12m': 'dateRange.last12m',
  '365d': 'dateRange.last365d',
};

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const t = useT();
  return (
    <div
      className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5 flex-wrap"
      role="group"
      aria-label="Date range"
    >
      {PRESETS.map(preset => (
        <button
          key={preset}
          type="button"
          onClick={() => onChange(preset)}
          aria-pressed={value === preset}
          className={cn(
            'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
            value === preset
              ? 'bg-background text-foreground shadow-sm border border-border/60'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
          )}
        >
          {t(PRESET_KEY[preset])}
        </button>
      ))}
    </div>
  );
}
