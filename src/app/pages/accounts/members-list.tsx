import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import {
  UserCircleIcon, MapPinIcon, ClockIcon,
  PencilSquareIcon, TrashIcon, LockClosedIcon,
} from '@heroicons/react/24/outline';

import { cn } from '../../components/ui/utils';
import { AVATAR_GRADIENTS, hashToIndex, MOTION_DUR, MOTION_EASE, getRoleColor, ROLE_LABEL } from '../../lib/tokens';
import { StatusBadge } from './status-badge';
import type { Account, StaffRole } from '../../types';

const TABLE_COLS =
  'grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2fr)_7rem_8rem_auto] lg:grid-cols-[minmax(0,2fr)_7rem_minmax(0,1.2fr)_8rem_6.5rem_auto]';

interface CardActionProps {
  offices: { id: string; name: string }[];
  currentUserId: string | undefined;
  canManage: boolean;
  resolveAvatar: (a: Account) => string | undefined;
  onToggleStatus: (a: Account) => void;
  onEdit: (a: Account) => void;
  onRemove: (a: Account) => void | Promise<void>;
}

interface MembersListProps extends CardActionProps {
  accounts: Account[];
  groupByRole: boolean;
  statusLabels: { active: string; invited: string; disabled: string };
  colHeaders: { member: string; role: string; offices: string; lastSeen: string; status: string };
}

function ColHeader({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <span className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground', className)}>
      {children}
    </span>
  );
}

function GroupHeader({ role, count, index }: { role: StaffRole; count: number; index: number }) {
  const reducedMotion = useReducedMotion();
  const color = getRoleColor(role);
  return (
    <motion.li
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: reducedMotion ? 0 : Math.min(index * 0.02, 0.2) }}
      className={cn('flex items-center justify-between gap-2 border-l-[3px] px-5 py-2', color.tintBg)}
    >
      <span className={cn('text-[11px] font-bold uppercase tracking-[0.18em] inline-flex items-center gap-1.5', color.tintText)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', color.dot)} />
        {ROLE_LABEL[role]}{count === 1 ? '' : 's'}
      </span>
      <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-card border border-border text-[10px] font-semibold tabular-nums text-muted-foreground">
        {count}
      </span>
    </motion.li>
  );
}

function MemberRow({
  account: a, index, offices, currentUserId, canManage,
  resolveAvatar, onToggleStatus, onEdit, onRemove, statusLabels,
}: CardActionProps & {
  account: Account;
  index: number;
  statusLabels: { active: string; invited: string; disabled: string };
}) {
  const reducedMotion = useReducedMotion();
  const initials = `${a.firstName[0] ?? ''}${a.lastName[0] ?? ''}`.toUpperCase();
  const isSelf = a.id === currentUserId;
  const officeNames = a.officeIds.map(id => offices.find(o => o.id === id)?.name ?? '—');
  const photoUrl = resolveAvatar(a);
  const gradient = AVATAR_GRADIENTS[hashToIndex(a.id, AVATAR_GRADIENTS.length)];
  const color = getRoleColor(a.role);
  const seenLabel = a.lastLoginAt
    ? formatDistanceToNow(new Date(a.lastLoginAt), { addSuffix: true })
    : 'Never';
  const isRecentlyActive = a.status === 'active' && a.lastLoginAt
    ? differenceInMinutes(new Date(), new Date(a.lastLoginAt)) < 60
    : false;

  return (
    <motion.li
      layout
      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: MOTION_DUR.base, delay: reducedMotion ? 0 : Math.min(index * 0.02, 0.2), ease: MOTION_EASE }}
      className={cn(TABLE_COLS, 'group gap-4 items-center px-5 py-3 transition-colors hover:bg-accent/30')}
    >
      {/* Member cell */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={`${a.firstName} ${a.lastName}`} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white', gradient)}>
              {initials || <UserCircleIcon className="h-5 w-5 text-white/90" />}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-medium text-foreground truncate">{a.firstName} {a.lastName}</p>
            {isSelf && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-px shrink-0">
                you
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{a.email}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground md:hidden">
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', color.dot)} />
            <span>{ROLE_LABEL[a.role]}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="tabular-nums">{seenLabel}</span>
          </div>
        </div>
      </div>

      {/* Role — md+ */}
      <div className="hidden md:flex items-center min-w-0">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] truncate', color.chip)}>
          <span className={cn('h-1 w-1 rounded-full shrink-0', color.dot)} />
          {ROLE_LABEL[a.role]}
        </span>
      </div>

      {/* Offices — lg+ */}
      <div className="hidden lg:flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
        <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {officeNames.length === 0 ? '—' : officeNames.length <= 1 ? officeNames[0] : `${officeNames[0]} +${officeNames.length - 1}`}
        </span>
      </div>

      {/* Last seen — md+ */}
      <div className="hidden md:flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
        <div className="relative shrink-0">
          <ClockIcon className="h-3.5 w-3.5" />
          {isRecentlyActive && (
            <>
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-card" aria-label="Active in last hour" />
              {!reducedMotion && (
                <motion.span
                  className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-emerald-500"
                  initial={{ opacity: 0.6, scale: 1 }}
                  animate={{ opacity: 0, scale: 2.2 }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  aria-hidden
                />
              )}
            </>
          )}
        </div>
        <span className="tabular-nums truncate">{seenLabel}</span>
      </div>

      {/* Status — lg+ */}
      <div className="hidden lg:flex items-center min-w-0">
        <StatusBadge status={a.status} labels={statusLabels} />
      </div>

      {/* Actions */}
      {canManage ? (
        <div className="flex items-center gap-0.5 justify-end opacity-60 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
          <button
            onClick={() => onToggleStatus(a)}
            disabled={isSelf}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            title={a.status === 'active' ? 'Disable account' : 'Reactivate account'}
          >
            <LockClosedIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(a)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            title="Edit"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onRemove(a)}
            disabled={isSelf}
            className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            title="Remove"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <span />
      )}
    </motion.li>
  );
}

export function MembersList({
  accounts, groupByRole, offices, currentUserId, canManage,
  resolveAvatar, onToggleStatus, onEdit, onRemove, statusLabels, colHeaders,
}: MembersListProps) {
  type Row =
    | { kind: 'header'; role: StaffRole; count: number }
    | { kind: 'member'; account: Account };

  const rows: Row[] = [];
  if (groupByRole) {
    (['owner', 'manager', 'receptionist', 'barber'] as StaffRole[]).forEach(r => {
      const group = accounts.filter(a => a.role === r);
      if (group.length === 0) return;
      rows.push({ kind: 'header', role: r, count: group.length });
      group.forEach(a => rows.push({ kind: 'member', account: a }));
    });
  } else {
    accounts.forEach(a => rows.push({ kind: 'member', account: a }));
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className={cn(TABLE_COLS, 'gap-4 border-b border-border bg-muted/20 px-5 py-2.5')}>
        <ColHeader>{colHeaders.member}</ColHeader>
        <ColHeader className="hidden md:block">{colHeaders.role}</ColHeader>
        <ColHeader className="hidden lg:block">{colHeaders.offices}</ColHeader>
        <ColHeader className="hidden md:block">{colHeaders.lastSeen}</ColHeader>
        <ColHeader className="hidden lg:block">{colHeaders.status}</ColHeader>
        <span />
      </div>
      <ul className="divide-y divide-border">
        <AnimatePresence initial={false}>
          {rows.map((row, i) =>
            row.kind === 'header' ? (
              <GroupHeader key={`h-${row.role}`} role={row.role} count={row.count} index={i} />
            ) : (
              <MemberRow
                key={row.account.id}
                account={row.account}
                index={i}
                offices={offices}
                currentUserId={currentUserId}
                canManage={canManage}
                resolveAvatar={resolveAvatar}
                onToggleStatus={onToggleStatus}
                onEdit={onEdit}
                onRemove={onRemove}
                statusLabels={statusLabels}
              />
            ),
          )}
        </AnimatePresence>
      </ul>
    </div>
  );
}
