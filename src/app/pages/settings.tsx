import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  BuildingStorefrontIcon, ClockIcon, AdjustmentsHorizontalIcon, PaintBrushIcon,
  BellIcon, CreditCardIcon, PuzzlePieceIcon, ShieldExclamationIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { tenantApi } from '../lib/api';
import { useOfficeStore } from '../store/office-store';
import { cn } from '../components/ui/utils';
import { MOTION_EASE } from '../lib/tokens';
import { useT } from '../hooks/use-t';
import { useAutoSave } from '../hooks/use-auto-save';
import { PageHeader, PageHeaderDivider } from '../components/shared/page-header';
import { SaveStatusIndicator } from '../components/shared/save-status-indicator';
import type { Tenant } from '../types';
import type { TranslationKey } from '../i18n';

import { BusinessSection } from './settings-sections/business';
import { HoursSection } from './settings-sections/hours';
import { BookingRulesSection } from './settings-sections/booking-rules';
import { AppearanceSection } from './settings-sections/appearance';
import { AdvancedSection } from './settings-sections/advanced';
import { ComingSoonSection } from './settings-sections/coming-soon';

type SettingsSection =
  | 'business' | 'hours' | 'booking-rules' | 'appearance'
  | 'notifications' | 'billing' | 'integrations'
  | 'advanced';

interface SidebarItem {
  id: SettingsSection;
  labelKey: TranslationKey;
  icon: typeof BuildingStorefrontIcon;
  /** Render with rose-accent (danger zone). Drawn under a hairline divider. */
  danger?: boolean;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'business',      labelKey: 'settings.section.business',      icon: BuildingStorefrontIcon },
  { id: 'hours',         labelKey: 'settings.section.hours',         icon: ClockIcon },
  { id: 'booking-rules', labelKey: 'settings.section.bookingRules',  icon: AdjustmentsHorizontalIcon },
  { id: 'appearance',    labelKey: 'settings.section.appearance',    icon: PaintBrushIcon },
  { id: 'notifications', labelKey: 'settings.section.notifications', icon: BellIcon },
  { id: 'billing',       labelKey: 'settings.section.billing',       icon: CreditCardIcon },
  { id: 'integrations',  labelKey: 'settings.section.integrations',  icon: PuzzlePieceIcon },
  { id: 'advanced',      labelKey: 'settings.section.advanced',      icon: ShieldExclamationIcon, danger: true },
];

function isValidSection(s: string): s is SettingsSection {
  return SIDEBAR_ITEMS.some(it => it.id === s);
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const t = useT();
  const reduceMotion = useReducedMotion();
  const officeId = useOfficeStore(s => s.currentOfficeId);
  const offices = useOfficeStore(s => s.offices);
  const currentOffice = useMemo(() => offices.find(o => o.id === officeId), [offices, officeId]);

  // Section state, synced with URL hash so refresh keeps the user on
  // the same section (e.g. /settings#hours).
  const initialSection = (() => {
    const hash = (typeof window !== 'undefined' ? window.location.hash.slice(1) : '');
    return isValidSection(hash) ? hash : 'business';
  })();
  const [section, setSection] = useState<SettingsSection>(initialSection);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const next = `#${section}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', `${window.location.pathname}${next}`);
    }
  }, [section]);

  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => tenantApi.get(),
  });

  // Local form state that mirrors the tenant. Auto-save propagates changes
  // back to the API; React Query cache is the source of truth.
  const [draft, setDraft] = useState<Tenant | null>(null);
  useEffect(() => {
    if (tenant) setDraft(tenant);
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Tenant>) => tenantApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
    },
  });

  // useAutoSave compares the draft against the last successfully-saved
  // tenant snapshot. The save fn is the existing tenantApi.update — which
  // accepts a partial.
  const { status, lastSavedAt, retry } = useAutoSave<Tenant | null>(
    draft,
    async (v) => {
      if (!v) return;
      await updateMutation.mutateAsync(v);
    },
    {
      // Default 600ms debounce — quick enough to feel live, long enough to
      // batch successive keystrokes into one save.
      debounceMs: 600,
    },
  );

  // Section components consume `draft` + this updater. Each field-level
  // change calls onUpdate({ [field]: value }) → useAutoSave handles the rest.
  const onUpdate = (patch: Partial<Tenant>) => {
    setDraft(prev => (prev ? { ...prev, ...patch } : prev));
  };

  return (
    <div className="space-y-5">
      {/* ─── Editorial hero with auto-save indicator ──── */}
      <PageHeader
        eyebrow={(
          <>
            <span>{t('settings.title')}</span>
            {currentOffice && (
              <>
                <PageHeaderDivider />
                <span className="inline-flex items-center gap-1 normal-case tracking-normal font-medium">
                  <MapPinIcon className="h-3 w-3" />
                  {currentOffice.name}
                </span>
              </>
            )}
          </>
        )}
        title={t(SIDEBAR_ITEMS.find(it => it.id === section)?.labelKey ?? 'settings.title')}
        action={<SaveStatusIndicator status={status} lastSavedAt={lastSavedAt} onRetry={retry} />}
      />

      {/* ─── Sub-sidebar + content layout ──── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[14rem_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-2">
            <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              {t('settings.configure')}
            </p>
            <nav className="flex flex-col gap-0.5">
              {SIDEBAR_ITEMS.map((item, i) => {
                const Icon = item.icon;
                const active = section === item.id;
                const showDivider = item.danger && i > 0;
                return (
                  <div key={item.id}>
                    {showDivider && <div className="my-1.5 mx-3 border-t border-border" />}
                    <motion.button
                      type="button"
                      onClick={() => setSection(item.id)}
                      whileHover={reduceMotion ? undefined : { x: 1 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      className={cn(
                        'relative w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                        active
                          ? item.danger
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-foreground'
                          : item.danger
                            ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                            : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground',
                      )}
                    >
                      {/* Shared-element active background — flies between
                          sidebar items via layoutId. Reduced-motion users
                          get a static bg from the className above. */}
                      {active && !reduceMotion && (
                        <motion.span
                          layoutId="settings-sidebar-active"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          aria-hidden
                          className={cn(
                            'absolute inset-0 -z-0 rounded-md',
                            item.danger ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-accent',
                          )}
                        />
                      )}
                      {active && reduceMotion && (
                        <span
                          aria-hidden
                          className={cn(
                            'absolute inset-0 -z-0 rounded-md',
                            item.danger ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-accent',
                          )}
                        />
                      )}
                      <Icon className="relative z-10 h-4 w-4" />
                      <span className="relative z-10">{t(item.labelKey)}</span>
                    </motion.button>
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content — AnimatePresence + key=section gives a fade+slide swap
            when the user picks a different sidebar item. min-w-0 + max-w-3xl
            keeps long forms from stretching past comfortable reading width. */}
        <div className="min-w-0 max-w-3xl">
          {!draft ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground"
            >
              {t('common.loading')}
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: MOTION_EASE }}
              >
                {section === 'business'      && <BusinessSection      tenant={draft} onUpdate={onUpdate} />}
                {section === 'hours'         && <HoursSection         tenant={draft} onUpdate={onUpdate} />}
                {section === 'booking-rules' && <BookingRulesSection  tenant={draft} onUpdate={onUpdate} />}
                {section === 'appearance'    && <AppearanceSection    tenant={draft} onUpdate={onUpdate} />}
                {section === 'advanced'      && <AdvancedSection      tenant={draft} onUpdate={onUpdate} />}
                {section === 'notifications' && (
                  <ComingSoonSection
                    titleKey="settings.section.notifications"
                    descriptionKey="settings.notifications.description"
                    icon={BellIcon}
                  />
                )}
                {section === 'billing' && (
                  <ComingSoonSection
                    titleKey="settings.section.billing"
                    descriptionKey="settings.billing.description"
                    icon={CreditCardIcon}
                  />
                )}
                {section === 'integrations' && (
                  <ComingSoonSection
                    titleKey="settings.section.integrations"
                    descriptionKey="settings.integrations.description"
                    icon={PuzzlePieceIcon}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
