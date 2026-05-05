import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform, animate } from 'motion/react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import {
  PlusIcon, UserCircleIcon, EnvelopeIcon,
  PencilSquareIcon, TrashIcon, ShieldCheckIcon,
  ClockIcon, LockClosedIcon,
  MagnifyingGlassIcon, MapPinIcon, ChevronDownIcon,
  ListBulletIcon, Squares2X2Icon, ShareIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

import { accountsApi, tenantApi, staffApi } from '../lib/api';
import { EmptyState } from '../components/shared/empty-state';
import { Can } from '../components/shared/can';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Field } from '../components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { CardSkeleton } from '../components/shared/page-skeleton';
import { usePermission } from '../hooks/use-permission';
import { useConfirm } from '../hooks/use-confirm';
import { useAuthStore } from '../store/auth-store';
import { useOfficeStore } from '../store/office-store';
import { ROLE_PERMISSIONS } from '../lib/permissions';
import { AVATAR_GRADIENTS, hashToIndex } from '../lib/tokens';
import { cn } from '../components/ui/utils';
import { fileToDataUrl } from '../lib/image-upload';
import { PhotoIcon } from '@heroicons/react/24/outline';
import type { Account, StaffRole, AccountStatus, Permission } from '../types';

// Role palette — same hues used on the Staff page so the two pages feel linked.
// `bar` is a static Tailwind class for the editorial group-header left stripe;
// keeping it explicit (not interpolated) so JIT picks it up at build time.
const ROLE_STYLE: Record<StaffRole, { chip: string; dot: string; bar: string; label: string }> = {
  owner:        { chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',   dot: 'bg-amber-500',   bar: 'border-l-amber-500',   label: 'Owner' },
  manager:      { chip: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/60', dot: 'bg-violet-500', bar: 'border-l-violet-500', label: 'Manager' },
  receptionist: { chip: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60',       dot: 'bg-blue-500',    bar: 'border-l-blue-500',    label: 'Receptionist' },
  barber:       { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60', dot: 'bg-emerald-500', bar: 'border-l-emerald-500', label: 'Barber' },
};

type RoleFilter = 'all' | StaffRole;

export function AccountsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { can } = usePermission();
  const currentUser = useAuthStore(s => s.user);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  // View comparison toggle — list (current), cards (visual showcase), tree (org chart).
  // Owner picks which one stays after eyeballing each side-by-side.
  const [viewMode, setViewMode] = useState<'list' | 'cards' | 'tree'>('list');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAll,
  });

  const { data: tenant } = useQuery({ queryKey: ['tenant'], queryFn: tenantApi.get });
  const offices = tenant?.offices ?? [];

  // All staff (all offices) — used to resolve `account.staffId → staff.avatarUrl`
  // so an account linked to a staff record auto-inherits their photo.
  const { data: allStaff = [] } = useQuery({
    queryKey: ['staff', 'all'],
    queryFn: () => staffApi.getAll(),
  });
  const staffById = useMemo(() => {
    const m = new Map<string, typeof allStaff[number]>();
    allStaff.forEach(s => m.set(s.id, s));
    return m;
  }, [allStaff]);
  const resolveAvatar = (a: Account): string | undefined =>
    a.avatarUrl || (a.staffId ? staffById.get(a.staffId)?.avatarUrl : undefined);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter(a => {
      if (roleFilter !== 'all' && a.role !== roleFilter) return false;
      if (!q) return true;
      return (
        a.email.toLowerCase().includes(q) ||
        a.firstName.toLowerCase().includes(q) ||
        a.lastName.toLowerCase().includes(q)
      );
    });
  }, [accounts, search, roleFilter]);

  const roleCounts = useMemo(() => {
    const counts: Record<StaffRole, number> = { owner: 0, manager: 0, receptionist: 0, barber: 0 };
    for (const a of accounts) counts[a.role]++;
    return counts;
  }, [accounts]);

  // Editorial hero stats — active vs pending tells the operator at a
  // glance how many invites are still outstanding.
  const statusCounts = useMemo(() => {
    let active = 0, pending = 0, disabled = 0;
    for (const a of accounts) {
      if (a.status === 'active') active++;
      else if (a.status === 'invited') pending++;
      else if (a.status === 'disabled') disabled++;
    }
    return { active, pending, disabled };
  }, [accounts]);

  const currentOfficeId = useOfficeStore(s => s.currentOfficeId);
  const currentOffice = useMemo(() => offices.find(o => o.id === currentOfficeId), [offices, currentOfficeId]);

  const inviteMut = useMutation({
    mutationFn: accountsApi.invite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Invitation sent');
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to invite'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Account> }) => accountsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account updated');
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update'),
  });

  const removeMut = useMutation({
    mutationFn: accountsApi.remove,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['accounts'] });
      const previous = queryClient.getQueryData<Account[]>(['accounts']);
      queryClient.setQueryData<Account[]>(['accounts'], old => (old ?? []).filter(a => a.id !== id));
      return { previous };
    },
    onError: (e: Error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['accounts'], context.previous);
      toast.error(e.message || 'Failed to remove account');
    },
    onSuccess: () => toast.success('Account removed'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (a: Account) => { setEditing(a); setDialogOpen(true); };

  const handleRemove = async (a: Account) => {
    if (a.id === currentUser?.id) {
      toast.error("You can't remove your own account");
      return;
    }
    const ok = await confirm({
      title: 'Remove account',
      description: `${a.firstName} ${a.lastName} will lose access immediately.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) removeMut.mutate(a.id);
  };

  const toggleStatus = (a: Account) => {
    const next: AccountStatus = a.status === 'active' ? 'disabled' : 'active';
    updateMut.mutate({ id: a.id, data: { status: next } });
  };

  const ROLE_TABS: { id: RoleFilter; label: string; count: number }[] = [
    { id: 'all',          label: 'All',          count: accounts.length },
    { id: 'owner',        label: 'Owner',        count: roleCounts.owner },
    { id: 'manager',      label: 'Manager',      count: roleCounts.manager },
    { id: 'receptionist', label: 'Receptionist', count: roleCounts.receptionist },
    { id: 'barber',       label: 'Barber',       count: roleCounts.barber },
  ];

  return (
    <div className="space-y-5">
      {/* ─── Hero — "The Circle" direction ───────────────
          Trust page, visited monthly — deserves more weight
          than a scanning-page hero. The count animates up on
          mount; a segmented status ribbon sits below showing
          the active/pending/disabled proportions visually. */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>Team &amp; access</span>
            {currentOffice && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center gap-1 normal-case tracking-normal font-medium">
                  <MapPinIcon className="h-3 w-3" />
                  {currentOffice.name}
                </span>
              </>
            )}
            <span className="text-muted-foreground/40">·</span>
            <span className="normal-case tracking-normal">Permissions &amp; invites</span>
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-none tabular-nums flex items-baseline gap-2">
            <AnimatedCounter to={accounts.length} />
            <span className="text-muted-foreground/70 font-semibold">
              {accounts.length === 1 ? 'account' : 'accounts'}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Can action="accounts.manage">
            <Button size="sm" onClick={openNew}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Invite member
            </Button>
          </Can>
        </div>
      </div>

      {/* Segmented status ribbon — three proportions in one bar.
          Reads left-to-right: active (emerald) → pending (amber)
          → disabled (muted). Labels sit below, each clickable in
          a real dashboard would filter, but here it's just signal. */}
      {accounts.length > 0 && (
        <StatusRibbon
          active={statusCounts.active}
          pending={statusCounts.pending}
          disabled={statusCounts.disabled}
          total={accounts.length}
        />
      )}

      {/* ─── Permission cheat-sheet (collapsible) ────────
          Editorial chrome: no shadow, chevron heroicon
          instead of ▾. Role columns get uppercase eyebrow
          + subtle dot — same rhythm as the Staff cards. */}
      <details className="group rounded-xl border border-border bg-card overflow-hidden">
        <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-3 hover:bg-accent/30 transition-colors">
          <ShieldCheckIcon className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Reference
            </p>
            <p className="text-sm font-medium text-foreground">What each role can do</p>
          </div>
          <ChevronDownIcon className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border border-t border-border">
          {(['owner', 'manager', 'receptionist', 'barber'] as StaffRole[]).map(r => (
            <div key={r} className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', ROLE_STYLE[r].dot)} />
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {ROLE_STYLE[r].label}
                </p>
                <span className="text-[11px] text-muted-foreground/80 ml-auto tabular-nums">
                  {ROLE_PERMISSIONS[r].length} perms
                </span>
              </div>
              <ul className="space-y-1.5">
                {PERMISSION_SUMMARY.map(row => (
                  <li key={row.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <PermissionDots role={r} permissions={row.permissions} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {/* ─── Operator bar — role tabs + search ────────── */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-end gap-1 overflow-x-auto border-b border-border px-2">
          {ROLE_TABS.map(t => {
            const active = roleFilter === t.id;
            const dot = t.id !== 'all' ? ROLE_STYLE[t.id as StaffRole].dot : null;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setRoleFilter(t.id)}
                aria-pressed={active}
                className={cn(
                  'relative inline-flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dot)} />}
                <span>{t.label}</span>
                <span className={cn(
                  'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums',
                  active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
                )}>
                  {t.count}
                </span>
                {active && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
        <div className="p-2.5 flex items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-background"
            />
          </div>
          {/* View toggle — temporary comparison mode. Once the owner picks a
              winner, the two losing renderers + this toggle get deleted. */}
          <div className="flex items-center rounded-md border border-border p-0.5 shrink-0">
            {([
              { id: 'list',  Icon: ListBulletIcon,  label: 'List'  },
              { id: 'cards', Icon: Squares2X2Icon,  label: 'Cards' },
              { id: 'tree',  Icon: ShareIcon,       label: 'Tree'  },
            ] as const).map(({ id, Icon, label }) => {
              const active = viewMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setViewMode(id)}
                  title={label}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                    active ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Members table ───────────────────────────────
          Admin pages use tables, not cards. Columns align vertically
          so scanning roles / last-seen / offices across 20 members
          is a single glance. Grouped by role (with inline subheaders)
          when viewing All; flat sorted list otherwise. */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border last:border-b-0 px-5 py-3">
              <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-48 rounded bg-muted/60 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserCircleIcon}
          title="No accounts match"
          description="Try a different search or clear the role filter."
        />
      ) : viewMode === 'cards' ? (
        <MembersCards
          accounts={filtered}
          groupByRole={roleFilter === 'all'}
          offices={offices}
          currentUserId={currentUser?.id}
          canManage={can('accounts.manage')}
          resolveAvatar={resolveAvatar}
          onToggleStatus={toggleStatus}
          onEdit={openEdit}
          onRemove={handleRemove}
        />
      ) : viewMode === 'tree' ? (
        <MembersTree
          accounts={filtered}
          offices={offices}
          currentUserId={currentUser?.id}
          canManage={can('accounts.manage')}
          resolveAvatar={resolveAvatar}
          onEdit={openEdit}
        />
      ) : (
        <MembersTable
          accounts={filtered}
          groupByRole={roleFilter === 'all'}
          offices={offices}
          currentUserId={currentUser?.id}
          canManage={can('accounts.manage')}
          resolveAvatar={resolveAvatar}
          onToggleStatus={toggleStatus}
          onEdit={openEdit}
          onRemove={handleRemove}
        />
      )}

      <AccountDialog
        open={dialogOpen}
        account={editing}
        offices={offices}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSubmit={(data) => {
          if (editing) updateMut.mutate({ id: editing.id, data });
          else inviteMut.mutate(data as Parameters<typeof accountsApi.invite>[0]);
        }}
        submitting={inviteMut.isPending || updateMut.isPending}
      />
    </div>
  );
}

// ─── Permission summary ─────────────────────────────────────
// Groups permissions into human-readable rows for the reference card.
const PERMISSION_SUMMARY: { key: string; label: string; permissions: Permission[] }[] = [
  { key: 'bookings', label: 'Manage bookings',        permissions: ['bookings.create', 'bookings.edit', 'bookings.delete'] },
  { key: 'clients',  label: 'Manage clients',         permissions: ['clients.create', 'clients.edit', 'clients.delete'] },
  { key: 'staff',    label: 'Manage staff roster',    permissions: ['staff.manage'] },
  { key: 'services', label: 'Manage services',        permissions: ['services.manage'] },
  { key: 'analytics',label: 'View analytics',         permissions: ['analytics.view'] },
  { key: 'settings', label: 'Change shop settings',   permissions: ['settings.edit'] },
  { key: 'accounts', label: 'Invite & remove users',  permissions: ['accounts.manage'] },
];

function PermissionDots({ role, permissions }: { role: StaffRole; permissions: Permission[] }) {
  const granted = permissions.filter(p => ROLE_PERMISSIONS[role].includes(p)).length;
  const total = permissions.length;
  if (granted === 0) return <span className="text-rose-500/70">—</span>;
  if (granted === total) return <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓</span>;
  return <span className="text-amber-600 dark:text-amber-400 font-medium">{granted}/{total}</span>;
}

// ─── Dialog ─────────────────────────────────────
interface AccountDialogProps {
  open: boolean;
  account: Account | null;
  offices: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (data: {
    email: string;
    firstName: string;
    lastName: string;
    role: StaffRole;
    officeIds: string[];
    avatarUrl?: string;
    status?: AccountStatus;
  }) => void;
  submitting: boolean;
}

function AccountDialog({ open, account, offices, onClose, onSubmit, submitting }: AccountDialogProps) {
  const isEdit = !!account;

  const [firstName, setFirstName] = useState(account?.firstName ?? '');
  const [lastName, setLastName] = useState(account?.lastName ?? '');
  const [email, setEmail] = useState(account?.email ?? '');
  const [role, setRole] = useState<StaffRole>(account?.role ?? 'receptionist');
  const [officeIds, setOfficeIds] = useState<string[]>(account?.officeIds ?? []);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(account?.avatarUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Reset form state whenever the dialog opens or switches between new/edit
  useEffect(() => {
    if (open) {
      setFirstName(account?.firstName ?? '');
      setLastName(account?.lastName ?? '');
      setEmail(account?.email ?? '');
      setRole(account?.role ?? 'receptionist');
      setOfficeIds(account?.officeIds ?? offices.map(o => o.id));
      setAvatarUrl(account?.avatarUrl);
    }
  }, [open, account, offices]);

  const toggleOffice = (id: string) => {
    setOfficeIds(prev => (prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]));
  };

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image too large (max 15MB)');
      return;
    }
    setUploadingAvatar(true);
    try {
      // Avatars use a smaller cap than service photos (512px is plenty for
      // a 44×44 circle in the card); saves localStorage budget for actual services.
      const dataUrl = await fileToDataUrl(file, { maxSide: 512, quality: 0.85 });
      setAvatarUrl(dataUrl);
    } catch (err) {
      toast.error((err as Error).message ?? 'Upload failed');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    if (officeIds.length === 0) {
      toast.error('Select at least one office');
      return;
    }
    onSubmit({ firstName, lastName, email, role, officeIds, avatarUrl });
  };

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  const previewGradient = AVATAR_GRADIENTS[hashToIndex(account?.id ?? email, AVATAR_GRADIENTS.length)];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {isEdit ? 'Edit' : 'Invite'}
          </p>
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            {isEdit ? `${account.firstName} ${account.lastName}` : 'New team member'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── Photo — upload + preview (no decorative halo) ─ */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar preview"
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white',
                  previewGradient,
                )}>
                  {initials || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarFile(e.target.files?.[0])}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={avatarUrl ? 'outline' : 'default'}
                  loading={uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <PhotoIcon className="h-4 w-4 mr-1.5" />
                  {avatarUrl ? 'Replace' : 'Upload photo'}
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setAvatarUrl(undefined)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Optional. Auto-resized to 512px.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" required>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
            </Field>
            <Field label="Last name" required>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
            </Field>
          </div>

          <Field
            label="Email"
            required
            hint={isEdit ? 'Email cannot be changed after invite.' : undefined}
          >
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@barberpro.com"
              disabled={isEdit}
            />
          </Field>

          <Field
            label="Role"
            required
            hint={
              role === 'owner'
                ? 'Full access — can manage accounts and billing.'
                : role === 'manager'
                ? 'Runs the shop day-to-day. Cannot change user roles.'
                : role === 'receptionist'
                ? 'Books appointments, manages clients. No staff or settings edits.'
                : 'Sees own calendar and marks appointments complete.'
            }
          >
            <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
                <SelectItem value="barber">Barber</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Offices" required hint="Which locations this member works with.">
            <div className="flex flex-wrap gap-2">
              {offices.map(o => {
                const active = officeIds.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleOffice(o.id)}
                    className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:bg-accent'
                    }`}
                  >
                    {o.name}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Save changes' : 'Send invite'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Hero count-up ────────────────────────────────────────
// Animates 0 → N on mount. `prefers-reduced-motion` skips
// the animation and renders the final value immediately.
function AnimatedCounter({ to }: { to: number }) {
  const reducedMotion = useReducedMotion();
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(reducedMotion ? to.toLocaleString() : '0');

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(to.toLocaleString());
      return;
    }
    const controls = animate(mv, to, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString()),
    });
    return () => controls.stop();
  }, [to, reducedMotion, mv]);

  return <span aria-label={`${to} accounts`}>{display}</span>;
}

// ─── Status proportion ribbon ─────────────────────────────
// One thin segmented bar showing active / pending / disabled
// as visual proportions. Each segment animates its width from
// zero on mount. Reads left-to-right; legend sits below.
function StatusRibbon({
  active, pending, disabled, total,
}: {
  active: number;
  pending: number;
  disabled: number;
  total: number;
}) {
  const reducedMotion = useReducedMotion();
  if (total === 0) return null;
  const pctActive = (active / total) * 100;
  const pctPending = (pending / total) * 100;
  const pctDisabled = (disabled / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={reducedMotion ? false : { width: 0 }}
          animate={{ width: `${pctActive}%` }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="bg-emerald-500"
          aria-label={`${active} active`}
        />
        <motion.div
          initial={reducedMotion ? false : { width: 0 }}
          animate={{ width: `${pctPending}%` }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="bg-amber-500"
          aria-label={`${pending} pending`}
        />
        <motion.div
          initial={reducedMotion ? false : { width: 0 }}
          animate={{ width: `${pctDisabled}%` }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-muted-foreground/30"
          aria-label={`${disabled} disabled`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="tabular-nums font-medium text-foreground">{active}</span>
          active
        </span>
        {pending > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span className="tabular-nums font-medium text-foreground">{pending}</span>
            pending invite{pending === 1 ? '' : 's'}
          </span>
        )}
        {disabled > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            <span className="tabular-nums font-medium text-foreground">{disabled}</span>
            disabled
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Shared card-action props ─────────────────────────────
interface CardActionProps {
  offices: { id: string; name: string }[];
  currentUserId: string | undefined;
  canManage: boolean;
  resolveAvatar: (a: Account) => string | undefined;
  onToggleStatus: (a: Account) => void;
  onEdit: (a: Account) => void;
  onRemove: (a: Account) => void | Promise<void>;
}

// ─── Members table ────────────────────────────────────────
// Admin pages use tables. One row per member, columns align
// vertically so scanning roles / offices / last-seen across
// 5 or 50 rows stays scannable. Group-by-role insets subheader
// rows inline when viewing All.
const TABLE_COLS =
  'grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2fr)_7rem_8rem_auto] lg:grid-cols-[minmax(0,2fr)_7rem_minmax(0,1.2fr)_8rem_6.5rem_auto]';

function MembersTable({
  accounts, groupByRole, offices, currentUserId, canManage,
  resolveAvatar, onToggleStatus, onEdit, onRemove,
}: CardActionProps & {
  accounts: Account[];
  groupByRole: boolean;
}) {
  // Flatten rows with inline group headers when viewing All so
  // stagger indexing is continuous (no restart at each group).
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
      {/* Column header */}
      <div className={cn(
        TABLE_COLS,
        'gap-4 border-b border-border bg-muted/20 px-5 py-2.5',
      )}>
        <ColHeader>Member</ColHeader>
        <ColHeader className="hidden md:block">Role</ColHeader>
        <ColHeader className="hidden lg:block">Offices</ColHeader>
        <ColHeader className="hidden md:block">Last seen</ColHeader>
        <ColHeader className="hidden lg:block">Status</ColHeader>
        <span />
      </div>

      {/* Body */}
      <ul className="divide-y divide-border">
        <AnimatePresence initial={false}>
          {rows.map((row, i) => {
            if (row.kind === 'header') {
              return <GroupHeader key={`h-${row.role}`} role={row.role} count={row.count} index={i} />;
            }
            return (
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
              />
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function ColHeader({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <span className={cn('text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground', className)}>
      {children}
    </span>
  );
}

// ─── Inline group header (Owners, Managers, Receptionists, Barbers) ─
// Editorial section banner — left color stripe matches the role palette,
// label rendered in foreground (not muted) so it reads as a section title,
// count chip on the right gives instant "how many in this role" stat.
function GroupHeader({ role, count, index }: { role: StaffRole; count: number; index: number }) {
  const reducedMotion = useReducedMotion();
  const style = ROLE_STYLE[role];
  return (
    <motion.li
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: reducedMotion ? 0 : Math.min(index * 0.02, 0.2) }}
      className={cn(
        'flex items-center justify-between gap-2 bg-muted/30 border-l-[3px] px-5 py-2',
        style.bar,
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
        {style.label}{count === 1 ? '' : 's'}
      </p>
      <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-card border border-border text-[10px] font-semibold tabular-nums text-muted-foreground">
        {count}
      </span>
    </motion.li>
  );
}

// ─── Member row ─────────────────────────────────────────────
// Dense, scannable. Columns collapse gracefully on smaller screens.
// Recently-active users (< 1 hour) get a breathing emerald dot in the
// Last seen cell. Actions slide in from right on row hover (CSS, no
// Framer Motion for this — hover behavior must work on touch too).
function MemberRow({
  account: a, index, offices, currentUserId, canManage,
  resolveAvatar, onToggleStatus, onEdit, onRemove,
}: CardActionProps & {
  account: Account;
  index: number;
}) {
  const reducedMotion = useReducedMotion();
  const role = ROLE_STYLE[a.role];
  const initials = `${a.firstName[0] ?? ''}${a.lastName[0] ?? ''}`.toUpperCase();
  const isSelf = a.id === currentUserId;
  const officeNames = a.officeIds.map(id => offices.find(o => o.id === id)?.name ?? '—');
  const photoUrl = resolveAvatar(a);
  const gradient = AVATAR_GRADIENTS[hashToIndex(a.id, AVATAR_GRADIENTS.length)];
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
      transition={{
        duration: 0.22,
        delay: reducedMotion ? 0 : Math.min(index * 0.02, 0.2),
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        TABLE_COLS,
        'group gap-4 items-center px-5 py-3 transition-colors hover:bg-accent/30',
      )}
    >
      {/* Member — avatar + name + email */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`${a.firstName} ${a.lastName}`}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white',
              gradient,
            )}>
              {initials || <UserCircleIcon className="h-5 w-5 text-white/90" />}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-medium text-foreground truncate">
              {a.firstName} {a.lastName}
            </p>
            {isSelf && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-px shrink-0">
                you
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{a.email}</p>
          {/* Mobile-only: role + last seen folded into the Member cell */}
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground md:hidden">
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', role.dot)} />
            <span>{role.label}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="tabular-nums">{seenLabel}</span>
          </div>
        </div>
      </div>

      {/* Role — md+. Chip with role color (replaces the bare dot+text). */}
      <div className="hidden md:flex items-center min-w-0">
        <span className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] truncate',
          role.chip,
        )}>
          <span className={cn('h-1 w-1 rounded-full shrink-0', role.dot)} />
          {role.label}
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
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-card" aria-label="Active in the last hour" />
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

      {/* Status — lg+. Always-visible pill (was text-only when active).
          Three states each with their own pill, same vocabulary. */}
      <div className="hidden lg:flex items-center min-w-0">
        {a.status === 'active' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
            <span className="h-1 w-1 rounded-full bg-emerald-500" />
            Active
          </span>
        ) : a.status === 'invited' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
            <span className="h-1 w-1 rounded-full bg-amber-500" />
            Pending
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 text-muted-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
            <LockClosedIcon className="h-2.5 w-2.5" />
            Disabled
          </span>
        )}
      </div>

      {/* Actions — slide in from right on row hover. Always visible at
          60% opacity so touch devices (iPad) can tap without hover. */}
      {canManage ? (
        <div className="flex items-center gap-0.5 justify-end opacity-60 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
          <button
            onClick={() => onToggleStatus(a)}
            disabled={isSelf}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            title={a.status === 'active' ? 'Disable account' : 'Reactivate account'}
            aria-label={a.status === 'active' ? 'Disable account' : 'Reactivate account'}
          >
            <LockClosedIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(a)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            title="Edit"
            aria-label="Edit account"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onRemove(a)}
            disabled={isSelf}
            className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            title="Remove"
            aria-label="Remove account"
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

// ─── Members CARDS view ────────────────────────────────────
// Visual showcase grid. Each account becomes a card with photo +
// role pill + status + contact + last-seen + actions. Provided
// here so the owner can compare against the table view and pick
// which one to keep.
function MembersCards({
  accounts, groupByRole, offices, currentUserId, canManage,
  resolveAvatar, onToggleStatus, onEdit, onRemove,
}: CardActionProps & {
  accounts: Account[];
  groupByRole: boolean;
}) {
  // Build group blocks so the response is `[ {header, cards: [...]}, ... ]`.
  type Block = { header: { role: StaffRole; count: number } | null; cards: Account[] };
  const blocks: Block[] = [];
  if (groupByRole) {
    (['owner', 'manager', 'receptionist', 'barber'] as StaffRole[]).forEach(r => {
      const cards = accounts.filter(a => a.role === r);
      if (cards.length === 0) return;
      blocks.push({ header: { role: r, count: cards.length }, cards });
    });
  } else {
    blocks.push({ header: null, cards: accounts });
  }

  return (
    <div className="space-y-6">
      {blocks.map((b, idx) => (
        <div key={b.header?.role ?? `block-${idx}`} className="space-y-3">
          {b.header && (() => {
            const style = ROLE_STYLE[b.header.role];
            return (
              <div className={cn(
                'flex items-center justify-between rounded-lg bg-muted/30 border-l-[3px] px-4 py-2',
                style.bar,
              )}>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                  {style.label}{b.header.count === 1 ? '' : 's'}
                </p>
                <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-card border border-border text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {b.header.count}
                </span>
              </div>
            );
          })()}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {b.cards.map(a => (
              <MemberCard
                key={a.id}
                account={a}
                offices={offices}
                currentUserId={currentUserId}
                canManage={canManage}
                resolveAvatar={resolveAvatar}
                onToggleStatus={onToggleStatus}
                onEdit={onEdit}
                onRemove={onRemove}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MemberCard({
  account: a, offices, currentUserId, canManage,
  resolveAvatar, onToggleStatus, onEdit, onRemove,
}: CardActionProps & { account: Account }) {
  const role = ROLE_STYLE[a.role];
  const initials = `${a.firstName[0] ?? ''}${a.lastName[0] ?? ''}`.toUpperCase();
  const isSelf = a.id === currentUserId;
  const officeNames = a.officeIds.map(id => offices.find(o => o.id === id)?.name ?? '—');
  const photoUrl = resolveAvatar(a);
  const gradient = AVATAR_GRADIENTS[hashToIndex(a.id, AVATAR_GRADIENTS.length)];
  const seenLabel = a.lastLoginAt ? formatDistanceToNow(new Date(a.lastLoginAt), { addSuffix: true }) : 'Never';

  return (
    <div className={cn(
      'group flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-sm',
      a.status === 'disabled' && 'opacity-60',
    )}>
      {/* Identity row — avatar + name + role pill */}
      <div className="flex items-start gap-3">
        {photoUrl ? (
          <img src={photoUrl} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" />
        ) : (
          <div className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white',
            gradient,
          )}>
            {initials || <UserCircleIcon className="h-6 w-6 text-white/90" />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-semibold text-foreground truncate leading-tight">
              {a.firstName} {a.lastName}
            </p>
            {isSelf && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground border border-border rounded px-1 py-px shrink-0">
                you
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{a.email}</p>
        </div>
      </div>

      {/* Pills row — role + status */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
          role.chip,
        )}>
          <span className={cn('h-1 w-1 rounded-full', role.dot)} />
          {role.label}
        </span>
        {a.status === 'active' ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
            <span className="h-1 w-1 rounded-full bg-emerald-500" />
            Active
          </span>
        ) : a.status === 'invited' ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
            <span className="h-1 w-1 rounded-full bg-amber-500" />
            Pending
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 text-muted-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
            <LockClosedIcon className="h-2.5 w-2.5" />
            Disabled
          </span>
        )}
      </div>

      {/* Meta — offices + last seen */}
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5 truncate">
          <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {officeNames.length === 0 ? '—' : officeNames.length <= 1 ? officeNames[0] : `${officeNames[0]} +${officeNames.length - 1}`}
          </span>
        </p>
        <p className="flex items-center gap-1.5 truncate tabular-nums">
          <ClockIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{seenLabel}</span>
        </p>
      </div>

      {/* Actions footer */}
      {canManage && (
        <div className="mt-4 flex items-center gap-0.5 border-t border-border -mx-4 px-4 pt-3 justify-end">
          <button
            onClick={() => onToggleStatus(a)}
            disabled={isSelf}
            title={a.status === 'active' ? 'Disable account' : 'Reactivate account'}
            aria-label={a.status === 'active' ? 'Disable account' : 'Reactivate account'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <LockClosedIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(a)}
            title="Edit"
            aria-label="Edit account"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onRemove(a)}
            disabled={isSelf}
            title="Remove"
            aria-label="Remove account"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Members TREE view ────────────────────────────────────
// Org chart — Owner at the top, Managers row below, Receptionists +
// Barbers as siblings on the bottom row. Connectors drawn with CSS
// borders (no SVG) so the layout stays responsive. Best for showing
// reporting structure; overkill for daily access management.
function MembersTree({
  accounts, offices, currentUserId, canManage, resolveAvatar, onEdit,
}: {
  accounts: Account[];
  offices: { id: string; name: string }[];
  currentUserId: string | undefined;
  canManage: boolean;
  resolveAvatar: (a: Account) => string | undefined;
  onEdit: (a: Account) => void;
}) {
  const owners = accounts.filter(a => a.role === 'owner');
  const managers = accounts.filter(a => a.role === 'manager');
  const receptionists = accounts.filter(a => a.role === 'receptionist');
  const barbers = accounts.filter(a => a.role === 'barber');
  void offices; void currentUserId; void canManage;

  return (
    <div className="rounded-xl border border-border bg-card p-8 overflow-x-auto">
      <div className="min-w-[640px] flex flex-col items-center gap-10">
        {/* Owner row */}
        <TreeRow accounts={owners} resolveAvatar={resolveAvatar} onEdit={onEdit} />

        {owners.length > 0 && managers.length > 0 && <TreeConnector />}

        {/* Manager row */}
        {managers.length > 0 && (
          <TreeRow accounts={managers} resolveAvatar={resolveAvatar} onEdit={onEdit} />
        )}

        {(managers.length > 0 || owners.length > 0) && (receptionists.length + barbers.length > 0) && <TreeConnector />}

        {/* Receptionists + Barbers row */}
        {(receptionists.length + barbers.length) > 0 && (
          <TreeRow accounts={[...receptionists, ...barbers]} resolveAvatar={resolveAvatar} onEdit={onEdit} />
        )}
      </div>
    </div>
  );
}

function TreeConnector() {
  return <span className="block h-8 w-px bg-border" aria-hidden />;
}

function TreeRow({
  accounts, resolveAvatar, onEdit,
}: {
  accounts: Account[];
  resolveAvatar: (a: Account) => string | undefined;
  onEdit: (a: Account) => void;
}) {
  return (
    <div className="flex flex-wrap items-stretch justify-center gap-3">
      {accounts.map(a => {
        const role = ROLE_STYLE[a.role];
        const initials = `${a.firstName[0] ?? ''}${a.lastName[0] ?? ''}`.toUpperCase();
        const photoUrl = resolveAvatar(a);
        const gradient = AVATAR_GRADIENTS[hashToIndex(a.id, AVATAR_GRADIENTS.length)];
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onEdit(a)}
            className={cn(
              'group flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 transition-all w-[140px]',
              'hover:border-foreground/30 hover:shadow-sm',
              a.status === 'disabled' && 'opacity-60',
            )}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white',
                gradient,
              )}>
                {initials || <UserCircleIcon className="h-6 w-6 text-white/90" />}
              </div>
            )}
            <p className="text-sm font-semibold text-foreground text-center leading-tight truncate w-full">
              {a.firstName} {a.lastName}
            </p>
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
              role.chip,
            )}>
              <span className={cn('h-1 w-1 rounded-full', role.dot)} />
              {role.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
