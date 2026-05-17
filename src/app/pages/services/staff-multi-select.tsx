import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Popover from '@radix-ui/react-popover';
import { UserIcon, ChevronDownIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { staffApi } from '../../lib/api';
import { cn } from '../../components/ui/utils';

export interface StaffMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  officeId?: string;
}

export function StaffMultiSelect({ value, onChange, officeId }: StaffMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', officeId],
    queryFn: () => staffApi.getAll(officeId),
  });

  const filtered = staff.filter(s => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return s.firstName.toLowerCase().includes(q) || s.lastName.toLowerCase().includes(q);
  });

  const selectedStaff = staff.filter(s => value.includes(s.id));

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  };

  const remove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(x => x !== id));
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm text-left transition-colors',
            'hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          {selectedStaff.length === 0 ? (
            <span className="text-muted-foreground flex items-center gap-1.5">
              <UserIcon className="h-4 w-4 shrink-0" />
              {staff.length === 0 ? 'No staff members' : 'Select staff…'}
            </span>
          ) : (
            selectedStaff.map(s => {
              const initials = `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`.toUpperCase();
              return (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 rounded-full bg-muted pl-1 pr-1.5 py-0.5 text-xs font-medium text-foreground"
                >
                  {s.avatarUrl ? (
                    <img src={s.avatarUrl} alt={initials} className="h-4 w-4 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground/10 text-[9px] font-bold">
                      {initials}
                    </span>
                  )}
                  {s.firstName} {s.lastName}
                  <button
                    type="button"
                    onClick={(e) => remove(s.id, e)}
                    className="ml-0.5 rounded-full text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${s.firstName}`}
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              );
            })
          )}
          <ChevronDownIcon className={cn('ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-md border border-border bg-popover p-0 shadow-lg"
          sideOffset={4}
          align="start"
        >
          <div className="flex items-center border-b border-border px-3">
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="flex-1 bg-transparent py-2 pl-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">No staff found</p>
            ) : (
              filtered.map(s => {
                const initials = `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`.toUpperCase();
                const checked = value.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <span className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input transition-colors',
                      checked && 'bg-foreground border-foreground',
                    )}>
                      {checked && (
                        <svg viewBox="0 0 10 8" fill="none" className="h-2.5 w-2.5">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-background" />
                        </svg>
                      )}
                    </span>
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} alt={initials} className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                        {initials}
                      </span>
                    )}
                    <span className="text-foreground">{s.firstName} {s.lastName}</span>
                  </button>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
