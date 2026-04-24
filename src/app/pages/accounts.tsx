import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform, animate } from 'motion/react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import {
  PlusIcon, UserCircleIcon, EnvelopeIcon,
  PencilSquareIcon, TrashIcon, ShieldCheckIcon,
  ClockIcon, LockClosedIcon,
  MagnifyingGlassIcon, MapPinIcon, ChevronDownIcon,
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
const ROLE_STYLE: Record<StaffRole, { chip: string; dot: string; label: string }> = {
  owner:        { chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',   dot: 'bg-amber-500',   label: 'Owner' },
  manager:      { chip: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/60', dot: 'bg-violet-500', label: 'Manager' },
  receptionist: { chip: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60',       dot: 'bg-blue-500',    label: 'Receptionist' },
  barber:       { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60', dot: 'bg-emerald-500', label: 'Barber' },
};

type RoleFilter = 'all' | StaffRole;

export function AccountsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { can } = usePermission();
  const currentUser = useAuthStore(s => s.user);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
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
        <div className="p-2.5">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-background"
            />
          </div>
        </div>
      </div>

      {/* ─── Grouped account list ────────────────────────
          When viewing All, accounts group into role sections
          in hierarchy order (Owner → Manager → Receptionist
          → Barber). Owners get feature-sized cards; the rest
          stay in a 2-up grid. Framer Motion stagger on mount. */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserCircleIcon}
          title="No accounts match"
          description="Try a different search or clear the role filter."
        />
      ) : roleFilter === 'all' ? (
        <div className="space-y-6">
          {(['owner', 'manager', 'receptionist', 'barber'] as StaffRole[]).map(r => {
            const sectionAccounts = filtered.filter(a => a.role === r);
            if (sectionAccounts.length === 0) return null;
            return (
              <RoleSection
                key={r}
                role={r}
                accounts={sectionAccounts}
                offices={offices}
                currentUserId={currentUser?.id}
                canManage={can('accounts.manage')}
                resolveAvatar={resolveAvatar}
                onToggleStatus={toggleStatus}
                onEdit={openEdit}
                onRemove={handleRemove}
              />
            );
          })}
        </div>
      ) : (
        <motion.div layout className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {filtered.map((a, i) => (
              <AccountCard
                key={a.id}
                account={a}
                index={i}
                variant={a.role === 'owner' ? 'feature' : 'standard'}
                offices={offices}
                currentUserId={currentUser?.id}
                canManage={can('accounts.manage')}
                resolveAvatar={resolveAvatar}
                onToggleStatus={toggleStatus}
                onEdit={openEdit}
                onRemove={handleRemove}
              />
            ))}
          </AnimatePresence>
        </motion.div>
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

// ─── Role section ─────────────────────────────────────────
// Groups accounts under a role header when viewing "All".
// Owner section renders full-width feature cards; other
// roles use a 2-up grid. AnimatePresence wraps the children
// so role changes animate cleanly when filter shifts.
function RoleSection({
  role, accounts, offices, currentUserId, canManage,
  resolveAvatar, onToggleStatus, onEdit, onRemove,
}: CardActionProps & {
  role: StaffRole;
  accounts: Account[];
}) {
  const isOwner = role === 'owner';
  const label = ROLE_STYLE[role].label;

  return (
    <section className="space-y-3">
      <header className="flex items-center gap-2">
        <span className={cn('h-1.5 w-1.5 rounded-full', ROLE_STYLE[role].dot)} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}{accounts.length === 1 ? '' : 's'}
        </p>
        <span className="text-[11px] tabular-nums text-muted-foreground/80">
          {accounts.length}
        </span>
        <span className="flex-1 border-b border-border/60 ml-2" />
      </header>
      <motion.div
        layout
        className={cn('grid gap-3', isOwner ? 'grid-cols-1' : 'sm:grid-cols-2')}
      >
        <AnimatePresence initial={false}>
          {accounts.map((a, i) => (
            <AccountCard
              key={a.id}
              account={a}
              index={i}
              variant={isOwner ? 'feature' : 'standard'}
              offices={offices}
              currentUserId={currentUserId}
              canManage={canManage}
              resolveAvatar={resolveAvatar}
              onToggleStatus={onToggleStatus}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}

// ─── Account card ─────────────────────────────────────────
// Framer Motion: staggered fade+rise entry (capped at 250ms),
// hover lift with spring, actions slide in from right. A user
// seen in the last hour gets a breathing emerald ring around
// their avatar — meaningful presence signal, not decoration.
function AccountCard({
  account: a, index, variant, offices, currentUserId, canManage,
  resolveAvatar, onToggleStatus, onEdit, onRemove,
}: CardActionProps & {
  account: Account;
  index: number;
  variant: 'standard' | 'feature';
}) {
  const reducedMotion = useReducedMotion();
  const role = ROLE_STYLE[a.role];
  const initials = `${a.firstName[0] ?? ''}${a.lastName[0] ?? ''}`.toUpperCase();
  const isSelf = a.id === currentUserId;
  const officeNames = a.officeIds.map(id => offices.find(o => o.id === id)?.name ?? '—');
  const photoUrl = resolveAvatar(a);
  const gradient = AVATAR_GRADIENTS[hashToIndex(a.id, AVATAR_GRADIENTS.length)];
  const seenLabel = a.lastLoginAt
    ? `Seen ${formatDistanceToNow(new Date(a.lastLoginAt), { addSuffix: true })}`
    : 'Never signed in';
  const isRecentlyActive = a.status === 'active' && a.lastLoginAt
    ? differenceInMinutes(new Date(), new Date(a.lastLoginAt)) < 60
    : false;
  const isFeature = variant === 'feature';

  return (
    <motion.article
      layout
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
      transition={{
        duration: 0.32,
        delay: reducedMotion ? 0 : Math.min(index * 0.04, 0.25),
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={reducedMotion ? undefined : { y: -2 }}
      className={cn(
        'group relative flex flex-col rounded-xl border border-border bg-card transition-colors hover:border-foreground/20 hover:bg-accent/20',
        isFeature ? 'p-5 sm:p-6' : 'p-4',
      )}
    >
      <div className={cn('flex items-start', isFeature ? 'gap-5' : 'gap-4')}>
        {/* Avatar — photo / linked-staff photo / gradient initials */}
        <div className="relative shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`${a.firstName} ${a.lastName}`}
              className={cn('rounded-full object-cover', isFeature ? 'h-16 w-16' : 'h-12 w-12')}
            />
          ) : (
            <div className={cn(
              'flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-white',
              isFeature ? 'h-16 w-16 text-lg' : 'h-12 w-12 text-sm',
              gradient,
            )}>
              {initials || <UserCircleIcon className="h-6 w-6 text-white/90" />}
            </div>
          )}
          {/* Presence — breathing ring + solid dot for users seen in last hour */}
          {isRecentlyActive && (
            <>
              {!reducedMotion && (
                <motion.span
                  className="absolute inset-0 rounded-full ring-2 ring-emerald-500"
                  initial={{ opacity: 0.55, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.25 }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  aria-hidden
                />
              )}
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card"
                aria-label="Active in the last hour"
              />
            </>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', role.dot)} />
            {role.label}
            {isSelf && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="normal-case tracking-normal font-medium">you</span>
              </>
            )}
          </div>
          <p className={cn(
            'mt-0.5 font-semibold text-foreground truncate leading-tight tracking-tight',
            isFeature ? 'text-lg sm:text-xl' : 'text-base',
          )}>
            {a.firstName} {a.lastName}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            <EnvelopeIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{a.email}</span>
          </p>
        </div>
      </div>

      {/* Secondary line — offices + seen + exception status */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        {officeNames.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <MapPinIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{officeNames.join(', ')}</span>
          </span>
        )}
        <span className="text-muted-foreground/40">·</span>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <ClockIcon className="h-3 w-3 shrink-0" />
          {seenLabel}
        </span>
        {a.status === 'invited' && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Pending invite
            </span>
          </>
        )}
        {a.status === 'disabled' && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
              <LockClosedIcon className="h-3 w-3" />
              Disabled
            </span>
          </>
        )}
      </div>

      {/* Actions — always faintly visible, slide in from right and
          full-opacity on card hover. Works on touch (no hover) too
          because the base state is already readable at 60%. */}
      {canManage && (
        <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-60 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
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
      )}
    </motion.article>
  );
}
