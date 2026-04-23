import { BuildingStorefrontIcon, CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { useOfficeStore } from '../store/office-store';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from './ui/utils';

export function OfficeSwitcher() {
  const offices = useOfficeStore((s) => s.offices);
  const currentOfficeId = useOfficeStore((s) => s.currentOfficeId);
  const setOfficeId = useOfficeStore((s) => s.setOfficeId);
  const current = offices.find((o) => o.id === currentOfficeId) ?? offices[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          aria-label="Switch office"
        >
          <BuildingStorefrontIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="hidden sm:inline max-w-[120px] truncate">{current?.name ?? 'Select office'}</span>
          <ChevronUpDownIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        <p className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">Offices</p>
        {offices.map((office) => {
          const isActive = office.id === currentOfficeId;
          return (
            <button
              key={office.id}
              onClick={() => setOfficeId(office.id)}
              className={cn(
                'flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                isActive ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/60',
              )}
            >
              <BuildingStorefrontIcon className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{office.name}</p>
                <p className="text-xs text-muted-foreground truncate">{office.address}</p>
              </div>
              {isActive && <CheckIcon className="h-4 w-4 shrink-0 mt-0.5 text-primary" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
