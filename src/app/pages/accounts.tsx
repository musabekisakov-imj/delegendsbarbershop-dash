import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  PlusIcon, UserCircleIcon, EnvelopeIcon,
  PencilSquareIcon, TrashIcon, ShieldCheckIcon,
  ClockIcon, LockClosedIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

import { accountsApi, tenantApi, staffApi } from '../lib/api';
import { PageHeader } from '../components/shared/page-header';
import { EmptyState } from '../components/shared/empty-state';
import { Can } from '../components/shared/can';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Field } from '../components/ui/field';
import { FilterChip } from '../components/ui/filter-chip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { CardSkeleton } from '../components/shared/page-skeleton';
import { usePermission } from '../hooks/use-permission';
import { useConfirm } from '../hooks/use-confirm';
import { useAuthStore } from '../store/auth-store';
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

const STATUS_STYLE: Record<AccountStatus, { chip: string; label: string }> = {
  active:   { chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',        label: 'Active' },
  invited:  { chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',              label: 'Invited' },
  disabled: { chip: 'bg-muted text-muted-foreground',                                  label: 'Disabled' },
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

  return (
    <div className="space-y-6">
      <PageHeader
        size="subtle"
        title="Team & access"
        description="Who can log in, and what they're allowed to do."
        action={
          <Can action="accounts.manage">
            <Button onClick={openNew}>
              <PlusIcon className="h-4 w-4 mr-2" /> Invite member
            </Button>
          </Can>
        }
      />

      {/* Role-permissions reference — collapsible "cheat sheet" so new users
          can see what each role does BEFORE they invite anyone, without the
          matrix dominating the page. */}
      <details className="group rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <summary className="cursor-pointer list-none p-4 flex items-center gap-3 hover:bg-accent/30 transition-colors">
          <ShieldCheckIcon className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">What each role can do</p>
            <p className="text-xs text-muted-foreground">Tap to see the permission matrix.</p>
          </div>
          <span className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden>▾</span>
        </summary>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border border-t border-border">
          {(['owner', 'manager', 'receptionist', 'barber'] as StaffRole[]).map(r => (
            <div key={r} className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className={`h-2 w-2 rounded-full ${ROLE_STYLE[r].dot}`} />
                <h4 className="font-semibold text-foreground">{ROLE_STYLE[r].label}</h4>
                <span className="text-xs text-muted-foreground ml-auto">
                  {ROLE_PERMISSIONS[r].length} perms
                </span>
              </div>
              <ul className="space-y-1">
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

      {/* Search + role filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={roleFilter === 'all'} onClick={() => setRoleFilter('all')}>
            All <span className="ml-1.5 tabular-nums text-muted-foreground">{accounts.length}</span>
          </FilterChip>
          {(['owner', 'manager', 'receptionist', 'barber'] as StaffRole[]).map(r => (
            <FilterChip key={r} active={roleFilter === r} onClick={() => setRoleFilter(r)}>
              {ROLE_STYLE[r].label} <span className="ml-1.5 tabular-nums text-muted-foreground">{roleCounts[r]}</span>
            </FilterChip>
          ))}
        </div>
      </div>

      {/* List */}
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
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(a => {
            const role = ROLE_STYLE[a.role];
            const status = STATUS_STYLE[a.status];
            const initials = `${a.firstName[0] ?? ''}${a.lastName[0] ?? ''}`.toUpperCase();
            const isSelf = a.id === currentUser?.id;
            const offices_ = a.officeIds.map(id => offices.find(o => o.id === id)?.name ?? '—');
            const photoUrl = resolveAvatar(a);
            const gradient = AVATAR_GRADIENTS[hashToIndex(a.id, AVATAR_GRADIENTS.length)];

            return (
              <div
                key={a.id}
                className="group relative rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar: uploaded photo → linked-staff photo → gradient initials.
                      Matches the pattern used on /clients, /bookings, /calendar. */}
                  <div className="relative shrink-0">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={`${a.firstName} ${a.lastName}`}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white',
                        gradient,
                      )}>
                        {initials || <UserCircleIcon className="h-6 w-6 text-white/90" />}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground truncate">
                        {a.firstName} {a.lastName}
                      </p>
                      {isSelf && (
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5">
                          you
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                      <EnvelopeIcon className="h-3.5 w-3.5" />
                      {a.email}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg border inline-flex items-center gap-1.5 ${role.chip}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${role.dot}`} />
                    {role.label}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg ${status.chip}`}>
                    {status.label}
                  </span>
                  {offices_.map((name, i) => (
                    <span key={i} className="text-xs text-muted-foreground px-2 py-1 rounded-lg bg-muted border border-border">
                      {name}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {a.lastLoginAt
                      ? `Seen ${formatDistanceToNow(new Date(a.lastLoginAt), { addSuffix: true })}`
                      : 'Never signed in'}
                  </span>

                  {can('accounts.manage') && (
                    // Always-visible at 70% opacity, full on hover — so touch
                    // devices can tap them (no hover on iPad).
                    <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleStatus(a)}
                        disabled={isSelf}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        title={a.status === 'active' ? 'Disable account' : 'Reactivate account'}
                        aria-label={a.status === 'active' ? 'Disable account' : 'Reactivate account'}
                      >
                        <LockClosedIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        title="Edit"
                        aria-label="Edit account"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemove(a)}
                        disabled={isSelf}
                        className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        title="Remove"
                        aria-label="Remove account"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
          <DialogTitle>{isEdit ? 'Edit account' : 'Invite new member'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── Photo (logo) — upload + preview ─────────── */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar preview"
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white ring-2 ring-border',
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
