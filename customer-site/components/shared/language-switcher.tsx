'use client';

import { useLang } from '@/lib/use-t';
import { LANGS, LANG_LABEL, type Lang } from '@/i18n';
import { cn } from '@/lib/cn';

export function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div
      role="group"
      aria-label="Language switcher"
      className="inline-flex items-center border border-border-strong"
    >
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            'px-2.5 py-1 text-[11px] font-mono font-medium uppercase tracking-[0.18em] transition-colors',
            lang === l
              ? 'bg-foreground text-background'
              : 'text-foreground/60 hover:text-foreground hover:bg-surface',
          )}
        >
          {LANG_LABEL[l as Lang]}
        </button>
      ))}
    </div>
  );
}
