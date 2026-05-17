import { useState } from 'react';
import { ShieldCheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '../../components/ui/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import { ROLE_PERMISSIONS } from '../../lib/permissions';
import { getRoleColor } from '../../lib/tokens';
import type { StaffRole, Permission } from '../../types';

const ROLES: StaffRole[] = ['owner', 'manager', 'receptionist', 'barber'];

interface CapabilityRow {
  key: string;
  label: string;
  tooltip: string;
  permissions: Permission[];
}

interface PermissionsMatrixProps {
  roleLabels: Record<StaffRole, string>;
  capabilityRows: CapabilityRow[];
  permCountLabel: string;
}

function PermissionGlyph({
  role, permissions, isRowHovered, isColHovered,
}: {
  role: StaffRole;
  permissions: Permission[];
  isRowHovered: boolean;
  isColHovered: boolean;
}) {
  const granted = permissions.filter(p => ROLE_PERMISSIONS[role].includes(p)).length;
  const total = permissions.length;
  const color = getRoleColor(role);
  const highlight = isRowHovered || isColHovered;

  if (granted === 0) {
    return (
      <span
        aria-label="Not granted"
        className={cn(
          'inline-block h-2 w-2 rounded-full ring-1 ring-muted-foreground/25 transition-opacity',
          highlight ? 'opacity-40' : 'opacity-100',
        )}
      />
    );
  }
  if (granted === total) {
    return (
      <span
        aria-label="Full access"
        className={cn('inline-block h-2 w-2 rounded-full transition-transform', color.dot, highlight && 'scale-125')}
      />
    );
  }
  return (
    <span
      aria-label={`Partial — ${granted} of ${total}`}
      className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums text-muted-foreground"
    >
      <span className={cn('inline-block h-2 w-2 rounded-full opacity-50', color.dot)} />
      {granted}/{total}
    </span>
  );
}

export function PermissionsMatrix({ roleLabels, capabilityRows, permCountLabel }: PermissionsMatrixProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<StaffRole | null>(null);

  return (
    <details className="group rounded-xl border border-border bg-card overflow-hidden">
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-3 hover:bg-accent/30 transition-colors">
        <ShieldCheckIcon className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Permissions · matrix
          </p>
          <p className="text-sm font-medium text-foreground">
            Who can do what
            <span className="ml-2 font-normal text-muted-foreground">— hover any row to compare</span>
          </p>
        </div>
        <ChevronDownIcon className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-border overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm border-collapse">
          <thead>
            <tr className="bg-muted/20">
              <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground w-1/2">
                Capability
              </th>
              {ROLES.map(r => {
                const color = getRoleColor(r);
                return (
                  <th
                    key={r}
                    onMouseEnter={() => setHoveredCol(r)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={cn(
                      'px-3 py-3 align-bottom transition-colors cursor-default',
                      hoveredCol === r && 'bg-muted/30',
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">
                        <span className={cn('h-1.5 w-1.5 rounded-full', color.dot)} />
                        {roleLabels[r]}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {ROLE_PERMISSIONS[r].length} {permCountLabel}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {capabilityRows.map(row => {
              const isRow = hoveredRow === row.key;
              return (
                <tr
                  key={row.key}
                  onMouseEnter={() => setHoveredRow(row.key)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={cn(
                    'border-t border-border transition-colors',
                    isRow ? 'bg-muted/30' : 'hover:bg-muted/15',
                  )}
                >
                  <td className="px-5 py-2.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[13px] text-foreground/90 cursor-default underline decoration-dotted decoration-muted-foreground/40 underline-offset-2">
                          {row.label}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {row.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  {ROLES.map(r => (
                    <td
                      key={r}
                      onMouseEnter={() => setHoveredCol(r)}
                      onMouseLeave={() => setHoveredCol(null)}
                      className={cn(
                        'px-3 py-2.5 text-center transition-colors',
                        hoveredCol === r && !isRow && 'bg-muted/20',
                      )}
                    >
                      <div className="inline-flex items-center justify-center min-h-[1rem]">
                        <PermissionGlyph
                          role={r}
                          permissions={row.permissions}
                          isRowHovered={isRow}
                          isColHovered={hoveredCol === r}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
