import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/use-t';
import { cn } from '../ui/utils';
import type { Language } from '../../types';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu';

const LANGS: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'lt', label: 'Lietuvių' },
];

export function LangDropdown({ className }: { className?: string }) {
  const [lang, setLang] = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Change language"
          className={cn(
            'inline-flex h-[30px] items-center gap-1 rounded-[7px] px-2 text-[12px] font-medium uppercase text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
            className,
          )}
        >
          {lang.toUpperCase()}
          <ChevronDownIcon className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {LANGS.map(({ code, label }) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => setLang(code)}
            className="flex items-center justify-between"
          >
            <span>{label}</span>
            {lang === code && <CheckIcon className="h-3.5 w-3.5 text-brand" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
