// Self-edit profile page — every logged-in user (any role) edits their own
// name + photo here. Read-only block surfaces what they CAN'T change
// themselves (email, role, offices, status) so they know who to ask.
//
// Mounted at `/profile`, no permission gate — the gate is implicit:
// only the logged-in user can reach this route, and only their own
// account is targeted via `useAuthStore.user.id`.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  ArrowLeftIcon, CameraIcon, TrashIcon,
  EnvelopeIcon, MapPinIcon, ClockIcon,
  ShieldCheckIcon, BuildingOffice2Icon, IdentificationIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

import { accountsApi, tenantApi, staffApi } from '../lib/api';
import { useAuthStore } from '../store/auth-store';
import { useOfficeStore } from '../store/office-store';
import { fileToDataUrl } from '../lib/image-upload';
import {
  AVATAR_GRADIENTS, hashToIndex,
  ROLE_LABEL, ROLE_CHIP, ROLE_DOT, ROLE_BAR, ROLE_RING,
  MOTION_EASE, MOTION_DUR,
} from '../lib/tokens';
import { Button } from '../components/ui/button';
import { Field } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { PageHeader, PageHeaderDivider } from '../components/shared/page-header';
import { cn } from '../components/ui/utils';
import type { Account } from '../types';

// Status pill — emerald for active, amber for invited, muted for disabled.
// Mirrors the dot palette used on the Tree node so a user landing on /profile
// from the team page recognizes the signal.
const STATUS_DESC: Record<Account['status'], string> = {
  active: 'Active member',
  invited: 'Invitation pending',
  disabled: 'Account disabled',
};
const STATUS_TONE: Record<Account['status'], string> = {
  active:   'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30',
  invited:  'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/30',
  disabled: 'bg-muted text-muted-foreground ring-border',
};

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();

  const authUser = useAuthStore(s => s.user);
  const setAuthUser = useAuthStore(s => s.setUser);

  const currentOfficeId = useOfficeStore(s => s.currentOfficeId);

  // Pull the full Account (includes avatarUrl, status, lastLoginAt, officeIds).
  // We hit the API rather than reading from localStorage so this page works
  // identically against the mock + remote backends.
  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: ['account', authUser?.id],
    queryFn: () => authUser ? accountsApi.getById(authUser.id) : null,
    enabled: !!authUser?.id,
  });

  const { data: tenant } = useQuery({ queryKey: ['tenant'], queryFn: tenantApi.get });
  const offices = tenant?.offices ?? [];

  // If the account is linked to a Staff record, surface it so we can show
  // their phone in the read-only block (Account doesn't carry phone).
  const { data: linkedStaff } = useQuery({
    queryKey: ['staff', 'byId', account?.staffId],
    queryFn: () => account?.staffId ? staffApi.getById(account.staffId) : null,
    enabled: !!account?.staffId,
  });

  // ── Form state — only the fields the user is allowed to edit ──
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate the form once the account arrives. Re-runs only when identity
  // changes (e.g., the user logs out/in as someone else).
  useEffect(() => {
    if (!account) return;
    setFirstName(account.firstName);
    setLastName(account.lastName);
    setAvatarUrl(account.avatarUrl);
  }, [account?.id]);

  const updateMut = useMutation({
    mutationFn: (data: Partial<Account>) =>
      accountsApi.update(authUser!.id, data),
    onSuccess: (updated) => {
      // Keep the React Query cache + auth store in sync so the topbar
      // updates without a refresh.
      queryClient.invalidateQueries({ queryKey: ['account', authUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setAuthUser({ firstName: updated.firstName, lastName: updated.lastName });
      toast.success('Profile updated');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update profile');
    },
  });

  // ── Actions ──────────────────────────────────────
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
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file, { maxSide: 512, quality: 0.85 });
      setAvatarUrl(dataUrl);
    } catch (err) {
      toast.error((err as Error).message ?? 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAvatar = () => setAvatarUrl(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    updateMut.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      avatarUrl,
    });
  };

  // Detect unsaved edits so the Save button can disable when nothing's changed.
  const dirty = useMemo(() => {
    if (!account) return false;
    return (
      firstName !== account.firstName ||
      lastName !== account.lastName ||
      avatarUrl !== account.avatarUrl
    );
  }, [account, firstName, lastName, avatarUrl]);

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?';
  const previewGradient = AVATAR_GRADIENTS[
    hashToIndex(account?.id ?? authUser?.email ?? 'guest', AVATAR_GRADIENTS.length)
  ];

  const currentOffice = offices.find(o => o.id === currentOfficeId);
  const myOffices = useMemo(() => {
    if (!account) return [];
    return account.officeIds
      .map(id => offices.find(o => o.id === id)?.name)
      .filter(Boolean) as string[];
  }, [account, offices]);

  // ── Loading + missing states ─────────────────────
  if (loadingAccount) return <ProfileSkeleton />;
  if (!authUser || !account) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Profile unavailable. Please sign in again.</p>
      </div>
    );
  }

  const animateProps = (delay: number) => reduce ? {} : {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: MOTION_DUR.base, ease: MOTION_EASE, delay },
  };

  return (
    <div className="space-y-6">
      {/* ─── Hero — editorial family ─────────────────
          Eyebrow row mirrors the rest of the dashboard
          (PAGE · Office · context). Display-size title
          carries the user's full name; role chip + status
          dot sit underneath. */}
      <motion.div {...animateProps(0)}>
        <PageHeader
          eyebrow={(
            <>
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeftIcon className="h-3 w-3" />
                Back
              </button>
              <PageHeaderDivider />
              <span>My profile</span>
              {currentOffice && (
                <>
                  <PageHeaderDivider />
                  <span className="inline-flex items-center gap-1 normal-case tracking-normal font-medium">
                    <MapPinIcon className="h-3 w-3" />
                    {currentOffice.name}
                  </span>
                </>
              )}
              <PageHeaderDivider />
              <span className="normal-case tracking-normal">Personal &amp; identity</span>
            </>
          )}
          title={`${account.firstName} ${account.lastName}`}
          meta={(
            <>
              <span className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
                ROLE_CHIP[account.role],
              )}>
                <span className={cn('h-1.5 w-1.5 rounded-full', ROLE_DOT[account.role])} />
                {ROLE_LABEL[account.role]}
              </span>
              <span className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1',
                STATUS_TONE[account.status],
              )}>
                <span className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  account.status === 'active' && 'bg-emerald-500',
                  account.status === 'invited' && 'bg-amber-500',
                  account.status === 'disabled' && 'bg-muted-foreground/40',
                )} />
                {STATUS_DESC[account.status]}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground/80">
                <EnvelopeIcon className="h-3.5 w-3.5" />
                {account.email}
              </span>
            </>
          )}
        />
      </motion.div>

      {/* ─── Editable surface — photo + identity ─────
          Two-column on lg+. Left: photo + upload chrome.
          Right: name fields + Save. The role-tinted ring
          on the avatar matches the Tree-page identity
          system so it feels like one app, not two. */}
      <motion.form
        {...animateProps(0.06)}
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="grid lg:grid-cols-[280px_1fr] gap-0">
          {/* Photo column */}
          <div className="relative p-6 lg:p-8 flex flex-col items-center gap-4 border-b lg:border-b-0 lg:border-r border-border bg-card">
            <span
              aria-hidden
              className="absolute inset-y-6 left-0 w-[3px] rounded-r-full hidden lg:block"
              style={{ background: ROLE_BAR[account.role] }}
            />
            <p className="self-start text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Photo
            </p>
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${firstName} ${lastName}`}
                  className="h-32 w-32 rounded-full object-cover"
                  style={{ boxShadow: `0 0 0 3px ${ROLE_RING[account.role]}, 0 0 0 6px var(--card)` }}
                />
              ) : (
                <div
                  className={cn(
                    'flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br text-3xl font-bold text-white',
                    previewGradient,
                  )}
                  style={{ boxShadow: `0 0 0 3px ${ROLE_RING[account.role]}, 0 0 0 6px var(--card)` }}
                >
                  {initials}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70 text-[11px] font-medium text-muted-foreground">
                  Uploading…
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleAvatarFile(e.target.files?.[0])}
              className="sr-only"
              id="profile-avatar-input"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <CameraIcon className="h-4 w-4 mr-1.5" />
                {avatarUrl ? 'Change' : 'Upload'}
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={removeAvatar}
                  className="text-muted-foreground hover:text-rose-600"
                >
                  <TrashIcon className="h-4 w-4 mr-1.5" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-center text-[11px] text-muted-foreground/70 leading-snug max-w-[200px]">
              JPG, PNG or WEBP. Auto-compressed to a 512&nbsp;px square.
            </p>
          </div>

          {/* Identity column */}
          <div className="p-6 lg:p-8 flex flex-col gap-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Identity
              </p>
              <p className="mt-1 text-sm text-muted-foreground/80">
                Name appears on bookings, the schedule and the team tree.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="First name" htmlFor="profile-firstName">
                <Input
                  id="profile-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </Field>
              <Field label="Last name" htmlFor="profile-lastName">
                <Input
                  id="profile-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </Field>
            </div>

            <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-[11px] text-muted-foreground/80">
                {dirty
                  ? 'You have unsaved changes.'
                  : 'Everything is saved.'}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setFirstName(account.firstName);
                    setLastName(account.lastName);
                    setAvatarUrl(account.avatarUrl);
                  }}
                  disabled={!dirty || updateMut.isPending}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!dirty || updateMut.isPending || uploading}
                >
                  {updateMut.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.form>

      {/* ─── Read-only access block ──────────────────
          Surfaces the fields the user can't change
          themselves. If they need to edit any of these,
          they'll know to ask an Owner. */}
      <motion.div
        {...animateProps(0.12)}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <ShieldCheckIcon className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Account &amp; access
            </p>
            <p className="text-sm font-medium text-foreground">
              Managed by your shop owner
            </p>
          </div>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-0">
          <ReadRow
            icon={<EnvelopeIcon className="h-4 w-4" />}
            label="Email"
            value={account.email}
            hint="Used to sign in"
          />
          <ReadRow
            icon={<IdentificationIcon className="h-4 w-4" />}
            label="Role"
            value={ROLE_LABEL[account.role]}
            hint="Defines your permissions"
          />
          <ReadRow
            icon={<ClockIcon className="h-4 w-4" />}
            label="Last sign-in"
            value={
              account.lastLoginAt
                ? `${formatDistanceToNow(parseISO(account.lastLoginAt))} ago`
                : 'Never'
            }
            hint={account.lastLoginAt ? format(parseISO(account.lastLoginAt), 'MMM d, yyyy · HH:mm') : undefined}
          />
          <ReadRow
            icon={<ClockIcon className="h-4 w-4" />}
            label="Member since"
            value={format(parseISO(account.createdAt), 'MMM d, yyyy')}
          />
          <ReadRow
            icon={<BuildingOffice2Icon className="h-4 w-4" />}
            label="Offices"
            value={myOffices.length > 0 ? myOffices.join(', ') : '—'}
            hint={myOffices.length > 1 ? `${myOffices.length} locations` : undefined}
            wide
          />
          {linkedStaff?.phone && (
            <ReadRow
              icon={<EnvelopeIcon className="h-4 w-4" />}
              label="Phone"
              value={linkedStaff.phone}
              hint="From your staff record"
            />
          )}
        </dl>
      </motion.div>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────

function ReadRow({
  icon, label, value, hint, wide,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  wide?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-start gap-3 px-6 py-4 border-t border-border first:border-t-0 sm:[&:nth-child(2)]:border-t-0',
      wide && 'sm:col-span-2',
    )}>
      <span className="mt-0.5 text-muted-foreground/70 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-1 text-sm font-medium text-foreground truncate">
          {value}
        </dd>
        {hint && (
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</p>
        )}
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-3 w-48 rounded bg-muted" />
        <div className="h-9 w-72 rounded bg-muted" />
        <div className="h-5 w-56 rounded bg-muted" />
      </div>
      <div className="rounded-xl border border-border bg-card p-8 grid lg:grid-cols-[280px_1fr] gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="h-32 w-32 rounded-full bg-muted" />
          <div className="h-8 w-32 rounded bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
