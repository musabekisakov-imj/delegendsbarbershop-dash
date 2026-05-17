import { UsersIcon } from '@heroicons/react/24/outline';
import { STAFF_COLORS } from '../../lib/tokens';
import { useT } from '../../hooks/use-t';
import { FilterPill } from './filter-pill';

interface StaffMeta {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface StaffFilterRowProps {
  staff: StaffMeta[];
  staffColorMap: Map<string, number>;
  /** For single-select (day-agenda) pass a Set with 0 or 1 items. */
  selectedIds: Set<string>;
  /** Toggle a staff ID in/out of selection. Passing existing = deselect. */
  onToggle: (id: string | null) => void;
  countFor: (staffId: string) => number;
  totalCount: number;
}

export function StaffFilterRow({
  staff, staffColorMap, selectedIds, onToggle, countFor, totalCount,
}: StaffFilterRowProps) {
  const t = useT();
  const allSelected = selectedIds.size === 0;
  const chips = staff.filter(s => countFor(s.id) > 0);

  if (chips.length <= 1) return null;

  return (
    <div className="relative border-b border-border bg-black/[0.01] dark:bg-white/[0.01]">
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-none">

        <FilterPill
          variant="meta"
          icon={<UsersIcon className="h-4 w-4" />}
          label={t('calendar.filterAll')}
          count={totalCount}
          selected={allSelected}
          onClick={() => onToggle(null)}
        />

        <span className="h-5 w-px bg-border shrink-0" aria-hidden />

        {chips.map(s => {
          const colorIdx = staffColorMap.get(s.id) ?? 0;
          const color = STAFF_COLORS[colorIdx % STAFF_COLORS.length];
          return (
            <FilterPill
              key={s.id}
              variant="staff"
              label={s.firstName}
              count={countFor(s.id)}
              selected={selectedIds.has(s.id)}
              onClick={() => onToggle(s.id)}
              avatar={{
                src: s.avatarUrl,
                fallback: `${s.firstName[0]}${s.lastName[0]}`,
                color,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
