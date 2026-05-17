import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import { servicesApi, categoriesApi } from '../../lib/api';
import { useOfficeStore } from '../../store/office-store';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TagIcon,
  Squares2X2Icon,
  MapPinIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  ScissorsIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { cn } from '../../components/ui/utils';
import { useT } from '../../hooks/use-t';
import { pluralKey } from '../../i18n/plural';
import { useLanguageStore } from '../../store/language-store';
import { usePriceFormatter } from '../../hooks/use-price-formatter';
import { CardSkeleton } from '../../components/shared/page-skeleton';
import { EmptyState } from '../../components/shared/empty-state';
import { BulkActionBar } from '../../components/shared/bulk-action-bar';
import { FilterPill } from '../../components/shared/filter-pill';
import { ViewToggle, type ViewMode } from '../../components/shared/view-toggle';
import { exportCsv } from '../../lib/csv';
import { useConfirm } from '../../hooks/use-confirm';
import { getCategoryColor, colorForCategoryFallback } from '../../lib/tokens';
import type { Service } from '../../types';
import { AnimatePresence, motion } from 'motion/react';
import { MOTION_DUR, MOTION_EASE } from '../../lib/tokens';
import { ServiceCard, dotForId } from './service-card';
import { ServiceEditorModal, type ServiceForm, emptyForm } from './service-editor-modal';
import { CategoriesDialog } from './categories-dialog';
import { ServiceListRow } from './service-list-row';
import { compareServices, type SortKey } from './sort';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';

const SORT_KEYS: SortKey[] = [
  'manual',
  'name-asc',
  'price-asc',
  'price-desc',
  'duration-asc',
  'duration-desc',
  'popularity-desc',
];

const SORT_I18N: Record<SortKey, string> = {
  'manual': 'services.sort.manual',
  'name-asc': 'services.sort.nameAsc',
  'price-asc': 'services.sort.priceAsc',
  'price-desc': 'services.sort.priceDesc',
  'duration-asc': 'services.sort.durationAsc',
  'duration-desc': 'services.sort.durationDesc',
  'popularity-desc': 'services.sort.popularityDesc',
};

export function ServicesPage() {
  const queryClient = useQueryClient();
  const t = useT();
  const language = useLanguageStore(s => s.language);
  const fmt = usePriceFormatter();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const officeId = useOfficeStore(s => s.currentOfficeId);
  const offices = useOfficeStore(s => s.offices);
  const currentOffice = useMemo(() => offices.find(o => o.id === officeId), [offices, officeId]);

  // ─── URL-synced view + sort ───────────────────────────────
  const [view, setView] = useState<ViewMode>(
    (searchParams.get('view') as ViewMode) ?? 'grid'
  );
  const [sort, setSort] = useState<SortKey>(
    (searchParams.get('sort') as SortKey) ?? 'manual'
  );

  const handleViewChange = (v: ViewMode) => {
    setView(v);
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('view', v); return n; }, { replace: true });
  };
  const handleSortChange = (s: SortKey) => {
    setSort(s);
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('sort', s); return n; }, { replace: true });
  };

  // ─── Local state ──────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Debounce search 200ms
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(id);
  }, [search]);

  // ─── Queries ──────────────────────────────────────────────
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services', officeId],
    queryFn: () => servicesApi.getAll(officeId),
  });
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });
  const isLoading = servicesLoading || categoriesLoading;

  // ─── Mutations ────────────────────────────────────────────
  const createServiceMutation = useMutation({
    mutationFn: (data: Omit<Service, 'id' | 'createdAt'>) => servicesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(t('toast.serviceCreated'));
      closeEditor();
    },
    onError: () => toast.error(t('toast.serviceCreateError')),
  });
  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Service> }) =>
      servicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(t('toast.serviceUpdated'));
      closeEditor();
    },
    onError: () => toast.error(t('toast.serviceUpdateError')),
  });

  const servicesKey = ['services', officeId] as const;

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => servicesApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: servicesKey });
      const previous = queryClient.getQueryData(servicesKey);
      queryClient.setQueryData(servicesKey, (old: Service[] | undefined) =>
        (old ?? []).filter(s => s.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(servicesKey, context.previous);
      toast.error(t('toast.serviceDeleteError'));
    },
    onSuccess: () => toast.success(t('toast.serviceDeleted')),
    onSettled: () => queryClient.invalidateQueries({ queryKey: servicesKey }),
  });

  // ─── Derived ──────────────────────────────────────────────
  const categoryById = useMemo(() => {
    const m = new Map<string, import('../../types').Category>();
    categories.forEach(c => m.set(c.id, c));
    return m;
  }, [categories]);

  const filteredServices = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const base = services.filter(s => {
      if (categoryFilter !== 'all' && s.categoryId !== categoryFilter) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
    });
    return [...base].sort((a, b) => compareServices(a, b, sort));
  }, [services, debouncedSearch, categoryFilter, sort]);

  const priceRange = useMemo(() => {
    if (services.length === 0) return null;
    const prices = services.map(s => s.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [services]);

  const isFiltering = debouncedSearch.trim() !== '' || categoryFilter !== 'all';

  // ─── Editor helpers ───────────────────────────────────────
  const openCreate = () => {
    if (categories.length === 0) {
      toast.error(t('toast.createCategoryFirst'));
      setIsCategoryDialogOpen(true);
      return;
    }
    setEditingId(null);
    setForm({
      ...emptyForm,
      categoryId: categoryFilter !== 'all' ? categoryFilter : categories[0]?.id ?? '',
    });
    setEditorOpen(true);
  };

  const openEdit = (svc: Service) => {
    setEditingId(svc.id);
    setForm({
      name: svc.name,
      price: String(svc.price),
      duration: String(svc.duration),
      categoryId: svc.categoryId,
      description: svc.description ?? '',
      imageUrl: svc.imageUrl ?? '',
      staffIds: [],
      prepMinutes: '',
      cleanupMinutes: '',
      isPublic: true,
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const submitForm = () => {
    if (!form.name.trim() || !form.price || !form.duration || !form.categoryId) {
      toast.error(t('toast.serviceRequired'));
      return;
    }
    const payload = {
      name: form.name.trim(),
      price: parseFloat(form.price),
      duration: parseInt(form.duration),
      categoryId: form.categoryId,
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim() || undefined,
      officeId,
    };
    if (editingId) {
      updateServiceMutation.mutate({ id: editingId, data: payload });
    } else {
      createServiceMutation.mutate(payload);
    }
  };

  // ─── Single delete ────────────────────────────────────────
  const handleDelete = async (svc: Service) => {
    const ok = await confirm({
      title: t('services.delete.title', { name: svc.name }),
      description: t('services.delete.description'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (ok) deleteServiceMutation.mutate(svc.id);
  };

  // ─── Duplicate ────────────────────────────────────────────
  const handleDuplicate = async (svc: Service) => {
    const { id: _id, createdAt: _ca, ...rest } = svc as Service & { id: string; createdAt: string };
    await createServiceMutation.mutateAsync({
      ...rest,
      name: `${svc.name} (copy)`,
    });
    toast.success(t('services.toast.duplicated'));
  };

  // ─── Bulk selection ───────────────────────────────────────
  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    const ok = await confirm({
      title: t(`services.bulkDelete.title.${pluralKey(count, language)}` as Parameters<typeof t>[0], { count }),
      description: t('services.bulkDelete.description'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;
    selectedIds.forEach(id => deleteServiceMutation.mutate(id));
    clearSelection();
  };

  // ─── Export ───────────────────────────────────────────────
  const handleExport = () => exportCsv('services', filteredServices, [
    { key: 'name', header: 'Name' },
    { key: (s) => categoryById.get(s.categoryId)?.name ?? '', header: 'Category' },
    { key: 'price', header: 'Price' },
    { key: 'duration', header: 'Duration (min)' },
    { key: 'description', header: 'Description' },
  ]);

  const isSubmitting = createServiceMutation.isPending || updateServiceMutation.isPending;

  // ─── Category filter pills data ───────────────────────────
  const filterItems = useMemo(() => [
    { id: 'all', name: t('services.filters.allCategories'), count: services.length, dot: undefined as string | undefined },
    ...categories.map(c => ({
      id: c.id,
      name: c.name,
      count: services.filter(s => s.categoryId === c.id).length,
      dot: getCategoryColor(c.color ?? colorForCategoryFallback(c.id)).dot,
    })),
  ], [categories, services, t]);

  return (
    <div className="space-y-5">
      {/* ─── Editorial hero ──────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>{t('services.title')}</span>
            {currentOffice && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center gap-1 normal-case tracking-normal font-medium">
                  <MapPinIcon className="h-3 w-3" />
                  {currentOffice.name}
                </span>
              </>
            )}
            {categories.length > 0 && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="normal-case tracking-normal tabular-nums">
                  {categories.length} {categories.length === 1 ? t('services.hero.categoryOne') : t('services.hero.categoryMany')}
                </span>
              </>
            )}
            {priceRange && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="normal-case tracking-normal tabular-nums">
                  {fmt(priceRange.min)}–{fmt(priceRange.max)}
                </span>
              </>
            )}
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-none tabular-nums">
            {services.length.toLocaleString()}{' '}
            <span className="text-muted-foreground/70 font-semibold">
              {services.length === 1 ? t('services.hero.serviceOne') : t('services.hero.serviceMany')}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredServices.length === 0}
            aria-label={t('services.actions.export')}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsCategoryDialogOpen(true)}>
            <Cog6ToothIcon className="mr-1 h-4 w-4" />
            {t('services.actions.manageCategories')}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <PlusIcon className="mr-1 h-4 w-4" />
            {t('services.actions.create')}
          </Button>
        </div>
      </div>

      {/* ─── Filter + search bar ─────────────────────────── */}
      {categories.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          {/* FilterPill row */}
          <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2.5 border-b border-border">
            {filterItems.map(item => (
              <FilterPill
                key={item.id}
                variant="meta"
                label={item.name}
                count={item.count}
                selected={categoryFilter === item.id}
                onClick={() => setCategoryFilter(item.id)}
                dot={item.dot}
                groupId="services-cat-filter"
                icon={item.id === 'all' ? <TagIcon className="h-3.5 w-3.5" /> : undefined}
              />
            ))}
          </div>

          {/* Search + sort + view toolbar */}
          <div className="flex items-center gap-2 p-2.5">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('services.search.placeholder')}
                className="pl-9 h-9 bg-background"
              />
            </div>

            {/* Sort dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0">
                  <AdjustmentsHorizontalIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('services.sort.label')}</span>
                  {sort !== 'manual' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-hidden />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{t('services.sort.label')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(v) => handleSortChange(v as SortKey)}
                >
                  {SORT_KEYS.map(key => (
                    <DropdownMenuRadioItem key={key} value={key}>
                      {t(SORT_I18N[key] as Parameters<typeof t>[0])}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View toggle */}
            <ViewToggle
              value={view}
              onChange={handleViewChange}
              layoutId="services-view-indicator"
            />
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {/* Empty: no categories */}
      {!isLoading && categories.length === 0 && (
        <EmptyState
          icon={Squares2X2Icon}
          eyebrow={t('services.startHere')}
          title={t('services.noCategories')}
          action={
            <Button onClick={() => setIsCategoryDialogOpen(true)}>
              <TagIcon className="mr-2 h-4 w-4" />
              {t('services.addCategory')}
            </Button>
          }
        />
      )}

      {/* Empty: no services at all */}
      {!isLoading && categories.length > 0 && services.length === 0 && (
        <EmptyState
          variant="dashed"
          icon={ScissorsIcon}
          eyebrow={t('services.title')}
          title={t('services.empty.title')}
          description={t('services.empty.description')}
          action={
            <Button onClick={openCreate}>
              {t('services.empty.cta')}
            </Button>
          }
        />
      )}

      {/* Empty: filter no results */}
      {!isLoading && categories.length > 0 && services.length > 0 && isFiltering && filteredServices.length === 0 && (
        <EmptyState
          variant="plain"
          icon={MagnifyingGlassIcon}
          title={t('services.search.empty.title')}
          action={
            <Button variant="outline" onClick={() => { setSearch(''); setCategoryFilter('all'); }}>
              {t('services.search.empty.cta')}
            </Button>
          }
        />
      )}

      {/* Service list */}
      {!isLoading && categories.length > 0 && (filteredServices.length > 0 || !isFiltering) && (
        <>
          {view === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {filteredServices.map(svc => (
                  <motion.div
                    key={svc.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: MOTION_DUR.fast, ease: MOTION_EASE }}
                  >
                    <ServiceCard
                      service={svc}
                      category={categoryById.get(svc.categoryId)}
                      onClick={() => openEdit(svc)}
                      onDelete={() => handleDelete(svc)}
                      onBook={() => navigate(`/bookings/new?serviceId=${svc.id}`)}
                      selected={selectedIds.has(svc.id)}
                      onSelect={(checked) => toggleSelect(svc.id, checked)}
                    />
                  </motion.div>
                ))}
                <motion.div
                  key="create-card"
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: MOTION_DUR.fast, ease: MOTION_EASE }}
                >
                  <button
                    onClick={openCreate}
                    className="group flex w-full flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 min-h-[220px] transition-all hover:border-foreground/40 hover:bg-muted/40"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card border border-border text-muted-foreground transition-transform group-hover:scale-110 group-hover:text-foreground">
                      <PlusIcon className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">{t('services.createCard.title')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {categoryFilter !== 'all'
                          ? t('services.createCard.toCategory', { name: categoryById.get(categoryFilter)?.name ?? '' })
                          : t('services.createCard.toMenu')}
                      </p>
                    </div>
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredServices.map(svc => (
                <ServiceListRow
                  key={svc.id}
                  service={svc}
                  category={categoryById.get(svc.categoryId)}
                  selected={selectedIds.has(svc.id)}
                  onSelect={toggleSelect}
                  onEdit={() => openEdit(svc)}
                  onDelete={() => handleDelete(svc)}
                  onDuplicate={() => handleDuplicate(svc)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        count={selectedIds.size}
        onClear={clearSelection}
        selectedLabel={t('bookings.selected')}
        actions={[
          {
            key: 'duplicate',
            label: t('services.card.actions.duplicate'),
            icon: <DocumentDuplicateIcon className="h-4 w-4" />,
            onClick: async () => {
              const toClone = services.filter(s => selectedIds.has(s.id));
              for (const svc of toClone) await handleDuplicate(svc);
              clearSelection();
            },
          },
          {
            key: 'delete',
            label: t('services.bulk.actions.delete'),
            icon: <TrashIcon className="h-4 w-4" />,
            onClick: handleBulkDelete,
            danger: true,
          },
        ]}
      />

      {/* Editor Modal */}
      <ServiceEditorModal
        open={editorOpen}
        onOpenChange={(open) => { if (!open) closeEditor(); }}
        mode={editingId ? 'edit' : 'create'}
        form={form}
        setForm={setForm}
        categories={categories}
        isSubmitting={isSubmitting}
        onSave={submitForm}
        officeId={officeId ?? undefined}
      />

      {/* Categories Dialog */}
      <CategoriesDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        categories={categories}
        services={services}
      />
    </div>
  );
}
