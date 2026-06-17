import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TagIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useT } from '../../hooks/use-t';
import { usePriceFormatter } from '../../hooks/use-price-formatter';
import { CardSkeleton } from '../../components/shared/page-skeleton';
import { EmptyState } from '../../components/shared/empty-state';
import { PageHeader, PageHeaderDivider } from '../../components/shared/page-header';
import { FilterPill } from '../../components/shared/filter-pill';
import { useConfirm } from '../../hooks/use-confirm';
import type { Product, ProductCategory } from '../../types';
import { AnimatePresence, motion } from 'motion/react';
import { MOTION_DUR, MOTION_EASE } from '../../lib/tokens';
import { ProductCard } from './product-card';
import { ProductEditorModal, type ProductForm, emptyForm } from './product-editor-modal';

const CATEGORIES: ProductCategory[] = ['hair-care', 'face-body', 'beards', 'hairdressing-supplies'];

export function ProductsPage() {
  const queryClient = useQueryClient();
  const t = useT();
  const fmt = usePriceFormatter();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(id);
  }, [search]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Product, 'id' | 'createdAt'>) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('toast.productCreated'));
      closeEditor();
    },
    onError: () => toast.error(t('toast.productError')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('toast.productUpdated'));
      closeEditor();
    },
    onError: () => toast.error(t('toast.productError')),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      const previous = queryClient.getQueryData(['products']);
      queryClient.setQueryData(['products'], (old: Product[] | undefined) =>
        (old ?? []).filter(p => p.id !== id)
      );
      return { previous };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['products'], ctx.previous);
      toast.error(t('toast.productError'));
    },
    onSuccess: () => toast.success(t('toast.productDeleted')),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return products.filter(p => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q)
        || p.brand.toLowerCase().includes(q)
        || p.description.toLowerCase().includes(q);
    });
  }, [products, debouncedSearch, categoryFilter]);

  const priceRange = useMemo(() => {
    if (products.length === 0) return null;
    const prices = products.map(p => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [products]);

  const filterItems = useMemo(() => [
    { id: 'all' as const, name: t('products.filters.all'), count: products.length },
    ...CATEGORIES.map(c => ({
      id: c,
      name: t(`products.category.${c}` as Parameters<typeof t>[0]),
      count: products.filter(p => p.category === c).length,
    })),
  ], [products, t]);

  const isFiltering = debouncedSearch.trim() !== '' || categoryFilter !== 'all';

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, category: categoryFilter !== 'all' ? categoryFilter : 'hair-care' });
    setEditorOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      brand: p.brand,
      size: p.size,
      price: String(p.price),
      stock: String(p.stock),
      category: p.category,
      description: p.description,
      imageUrl: p.imageUrl ?? '',
      isPublic: p.isPublic !== false,
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const submitForm = () => {
    if (!form.name.trim() || !form.brand.trim() || !form.price) {
      toast.error(t('products.editor.required'));
      return;
    }
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      size: form.size.trim(),
      price: parseFloat(form.price),
      stock: parseInt(form.stock || '0', 10),
      category: form.category,
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim() || undefined,
      isPublic: form.isPublic,
    };
    if (editingId) updateMutation.mutate({ id: editingId, data: payload });
    else createMutation.mutate(payload);
  };

  const handleDelete = async (p: Product) => {
    const ok = await confirm({
      title: t('products.delete.title', { name: p.name }),
      description: t('products.delete.description'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (ok) deleteMutation.mutate(p.id);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={(
          <>
            <span>{t('products.title')}</span>
            {priceRange && (
              <>
                <PageHeaderDivider />
                <span className="normal-case tracking-normal tabular-nums">
                  {fmt(priceRange.min)}–{fmt(priceRange.max)}
                </span>
              </>
            )}
          </>
        )}
        title={(
          <span className="tabular-nums">
            {products.length.toLocaleString()}{' '}
            <span className="font-semibold text-muted-foreground/70">
              {products.length === 1 ? t('products.hero.itemOne') : t('products.hero.itemMany')}
            </span>
          </span>
        )}
        action={(
          <Button size="sm" onClick={openCreate}>
            <PlusIcon className="mr-1 h-4 w-4" />
            {t('products.actions.create')}
          </Button>
        )}
      />

      {/* Filter + search bar */}
      {products.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border px-3 py-2.5">
            {filterItems.map(item => (
              <FilterPill
                key={item.id}
                variant="meta"
                label={item.name}
                count={item.count}
                selected={categoryFilter === item.id}
                onClick={() => setCategoryFilter(item.id)}
                groupId="products-cat-filter"
                icon={item.id === 'all' ? <TagIcon className="h-3.5 w-3.5" /> : undefined}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 p-2.5">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('products.search.placeholder')}
                className="h-9 bg-background pl-9"
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {/* Empty: no products */}
      {!isLoading && products.length === 0 && (
        <EmptyState
          variant="dashed"
          icon={ShoppingBagIcon}
          eyebrow={t('products.title')}
          title={t('products.empty.title')}
          description={t('products.empty.description')}
          action={<Button onClick={openCreate}>{t('products.empty.cta')}</Button>}
        />
      )}

      {/* Empty: filter no match */}
      {!isLoading && products.length > 0 && isFiltering && filtered.length === 0 && (
        <EmptyState
          variant="plain"
          icon={MagnifyingGlassIcon}
          title={t('products.search.empty.title')}
          action={
            <Button variant="outline" onClick={() => { setSearch(''); setCategoryFilter('all'); }}>
              {t('products.search.empty.cta')}
            </Button>
          }
        />
      )}

      {/* Grid */}
      {!isLoading && (filtered.length > 0 || !isFiltering) && products.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filtered.map(p => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: MOTION_DUR.fast, ease: MOTION_EASE }}
              >
                <ProductCard product={p} onEdit={() => openEdit(p)} onDelete={() => handleDelete(p)} />
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
                className="group flex min-h-[220px] w-full flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-border bg-muted/20 p-6 transition-all hover:border-foreground/40 hover:bg-muted/40"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-transform group-hover:scale-110 group-hover:text-foreground">
                  <PlusIcon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-foreground">{t('products.actions.create')}</p>
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      <ProductEditorModal
        open={editorOpen}
        onOpenChange={(open) => { if (!open) closeEditor(); }}
        mode={editingId ? 'edit' : 'create'}
        form={form}
        setForm={setForm}
        isSubmitting={isSubmitting}
        onSave={submitForm}
      />
    </div>
  );
}
