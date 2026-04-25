import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { servicesApi, categoriesApi } from '../lib/api';
import { useOfficeStore } from '../store/office-store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  PlusIcon, ClockIcon, ScissorsIcon, TagIcon, Squares2X2Icon,
  PencilSquareIcon, TrashIcon, MagnifyingGlassIcon, Cog6ToothIcon,
  CheckIcon, XMarkIcon, PhotoIcon, MapPinIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { cn } from '../components/ui/utils';
import { useT } from '../hooks/use-t';
import { CardSkeleton } from '../components/shared/page-skeleton';
import { EmptyState } from '../components/shared/empty-state';
import { exportCsv } from '../lib/csv';
import { useConfirm } from '../hooks/use-confirm';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { fileToDataUrl, dataUrlBytes } from '../lib/image-upload';
import type { Service, Category } from '../types';

// Responsive <img> attrs for Unsplash URLs — serves 400/800/1200 widths instead of always 800.
// For non-Unsplash URLs we just return a single src untouched.
//
// Previous version used a regex (`url.replace(/[?&]w=\d+/, '')`) that turned
// `?w=800&q=80` into `q=80` glued onto the path — producing a 404 URL.
// Using the URL API is safer: delete the `w` param, re-serialize, then append
// the new width. No string surgery.
function responsiveImg(url: string) {
  const isUnsplash = /^https:\/\/images\.unsplash\.com\//.test(url);
  if (!isUnsplash) return { src: url };
  let base: string;
  try {
    const u = new URL(url);
    u.searchParams.delete('w');
    base = u.toString();
  } catch {
    // If URL is malformed, skip responsive logic and return as-is.
    return { src: url };
  }
  const sep = base.includes('?') ? '&' : '?';
  return {
    src: `${base}${sep}w=800`,
    srcSet: [400, 800, 1200].map(w => `${base}${sep}w=${w} ${w}w`).join(', '),
    sizes: '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw',
  };
}

// Deterministic category color dot
const CATEGORY_DOTS = [
  'bg-blue-500', 'bg-violet-500', 'bg-amber-500',
  'bg-emerald-500', 'bg-rose-500', 'bg-cyan-500',
];
const dotForId = (id: string) => {
  const n = [...id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return CATEGORY_DOTS[n % CATEGORY_DOTS.length];
};

interface ServiceForm {
  name: string;
  price: string;
  duration: string;
  categoryId: string;
  description: string;
  imageUrl: string;
}

const emptyForm: ServiceForm = {
  name: '', price: '', duration: '', categoryId: '', description: '', imageUrl: '',
};

export function ServicesPage() {
  const queryClient = useQueryClient();
  const t = useT();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const officeId = useOfficeStore(s => s.currentOfficeId);
  const offices = useOfficeStore(s => s.offices);
  const currentOffice = useMemo(() => offices.find(o => o.id === officeId), [offices, officeId]);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services', officeId],
    queryFn: () => servicesApi.getAll(officeId),
  });
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });
  const isLoading = servicesLoading || categoriesLoading;

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

  // Optimistic delete — service card disappears immediately.
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
    onSuccess: () => {
      toast.success(t('toast.serviceDeleted'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: servicesKey });
    },
  });

  const categoryById = useMemo(() => {
    const m = new Map<string, Category>();
    categories.forEach(c => m.set(c.id, c));
    return m;
  }, [categories]);

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter(s => {
      if (categoryFilter !== 'all' && s.categoryId !== categoryFilter) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
    });
  }, [services, search, categoryFilter]);

  // Editorial hero stats — price range across all services gives an
  // at-a-glance sense of the menu's span without a heavy chart.
  const priceRange = useMemo(() => {
    if (services.length === 0) return null;
    const prices = services.map(s => s.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [services]);

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

  const handleDelete = async (svc: Service) => {
    const ok = await confirm({
      title: `Delete "${svc.name}"?`,
      description: 'Appointments using this service will keep their record.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) deleteServiceMutation.mutate(svc.id);
  };

  const isSubmitting = createServiceMutation.isPending || updateServiceMutation.isPending;
  const isFiltering = search.trim() !== '' || categoryFilter !== 'all';

  const handleExport = () => exportCsv('services', filteredServices, [
    { key: 'name', header: 'Name' },
    { key: (s) => categoryById.get(s.categoryId)?.name ?? '', header: 'Category' },
    { key: 'price', header: 'Price' },
    { key: 'duration', header: 'Duration (min)' },
    { key: 'description', header: 'Description' },
  ]);

  return (
    <div className="space-y-5">
      {/* ─── Editorial hero ──────────────────────────────
          The Menu: the service count IS the title, eyebrow
          carries office + category count + price range.
          Matches Client Ledger / Crew Board hero rhythm. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>Services</span>
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
                  {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                </span>
              </>
            )}
            {priceRange && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="normal-case tracking-normal tabular-nums">
                  €{priceRange.min}–€{priceRange.max}
                </span>
              </>
            )}
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-none tabular-nums">
            {services.length.toLocaleString()}{' '}
            <span className="text-muted-foreground/70 font-semibold">
              {services.length === 1 ? 'service' : 'services'}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredServices.length === 0}
            aria-label="Export services"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsCategoryDialogOpen(true)}>
            <Cog6ToothIcon className="mr-1 h-4 w-4" />
            Categories
          </Button>
          <Button size="sm" onClick={openCreate}>
            <PlusIcon className="mr-1 h-4 w-4" />
            New service
          </Button>
        </div>
      </div>

      {/* ─── Operator bar — category filter + search ─────
          One tight band. Tab-underline category filter on
          top (replaces rainbow chip row), search below. */}
      {categories.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-end gap-1 overflow-x-auto border-b border-border px-2">
            {[{ id: 'all', name: 'All', count: services.length }, ...categories.map(c => ({
              id: c.id, name: c.name, count: services.filter(s => s.categoryId === c.id).length,
            }))].map(cat => {
              const active = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  aria-pressed={active}
                  className={cn(
                    'relative inline-flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {cat.id !== 'all' && (
                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotForId(cat.id))} />
                  )}
                  <span>{cat.name}</span>
                  <span className={cn(
                    'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums',
                    active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
                  )}>
                    {cat.count}
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
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services…"
                className="pl-9 h-9 bg-background"
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {/* Empty: no categories — first-time placeholder */}
      {!isLoading && categories.length === 0 && (
        <EmptyState
          icon={Squares2X2Icon}
          eyebrow="Start here"
          title="No categories yet"
          description="Create a category before adding services."
          action={
            <Button onClick={() => setIsCategoryDialogOpen(true)}>
              <TagIcon className="mr-2 h-4 w-4" />
              Create category
            </Button>
          }
        />
      )}

      {/* Empty: filters return nothing */}
      {!isLoading && categories.length > 0 && isFiltering && filteredServices.length === 0 && (
        <EmptyState
          icon={MagnifyingGlassIcon}
          eyebrow="No matches"
          title="No services match"
          description="Try a different search term or pick another category."
          variant="plain"
          action={
            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setCategoryFilter('all'); }}>
              Clear filters
            </Button>
          }
        />
      )}

      {/* Gallery grid */}
      {!isLoading && categories.length > 0 && (filteredServices.length > 0 || !isFiltering) && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filteredServices.map(svc => (
            <ServiceCard
              key={svc.id}
              service={svc}
              category={categoryById.get(svc.categoryId)}
              onClick={() => openEdit(svc)}
              onDelete={() => handleDelete(svc)}
              onBook={() => navigate(`/bookings/new?serviceId=${svc.id}`)}
            />
          ))}

          {/* Create card — always last tile */}
          <button
            onClick={openCreate}
            className="group flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 min-h-[220px] transition-all hover:border-foreground/40 hover:bg-muted/40"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card border border-border text-muted-foreground transition-transform group-hover:scale-110 group-hover:text-foreground">
              <PlusIcon className="h-5 w-5" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Add a service</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {categoryFilter !== 'all' ? `to ${categoryById.get(categoryFilter)?.name ?? 'this category'}` : 'to your menu'}
              </p>
            </div>
          </button>
        </div>
      )}

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

// ─── ServiceCard ─────────────────────────────────────────────────
function ServiceCard({
  service, category, onClick, onDelete, onBook,
}: {
  service: Service;
  category: Category | undefined;
  onClick: () => void;
  onDelete: () => void;
  onBook: () => void;
}) {
  const initial = service.name.charAt(0).toUpperCase() || 'S';
  // Track runtime image-load failure so we swap in the placeholder letter
  // + scissors (same UI as "no photo yet") instead of showing a blank card.
  // Previously onError just `display:none`d the img, leaving an empty tile.
  const [imgFailed, setImgFailed] = useState(false);
  const showPlaceholder = !service.imageUrl || imgFailed;

  return (
    <article
      onClick={onClick}
      className="group relative cursor-pointer rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-foreground/20"
    >
      {/* Hero — photo if present, else a muted neutral fallback.
          Dropped the per-service rainbow gradient: next to real photos it read
          as chromatic noise. Now missing-photo tiles all share one quiet neutral
          so the eye groups them as "placeholders" instead of "loud cards". */}
      <div className={cn(
        'relative aspect-[4/3] overflow-hidden',
        showPlaceholder && 'bg-gradient-to-br from-muted to-accent/60 dark:from-muted dark:to-accent/20',
      )}>
        {service.imageUrl && !imgFailed && (
          <img
            {...responsiveImg(service.imageUrl)}
            alt={service.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgFailed(true)}
          />
        )}

        {/* Neutral placeholder — the initial + a scissors silhouette in muted
            foreground tones so it reads as "no photo yet" rather than decorative. */}
        {showPlaceholder && (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-foreground/15 font-black leading-none select-none text-[5rem]">
                {initial}
              </span>
            </div>
            <ScissorsIcon className="absolute -bottom-3 -right-3 h-24 w-24 text-foreground/10 rotate-12" />
          </>
        )}

        {/* Dark overlay — only over a real loaded photo, not over the placeholder
            fallback (otherwise the placeholder letter gets darkened for no reason).
            Softened from /60 → /40 because the price pill already has backdrop-blur
            and the stronger ramp was muddying already-dim barbershop interiors. */}
        {!showPlaceholder && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/5" />
        )}

        {/* Category marker — simplified from a heavy white-glass pill to a
            colored dot with a small label. Category is already shown in the
            filter chips above; this is just a reminder, not primary info.
            Keeps the visual weight in the price pill (top-right) where it belongs. */}
        {category && (
          <div className={cn(
            'absolute top-2 left-2 inline-flex items-center gap-1.5 text-[10px] font-medium drop-shadow-sm',
            !showPlaceholder ? 'text-white/95' : 'text-muted-foreground',
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', dotForId(category.id))} />
            {category.name}
          </div>
        )}

        {/* Price pill — top-right */}
        <div className="absolute top-2 right-2 inline-flex items-center rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-xs font-bold tabular-nums text-foreground shadow-sm">
          €{service.price}
        </div>

        {/* Action row — always visible (touch devices don't have hover), dims to
            70% when idle, pops to 100% on hover. Adds a primary "Book" CTA so
            receptionists can jump straight into /bookings/new with this service
            pre-selected — the most common action, now one click away. */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onBook(); }}
            aria-label="Book this service"
            title="Book this service"
            className="inline-flex h-7 items-center gap-1 rounded-full bg-primary text-primary-foreground px-2.5 text-[11px] font-semibold shadow-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <PlusIcon className="h-3 w-3" />
            Book
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            aria-label="Edit"
            title="Edit"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md text-foreground shadow-sm hover:bg-white dark:hover:bg-black/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <PencilSquareIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label="Delete"
            title="Delete"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md text-rose-600 shadow-sm hover:bg-white dark:hover:bg-black/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-foreground text-sm truncate">{service.name}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <ClockIcon className="h-3.5 w-3.5" />
            <span className="tabular-nums">{service.duration}m</span>
          </div>
        </div>
        {/* Description — always reserve 2 lines of space so the grid rows line
            up even when some services have no description. `min-h` locks the
            footer height; `line-clamp-2` truncates if someone writes a novel. */}
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
          {service.description || '\u00A0'}
        </p>
      </div>
    </article>
  );
}

// ─── ServiceEditorModal ─────────────────────────────────────────
function ServiceEditorModal({
  open, onOpenChange, mode, form, setForm, categories, isSubmitting, onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  form: ServiceForm;
  setForm: (f: ServiceForm) => void;
  categories: Category[];
  isSubmitting: boolean;
  onSave: () => void;
}) {
  const initial = (form.name.charAt(0) || 'S').toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {mode === 'create' ? 'New' : 'Edit'}
          </p>
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            {mode === 'create' ? 'Add a service' : form.name || 'Service'}
          </DialogTitle>
        </DialogHeader>

        {/* Live preview — neutral fallback to match the card grid.
            The rainbow gradient was a demo-era decoration; now the
            placeholder reads as a deliberate "no photo yet" state. */}
        <div className={cn(
          'relative aspect-[5/2] rounded-xl overflow-hidden',
          !form.imageUrl && 'bg-gradient-to-br from-muted to-accent/60 dark:from-muted dark:to-accent/20 border border-border',
        )}>
          {form.imageUrl ? (
            <img {...responsiveImg(form.imageUrl)} alt="preview" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-foreground/15 font-black leading-none select-none text-[6rem]">
                  {initial}
                </span>
              </div>
              <ScissorsIcon className="absolute -bottom-2 -right-2 h-24 w-24 text-foreground/10 rotate-12" />
            </>
          )}
          {form.imageUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />}
          {form.price && (
            <div className="absolute top-3 right-3 inline-flex items-center rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md px-3 py-1 text-sm font-bold tabular-nums text-foreground shadow-sm">
              €{form.price}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Classic Haircut"
              className="mt-1.5"
              autoFocus
            />
          </div>

          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Category</Label>
            <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Price (€)</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="35"
                className="mt-1.5 tabular-nums"
              />
            </div>
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Duration (min)</Label>
              <Input
                type="number"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="30"
                className="mt-1.5 tabular-nums"
              />
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description…"
              className="mt-1.5"
              rows={2}
            />
          </div>

          {/* ── Photo — upload a file OR paste a URL ── */}
          <ServicePhotoField
            imageUrl={form.imageUrl}
            onChange={(url) => setForm({ ...form, imageUrl: url })}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={isSubmitting}>
              {mode === 'create' ? 'Create service' : 'Save changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── CategoriesDialog ───────────────────────────────────────────
function CategoriesDialog({
  open, onOpenChange, categories, services,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  services: Service[];
}) {
  const queryClient = useQueryClient();
  const t = useT();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: Omit<Category, 'id' | 'createdAt'>) => categoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(t('toast.categoryCreated'));
      setName(''); setIsAdding(false);
    },
    onError: () => toast.error(t('toast.categoryCreateError')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(t('toast.categoryUpdated'));
      setEditingId(null); setName('');
    },
    onError: () => toast.error(t('toast.categoryUpdateError')),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(t('toast.categoryDeleted'));
    },
    onError: () => toast.error(t('toast.categoryDeleteError')),
  });

  const handleDelete = (cat: Category) => {
    const count = services.filter(s => s.categoryId === cat.id).length;
    const msg = count > 0
      ? `Delete "${cat.name}"? ${count} service${count === 1 ? '' : 's'} will be left uncategorized.`
      : `Delete "${cat.name}"?`;
    if (confirm(msg)) deleteMutation.mutate(cat.id);
  };

  const startAdd = () => { setIsAdding(true); setEditingId(null); setName(''); };
  const startEdit = (cat: Category) => { setEditingId(cat.id); setIsAdding(false); setName(cat.name); };
  const cancel = () => { setEditingId(null); setIsAdding(false); setName(''); };
  const submit = () => {
    if (!name.trim()) return toast.error(t('toast.enterCategoryName'));
    if (editingId) updateMutation.mutate({ id: editingId, data: { name: name.trim() } });
    else createMutation.mutate({ name: name.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage categories</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          {categories.map(cat => {
            const count = services.filter(s => s.categoryId === cat.id).length;
            const isEditingThis = editingId === cat.id;
            return (
              <div key={cat.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotForId(cat.id))} />
                {isEditingThis ? (
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    className="h-8 flex-1"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="flex-1 truncate text-sm font-medium text-foreground">{cat.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {count} service{count === 1 ? '' : 's'}
                    </span>
                  </>
                )}
                {isEditingThis ? (
                  <>
                    <button onClick={submit} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40" aria-label="Save">
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button onClick={cancel} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent" aria-label="Cancel">
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(cat)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Edit">
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(cat)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300" aria-label="Delete">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            );
          })}

          {isAdding && (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2">
              <TagIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Category name"
                className="h-8 flex-1"
                autoFocus
              />
              <button onClick={submit} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40" aria-label="Save">
                <CheckIcon className="h-4 w-4" />
              </button>
              <button onClick={cancel} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent" aria-label="Cancel">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {!isAdding && (
          <Button variant="outline" size="sm" onClick={startAdd} className="w-full">
            <PlusIcon className="mr-1.5 h-4 w-4" />
            Add category
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── ServicePhotoField ─────────────────────────────────────
// Upload a file from disk OR paste a URL. Uploaded files are downscaled to
// 1200px and re-encoded as JPEG in the browser before being stored as a
// data-URL — otherwise a single phone photo would blow the localStorage
// quota (~5MB total per origin).
function ServicePhotoField({
  imageUrl,
  onChange,
}: {
  imageUrl: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlField, setShowUrlField] = useState(false);
  const hasImage = !!imageUrl;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    // Keep raw source sane — ~15MB cap on the input side. Compression brings
    // the stored size down to under 250KB regardless.
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image too large (max 15MB)');
      return;
    }
    setIsUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file, { maxSide: 1200, quality: 0.82 });
      const kb = Math.round(dataUrlBytes(dataUrl) / 1024);
      onChange(dataUrl);
      toast.success(`Photo uploaded (${kb} KB)`);
    } catch (err) {
      toast.error((err as Error).message ?? 'Upload failed');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <PhotoIcon className="h-3.5 w-3.5" />
        Photo
      </Label>

      {/* Hidden native file input — the custom button triggers it. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="mt-1.5 space-y-2">
        {/* Upload / replace button */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={hasImage ? 'outline' : 'default'}
            size="sm"
            loading={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            <PhotoIcon className="h-4 w-4 mr-1.5" />
            {hasImage ? 'Replace photo' : 'Upload photo'}
          </Button>

          {hasImage && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange('')}
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Remove
            </Button>
          )}

          <button
            type="button"
            onClick={() => setShowUrlField(v => !v)}
            className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            {showUrlField ? 'Hide URL field' : 'Paste URL instead'}
          </button>
        </div>

        {/* Optional: paste a URL directly (for Unsplash/CDN). Hidden by default. */}
        {showUrlField && (
          <Input
            value={imageUrl.startsWith('data:') ? '' : imageUrl}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://images.unsplash.com/…"
            className="font-mono text-xs"
          />
        )}

        <p className="text-xs text-muted-foreground">
          {hasImage
            ? 'Shown as the hero image on the service card.'
            : 'Upload from your device — auto-resized to 1200px. Or paste a URL.'}
        </p>
      </div>
    </div>
  );
}
