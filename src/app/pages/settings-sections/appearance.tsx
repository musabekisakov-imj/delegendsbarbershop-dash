import {
  SunIcon, MoonIcon, ComputerDesktopIcon, GlobeAltIcon,
  Bars3BottomLeftIcon, Bars3Icon,
} from '@heroicons/react/24/outline';
import { useTheme } from 'next-themes';
import { motion } from 'motion/react';
import { useT, useTimeFormat, useDensity, useLanguage } from '../../hooks/use-t';
import { cn } from '../../components/ui/utils';
import { PillButton, PillGroup } from './booking-rules';
import { MOTION_EASE } from '../../lib/tokens';
import type { Tenant, Language } from '../../types';
import type { Density } from '../../store/language-store';
import type { TimeFormat } from '../../lib/time';

interface SectionProps {
  tenant: Tenant;
  onUpdate: (patch: Partial<Tenant>) => void;
}

const LANG_OPTIONS: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'lt', label: 'LT' },
];

export function AppearanceSection({ tenant, onUpdate }: SectionProps) {
  const t = useT();
  const { theme: currentTheme, setTheme } = useTheme();
  const [timeFormat, setTimeFormat] = useTimeFormat();
  const [density, setDensity] = useDensity();
  const [language, setLanguage] = useLanguage();

  // Theme + language are also reflected on tenant for cross-device sync
  // when the backend lands. For now they live primarily in client stores.
  const handleThemeChange = (next: 'light' | 'dark' | 'system') => {
    setTheme(next);
    if (next !== 'system') onUpdate({ theme: next });
  };
  const handleLangChange = (next: Language) => {
    setLanguage(next);
    onUpdate({ language: next });
  };

  return (
    <div className="space-y-5">
      {/* ─── Theme ──── */}
      <Card title={t('settings.appearance.theme')}>
        <PillGroup>
          <PillButton active={currentTheme === 'light'} onClick={() => handleThemeChange('light')}>
            <SunIcon className="h-3.5 w-3.5" />
            <span>{t('settings.appearance.themeLight')}</span>
          </PillButton>
          <PillButton active={currentTheme === 'dark'} onClick={() => handleThemeChange('dark')}>
            <MoonIcon className="h-3.5 w-3.5" />
            <span>{t('settings.appearance.themeDark')}</span>
          </PillButton>
          <PillButton active={currentTheme === 'system'} onClick={() => handleThemeChange('system')}>
            <ComputerDesktopIcon className="h-3.5 w-3.5" />
            <span>{t('settings.appearance.themeSystem')}</span>
          </PillButton>
        </PillGroup>
      </Card>

      {/* ─── Language ──── */}
      <Card title={t('settings.appearance.language')}>
        <PillGroup>
          {LANG_OPTIONS.map((o) => (
            <PillButton key={o.code} active={language === o.code} onClick={() => handleLangChange(o.code)}>
              <GlobeAltIcon className="h-3.5 w-3.5" />
              <span className="font-semibold tabular-nums">{o.label}</span>
            </PillButton>
          ))}
        </PillGroup>
      </Card>

      {/* ─── Density ──── */}
      <Card title={t('settings.appearance.density')} hint={t('settings.appearance.densityHint')}>
        <PillGroup>
          <PillButton active={density === 'compact'} onClick={() => setDensity('compact' as Density)}>
            <Bars3Icon className="h-3.5 w-3.5" />
            <span>{t('settings.appearance.densityCompact')}</span>
            <span
              className={cn(
                'ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]',
                density === 'compact' ? 'bg-background/20 text-background/80' : 'bg-muted-foreground/15 text-muted-foreground',
              )}
            >
              {t('settings.appearance.default')}
            </span>
          </PillButton>
          <PillButton active={density === 'comfortable'} onClick={() => setDensity('comfortable' as Density)}>
            <Bars3BottomLeftIcon className="h-3.5 w-3.5" />
            <span>{t('settings.appearance.densityComfortable')}</span>
          </PillButton>
        </PillGroup>
      </Card>

      {/* ─── Time format ──── */}
      <Card title={t('settings.appearance.timeFormat')}>
        <PillGroup>
          <PillButton active={timeFormat === '12h'} onClick={() => setTimeFormat('12h' as TimeFormat)}>
            <span className="font-mono tabular-nums text-[11px] opacity-70">2:30 PM</span>
            <span>{t('settings.appearance.timeFormat12h')}</span>
          </PillButton>
          <PillButton active={timeFormat === '24h'} onClick={() => setTimeFormat('24h' as TimeFormat)}>
            <span className="font-mono tabular-nums text-[11px] opacity-70">14:30</span>
            <span>{t('settings.appearance.timeFormat24h')}</span>
          </PillButton>
        </PillGroup>
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
