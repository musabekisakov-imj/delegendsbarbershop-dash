import type { ComponentType } from 'react';
import { useT } from '../../hooks/use-t';
import { cn } from '../../components/ui/utils';
import type { TranslationKey } from '../../i18n';

interface ComingSoonProps {
  /** Translation key for the section title (e.g. "settings.section.notifications"). */
  titleKey: TranslationKey;
  /** Translation key for the body description. */
  descriptionKey: TranslationKey;
  /** Heroicon component to render in the empty-state hero. */
  icon: ComponentType<{ className?: string }>;
  className?: string;
}

/**
 * Shared empty-state for sections whose feature isn't built yet
 * (Notifications, Billing, Integrations). The sidebar entry exists so
 * the architecture is fully visible to the user; the content area surfaces
 * a calm "Coming soon" hero with a one-sentence description.
 */
export function ComingSoonSection({ titleKey, descriptionKey, icon: Icon, className }: ComingSoonProps) {
  const t = useT();
  return (
    <div className={cn('rounded-xl border border-border bg-card', className)}>
      <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-foreground">
          {t(titleKey)}
        </h2>
        <p className="text-[13px] text-muted-foreground max-w-md leading-relaxed">
          {t(descriptionKey)}
        </p>
        <span className="mt-2 inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
          {t('settings.comingSoon')}
        </span>
      </div>
    </div>
  );
}
