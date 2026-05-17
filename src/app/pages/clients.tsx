import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, appointmentsApi } from '../lib/api';
import { useOfficeStore } from '../store/office-store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  MagnifyingGlassIcon, PlusIcon, UserIcon, CalendarIcon, ArrowsUpDownIcon,
  ListBulletIcon, Squares2X2Icon, PencilSquareIcon, EnvelopeIcon, PhoneIcon,
  TrashIcon, ArrowUturnLeftIcon, MapPinIcon, ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '../components/ui/utils';
import { useT } from '../hooks/use-t';
import { CardSkeleton, TableSkeleton } from '../components/shared/page-skeleton';
import { EmptyState } from '../components/shared/empty-state';
import { gradientFor } from '../lib/tokens';
import { Field, Readonly } from '../components/ui/field';
import { ClientForm } from '../components/clients/client-form';
import { exportCsv } from '../lib/csv';
import { useConfirm } from '../hooks/use-confirm';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import type { ClientFormValues } from '../lib/schemas';
import type { Client, AppointmentWithDetails } from '../types';

type ViewMode = 'list' | 'grid';
type Filter = 'all' | 'returning' | 'new' | 'vip';
type SortKey = 'visits-desc' | 'visits-asc' | 'name-asc' | 'name-desc' | 'recent' | 'oldest' | 'spend-desc' | 'spend-asc';

// Avatar gradients + hash function imported from tokens.ts so the same client
// paints the same color on every page (Bookings, Clients, New booking).

// Recency buckets — matches how a shop thinks about cadence
type Recency = 'fresh' | 'warm' | 'cold' | 'new';
const recencyOf = (lastVisitAt: string | null): Recency => {
  if (!lastVisitAt) return 'new';
  const days = differenceInDays(new Date(), parseISO(lastVisitAt));
  if (days <= 14) return 'fresh';
  if (days <= 60) return 'warm';
  return 'cold';
};

const RECENCY_STYLE: Record<Recency, { dot: string; labelKey: string; text: string }> = {
  fresh: { dot: 'bg-emerald-500', labelKey: 'clients.recencyFresh', text: 'text-emerald-600 dark:text-emerald-400' },
  warm:  { dot: 'bg-amber-500',  labelKey: 'clients.recencyWarm',  text: 'text-amber-600 dark:text-amber-400' },
  cold:  { dot: 'bg-rose-500',   labelKey: 'clients.recencyCold',  text: 'text-rose-600 dark:text-rose-400' },
  new:   { dot: 'bg-blue-500',   labelKey: 'clients.recencyNew',   text: 'text-blue-600 dark:text-blue-400' },
};

// daysAgoLabel is built inside the component so it can access t().
// This stub keeps the type signature visible at module scope.
type DaysAgoFn = (lastVisitAt: string | null) => string;

export function ClientsPage() {
  const queryClient = useQueryClient();
  const t = useT();
  const confirm = useConfirm();

  // Localised helpers that depend on t() ─────────────────────────
  const daysAgoLabel: DaysAgoFn = (lastVisitAt) => {
    if (!lastVisitAt) return t('clients.never');
    const days = differenceInDays(new Date(), parseISO(lastVisitAt));
    if (days === 0) return t('common.today');
    if (days === 1) return t('calendar.dayLabelYesterday');
    if (days < 30)  return t('clients.daysAgoDays', { n: days });
    if (days < 365) return t('clients.daysAgoMonths', { n: Math.floor(days / 30) });
    return t('clients.daysAgoYears', { n: Math.floor(days / 365) });
  };

  const SORT_LABELS: Record<SortKey, string> = {
    'visits-desc': t('clients.sortVisitsDesc'),
    'visits-asc':  t('clients.sortVisitsAsc'),
    'name-asc':    t('clients.sortNameAsc'),
    'name-desc':   t('clients.sortNameDesc'),
    'recent':      t('clients.sortRecent'),
    'oldest':      t('clients.sortOldest'),
    'spend-desc':  t('clients.sortSpendDesc'),
    'spend-asc':   t('clients.sortSpendAsc'),
  };
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [detailsTab, setDetailsTab] = useState<'overview' | 'history' | 'edit'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filter, setFilter] = useState<Filter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('visits-desc');

  const officeId = useOfficeStore(s => s.currentOfficeId);
  const offices = useOfficeStore(s => s.offices);
  const currentOffice = useMemo(() => offices.find(o => o.id === officeId), [offices, officeId]);

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients', officeId],
    queryFn: () => clientsApi.getAll(officeId),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', officeId],
    queryFn: () => appointmentsApi.getAllWithDetails(officeId),
  });
  const isLoading = clientsLoading;

  const createMutation = useMutation({
    mutationFn: (data: Omit<Client, 'id' | 'createdAt' | 'totalVisits' | 'lastVisitAt'>) =>
      clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(t('toast.clientCreated'));
      setIsCreateModalOpen(false);
    },
    onError: () => toast.error(t('toast.clientCreateError')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
      clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(t('toast.clientUpdated'));
      setIsEditing(false);
    },
    onError: () => toast.error(t('toast.clientUpdateError')),
  });

  const clientsKey = ['clients', officeId] as const;

  // Optimistic delete — client disappears from list instantly, rolls back on error.
  // Toast includes an Undo action that re-creates the client from the snapshot.
  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: clientsKey });
      const previous = queryClient.getQueryData<Client[]>(clientsKey);
      const deletedClient = previous?.find((c) => c.id === id);
      queryClient.setQueryData(clientsKey, (old: Client[] | undefined) =>
        (old ?? []).filter(c => c.id !== id)
      );
      return { previous, deletedClient };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(clientsKey, context.previous);
      toast.error(t('toast.clientDeleteError'));
    },
    onSuccess: (_data, id, context) => {
      setSelectedClientId(null);
      toast.success(t('toast.clientDeleted'), {
        action: context?.deletedClient
          ? {
              label: 'Undo',
              // Soft delete: clients.delete set `deletedAt`; clients.restore
              // clears it. Keeps the same id → any orphaned appointment
              // references resolve again after undo.
              onClick: () => {
                clientsApi.restore(id)
                  .then(() => queryClient.invalidateQueries({ queryKey: clientsKey }));
              },
            }
          : undefined,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: clientsKey });
    },
  });

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: t('clients.deleteConfirmTitle', { name }),
      description: t('clients.deleteConfirmDesc'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (ok) deleteMutation.mutate(id);
  };

  const handleCreate = (values: ClientFormValues) => {
    createMutation.mutate({ ...values, officeIds: [officeId] });
  };

  const handleUpdate = (clientId: string, values: ClientFormValues) => {
    updateMutation.mutate({ id: clientId, data: values });
  };

  // Per-client spend & favorite service — computed once from completed appointments
  const clientStats = useMemo(() => {
    const spendMap = new Map<string, number>();
    const serviceCountMap = new Map<string, Map<string, number>>();
    appointments.forEach(a => {
      if (a.status !== 'completed') return;
      spendMap.set(a.clientId, (spendMap.get(a.clientId) ?? 0) + (a.service?.price ?? 0));
      const byService = serviceCountMap.get(a.clientId) ?? new Map();
      byService.set(a.service.name, (byService.get(a.service.name) ?? 0) + 1);
      serviceCountMap.set(a.clientId, byService);
    });

    const favorite = (clientId: string): string | undefined => {
      const byService = serviceCountMap.get(clientId);
      if (!byService) return;
      let best: string | undefined;
      let bestN = 0;
      byService.forEach((n, name) => { if (n > bestN) { bestN = n; best = name; } });
      return best;
    };

    return {
      spend: (id: string) => spendMap.get(id) ?? 0,
      favorite,
    };
  }, [appointments]);

  // VIP threshold: top 20% by spend among clients with any spend
  const vipSet = useMemo(() => {
    const spends = clients.map(c => clientStats.spend(c.id)).filter(s => s > 0).sort((a, b) => b - a);
    if (spends.length === 0) return new Set<string>();
    const cutoffIdx = Math.max(0, Math.floor(spends.length * 0.2) - 1);
    const cutoff = spends[cutoffIdx] ?? 0;
    if (cutoff <= 0) return new Set<string>();
    return new Set(clients.filter(c => clientStats.spend(c.id) >= cutoff).map(c => c.id));
  }, [clients, clientStats]);

  const returningCount = clients.filter(c => (c.totalVisits ?? 0) > 0).length;
  const newCount = clients.length - returningCount;
  const vipCount = vipSet.size;

  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = clients.filter(c => {
      if (filter === 'returning' && (c.totalVisits ?? 0) === 0) return false;
      if (filter === 'new' && (c.totalVisits ?? 0) > 0) return false;
      if (filter === 'vip' && !vipSet.has(c.id)) return false;
      if (!q) return true;
      return (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(searchQuery)
      );
    });

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'visits-desc': return (b.totalVisits ?? 0) - (a.totalVisits ?? 0);
        case 'visits-asc':  return (a.totalVisits ?? 0) - (b.totalVisits ?? 0);
        case 'name-asc':    return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'name-desc':   return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
        case 'recent': {
          const at = a.lastVisitAt ? parseISO(a.lastVisitAt).getTime() : 0;
          const bt = b.lastVisitAt ? parseISO(b.lastVisitAt).getTime() : 0;
          return bt - at;
        }
        case 'oldest': {
          const at = a.lastVisitAt ? parseISO(a.lastVisitAt).getTime() : Infinity;
          const bt = b.lastVisitAt ? parseISO(b.lastVisitAt).getTime() : Infinity;
          return at - bt;
        }
        case 'spend-desc': return clientStats.spend(b.id) - clientStats.spend(a.id);
        case 'spend-asc':  return clientStats.spend(a.id) - clientStats.spend(b.id);
      }
    });
  }, [clients, searchQuery, filter, sortKey, vipSet, clientStats]);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientAppointments = selectedClient
    ? appointments
        .filter(apt => apt.clientId === selectedClient.id)
        .sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime())
    : [];

  const openClientDetail = (client: Client) => {
    setSelectedClientId(client.id);
    setIsEditing(false);
  };

  const exportClients = () => exportCsv(
    `clients-${format(new Date(), 'yyyy-MM-dd')}`,
    filteredSorted,
    [
      { key: 'firstName', header: 'First name' },
      { key: 'lastName', header: 'Last name' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: (c) => c.totalVisits ?? 0, header: 'Total visits' },
      { key: (c) => c.lastVisitAt ? format(parseISO(c.lastVisitAt), 'yyyy-MM-dd') : '', header: 'Last visit' },
      { key: (c) => clientStats.spend(c.id), header: 'Lifetime spend' },
      { key: 'notes', header: 'Notes' },
    ],
  );

  const FILTER_TABS: { id: Filter; label: string; count: number }[] = [
    { id: 'all',       label: t('calendar.filterAll'),        count: clients.length },
    { id: 'returning', label: t('clients.filterReturning'),   count: returningCount },
    { id: 'new',       label: t('clients.filterNew'),         count: newCount       },
    ...(vipCount > 0 ? [{ id: 'vip' as Filter, label: t('clients.filterVip'), count: vipCount }] : []),
  ];

  return (
    <div className="space-y-5">
      {/* ─── Editorial hero ──────────────────────────────
          Client Ledger: the count IS the headline (Analytics
          uses € revenue the same way). Eyebrow carries the
          operational signal — Office · returning · VIP. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>{t('clients.title')}</span>
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
            <span className="normal-case tracking-normal tabular-nums">
              {t('clients.returning', { n: returningCount })}
            </span>
            {vipCount > 0 && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center gap-1 normal-case tracking-normal font-medium">
                  <StarIconSolid className="h-3 w-3 text-amber-400" />
                  <span className="tabular-nums">{t('clients.vipCount', { n: vipCount })}</span>
                </span>
              </>
            )}
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-none tabular-nums">
            {clients.length.toLocaleString()}{' '}
            <span className="text-muted-foreground/70 font-semibold">
              {clients.length === 1 ? t('clients.clientOne') : t('clients.clientMany')}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={exportClients}
            disabled={filteredSorted.length === 0}
            aria-label={t('clients.exportAria')}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="mr-1 h-4 w-4" />
            {t('clients.add')}
          </Button>
        </div>
      </div>

      {/* ─── Operator bar ────────────────────────────────
          One tight band replaces the old filter row + controls
          row. Tab-with-underline filters on the left (Bookings
          pattern), search in the middle, sort + view toggle
          on the right. */}
      <div className="rounded-xl border border-border bg-card">
        {/* Tab bar with underline — filter by segment */}
        <div className="flex items-end gap-1 overflow-x-auto border-b border-border px-2">
          {FILTER_TABS.map(tab => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                aria-pressed={active}
                className={cn(
                  'relative inline-flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.id === 'vip' && <StarIconSolid className="h-3 w-3 text-amber-400" />}
                <span>{tab.label}</span>
                <span className={cn(
                  'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums',
                  active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
                )}>
                  {tab.count}
                </span>
                {active && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" aria-hidden />
                )}
              </button>
            );
          })}
        </div>

        {/* Search + sort + view mode — operator controls */}
        <div className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('clients.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background"
            />
          </div>

          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="sm:w-48 h-9">
              <ArrowsUpDownIcon className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
                <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="inline-flex items-center rounded-md border border-border p-0.5 shrink-0 h-9">
            <button
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              aria-label={t('clients.listViewAria')}
              className={cn(
                'inline-flex items-center justify-center rounded px-2 py-1 transition-colors',
                viewMode === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ListBulletIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label={t('clients.gridViewAria')}
              className={cn(
                'inline-flex items-center justify-center rounded px-2 py-1 transition-colors',
                viewMode === 'grid' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Squares2X2Icon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        viewMode === 'list' ? (
          <TableSkeleton rows={6} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )
      ) : filteredSorted.length === 0 ? (
        <EmptyState
          icon={UserIcon}
          variant={searchQuery || filter !== 'all' ? 'plain' : 'dashed'}
          title={t('clients.none')}
          description={
            searchQuery
              ? t('clients.emptySearch')
              : filter !== 'all'
                ? t('clients.emptyFilter')
                : t('clients.emptyDefault')
          }
          action={
            !searchQuery && filter === 'all' ? (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                {t('clients.add')}
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === 'list' ? (
        /* ─── LIST VIEW ─────────────────────────────────────
            Row grid: identity (1.2fr) | contact (1.3fr) | visits (auto) |
            spend (auto) | last-seen (auto) | hover-actions (auto).
            Sticky header, hairline dividers, hover-reveal actions. */
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div
            className={cn(
              'grid gap-4 border-b border-border bg-muted/40 px-5 py-2.5',
              'grid-cols-[minmax(0,1.2fr)_1fr_3.5rem_5rem] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_4rem_6rem_6rem] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_4rem_6rem_6rem_8rem]',
            )}
          >
            <ColHeader>{t('clients.colClient')}</ColHeader>
            <ColHeader className="hidden md:block">{t('clients.colContact')}</ColHeader>
            <ColHeader className="text-right">{t('clients.colVisits')}</ColHeader>
            <ColHeader className="text-right hidden sm:block">{t('clients.colSpend')}</ColHeader>
            <ColHeader className="hidden md:block">{t('clients.colLastSeen')}</ColHeader>
            <span className="hidden lg:block" />
          </div>

          {/* Rows */}
          <ul className="divide-y divide-border">
            {filteredSorted.map(client => {
              const grad = gradientFor(client.id);
              const recency = recencyOf(client.lastVisitAt);
              const rStyle = RECENCY_STYLE[recency];
              const spend = clientStats.spend(client.id);
              const isVip = vipSet.has(client.id);

              return (
                <li
                  key={client.id}
                  onClick={() => openClientDetail(client)}
                  className={cn(
                    'group relative cursor-pointer px-5 py-3 transition-colors',
                    'grid items-center gap-4',
                    'grid-cols-[minmax(0,1.2fr)_1fr_3.5rem_5rem] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_4rem_6rem_6rem] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_4rem_6rem_6rem_8rem]',
                    'hover:bg-muted/40 focus-within:bg-muted/40',
                  )}
                >
                  {/* Identity: avatar + name + chip stack */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white overflow-hidden',
                      grad,
                      isVip && 'ring-2 ring-amber-400 ring-offset-1 ring-offset-background',
                    )}>
                      {client.avatarUrl && (
                        <img
                          src={client.avatarUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <span className="relative">{client.firstName[0]}{client.lastName[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {client.firstName} {client.lastName}
                        </p>
                        {isVip && (
                          <span className="shrink-0 inline-flex items-center rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide bg-amber-400/15 text-amber-600 dark:text-amber-400">
                            {t('clients.vipLabel')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate md:hidden tabular-nums mt-0.5">
                        {client.phone}
                      </p>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="hidden md:block min-w-0">
                    <p className="flex items-center gap-1.5 text-sm text-foreground truncate">
                      <EnvelopeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{client.email}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums mt-0.5">
                      <PhoneIcon className="h-3 w-3 shrink-0" />
                      {client.phone}
                    </p>
                  </div>

                  {/* Visits */}
                  <div className="text-right font-semibold text-foreground tabular-nums">
                    {client.totalVisits ?? 0}
                  </div>

                  {/* Spend */}
                  <div className="hidden sm:block text-right font-medium tabular-nums whitespace-nowrap">
                    {spend > 0 ? (
                      <span className="text-foreground">€{spend.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </div>

                  {/* Last seen */}
                  <div className="hidden md:flex items-center gap-1.5 text-xs whitespace-nowrap">
                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', rStyle.dot)} />
                    <span className="text-muted-foreground tabular-nums">{daysAgoLabel(client.lastVisitAt)}</span>
                  </div>

                  {/* Hover actions */}
                  <div className="hidden lg:flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconAction
                      label={t('clients.actionCall')}
                      onClick={e => { e.stopPropagation(); window.location.href = `tel:${client.phone}`; }}
                    >
                      <PhoneIcon className="h-3.5 w-3.5" />
                    </IconAction>
                    <IconAction
                      label={t('clients.actionMessage')}
                      onClick={e => { e.stopPropagation(); window.location.href = `mailto:${client.email}`; }}
                    >
                      <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
                    </IconAction>
                    <IconAction
                      label={t('clients.actionBook')}
                      onClick={e => { e.stopPropagation(); navigate(`/bookings/new?clientId=${client.id}`); }}
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                    </IconAction>
                    <IconAction
                      label={t('common.delete')}
                      danger
                      onClick={e => { e.stopPropagation(); handleDelete(client.id, `${client.firstName} ${client.lastName}`); }}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </IconAction>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        /* ─── GRID VIEW ───────────────────────────────────── */
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filteredSorted.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              spend={clientStats.spend(client.id)}
              isVip={vipSet.has(client.id)}
              onClick={() => openClientDetail(client)}
            />
          ))}
        </div>
      )}

      {/* Client detail — centered modal (was side sheet before client review). */}
      <Dialog
        open={selectedClientId !== null}
        onOpenChange={(open) => { if (!open) { setSelectedClientId(null); setDetailsTab('overview'); } }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto p-0">
          {selectedClient && (() => {
            const recency = recencyOf(selectedClient.lastVisitAt);
            const rStyle = RECENCY_STYLE[recency];
            const spend = clientStats.spend(selectedClient.id);
            const favorite = clientStats.favorite(selectedClient.id);
            const isVip = vipSet.has(selectedClient.id);
            const historyCount = clientAppointments.length;
            const recentVisits = clientAppointments.slice(0, 3);
            const bookForClient = () => {
              setSelectedClientId(null);
              setDetailsTab('overview');
              navigate(`/bookings/new?clientId=${selectedClient.id}`);
            };

            return (
              <>
                {/* ─── Identity header ─────────────────────────────────
                    Editorial treatment: the person's NAME is the title,
                    scaled like a magazine headline. Eyebrow above gives
                    operator context (recency · gender · VIP). Smaller
                    avatar reads as a mark, not a profile photo. */}
                <DialogHeader className="px-7 pt-7 pb-5 space-y-0 border-b border-border">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className={cn(
                        'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white overflow-hidden',
                        gradientFor(selectedClient.id),
                        isVip && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-background',
                      )}>
                        {selectedClient.avatarUrl && (
                          <img
                            src={selectedClient.avatarUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <span className="relative">{selectedClient.firstName[0]}{selectedClient.lastName[0]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          <span className={cn('inline-flex items-center gap-1 normal-case tracking-normal font-medium', rStyle.text)}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', rStyle.dot)} />
                            {t(rStyle.labelKey as Parameters<typeof t>[0])}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="normal-case tracking-normal tabular-nums">
                            {daysAgoLabel(selectedClient.lastVisitAt)}
                          </span>
                          {selectedClient.gender && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="normal-case tracking-normal font-medium">
                                {t(GENDER_STYLE[selectedClient.gender].labelKey as Parameters<typeof t>[0])}
                              </span>
                            </>
                          )}
                          {isVip && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="inline-flex items-center gap-1 normal-case tracking-normal font-medium text-amber-600 dark:text-amber-400">
                                <StarIconSolid className="h-3 w-3" />
                                {t('clients.vipLabel')}
                              </span>
                            </>
                          )}
                        </div>
                        <DialogTitle className="mt-1.5 text-2xl sm:text-3xl font-bold text-foreground truncate leading-tight tracking-tight">
                          {selectedClient.firstName} {selectedClient.lastName}
                        </DialogTitle>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" onClick={bookForClient}>
                        <CalendarIcon className="mr-1 h-4 w-4" />
                        {t('clients.actionBook')}
                      </Button>
                      <Button asChild size="sm" variant="outline" aria-label={t('clients.actionCall')}>
                        <a href={`tel:${selectedClient.phone}`}>
                          <PhoneIcon className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="outline" aria-label={t('clients.actionMessage')}>
                        <a href={`mailto:${selectedClient.email}`}>
                          <EnvelopeIcon className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                {/* Hairline-divided stat band — same rhythm as Calendar
                    summary. Typography carries it; no muted surfaces. */}
                <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                  <LedgerStat label={t('clients.colVisits')}   value={String(selectedClient.totalVisits ?? 0)} />
                  <LedgerStat label={t('clients.colSpend')}    value={spend > 0 ? `€${spend.toLocaleString()}` : '—'} />
                  <LedgerStat label={t('clients.colLastSeen')} value={daysAgoLabel(selectedClient.lastVisitAt)} />
                </div>

                <Tabs value={detailsTab} onValueChange={(v) => setDetailsTab(v as typeof detailsTab)} className="px-7 py-6">
                  <TabsList className="grid w-full grid-cols-3 max-w-sm">
                    <TabsTrigger value="overview">{t('clients.overview')}</TabsTrigger>
                    <TabsTrigger value="history" className="gap-1.5">
                      {t('clients.history')}
                      {historyCount > 0 && (
                        <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                          {historyCount}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="edit">{t('clients.edit')}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-6">
                    <div className="grid gap-8 md:grid-cols-5">
                      {/* Left — contact + favorite + notes */}
                      <div className="md:col-span-2 space-y-5">
                        <Section label={t('clients.sectionContact')}>
                          <a
                            href={`mailto:${selectedClient.email}`}
                            className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                          >
                            <EnvelopeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{selectedClient.email}</span>
                          </a>
                          <a
                            href={`tel:${selectedClient.phone}`}
                            className="mt-1.5 flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors tabular-nums"
                          >
                            <PhoneIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            {selectedClient.phone}
                          </a>
                        </Section>

                        {favorite && (
                          <Section label={t('clients.sectionFavoriteService')} accent>
                            <p className="text-sm font-medium text-foreground">{favorite}</p>
                          </Section>
                        )}

                        {selectedClient.notes && (
                          <Section label={t('clients.notes')}>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                              {selectedClient.notes}
                            </p>
                          </Section>
                        )}
                      </div>

                      {/* Right — recent visits preview */}
                      <div className="md:col-span-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('clients.sectionRecentVisits')}
                          </p>
                          {historyCount > 3 && (
                            <button
                              type="button"
                              onClick={() => setDetailsTab('history')}
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              {t('clients.viewAllHistory', { n: historyCount })}
                            </button>
                          )}
                        </div>

                        {recentVisits.length === 0 ? (
                          <div className="mt-3 rounded-lg border border-dashed border-border py-8 text-center">
                            <CalendarIcon className="mx-auto h-8 w-8 text-muted-foreground/40" />
                            <p className="mt-2 text-xs text-muted-foreground">{t('clients.noAppointmentsYet')}</p>
                          </div>
                        ) : (
                          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
                            {recentVisits.map(apt => (
                              <li key={apt.id} className="flex items-center gap-3 p-3">
                                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-muted/50 text-center leading-none">
                                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {format(parseISO(apt.startTime), 'MMM')}
                                  </span>
                                  <span className="text-sm font-bold tabular-nums text-foreground">
                                    {format(parseISO(apt.startTime), 'd')}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {apt.service.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {t('clients.with')} {apt.staff.firstName} {apt.staff.lastName}
                                  </p>
                                </div>
                                <span className="text-sm font-semibold tabular-nums text-foreground shrink-0">
                                  €{apt.service.price}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="mt-6">
                    <ClientHistory appointments={clientAppointments} />
                  </TabsContent>

                  <TabsContent value="edit" className="mt-6 space-y-4">
                    {isEditing ? (
                      <ClientForm
                        defaultValues={{
                          firstName: selectedClient.firstName,
                          lastName: selectedClient.lastName,
                          email: selectedClient.email,
                          phone: selectedClient.phone,
                          gender: selectedClient.gender,
                          notes: selectedClient.notes,
                        }}
                        onSubmit={(values) => handleUpdate(selectedClient.id, values)}
                        onCancel={() => setIsEditing(false)}
                        submitLabel={t('common.saveChanges')}
                        isSubmitting={updateMutation.isPending}
                      />
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Readonly label={t('clients.firstName')}>{selectedClient.firstName}</Readonly>
                          <Readonly label={t('clients.lastName')}>{selectedClient.lastName}</Readonly>
                          <Readonly label={t('clients.email')}>{selectedClient.email}</Readonly>
                          <Readonly label={t('clients.phone')}>{selectedClient.phone}</Readonly>
                          <Readonly label={t('clients.gender')}>
                            {selectedClient.gender
                              ? t(GENDER_STYLE[selectedClient.gender].labelKey as Parameters<typeof t>[0])
                              : t('clients.genderNotSet')}
                          </Readonly>
                          <Readonly label={t('clients.notes')}>{selectedClient.notes || t('clients.noNotes')}</Readonly>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => setIsEditing(true)} className="flex-1">
                            <PencilSquareIcon className="mr-1.5 h-4 w-4" />
                            {t('clients.edit')}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDelete(selectedClient.id, `${selectedClient.firstName} ${selectedClient.lastName}`)}
                            disabled={deleteMutation.isPending}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Create modal — uses react-hook-form + zod via ClientForm */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('clients.addNew')}</DialogTitle>
          </DialogHeader>
          <ClientForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateModalOpen(false)}
            submitLabel={t('clients.createAction')}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ClientCard (grid view) ──────────────────────────────────
// Editorial rebuild: no gradient decoration at the top (that read
// like a social profile card). Avatar sits upper-left, name top,
// a hairline-divided stat row below. Same visual language as the
// staff column headers on Calendar and the Overview schedule rows.
function ClientCard({
  client, spend, isVip, onClick,
}: {
  client: Client;
  spend: number;
  isVip: boolean;
  onClick: () => void;
}) {
  const t = useT();
  const grad = gradientFor(client.id);
  const recency = recencyOf(client.lastVisitAt);
  const rStyle = RECENCY_STYLE[recency];

  const cardDaysAgo = (lastVisitAt: string | null): string => {
    if (!lastVisitAt) return t('clients.never');
    const days = differenceInDays(new Date(), parseISO(lastVisitAt));
    if (days === 0) return t('common.today');
    if (days === 1) return t('calendar.dayLabelYesterday');
    if (days < 30)  return t('clients.daysAgoDays', { n: days });
    if (days < 365) return t('clients.daysAgoMonths', { n: Math.floor(days / 30) });
    return t('clients.daysAgoYears', { n: Math.floor(days / 365) });
  };

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-foreground/20 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Identity — avatar + name on one line */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white overflow-hidden',
          grad,
          isVip && 'ring-2 ring-amber-400 ring-offset-1 ring-offset-background',
        )}>
          {client.avatarUrl && (
            <img
              src={client.avatarUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <span className="relative">{client.firstName[0]}{client.lastName[0]}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {client.firstName} {client.lastName}
            </p>
            {isVip && (
              <span className="shrink-0 inline-flex items-center rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide bg-amber-400/15 text-amber-600 dark:text-amber-400">
                {t('clients.vipLabel')}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate tabular-nums mt-0.5">{client.phone}</p>
        </div>
      </div>

      {/* Hairline-divided stat row */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-border border-t border-border -mx-4 -mb-4">
        <div className="px-3 py-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('clients.colVisits')}</p>
          <p className="mt-0.5 text-sm font-bold text-foreground tabular-nums leading-none">{client.totalVisits ?? 0}</p>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('clients.colSpend')}</p>
          <p className="mt-0.5 text-sm font-bold text-foreground tabular-nums leading-none truncate">
            {spend > 0 ? `€${spend.toLocaleString()}` : <span className="text-muted-foreground/50">—</span>}
          </p>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('clients.colSeen')}</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums leading-none flex items-center gap-1">
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', rStyle.dot)} />
            <span className="text-foreground">{cardDaysAgo(client.lastVisitAt)}</span>
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── ClientHistory (sheet tab) ───────────────────────────────
function ClientHistory({ appointments }: { appointments: AppointmentWithDetails[] }) {
  const navigate = useNavigate();
  const t = useT();

  if (appointments.length === 0) {
    return (
      <div className="py-12 text-center">
        <CalendarIcon className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">{t('clients.noHistory')}</p>
      </div>
    );
  }

  const rebook = (apt: AppointmentWithDetails) => {
    const params = new URLSearchParams({
      clientId: apt.clientId,
      serviceId: apt.serviceId,
      staffId: apt.staffId,
    });
    navigate(`/bookings/new?${params.toString()}`);
  };

  return (
    <div className="space-y-2 mt-2">
      {appointments.map(apt => (
        <div key={apt.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{apt.service.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                {format(parseISO(apt.startTime), 'MMM d, yyyy · HH:mm')}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {t('clients.with')} {apt.staff.firstName} {apt.staff.lastName}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold text-foreground tabular-nums">€{apt.service.price}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">{apt.status}</p>
            </div>
          </div>
          {apt.status === 'completed' && (
            <button
              onClick={() => rebook(apt)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
              {t('clients.bookAgain')}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Local primitives ────────────────────────────────────────
// Editorial ledger cell — uppercase eyebrow, large tabular value,
// no icon decoration. Three of these make the detail modal's stat
// band. Same rhythm as Calendar's hairline-divided summary.
function LedgerStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground tabular-nums leading-none truncate">{value}</p>
    </div>
  );
}

function Section({
  label, children, accent,
}: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={cn(accent && 'border-l-2 border-primary/60 pl-3')}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

const GENDER_STYLE: Record<NonNullable<Client['gender']>, { icon: string; text: string; dot: string; labelKey: string }> = {
  male:   { icon: '♂', text: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',         dot: 'text-sky-600 dark:text-sky-400',       labelKey: 'clients.genderMale' },
  female: { icon: '♀', text: 'bg-pink-500/15 text-pink-600 dark:text-pink-400',      dot: 'text-pink-600 dark:text-pink-400',     labelKey: 'clients.genderFemale' },
  other:  { icon: '⚬', text: 'bg-violet-500/15 text-violet-600 dark:text-violet-400', dot: 'text-violet-600 dark:text-violet-400', labelKey: 'clients.genderOther' },
};

// Compact inline glyph — kept for potential future use; currently only modal uses gender label directly.
function GenderDot({ gender }: { gender: NonNullable<Client['gender']> }) {
  const t = useT();
  const s = GENDER_STYLE[gender];
  const label = t(s.labelKey as Parameters<typeof t>[0]);
  return (
    <span
      aria-label={label}
      title={label}
      className={cn('text-sm leading-none shrink-0', s.dot)}
    >
      {s.icon}
    </span>
  );
}

function ColHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      'text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground',
      className,
    )}>
      {children}
    </span>
  );
}

function IconAction({
  children, label, onClick, danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors',
        danger
          ? 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300'
          : 'hover:bg-accent hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}


