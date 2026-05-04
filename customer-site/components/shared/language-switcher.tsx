'use client';

import { useLang } from '@/lib/use-t';
import { LANGS, LANG_LABEL, type Lang } from '@/i18n';
import { cn } from '@/lib/cn';

export function LanguageSwitcher({ overHero = false }: { overHero?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div
      role="group"
      aria-label="Language switcher"
      className={cn(
        'inline-flex items-center border',
        overHero ? 'border-white/30' : 'border-border-strong',
      )}
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
              ? overHero
                ? 'bg-white text-black'
                : 'bg-foreground text-background'
              : overHero
                ? 'text-white/65 hover:text-white hover:bg-white/10'
                : 'text-foreground/60 hover:text-foreground hover:bg-surface',
          )}
        >
          {LANG_LABEL[l as Lang]}
        </button>
      ))}
    </div>
  );
}
