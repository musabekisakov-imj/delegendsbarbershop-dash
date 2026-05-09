import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion, useMotionValue, animate } from 'motion/react';
import { formatDistanceToNow, differenceInMinutes, parseISO } from 'date-fns';
import {
  PlusIcon, UserCircleIcon, EnvelopeIcon,
  PencilSquareIcon, TrashIcon, ShieldCheckIcon,
  ClockIcon, LockClosedIcon, PowerIcon,
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
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../components/ui/hover-card';
import { usePermission } from '../hooks/use-permission';
import { useConfirm } from '../hooks/use-confirm';
import { useAuthStore } from '../store/auth-store';
import { useOfficeStore } from '../store/office-store';
import { ROLE_PERMISSIONS } from '../lib/permissions';
import {
  AVATAR_GRADIENTS, hashToIndex,
  ROLE_LABEL, ROLE_CHIP, ROLE_DOT, ROLE_BAR, ROLE_RING,
  MOTION_EASE, MOTION_DUR,
} from '../lib/tokens';
import { cn } from '../components/ui/utils';
import { fileToDataUrl } from '../lib/image-upload';
import { PhotoIcon } from '@heroicons/react/24/outline';
import type { Account, StaffRole, AccountStatus, Permission } from '../types';
// Role palette is now imported from `lib/tokens.ts` (`ROLE_LABEL`, `ROLE_CHIP`,
// `ROLE_DOT`, `ROLE_BAR`, `ROLE_RING`) so this page and the Staff page share
// a single source of truth.

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

  // Per-role pending count — feeds the small amber dot on each tab's
  // count chip so the operator sees which roles have outstanding invites.
  const pendingByRole = useMemo(() => {
    const m: Record<StaffRole, number> = { owner: 0, manager: 0, receptionist: 0, barber: 0 };
    for (const a of accounts) if (a.status === 'invited') m[a.role]++;
    return m;
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

  const ROLE_TABS: { id: RoleFilter; label: string; count: number; pending: number }[] = [
    { id: 'all',          label: 'All',          count: accounts.length,         pending: statusCounts.pending },
    { id: 'owner',        label: 'Owner',        count: roleCounts.owner,        pending: pendingByRole.owner },
    { id: 'manager',      label: 'Manager',      count: roleCounts.manager,      pending: pendingByRole.manager },
    { id: 'receptionist', label: 'Receptionist', count: roleCounts.receptionist, pending: pendingByRole.receptionist },
    { id: 'barber',       label: 'Barber',       count: roleCounts.barber,       pending: pendingByRole.barber },
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

      {/* ─── Permission cheat-sheet — MATRIX direction ───
          Single dense table: rows = capabilities, columns = roles.
          Scans horizontally (who has THIS) and vertically (which
          capabilities does THIS role cover) without re-rendering
          labels four times. Each cell carries one of three glyphs:
          a filled role-tinted dot (full access), a half-opacity
          dot + "X/Y" fraction (partial), or a hollow ring (none).
          The Owner column reads as a near-solid color stripe;
          Barber as mostly hollow rings — power gradient at a
          glance, no text needed. */}
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
                {(['owner', 'manager', 'receptionist', 'barber'] as StaffRole[]).map(r => (
                  <th key={r} className="px-3 py-3 align-bottom">
                    <div className="flex flex-col items-center gap-1">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">
                        <span className={cn('h-1.5 w-1.5 rounded-full', ROLE_DOT[r])} />
                        {ROLE_LABEL[r]}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {ROLE_PERMISSIONS[r].length} perms
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_SUMMARY.map(row => (
                <tr
                  key={row.key}
                  className="border-t border-border transition-colors hover:bg-muted/30"
                >
                  <td className="px-5 py-2.5 text-[13px] text-foreground/90">
                    {row.label}
                  </td>
                  {(['owner', 'manager', 'receptionist', 'barber'] as StaffRole[]).map(r => (
                    <td key={r} className="px-3 py-2.5 text-center">
                      <div className="inline-flex items-center justify-center min-h-[1rem]">
                        <PermissionGlyph role={r} permissions={row.permissions} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* ─── Operator bar — TUNER direction ────────────────
          One horizontal rail, no card frame. Hairlines top + bottom.
          Tabs flex-grow on the left; search anchors right with a
          hairline divider between them. Each role count chip carries
          a tiny amber ring-fenced dot when that role has outstanding
          invites — surfaces "what needs attention" without opening
          the page. The active-tab underline is a shared `motion.span`
          with `layoutId="role-tab-underline"` for sliding state. */}
      <div className="border-y border-border">
        <LayoutGroup id="role-tabs">
          <div className="flex flex-col sm:flex-row sm:items-stretch">
            <div className="flex items-end gap-1 flex-1 min-w-0 overflow-x-auto px-2 border-b sm:border-b-0 border-border">
              {ROLE_TABS.map(t => {
                const active = roleFilter === t.id;
                const dot = t.id !== 'all' ? ROLE_DOT[t.id as StaffRole] : null;
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
                      'relative inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums',
                      active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
                    )}>
                      {t.count}
                      {t.pending > 0 && (
                        <span
                          aria-hidden
                          title={`${t.pending} pending invite${t.pending === 1 ? '' : 's'}`}
                          className={cn(
                            'absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-500',
                            active ? 'ring-2 ring-foreground' : 'ring-2 ring-background',
                          )}
                        />
                      )}
                    </span>
                    {active && (
                      <motion.span
                        layoutId="role-tab-underline"
                        className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground"
                        transition={{ duration: MOTION_DUR.base, ease: MOTION_EASE }}
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="hidden sm:block w-px bg-border self-stretch shrink-0" />
            <div className="flex items-center px-3 py-1.5 sm:py-0">
              <div className="relative w-full sm:w-56 lg:w-64">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={cn(
                    'w-full h-9 pl-9 pr-3 text-sm bg-transparent rounded-none',
                    'border-0 border-b border-transparent transition-colors',
                    'focus:outline-none focus:border-foreground/40',
                    'placeholder:text-muted-foreground',
                  )}
                />
              </div>
            </div>
          </div>
        </LayoutGroup>
      </div>

      {/* ─── Renderer ─────────────────────────────────────
          Tree is the canonical view when no role filter is set —
          it shows the full reporting structure at a glance. Once a
          single role is filtered, the Tree collapses to a single
          row (awkward), so we fall back to MembersTable in that
          case. The Tree handles its own search dimming, so it
          consumes the unfiltered `accounts` list and only the
          search query. */}
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
      ) : roleFilter !== 'all' ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={UserCircleIcon}
            title="No accounts match"
            description="Try a different search or clear the role filter."
          />
        ) : (
          <MembersTable
            accounts={filtered}
            groupByRole={false}
            offices={offices}
            currentUserId={currentUser?.id}
            canManage={can('accounts.manage')}
            resolveAvatar={resolveAvatar}
            onToggleStatus={toggleStatus}
            onEdit={openEdit}
            onRemove={handleRemove}
          />
        )
      ) : (
        <MembersTree
          accounts={accounts}
          search={search}
          offices={offices}
          resolveAvatar={resolveAvatar}
          onEdit={openEdit}
          onToggleStatus={toggleStatus}
          onInvite={openNew}
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

// Three-state glyph for the permission matrix:
//  • full access  → solid role-tinted dot   (gives Owner column its
//                                            uninterrupted color stripe)
//  • partial      → half-opacity dot + "X/Y" fraction in muted ink
//  • none         → hollow ring             (de-emphasized; reads as absence)
//
// Using oklch colors via inline `style` (not Tailwind classes) keeps the dot
// in lockstep with the same `ROLE_BAR` token used by the tree-node left rails
// and avatar rings — single source of truth.
function PermissionGlyph({ role, permissions }: { role: StaffRole; permissions: Permission[] }) {
  const granted = permissions.filter(p => ROLE_PERMISSIONS[role].includes(p)).length;
  const total = permissions.length;
  if (granted === 0) {
    return (
      <span
        aria-label="Not granted"
        className="inline-block h-2 w-2 rounded-full ring-1 ring-muted-foreground/25"
      />
    );
  }
  if (granted === total) {
    return (
      <span
        aria-label="Full access"
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: ROLE_BAR[role] }}
      />
    );
  }
  return (
    <span
      aria-label={`Partial — ${granted} of ${total}`}
      className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums text-muted-foreground"
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: ROLE_BAR[role], opacity: 0.5 }}
      />
      {granted}/{total}
    </span>
  );
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
  return (
    <motion.li
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: reducedMotion ? 0 : Math.min(index * 0.02, 0.2) }}
      className="flex items-center justify-between gap-2 bg-muted/30 border-l-[3px] px-5 py-2"
      style={{ borderLeftColor: ROLE_BAR[role] }}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
        {ROLE_LABEL[role]}{count === 1 ? '' : 's'}
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
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', ROLE_DOT[a.role])} />
            <span>{ROLE_LABEL[a.role]}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="tabular-nums">{seenLabel}</span>
          </div>
        </div>
      </div>

      {/* Role — md+. Chip with role color (no border — bg-tint alone is enough). */}
      <div className="hidden md:flex items-center min-w-0">
        <span className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] truncate',
          ROLE_CHIP[a.role],
        )}>
          <span className={cn('h-1 w-1 rounded-full shrink-0', ROLE_DOT[a.role])} />
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

// ─── Members TREE view ("ATELIER") ──────────────────────────────────────────
// TODO i18n — strings here are hardcoded English. When `team.tree.*` keys are
// introduced in en/lt/ru, replace inline labels with `t(…)` calls.
//
// Org chart, redesigned: a deterministic CSS-Grid layout with an animated SVG
// bezier connector overlay, a `layoutId` shared focus ring that morphs between
// cards, role-tinted left rails + avatar rings, status dots, an atmospheric
// dot-grid background, and a HoverCard rich preview. Click no longer jumps
// straight to AccountDialog — the preview's "Edit details" CTA does.
//
// Data model note: `Account` has no `managerId`, so reports do not slot under
// a specific manager; instead we draw N-to-M lines from each manager-bottom
// to each report-top. With one manager the layout reads as a clean 3-row tree;
// with multiple, the connector opacity drops to keep the bundle readable.

type Tier = 'owner' | 'manager' | 'report';

interface Edge {
  fromId: string;
  toId: string;
  d: string;
}

function MembersTree({
  accounts,
  search,
  offices,
  resolveAvatar,
  onEdit,
  onToggleStatus,
  onInvite,
}: {
  accounts: Account[];
  search: string;
  offices: { id: string; name: string }[];
  resolveAvatar: (a: Account) => string | undefined;
  onEdit: (a: Account) => void;
  onToggleStatus: (a: Account) => void;
  onInvite: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Map<string, HTMLElement>>(new Map());
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const owners   = useMemo(() => accounts.filter(a => a.role === 'owner'), [accounts]);
  const managers = useMemo(() => accounts.filter(a => a.role === 'manager'), [accounts]);
  const reports  = useMemo(() => accounts.filter(a => a.role === 'receptionist' || a.role === 'barber'), [accounts]);

  const cols = Math.max(managers.length, reports.length, 1);

  // Search-driven dimming. Tree always receives the unfiltered list so the
  // structure stays visible; matches stay full-opacity, the rest fade.
  const dimmedIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(
      accounts
        .filter(a => !(
          a.email.toLowerCase().includes(q) ||
          a.firstName.toLowerCase().includes(q) ||
          a.lastName.toLowerCase().includes(q)
        ))
        .map(a => a.id),
    );
  }, [search, accounts]);

  // Compute SVG paths from owner-bottom → manager-top and manager-bottom →
  // report-top. Reads bounding rects of registered refs against the container,
  // recomputes on layout / resize / data change.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const recompute = () => {
      const cBox = container.getBoundingClientRect();
      const rectFor = (id: string) => {
        const el = refs.current.get(id);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          topX: r.left - cBox.left + r.width / 2,
          topY: r.top - cBox.top,
          bottomX: r.left - cBox.left + r.width / 2,
          bottomY: r.bottom - cBox.top,
        };
      };
      const bezier = (x1: number, y1: number, x2: number, y2: number) => {
        const my = (y1 + y2) / 2;
        return `M ${x1},${y1} C ${x1},${my} ${x2},${my} ${x2},${y2}`;
      };

      const next: Edge[] = [];
      // Layer 1: owner → managers, OR owner → reports if no managers exist.
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
      // Layer 2: managers → reports (only when both exist).
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

    // Two RAFs — first to wait for layout to settle, second so motion's own
    // entrance animations don't snap the rects mid-frame. Then ResizeObserver
    // catches container width changes (sidebar collapse, window resize, etc.).
    let raf1 = 0, raf2 = 0;
    raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(recompute); });
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      ro.disconnect();
    };
  }, [accounts, owners, managers, reports]);

  if (accounts.length === 0) {
    return <EmptyTreeState onInvite={onInvite} />;
  }

  const fanFactor = managers.length > 1 ? 0.45 : 0.85;
  const registerRef = (id: string) => (node: HTMLElement | null) => {
    if (node) refs.current.set(id, node);
    else refs.current.delete(id);
  };

  const reportsCount = (id: string) => {
    void id;
    // Without per-manager assignment in the data model, the most truthful
    // signal a manager card can carry is "reports under this office".
    return reports.length;
  };

  return (
    <LayoutGroup id="tree">
      <div className="rounded-2xl border border-border bg-card tree-grid-bg p-6 sm:p-10 lg:p-14 overflow-x-auto">
        <div ref={containerRef} className="relative min-w-[640px] mx-auto">
          {/* SVG connector overlay — sits behind the grid in the same
              positioned container so getBoundingClientRect deltas line up. */}
          <svg
            className="absolute inset-0 h-full w-full pointer-events-none"
            aria-hidden
          >
            {edges.map((e, i) => {
              const isHi = hoveredId === e.toId || hoveredId === e.fromId;
              const isDim = dimmedIds.has(e.toId);
              return (
                <motion.path
                  key={`${e.fromId}->${e.toId}`}
                  d={e.d}
                  fill="none"
                  strokeWidth={1.25}
                  stroke={isHi ? 'var(--foreground)' : 'var(--border)'}
                  strokeOpacity={isDim ? 0.12 : isHi ? 0.6 : fanFactor}
                  initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    duration: MOTION_DUR.slow,
                    ease: MOTION_EASE,
                    delay: reducedMotion ? 0 : 0.2 + i * 0.05,
                  }}
                />
              );
            })}
          </svg>

          {/* Grid — three rows (owner / managers / reports), col count
              equals the widest tier so cards space evenly. */}
          <div
            className="relative grid gap-x-6 gap-y-14"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(164px, 1fr))` }}
          >
            <div className="col-span-full flex justify-center">
              {owners.map((a, i) => (
                <TreeNode
                  key={a.id}
                  a={a}
                  tier="owner"
                  idx={i}
                  registerRef={registerRef(a.id)}
                  hovered={hoveredId === a.id}
                  setHoveredId={setHoveredId}
                  dimmed={dimmedIds.has(a.id)}
                  resolveAvatar={resolveAvatar}
                  offices={offices}
                  reportsCount={reportsCount(a.id)}
                  onEdit={onEdit}
                  onToggleStatus={onToggleStatus}
                />
              ))}
            </div>

            {managers.length > 0 && (
              <div className="col-span-full flex flex-wrap justify-around gap-x-6 gap-y-4">
                {managers.map((a, i) => (
                  <TreeNode
                    key={a.id}
                    a={a}
                    tier="manager"
                    idx={i}
                    registerRef={registerRef(a.id)}
                    hovered={hoveredId === a.id}
                    setHoveredId={setHoveredId}
                    dimmed={dimmedIds.has(a.id)}
                    resolveAvatar={resolveAvatar}
                    offices={offices}
                    reportsCount={reportsCount(a.id)}
                    onEdit={onEdit}
                    onToggleStatus={onToggleStatus}
                  />
                ))}
              </div>
            )}

            {reports.length > 0 && (
              <div className="col-span-full flex flex-wrap justify-center gap-6">
                {reports.map((a, i) => (
                  <TreeNode
                    key={a.id}
                    a={a}
                    tier="report"
                    idx={i}
                    registerRef={registerRef(a.id)}
                    hovered={hoveredId === a.id}
                    setHoveredId={setHoveredId}
                    dimmed={dimmedIds.has(a.id)}
                    resolveAvatar={resolveAvatar}
                    offices={offices}
                    reportsCount={0}
                    onEdit={onEdit}
                    onToggleStatus={onToggleStatus}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutGroup>
  );
}

// ─── Tree node (single card) ─────────────────────────────────────────────────
// HoverCard wraps the trigger button. Hover/focus opens the preview after
// 120ms; click also opens the preview (Radix HoverCard handles touch via
// pointer-events). The preview hosts the explicit Edit / Toggle CTAs so click
// is no longer destructive.
function TreeNode({
  a, tier, idx, registerRef, hovered, setHoveredId, dimmed,
  resolveAvatar, offices, reportsCount, onEdit, onToggleStatus,
}: {
  a: Account;
  tier: Tier;
  idx: number;
  registerRef: (node: HTMLElement | null) => void;
  hovered: boolean;
  setHoveredId: (id: string | null) => void;
  dimmed: boolean;
  resolveAvatar: (a: Account) => string | undefined;
  offices: { id: string; name: string }[];
  reportsCount: number;
  onEdit: (a: Account) => void;
  onToggleStatus: (a: Account) => void;
}) {
  const reducedMotion = useReducedMotion();
  const initials = `${a.firstName[0] ?? ''}${a.lastName[0] ?? ''}`.toUpperCase();
  const photoUrl = resolveAvatar(a);
  const gradient = AVATAR_GRADIENTS[hashToIndex(a.id, AVATAR_GRADIENTS.length)];
  const officeNames = a.officeIds
    .map(id => offices.find(o => o.id === id)?.name)
    .filter((x): x is string => Boolean(x));

  // Tier-aware entrance delays — owner first, managers next, reports last.
  const enterDelay = reducedMotion
    ? 0
    : tier === 'owner'
    ? 0
    : tier === 'manager'
    ? 0.08 + idx * 0.08
    : 0.4 + idx * 0.06;

  // Footer micro-text — never lies. Owners + managers show last activity,
  // reports show how many offices they cover (matches the overall page tone
  // of "scannable economic facts, no marketing copy").
  const footerLine =
    tier === 'report'
      ? officeNames.length === 0
        ? '—'
        : `${officeNames.length} office${officeNames.length === 1 ? '' : 's'}`
      : a.lastLoginAt
      ? `active ${formatDistanceToNow(parseISO(a.lastLoginAt))} ago`
      : 'never signed in';

  void reportsCount;

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
            'hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]',
            'dark:hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            a.status === 'disabled' && 'opacity-60',
          )}
        >
          {/* Role-tinted left rail — the single piece of color most pages of
              this Editorial family carry; here it telegraphs role from
              across the canvas without needing the chip text. */}
          <span
            aria-hidden
            className="absolute inset-y-3 left-0 w-[3px] rounded-r-full"
            style={{ background: ROLE_BAR[a.role] }}
          />

          {/* Status dot — top-right corner. Pending pulses to draw attention
              to outstanding invites; disabled is muted; active is quiet emerald. */}
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

          {/* Avatar with role ring */}
          <div className="mt-0.5">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                className="h-14 w-14 rounded-full object-cover ring-2 ring-offset-2 ring-offset-card"
                style={{ boxShadow: `0 0 0 2px ${ROLE_RING[a.role]}` }}
              />
            ) : (
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ring-2 ring-offset-2 ring-offset-card',
                  gradient,
                )}
                style={{ boxShadow: `0 0 0 2px ${ROLE_RING[a.role]}` }}
              >
                {initials || <UserCircleIcon className="h-7 w-7 text-white/90" />}
              </div>
            )}
          </div>

          {/* Name */}
          <p className="text-[13px] font-semibold tracking-tight text-foreground text-center leading-tight truncate w-full">
            {a.firstName} {a.lastName}
          </p>

          {/* Role chip */}
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
            ROLE_CHIP[a.role],
          )}>
            <span className={cn('h-1 w-1 rounded-full', ROLE_DOT[a.role])} />
            {ROLE_LABEL[a.role]}
          </span>

          {/* Footer micro-row — hairline above */}
          <div className="mt-auto w-full pt-1.5 border-t border-border/60 text-[10px] text-muted-foreground tabular-nums text-center truncate">
            {footerLine}
          </div>

          {/* Shared focus ring — morphs between hovered cards via layoutId.
              The single most-impactful framer-motion win on this page. */}
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

      <HoverCardContent
        side="top"
        align="center"
        className="w-72 p-0 border border-border bg-popover shadow-lg"
      >
        <TreePreview a={a} offices={offices} onEdit={onEdit} onToggleStatus={onToggleStatus} />
      </HoverCardContent>
    </HoverCard>
  );
}

// ─── Hover preview ───────────────────────────────────────────────────────────
// Rich card shown on hover — defers the heavy AccountDialog to an explicit
// Edit CTA so click on the node card is no longer destructive on touch.
function TreePreview({
  a, offices, onEdit, onToggleStatus,
}: {
  a: Account;
  offices: { id: string; name: string }[];
  onEdit: (a: Account) => void;
  onToggleStatus: (a: Account) => void;
}) {
  const initials = `${a.firstName[0] ?? ''}${a.lastName[0] ?? ''}`.toUpperCase();
  const officeNames = a.officeIds
    .map(id => offices.find(o => o.id === id)?.name)
    .filter((x): x is string => Boolean(x));
  const seen = a.lastLoginAt
    ? `${formatDistanceToNow(parseISO(a.lastLoginAt))} ago`
    : null;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shrink-0',
            AVATAR_GRADIENTS[hashToIndex(a.id, AVATAR_GRADIENTS.length)],
          )}
          style={{ boxShadow: `0 0 0 2px ${ROLE_RING[a.role]}` }}
        >
          {initials || <UserCircleIcon className="h-6 w-6 text-white/90" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {a.firstName} {a.lastName}
          </p>
          <span className={cn(
            'mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
            ROLE_CHIP[a.role],
          )}>
            <span className={cn('h-1 w-1 rounded-full', ROLE_DOT[a.role])} />
            {ROLE_LABEL[a.role]}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="px-4 pb-3 space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 min-w-0">
          <EnvelopeIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="select-text truncate">{a.email}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <ClockIcon className="h-3.5 w-3.5 shrink-0" />
          {seen
            ? <span className="tabular-nums">{seen}</span>
            : <span className="italic text-muted-foreground/70">Never signed in</span>}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{officeNames.length === 0 ? '—' : officeNames.join(', ')}</span>
        </div>
      </div>

      {/* Status pill */}
      <div className="px-4 pb-3">
        {a.status === 'active' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
            <span className="h-1 w-1 rounded-full bg-emerald-500" />
            Active
          </span>
        ) : a.status === 'invited' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
            <span className="h-1 w-1 rounded-full bg-amber-500" />
            Pending invite
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/40 text-muted-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
            <LockClosedIcon className="h-2.5 w-2.5" />
            Disabled
          </span>
        )}
      </div>

      {/* Actions */}
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

// ─── Empty state ─────────────────────────────────────────────────────────────
// One dashed-border card centered in the boardroom canvas. Reuses the same
// dot-grid background so empty + populated states share the same visual frame.
function EmptyTreeState({ onInvite }: { onInvite: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card tree-grid-bg p-10 lg:p-14 flex justify-center">
      <div className="w-[280px] rounded-xl border border-dashed border-border bg-card/50 p-8 flex flex-col items-center gap-3 text-center">
        <EnvelopeIcon className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Invite your first member</p>
        <p className="text-xs text-muted-foreground">
          Add an owner, manager, receptionist, or barber to get started.
        </p>
        <Button size="sm" onClick={onInvite} className="mt-1">
          <PlusIcon className="h-4 w-4 mr-1" />
          Invite member
        </Button>
      </div>
    </div>
  );
}
