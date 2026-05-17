import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import {
  UserIcon,
  UsersIcon,
  ScissorsIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useGlobalSearch, type SearchResult } from '../hooks/use-global-search';
import { cn } from './ui/utils';
import { CONTAINER_SHELL } from './layout/header';
import { useT } from '../hooks/use-t';

const KIND_ICON: Record<SearchResult['kind'], typeof UserIcon> = {
  client: UserIcon,
  staff: UsersIcon,
  service: ScissorsIcon,
  booking: CalendarIcon,
};

const KIND_HEADING: Record<SearchResult['kind'], string> = {
  client: 'Clients',
  staff: 'Staff',
  service: 'Services',
  booking: 'Recent bookings',
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const t = useT();
  const results = useGlobalSearch(query);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const grouped = results.reduce<Record<SearchResult['kind'], SearchResult[]>>(
    (acc, r) => {
      acc[r.kind].push(r);
      return acc;
    },
    { client: [], staff: [], service: [], booking: [] },
  );

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    navigate(result.href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(CONTAINER_SHELL, 'hidden md:inline-flex')}
        aria-label={t('search.open')}
      >
        <MagnifyingGlassIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        <kbd className="font-mono text-[11px] font-semibold text-muted-foreground/80 tracking-tight">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Global search" description="Search clients, staff, services, and bookings across all offices">
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search across all offices…"
        />
        <CommandList>
          {query && results.length === 0 && (
            <CommandEmpty>No matches for &ldquo;{query}&rdquo;</CommandEmpty>
          )}
          {!query && <CommandEmpty>Start typing to search…</CommandEmpty>}

          {(['client', 'staff', 'service', 'booking'] as const).map((kind) => {
            const items = grouped[kind];
            if (items.length === 0) return null;
            const Icon = KIND_ICON[kind];
            return (
              <CommandGroup key={kind} heading={KIND_HEADING[kind]}>
                {items.map((r) => (
                  <CommandItem
                    key={`${r.kind}-${r.id}`}
                    value={`${r.kind}-${r.id}-${r.title}`}
                    onSelect={() => handleSelect(r)}
                  >
                    <Icon />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{r.title}</p>
                      {r.subtitle && (
                        <p className="truncate text-xs text-muted-foreground">{r.subtitle}</p>
                      )}
                    </div>
                    {r.office && (
                      <span className={cn(
                        'shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase',
                        r.office.id === 'office-1' ? 'text-blue-600 dark:text-blue-400' : 'text-violet-600 dark:text-violet-400',
                      )}>
                        {r.office.name}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
