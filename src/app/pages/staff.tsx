import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon, UsersIcon, EnvelopeIcon, PhoneIcon,
  MagnifyingGlassIcon, CalendarDaysIcon,
  PencilSquareIcon, TrashIcon, PhotoIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { fileToDataUrl } from '../lib/image-upload';

import { staffApi, shiftsApi, absencesApi } from '../lib/api';
import { useOfficeStore } from '../store/office-store';
import { useT } from '../hooks/use-t';
import { cn } from '../components/ui/utils';
import { CardSkeleton } from '../components/shared/page-skeleton';
import { FilterChip } from '../components/ui/filter-chip';
import { Field } from '../components/ui/field';
import { useConfirm } from '../hooks/use-confirm';
import { Can } from '../components/shared/can';
import { usePermission } from '../hooks/use-permission';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import type { AbsenceReason } from '../types';

import { PageHeader } from '../components/shared/page-header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import type { Staff, StaffRole, DayOfWeek } from '../types';
import type { TranslationKey } from '../i18n';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_SHORT_KEY: Record<DayOfWeek, string> = {
  monday: 'mon', tuesday: 'tue', wednesday: 'wed', thursday: 'thu',
  friday: 'fri', saturday: 'sat', sunday: 'sun',
};

// Deterministic per-staff accent, mirrors the Calendar column palette.
const ACCENTS = [
  { bg: 'bg-blue-100 dark:bg-blue-950/60',       text: 'text-blue-700 dark:text-blue-200',       dot: 'bg-blue-500',    ring: 'ring-blue-400' },
  { bg: 'bg-violet-100 dark:bg-violet-950/60',   text: 'text-violet-700 dark:text-violet-200',   dot: 'bg-violet-500',  ring: 'ring-violet-400' },
  { bg: 'bg-amber-100 dark:bg-amber-950/60',     text: 'text-amber-700 dark:text-amber-200',     dot: 'bg-amber-500',   ring: 'ring-amber-400' },
  { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-200', dot: 'bg-emerald-500', ring: 'ring-emerald-400' },
  { bg: 'bg-rose-100 dark:bg-rose-950/60',       text: 'text-rose-700 dark:text-rose-200',       dot: 'bg-rose-500',    ring: 'ring-rose-400' },
  { bg: 'bg-cyan-100 dark:bg-cyan-950/60',       text: 'text-cyan-700 dark:text-cyan-200',       dot: 'bg-cyan-500',    ring: 'ring-cyan-400' },
  { bg: 'bg-orange-100 dark:bg-orange-950/60',   text: 'text-orange-700 dark:text-orange-200',   dot: 'bg-orange-500',  ring: 'ring-orange-400' },
];

const accentFor = (id: string) => {
  const key = [...id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return ACCENTS[key % ACCENTS.length];
};

// Per-reason palette for absence chips — muted tones so the grid stays calm.
// Rose is reserved for destructive UI (delete) — sick uses amber instead.
const REASON_STYLE: Record<AbsenceReason, { label: string; bg: string; text: string; dot: string }> = {
  'day-off':  { label: 'Day off',  bg: 'bg-muted/60',                         text: 'text-muted-foreground',                   dot: 'bg-muted-foreground/50' },
  vacation:   { label: 'Vacation', bg: 'bg-sky-100 dark:bg-sky-950/50',       text: 'text-sky-700 dark:text-sky-300',          dot: 'bg-sky-500' },
  sick:       { label: 'Sick',     bg: 'bg-amber-100 dark:bg-amber-950/50',   text: 'text-amber-700 dark:text-amber-300',      dot: 'bg-amber-500' },
  training:   { label: 'Training', bg: 'bg-indigo-100 dark:bg-indigo-950/50', text: 'text-indigo-700 dark:text-indigo-300',    dot: 'bg-indigo-500' },
};

export function StaffPage() {
  const queryClient = useQueryClient();
  const t = useT();
  const confirm = useConfirm();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    role: 'barber' as StaffRole, isActive: true,
    avatarUrl: undefined as string | undefined,
  });

  // Photo upload — ref + pending flag for the loading state on the button.
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const handleAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error('Image too large (max 15MB)'); return; }
    setUploadingAvatar(true);
    try {
      const dataUrl = await fileToDataUrl(file, { maxSide: 512, quality: 0.85 });
      setForm(prev => ({ ...prev, avatarUrl: dataUrl }));
    } catch (err) {
      toast.error((err as Error).message ?? 'Upload failed');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Per-day schedule draft — lives inside the staff edit/create dialog so
  // a single Save persists both staff fields and the weekly plan.
  // Status drives what gets saved: 'working' → Shift; anything else → Absence.
  type DayStatus = 'working' | AbsenceReason;
  type DayDraft = { status: DayStatus; startTime: string; endTime: string };
  type ScheduleDraft = Record<DayOfWeek, DayDraft>;
  const emptySchedule = (): ScheduleDraft => DAYS.reduce((acc, day) => {
    acc[day] = {
      status: (day === 'saturday' || day === 'sunday') ? 'day-off' : 'working',
      startTime: '09:00',
      endTime: '18:00',
    };
    return acc;
  }, {} as ScheduleDraft);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>(emptySchedule);

  const officeId = useOfficeStore(s => s.currentOfficeId);
  const { role } = usePermission();
  const canEditSchedule = role === 'owner' || role === 'manager';
  const { data: staff = [], isLoading } = useQuery({ queryKey: ['staff', officeId], queryFn: () => staffApi.getAll(officeId) });
  const { data: shifts = [] } = useQuery({ queryKey: ['shifts'], queryFn: () => shiftsApi.getAll() });
  const { data: absences = [] } = useQuery({ queryKey: ['absences'], queryFn: () => absencesApi.getAll() });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Staff, 'id' | 'createdAt'>) => staffApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(t('toast.staffAdded'));
      closeForm();
    },
    onError: () => toast.error(t('toast.staffAddError')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Staff> }) =>
      staffApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(t('toast.staffUpdated'));
    },
    onError: () => toast.error(t('toast.staffUpdateError')),
  });

  // Optimistic delete with Undo toast — firing a teammate by mistake should be
  // one click to reverse. We keep a snapshot of the removed member so the toast
  // action can recreate them exactly.
  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['staff'] });
      const previous = queryClient.getQueryData<Staff[]>(['staff', officeId]);
      const deleted = previous?.find(m => m.id === id);
      queryClient.setQueryData<Staff[]>(['staff', officeId], (old) =>
        (old ?? []).filter(m => m.id !== id)
      );
      return { previous, deleted };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['staff', officeId], context.previous);
      toast.error(t('toast.staffDeleteError'));
    },
    onSuccess: (_data, _id, context) => {
      toast.success(t('toast.staffDeleted'), {
        action: context?.deleted
          ? {
              label: 'Undo',
              onClick: () => {
                const m = context.deleted!;
                staffApi.create({
                  firstName: m.firstName,
                  lastName: m.lastName,
                  email: m.email,
                  phone: m.phone,
                  role: m.role,
                  isActive: m.isActive,
                  avatarUrl: m.avatarUrl,
                  officeIds: m.officeIds,
                }).then(() => queryClient.invalidateQueries({ queryKey: ['staff'] }));
              },
            }
          : undefined,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });

  // ─── Schedule editing (owner-only) ─────────────────
  const upsertShiftMut = useMutation({
    mutationFn: (data: { staffId: string; dayOfWeek: DayOfWeek; startTime: string; endTime: string }) =>
      shiftsApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Schedule updated');
    },
    onError: () => toast.error('Could not save schedule'),
  });
  const removeShiftMut = useMutation({
    mutationFn: (params: { staffId: string; dayOfWeek: DayOfWeek }) => shiftsApi.remove(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Marked as day off');
    },
    onError: () => toast.error('Could not update schedule'),
  });

  const resetForm = () => setForm({
    firstName: '', lastName: '', email: '', phone: '',
    role: 'barber', isActive: true, avatarUrl: undefined,
  });

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setScheduleDraft(emptySchedule());
    setIsFormOpen(true);
  };

  const openEdit = (m: Staff) => {
    setEditingId(m.id);
    setForm({
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      role: m.role,
      isActive: m.isActive,
      avatarUrl: m.avatarUrl,
    });
    // Pre-fill schedule draft — Shift wins; otherwise fall back to Absence
    // reason; otherwise default to Day off.
    const memberShifts = shifts.filter(s => s.staffId === m.id);
    const memberAbsences = absences.filter(a => a.staffId === m.id);
    setScheduleDraft(DAYS.reduce((acc, day) => {
      const s = memberShifts.find(x => x.dayOfWeek === day);
      if (s) {
        acc[day] = { status: 'working', startTime: s.startTime, endTime: s.endTime };
      } else {
        const a = memberAbsences.find(x => x.dayOfWeek === day);
        acc[day] = {
          status: a?.reason ?? 'day-off',
          startTime: '09:00',
          endTime: '18:00',
        };
      }
      return acc;
    }, {} as ScheduleDraft));
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    resetForm();
    setScheduleDraft(emptySchedule());
  };

  // Persist the week plan: working → upsert Shift + clear Absence;
  //                        non-working → remove Shift + upsert Absence.
  const persistSchedule = async (staffId: string) => {
    await Promise.all(DAYS.flatMap(day => {
      const d = scheduleDraft[day];
      if (d.status === 'working' && d.startTime < d.endTime) {
        return [
          shiftsApi.upsert({ staffId, dayOfWeek: day, startTime: d.startTime, endTime: d.endTime }),
          absencesApi.remove({ staffId, dayOfWeek: day }),
        ];
      }
      return [
        shiftsApi.remove({ staffId, dayOfWeek: day }),
        absencesApi.upsert({ staffId, dayOfWeek: day, reason: d.status as AbsenceReason }),
      ];
    }));
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
    queryClient.invalidateQueries({ queryKey: ['absences'] });
  };

  const handleSubmit = () => {
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      toast.error(t('toast.fillRequired'));
      return;
    }
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: form },
        { onSuccess: async () => { await persistSchedule(editingId); closeForm(); } },
      );
    } else {
      createMutation.mutate(
        { ...form, officeIds: [officeId] },
        { onSuccess: async (created) => { await persistSchedule(created.id); closeForm(); } },
      );
    }
  };

  const handleDelete = async (m: Staff) => {
    const ok = await confirm({
      title: `Delete ${m.firstName} ${m.lastName}?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) deleteMutation.mutate(m.id);
  };

  const roleLabel: Record<StaffRole, string> = {
    owner: t('staff.roleOwner'),
    manager: t('staff.roleManager'),
    barber: t('staff.roleBarber'),
    receptionist: t('staff.roleReceptionist'),
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter(m => {
      if (filter === 'active' && !m.isActive) return false;
      if (filter === 'inactive' && m.isActive) return false;
      if (!q) return true;
      return (
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.phone.includes(search)
      );
    });
  }, [staff, filter, search]);

  const activeCount = staff.filter(s => s.isActive).length;
  const inactiveCount = staff.length - activeCount;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('staff.title')}
        description={t('staff.description')}
        action={
          <Can action="staff.manage">
            <Button size="sm" onClick={openCreate}>
              <PlusIcon className="mr-1.5 h-4 w-4" />
              {t('staff.add')}
            </Button>
          </Can>
        }
      />

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">{t('staff.directory')}</TabsTrigger>
          <TabsTrigger value="schedule">{t('staff.schedule')}</TabsTrigger>
        </TabsList>

        {/* ─── Directory ─────────────────────────── */}
        <TabsContent value="directory" className="space-y-4 mt-4">
          {/* Filter chips — counts baked in, same pattern as services */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
              {t('staff.filterAll')}
              <span className="ml-1.5 text-xs opacity-70 tabular-nums">{staff.length}</span>
            </FilterChip>
            <FilterChip active={filter === 'active'} onClick={() => setFilter('active')}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t('staff.filterActive')}
              <span className="ml-1.5 text-xs opacity-70 tabular-nums">{activeCount}</span>
            </FilterChip>
            <FilterChip active={filter === 'inactive'} onClick={() => setFilter('inactive')}>
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              {t('staff.filterInactive')}
              <span className="ml-1.5 text-xs opacity-70 tabular-nums">{inactiveCount}</span>
            </FilterChip>
          </div>

          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('clients.searchPlaceholder')}
              className="pl-9 h-10"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
            ) : filtered.length === 0 ? (
              <div className="col-span-full flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card py-14 text-center">
                <UsersIcon className="h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">{t('staff.none')}</p>
              </div>
            ) : (
              filtered.map(member => {
                const c = accentFor(member.id);
                const memberShifts = shifts.filter(s => s.staffId === member.id);
                return (
                  <div
                    key={member.id}
                    className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-foreground/15 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <Avatar className={cn('h-11 w-11 ring-2 ring-offset-2 ring-offset-card', c.ring)}>
                          {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.firstName} />}
                          <AvatarFallback className={cn('text-xs font-bold', c.bg, c.text)}>
                            {member.firstName[0]}{member.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{roleLabel[member.role]}</p>
                        </div>
                      </div>

                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          member.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {member.isActive ? t('staff.active') : t('staff.inactive')}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs">
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <EnvelopeIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </p>
                      <p className="flex items-center gap-2 text-muted-foreground tabular-nums">
                        <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
                        {member.phone}
                      </p>
                    </div>

                    {/* Week dot-indicator */}
                    <div className="mt-3 flex items-center gap-1">
                      {DAYS.map(d => {
                        const has = memberShifts.some(s => s.dayOfWeek === d);
                        return (
                          <div
                            key={d}
                            title={t(`days.${d}` as TranslationKey)}
                            className={cn(
                              'flex h-5 flex-1 items-center justify-center rounded-sm text-[9px] font-semibold uppercase tracking-wider',
                              has ? `${c.bg} ${c.text}` : 'bg-muted text-muted-foreground/40',
                            )}
                          >
                            {t(`days.short.${DAY_SHORT_KEY[d]}` as TranslationKey).slice(0, 2)}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                      {memberShifts.length > 0 ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDaysIcon className="h-3.5 w-3.5" />
                          Working {memberShifts.length} {memberShifts.length === 1 ? 'day' : 'days'}
                        </span>
                      ) : <span />}

                      <Can action="staff.manage">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <Switch
                              aria-label="Toggle active"
                              checked={member.isActive}
                              onCheckedChange={() =>
                                updateMutation.mutate({ id: member.id, data: { isActive: !member.isActive } })
                              }
                            />
                            Active
                          </label>
                          <button
                            onClick={() => openEdit(member)}
                            aria-label="Edit staff member"
                            title="Edit"
                            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 dark:hover:border-blue-800/60"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member)}
                            disabled={deleteMutation.isPending}
                            aria-label="Delete staff member"
                            title="Delete"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 dark:hover:border-rose-800/60 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </Can>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ─── Schedule ──────────────────────────── */}
        <TabsContent value="schedule" className="mt-4">
          {staff.filter(s => s.isActive).length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card py-14 text-center">
              <CalendarDaysIcon className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                {staff.length === 0
                  ? t('staff.none')
                  : 'No active staff to schedule. Activate a team member first.'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="sticky left-0 z-10 bg-muted/40 backdrop-blur px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[180px]">
                        {t('staff.member')}
                      </th>
                      {DAYS.map(day => (
                        <th
                          key={day}
                          className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {t(`days.short.${DAY_SHORT_KEY[day]}` as TranslationKey)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {staff.filter(s => s.isActive).map(member => {
                      const c = accentFor(member.id);
                      const memberShifts = shifts.filter(s => s.staffId === member.id);
                      return (
                        <tr key={member.id} className="transition-colors hover:bg-accent/30 group">
                          <td className="sticky left-0 z-10 bg-card group-hover:bg-accent/30 px-5 py-3 min-w-[180px]">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className={cn('h-9 w-9 ring-2 ring-offset-2 ring-offset-card', c.ring)}>
                                {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.firstName} />}
                                <AvatarFallback className={cn('text-[10px] font-bold', c.bg, c.text)}>
                                  {member.firstName[0]}{member.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">
                                  {member.firstName} {member.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">{roleLabel[member.role]}</p>
                              </div>
                            </div>
                          </td>
                          {DAYS.map(day => {
                            const shift = memberShifts.find(s => s.dayOfWeek === day);
                            const absence = absences.find(a => a.staffId === member.id && a.dayOfWeek === day);
                            return (
                              <td key={day} className="px-3 py-3 whitespace-nowrap">
                                <ScheduleCell
                                  staffId={member.id}
                                  day={day}
                                  shift={shift}
                                  absence={absence?.reason}
                                  accent={c}
                                  canEdit={canEditSchedule}
                                  onSave={(startTime, endTime) => upsertShiftMut.mutate({ staffId: member.id, dayOfWeek: day, startTime, endTime })}
                                  onClear={() => removeShiftMut.mutate({ staffId: member.id, dayOfWeek: day })}
                                  offLabel={t('staff.off')}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create / Edit dialog */}
      <Dialog open={isFormOpen} onOpenChange={open => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit staff member' : t('staff.addNew')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* ── Photo ─ upload + preview ───────────────
                Uses the same canvas-downscale pipeline as Accounts so the
                stored data-URL stays ≤ ~120 KB per staff member. */}
            <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-3">
              <div className="relative shrink-0">
                {form.avatarUrl ? (
                  <img
                    src={form.avatarUrl}
                    alt="Staff avatar preview"
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-lg font-bold text-white ring-2 ring-border">
                    {(form.firstName[0] ?? '') + (form.lastName[0] ?? '') || '?'}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
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
                    variant={form.avatarUrl ? 'outline' : 'default'}
                    loading={uploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <PhotoIcon className="mr-1.5 h-4 w-4" />
                    {form.avatarUrl ? 'Replace' : 'Upload photo'}
                  </Button>
                  {form.avatarUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setForm(prev => ({ ...prev, avatarUrl: undefined }))}
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
              <Field label={`${t('staff.firstName')} *`}>
                <Input
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  placeholder="John"
                />
              </Field>
              <Field label={`${t('staff.lastName')} *`}>
                <Input
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </Field>
            </div>
            <Field label={`${t('staff.email')} *`}>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="john@barberpro.com"
              />
            </Field>
            <Field label={`${t('staff.phone')} *`}>
              <Input
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 555 123 4567"
              />
            </Field>
            <Field label={`${t('staff.role')} *`}>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v as StaffRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t('staff.roleOwner')}</SelectItem>
                  <SelectItem value="manager">{t('staff.roleManager')}</SelectItem>
                  <SelectItem value="barber">{t('staff.roleBarber')}</SelectItem>
                  <SelectItem value="receptionist">{t('staff.roleReceptionist')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
              <Label className="text-sm text-foreground">{t('staff.activeStatus')}</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={checked => setForm({ ...form, isActive: checked })}
              />
            </div>

            {/* ─── Weekly schedule (embedded directly in the dialog) ──
                Each row has a 5-way status — working / day off / vacation /
                sick / training. Working shows time inputs; non-working hides
                them and persists the reason as an Absence record. */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Label className="text-sm font-semibold text-foreground">Default week</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Adjust later on the Schedule tab.
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setScheduleDraft(prev => DAYS.reduce((acc, day) => {
                      acc[day] = { ...prev[day], status: 'working' };
                      return acc;
                    }, {} as ScheduleDraft))}
                  >
                    All working
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setScheduleDraft(prev => DAYS.reduce((acc, day) => {
                      acc[day] = { ...prev[day], status: 'day-off' };
                      return acc;
                    }, {} as ScheduleDraft))}
                  >
                    All off
                  </Button>
                </div>
              </div>
              <div className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {DAYS.map(day => {
                  const d = scheduleDraft[day];
                  const setDay = (patch: Partial<DayDraft>) =>
                    setScheduleDraft(prev => ({ ...prev, [day]: { ...prev[day], ...patch } }));
                  const isWorking = d.status === 'working';
                  return (
                    <div
                      key={day}
                      className="grid grid-cols-[5rem_9rem_minmax(90px,1fr)_minmax(90px,1fr)] items-center gap-2 px-3 py-2"
                    >
                      <span className={cn(
                        'text-xs font-medium capitalize',
                        isWorking ? 'text-foreground' : 'text-muted-foreground/70',
                      )}>
                        {t(`days.short.${DAY_SHORT_KEY[day]}` as TranslationKey)}
                      </span>

                      <Select value={d.status} onValueChange={v => setDay({ status: v as DayStatus })}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="working">Working</SelectItem>
                          <SelectItem value="day-off">Day off</SelectItem>
                          <SelectItem value="vacation">Vacation</SelectItem>
                          <SelectItem value="sick">Sick</SelectItem>
                          <SelectItem value="training">Training</SelectItem>
                        </SelectContent>
                      </Select>

                      {isWorking ? (
                        <>
                          <Input
                            type="time"
                            step={300}
                            value={d.startTime}
                            onChange={e => setDay({ startTime: e.target.value })}
                            className="h-8 tabular-nums text-xs"
                          />
                          <Input
                            type="time"
                            step={300}
                            value={d.endTime}
                            onChange={e => setDay({ endTime: e.target.value })}
                            className="h-8 tabular-nums text-xs"
                          />
                        </>
                      ) : (
                        <div className="col-span-2 flex items-center">
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium',
                            REASON_STYLE[d.status as AbsenceReason].bg,
                            REASON_STYLE[d.status as AbsenceReason].text,
                          )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', REASON_STYLE[d.status as AbsenceReason].dot)} />
                            {REASON_STYLE[d.status as AbsenceReason].label}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSubmit}
                className="flex-1"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? t('common.saveChanges') : t('staff.addAction')}
              </Button>
              <Button variant="outline" onClick={closeForm}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Schedule cell (read-only or editable popover) ────────
type Accent = ReturnType<typeof accentFor>;

function ScheduleCell({
  staffId, day, shift, absence, accent, canEdit, onSave, onClear, offLabel,
}: {
  staffId: string;
  day: DayOfWeek;
  shift: { startTime: string; endTime: string } | undefined;
  absence?: AbsenceReason;
  accent: Accent;
  canEdit: boolean;
  onSave: (startTime: string, endTime: string) => void;
  onClear: () => void;
  offLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(shift?.startTime ?? '09:00');
  const [end, setEnd] = useState(shift?.endTime ?? '18:00');

  // Sync local draft when the row's shift changes (e.g. just-saved value).
  useEffect(() => {
    setStart(shift?.startTime ?? '09:00');
    setEnd(shift?.endTime ?? '18:00');
  }, [shift?.startTime, shift?.endTime]);

  const reasonStyle = absence ? REASON_STYLE[absence] : null;
  // Unified pill footprint — every state uses the same chip size so editors
  // see a consistent clickable target across the row.
  const pillBase = 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium';
  const pill = shift ? (
    <span
      className={cn(
        pillBase, 'tabular-nums',
        accent.bg, accent.text,
        canEdit && 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-offset-card transition-shadow',
        canEdit && accent.ring,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', accent.dot)} />
      {shift.startTime}–{shift.endTime}
    </span>
  ) : reasonStyle ? (
    <span
      className={cn(
        pillBase,
        reasonStyle.bg, reasonStyle.text,
        canEdit && 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-offset-card transition-shadow',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', reasonStyle.dot)} />
      {reasonStyle.label}
    </span>
  ) : canEdit ? (
    <span
      className={cn(
        pillBase,
        'border border-dashed border-border bg-transparent text-muted-foreground cursor-pointer hover:border-foreground/30 hover:text-foreground transition-colors',
      )}
    >
      <PlusIcon className="h-3 w-3" />
      {offLabel}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground/40">{offLabel}</span>
  );

  if (!canEdit) return pill;

  const save = () => {
    if (!start || !end || start >= end) {
      toast.error('End time must be after start time');
      return;
    }
    onSave(start, end);
    setOpen(false);
  };

  const handleMarkOff = () => {
    const previous = shift ? { startTime: shift.startTime, endTime: shift.endTime } : null;
    onClear();
    setOpen(false);
    toast.success('Marked as day off', {
      action: previous
        ? { label: 'Undo', onClick: () => onSave(previous.startTime, previous.endTime) }
        : undefined,
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="group/cell" aria-label={`Edit ${day}`}>{pill}</button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="start">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground capitalize">
          {day}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Start</Label>
            <Input
              type="time"
              step={300}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 tabular-nums"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">End</Label>
            <Input
              type="time"
              step={300}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 tabular-nums"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          {shift ? (
            <button
              type="button"
              onClick={handleMarkOff}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Mark as day off
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={save}>Save</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

