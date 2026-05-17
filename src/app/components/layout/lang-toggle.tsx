import { useLanguage } from '../../hooks/use-t';
import { cn } from '../ui/utils';
import type { Language } from '../../types';

const LANGS: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'lt', label: 'LT' },
];

export function LangToggle({ className }: { className?: string }) {
  const [lang, setLang] = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn('inline-flex items-center rounded-md border border-border overflow-hidden', className)}
    >
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            'px-2 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider transition-colors',
            lang === code
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
