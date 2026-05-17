import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, LayoutGroup, useReducedMotion } from 'motion/react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
  UserCircleIcon, PlusIcon, EnvelopeIcon,
  ClockIcon, MapPinIcon, PencilSquareIcon, PowerIcon,
} from '@heroicons/react/24/outline';

import { HoverCard, HoverCardTrigger, HoverCardContent } from '../../components/ui/hover-card';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import { AVATAR_GRADIENTS, hashToIndex, MOTION_DUR, MOTION_EASE, getRoleColor, ROLE_LABEL } from '../../lib/tokens';
import { StatusBadge } from './status-badge';
import type { Account, StaffRole } from '../../types';

type Tier = 'owner' | 'manager' | 'report';

interface Edge { fromId: string; toId: string; d: string; }

interface TreeSharedProps {
  offices: { id: string; name: string }[];
  resolveAvatar: (a: Account) => string | undefined;
  onEdit: (a: Account) => void;
  onToggleStatus: (a: Account) => void;
  statusLabels: { active: string; invited: string; disabled: string };
}

interface MembersTreeProps extends TreeSharedProps {
  accounts: Account[];
  search: string;
  onInvite: () => void;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction: string;
}

function EmptyTreeState({ onInvite, title, description, action }: {
  onInvite: () => void; title: string; description: string; action: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card tree-grid-bg p-10 lg:p-14 flex justify-center">
      <div className="w-[280px] rounded-xl border border-dashed border-border bg-card/50 p-8 flex flex-col items-center gap-3 text-center">
        <EnvelopeIcon className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        <Button size="sm" onClick={onInvite} className="mt-1">
          <PlusIcon className="h-4 w-4 mr-1" />
          {action}
        </Button>
      </div>
    </div>
  );
}

function TreePreview({ a, offices, onEdit, onToggleStatus, statusLabels }: TreeSharedProps & { a: Account }) {
  const initials = `${a.firstName[0] ?? ''}${a.lastName[0] ?? ''}`.toUpperCase();
  const officeNames = a.officeIds.map(id => offices.find(o => o.id === id)?.name).filter((x): x is string => Boolean(x));
  const seen = a.lastLoginAt ? `${formatDistanceToNow(parseISO(a.lastLoginAt))} ago` : null;
  const color = getRoleColor(a.role);

  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-3 p-4">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shrink-0', AVATAR_GRADIENTS[hashToIndex(a.id, AVATAR_GRADIENTS.length)])}>
          {initials || <UserCircleIcon className="h-6 w-6 text-white/90" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{a.firstName} {a.lastName}</p>
          <span className={cn('mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]', color.chip)}>
            <span className={cn('h-1 w-1 rounded-full', color.dot)} />
            {ROLE_LABEL[a.role]}
          </span>
        </div>
      </div>
      <div className="px-4 pb-3 space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 min-w-0">
          <EnvelopeIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="select-text truncate">{a.email}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <ClockIcon className="h-3.5 w-3.5 shrink-0" />
          {seen ? <span className="tabular-nums">{seen}</span> : <span className="italic text-muted-foreground/70">Never signed in</span>}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{officeNames.length === 0 ? '—' : officeNames.join(', ')}</span>
        </div>
      </div>
      <div className="px-4 pb-3">
        <StatusBadge status={a.status} labels={statusLabels} />
      </div>
      <div className="flex items-center gap-2 border-t border-border px-3 py-2.5">
        <Button size="sm" className="flex-1" onClick={() => onEdit(a)}>
          <PencilSquareIcon className="h-4 w-4 mr-1.5" />
          Edit details
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onToggleStatus(a)} title="Toggle status">
          <PowerIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TreeNode({
  a, tier, idx, registerRef, hovered, setHoveredId, dimmed,
  resolveAvatar, offices, onEdit, onToggleStatus, statusLabels,
}: TreeSharedProps & {
  a: Account; tier: Tier; idx: number;
  registerRef: (node: HTMLElement | null) => void;
  hovered: boolean; setHoveredId: (id: string | null) => void; dimmed: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const initials = `${a.firstName[0] ?? ''}${a.lastName[0] ?? ''}`.toUpperCase();
  const photoUrl = resolveAvatar(a);
  const gradient = AVATAR_GRADIENTS[hashToIndex(a.id, AVATAR_GRADIENTS.length)];
  const color = getRoleColor(a.role);
  const officeNames = a.officeIds.map(id => offices.find(o => o.id === id)?.name).filter((x): x is string => Boolean(x));

  const enterDelay = reducedMotion ? 0
    : tier === 'owner' ? 0
    : tier === 'manager' ? 0.08 + idx * 0.08
    : 0.4 + idx * 0.06;

  const footerLine = tier === 'report'
    ? officeNames.length === 0 ? '—' : `${officeNames.length} office${officeNames.length === 1 ? '' : 's'}`
    : a.lastLoginAt ? `active ${formatDistanceToNow(parseISO(a.lastLoginAt))} ago` : 'never signed in';

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <motion.button
          ref={registerRef}
          type="button"
          onMouseEnter={() => setHoveredId(a.id)}
          onMouseLeave={() => setHoveredId(null)}
          onFocus={() => setHoveredId(a.id)}
          onBlur={() => setHoveredId(null)}
          initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: dimmed ? 0.3 : 1, scale: 1 }}
          transition={{ duration: MOTION_DUR.base, ease: MOTION_EASE, delay: enterDelay }}
          className={cn(
            'group relative w-[164px] h-[176px] rounded-xl border border-border bg-card p-4',
            'flex flex-col items-center gap-2 cursor-pointer outline-none',
            'transition-[border-color,box-shadow,transform] duration-200',
            'hover:border-foreground/30 hover:-translate-y-0.5',
            'hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] dark:hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            a.status === 'disabled' && 'opacity-60',
          )}
        >
          <span aria-hidden className={cn('absolute inset-y-3 left-0 w-[3px] rounded-r-full', color.dot)} />
          <span
            aria-label={a.status === 'active' ? 'Active' : a.status === 'invited' ? 'Pending invite' : 'Disabled'}
            className={cn(
              'absolute top-2 right-2 h-2 w-2 rounded-full',
              a.status === 'active' && 'bg-emerald-500',
              a.status === 'invited' && 'bg-amber-500',
              a.status === 'disabled' && 'bg-muted-foreground/40',
            )}
          />
          {a.status === 'invited' && !reducedMotion && (
            <motion.span
              className="absolute top-2 right-2 h-2 w-2 rounded-full ring-2 ring-amber-500"
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: 0, scale: 2.4 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              aria-hidden
            />
          )}
          <div className="mt-0.5">
            {photoUrl ? (
              <img src={photoUrl} alt="" className={cn('h-14 w-14 rounded-full object-cover ring-2 ring-offset-2 ring-offset-card', color.ring)} />
            ) : (
              <div className={cn('flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ring-2 ring-offset-2 ring-offset-card', gradient, color.ring)}>
                {initials || <UserCircleIcon className="h-7 w-7 text-white/90" />}
              </div>
            )}
          </div>
          <p className="text-[13px] font-semibold tracking-tight text-foreground text-center leading-tight truncate w-full">
            {a.firstName} {a.lastName}
          </p>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]', color.chip)}>
            <span className={cn('h-1 w-1 rounded-full', color.dot)} />
            {ROLE_LABEL[a.role]}
          </span>
          <div className="mt-auto w-full pt-1.5 border-t border-border/60 text-[10px] text-muted-foreground tabular-nums text-center truncate">
            {footerLine}
          </div>
          {hovered && (
            <motion.span
              layoutId="tree-focus-ring"
              aria-hidden
              className="absolute -inset-px rounded-xl ring-2 ring-foreground/40 pointer-events-none"
              transition={{ duration: MOTION_DUR.base, ease: MOTION_EASE }}
            />
          )}
        </motion.button>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="center" className="w-72 p-0 border border-border bg-popover shadow-lg">
        <TreePreview a={a} offices={offices} onEdit={onEdit} onToggleStatus={onToggleStatus} statusLabels={statusLabels} resolveAvatar={resolveAvatar} />
      </HoverCardContent>
    </HoverCard>
  );
}

export function MembersTree({
  accounts, search, offices, resolveAvatar, onEdit, onToggleStatus, onInvite,
  emptyTitle, emptyDescription, emptyAction, statusLabels,
}: MembersTreeProps) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Map<string, HTMLElement>>(new Map());
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const owners   = useMemo(() => accounts.filter(a => a.role === 'owner'),   [accounts]);
  const managers = useMemo(() => accounts.filter(a => a.role === 'manager'), [accounts]);
  const reports  = useMemo(() => accounts.filter(a => a.role === 'receptionist' || a.role === 'barber'), [accounts]);
  const cols = Math.max(managers.length, reports.length, 1);

  const dimmedIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(accounts.filter(a => !(
      a.email.toLowerCase().includes(q) ||
      a.firstName.toLowerCase().includes(q) ||
      a.lastName.toLowerCase().includes(q)
    )).map(a => a.id));
  }, [search, accounts]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const recompute = () => {
      const cBox = container.getBoundingClientRect();
      const rectFor = (id: string) => {
        const el = refs.current.get(id);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { topX: r.left - cBox.left + r.width / 2, topY: r.top - cBox.top, bottomX: r.left - cBox.left + r.width / 2, bottomY: r.bottom - cBox.top };
      };
      const bezier = (x1: number, y1: number, x2: number, y2: number) => {
        const my = (y1 + y2) / 2;
        return `M ${x1},${y1} C ${x1},${my} ${x2},${my} ${x2},${y2}`;
      };
      const next: Edge[] = [];
      if (owners.length > 0) {
        const targets = managers.length > 0 ? managers : reports;
        for (const o of owners) {
          const oBox = rectFor(o.id); if (!oBox) continue;
          for (const t of targets) {
            const tBox = rectFor(t.id); if (!tBox) continue;
            next.push({ fromId: o.id, toId: t.id, d: bezier(oBox.bottomX, oBox.bottomY, tBox.topX, tBox.topY) });
          }
        }
      }
      if (managers.length > 0 && reports.length > 0) {
        for (const m of managers) {
          const mBox = rectFor(m.id); if (!mBox) continue;
          for (const r of reports) {
            const rBox = rectFor(r.id); if (!rBox) continue;
            next.push({ fromId: m.id, toId: r.id, d: bezier(mBox.bottomX, mBox.bottomY, rBox.topX, rBox.topY) });
          }
        }
      }
      setEdges(next);
    };
    let raf1 = 0, raf2 = 0;
    raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(recompute); });
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); ro.disconnect(); };
  }, [accounts, owners, managers, reports]);

  if (accounts.length === 0) {
    return <EmptyTreeState onInvite={onInvite} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  const fanFactor = managers.length > 1 ? 0.45 : 0.85;
  const registerRef = (id: string) => (node: HTMLElement | null) => {
    if (node) refs.current.set(id, node); else refs.current.delete(id);
  };

  const nodeProps = (a: Account, tier: Tier, idx: number) => ({
    a, tier, idx,
    registerRef: registerRef(a.id),
    hovered: hoveredId === a.id,
    setHoveredId,
    dimmed: dimmedIds.has(a.id),
    resolveAvatar, offices, onEdit, onToggleStatus, statusLabels,
  });

  return (
    <LayoutGroup id="tree">
      <div className="rounded-2xl border border-border bg-card tree-grid-bg p-6 sm:p-10 lg:p-14 overflow-x-auto">
        <div ref={containerRef} className="relative min-w-[640px] mx-auto">
          <svg className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden>
            {edges.map((e, i) => {
              const isHi = hoveredId === e.toId || hoveredId === e.fromId;
              const isDim = dimmedIds.has(e.toId);
              return (
                <motion.path
                  key={`${e.fromId}->${e.toId}`}
                  d={e.d} fill="none" strokeWidth={1.25}
                  stroke={isHi ? 'var(--foreground)' : 'var(--border)'}
                  strokeOpacity={isDim ? 0.12 : isHi ? 0.6 : fanFactor}
                  initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: MOTION_DUR.slow, ease: MOTION_EASE, delay: reducedMotion ? 0 : 0.2 + i * 0.05 }}
                />
              );
            })}
          </svg>
          <div className="relative grid gap-x-6 gap-y-14" style={{ gridTemplateColumns: `repeat(${cols}, minmax(164px, 1fr))` }}>
            <div className="col-span-full flex justify-center gap-6">
              {owners.map((a, i) => <TreeNode key={a.id} {...nodeProps(a, 'owner', i)} />)}
            </div>
            {managers.length > 0 && (
              <div className="col-span-full flex flex-wrap justify-around gap-x-6 gap-y-4">
                {managers.map((a, i) => <TreeNode key={a.id} {...nodeProps(a, 'manager', i)} />)}
              </div>
            )}
            {reports.length > 0 && (
              <div className="col-span-full flex flex-wrap justify-center gap-6">
                {reports.map((a, i) => <TreeNode key={a.id} {...nodeProps(a, 'report', i)} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutGroup>
  );
}
