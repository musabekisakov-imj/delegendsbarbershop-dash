import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as Popover from '@radix-ui/react-popover';
import { categoriesApi, servicesApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  TagIcon,
  CheckIcon,
  XMarkIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { cn } from '../../components/ui/utils';
import { useT } from '../../hooks/use-t';
import { pluralKey } from '../../i18n/plural';
import { useLanguageStore } from '../../store/language-store';
import type { Service, Category, CategoryColorKey } from '../../types';
import {
  CATEGORY_COLOR_PALETTE,
  getCategoryColor,
  colorForCategoryFallback,
  MOTION_DUR,
  MOTION_EASE,
} from '../../lib/tokens';
import { DeleteCategoryDialog } from './delete-category-dialog';

// ─── Color order ─────────────────────────────────────────────────────────────
const COLOR_ORDER: CategoryColorKey[] = [
  'slate', 'rose', 'amber', 'emerald', 'sky',
  'violet', 'fuchsia', 'teal', 'orange', 'indigo',
];

// ─── ColorSwatch popover ─────────────────────────────────────────────────────

interface ColorSwatchProps {
  currentColor: CategoryColorKey;
  catId: string;
  onSelect: (color: CategoryColorKey) => void;
}

function ColorSwatchPopover({ currentColor, catId, onSelect }: ColorSwatchProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          aria-label="Change color"
          className={cn(
            'h-3.5 w-3.5 rounded-full shrink-0 ring-2 ring-transparent transition-all',
            'hover:ring-border focus-visible:outline-none focus-visible:ring-ring',
            getCategoryColor(currentColor ?? colorForCategoryFallback(catId)).dot,
          )}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-50 rounded-xl border border-border bg-popover p-2 shadow-lg"
        >
          <div className="grid grid-cols-5 gap-1.5">
            {COLOR_ORDER.map((key) => {
              const token = CATEGORY_COLOR_PALETTE[key];
              const isActive = key === currentColor;
              return (
                <motion.button
                  key={key}
                  aria-label={key}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ duration: MOTION_DUR.fast, ease: MOTION_EASE }}
                  onClick={() => {
                    onSelect(key);
                    setOpen(false);
                  }}
                  className={cn(
                    'relative h-6 w-6 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    token.dot,
                  )}
                >
                  {isActive && (
                    <CheckIcon className="absolute inset-0 m-auto h-3.5 w-3.5 text-white" />
                  )}
                </motion.button>
              );
            })}
          </div>
          <Popover.Arrow className="fill-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ─── SortableItem ─────────────────────────────────────────────────────────────

interface SortableItemProps {
  cat: Category;
  serviceCount: number;
  editingId: string | null;
  editName: string;
  onEditNameChange: (v: string) => void;
  onStartEdit: (cat: Category) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteClick: (cat: Category) => void;
  onColorChange: (catId: string, color: CategoryColorKey) => void;
}

function SortableItem({
  cat,
  serviceCount,
  editingId,
  editName,
  onEditNameChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteClick,
  onColorChange,
}: SortableItemProps) {
  const t = useT();
  const language = useLanguageStore(s => s.language);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isEditingThis = editingId === cat.id;
  const colorKey = cat.color ?? colorForCategoryFallback(cat.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-2"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing shrink-0"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <Bars3Icon className="h-4 w-4" />
      </button>

      {/* Color swatch dot */}
      <ColorSwatchPopover
        currentColor={colorKey}
        catId={cat.id}
        onSelect={(c) => onColorChange(cat.id, c)}
      />

      {isEditingThis ? (
        <Input
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSaveEdit()}
          className="h-8 flex-1"
          autoFocus
        />
      ) : (
        <>
          <span className="flex-1 truncate text-sm font-medium text-foreground">
            {cat.name}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {t(`services.categories.servicesCount.${pluralKey(serviceCount, language)}` as Parameters<typeof t>[0], { count: serviceCount })}
          </span>
        </>
      )}

      {isEditingThis ? (
        <>
          <button
            onClick={onSaveEdit}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            aria-label="Save"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onCancelEdit}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            aria-label="Cancel"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => onStartEdit(cat)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Edit"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDeleteClick(cat)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
            aria-label="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

// ─── CategoriesDialog ─────────────────────────────────────────────────────────

export function CategoriesDialog({
  open,
  onOpenChange,
  categories,
  services,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  services: Service[];
}) {
  const queryClient = useQueryClient();
  const t = useT();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [localOrder, setLocalOrder] = useState<Category[]>([]);

  // Keep localOrder synced when categories prop changes (unless mid-drag)
  const orderedCategories = localOrder.length > 0
    ? localOrder
    : [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: Omit<Category, 'id' | 'createdAt'>) => categoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(t('toast.categoryCreated'));
      setNewName('');
      setIsAdding(false);
    },
    onError: () => toast.error(t('toast.categoryCreateError')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(t('toast.categoryUpdated'));
      setEditingId(null);
      setEditName('');
    },
    onError: () => toast.error(t('toast.categoryUpdateError')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(t('toast.categoryDeleted'));
      setDeletingCategory(null);
    },
    onError: () => toast.error(t('toast.categoryDeleteError')),
  });

  const colorMutation = useMutation({
    mutationFn: ({ id, color }: { id: string; color: CategoryColorKey }) =>
      categoriesApi.update(id, { color }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    onError: () => toast.error(t('toast.categoryUpdateError')),
  });

  // ─── DnD ───────────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedCategories.findIndex((c) => c.id === active.id);
    const newIndex = orderedCategories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(orderedCategories, oldIndex, newIndex);

    setLocalOrder(reordered);

    // Persist new sortOrder for each item
    reordered.forEach((cat, index) => {
      if (cat.sortOrder !== index) {
        categoriesApi.update(cat.id, { sortOrder: index }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['categories'] });
        });
      }
    });
  }

  // ─── Inline edit ───────────────────────────────────────────────────────────

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setNewName('');
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setIsAdding(false);
    setEditName(cat.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditName('');
    setNewName('');
  };

  const submitEdit = () => {
    if (!editName.trim()) return toast.error(t('toast.enterCategoryName'));
    updateMutation.mutate({ id: editingId!, data: { name: editName.trim() } });
  };

  const submitAdd = () => {
    if (!newName.trim()) return toast.error(t('toast.enterCategoryName'));
    createMutation.mutate({
      name: newName.trim(),
      color: 'slate',
      sortOrder: orderedCategories.length,
    });
  };

  // ─── Delete flow ────────────────────────────────────────────────────────────

  const handleDeleteClick = (cat: Category) => {
    setDeletingCategory(cat);
  };

  const handleMoveServices = async (targetCategoryId: string) => {
    if (!deletingCategory) return;
    const affected = services.filter((s) => s.categoryId === deletingCategory.id);
    await Promise.all(
      affected.map((s) => servicesApi.update(s.id, { categoryId: targetCategoryId }))
    );
    deleteMutation.mutate(deletingCategory.id);
    queryClient.invalidateQueries({ queryKey: ['services'] });
  };

  const handleDeleteServices = () => {
    if (!deletingCategory) return;
    deleteMutation.mutate(deletingCategory.id);
  };

  // ─── Color change ───────────────────────────────────────────────────────────

  const handleColorChange = (catId: string, color: CategoryColorKey) => {
    colorMutation.mutate({ id: catId, color });
  };

  const deletingServiceCount = deletingCategory
    ? services.filter((s) => s.categoryId === deletingCategory.id).length
    : 0;

  const otherCategories = deletingCategory
    ? orderedCategories.filter((c) => c.id !== deletingCategory.id)
    : [];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('services.categories.manage')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedCategories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {orderedCategories.map((cat) => {
                  const count = services.filter((s) => s.categoryId === cat.id).length;
                  return (
                    <SortableItem
                      key={cat.id}
                      cat={cat}
                      serviceCount={count}
                      editingId={editingId}
                      editName={editName}
                      onEditNameChange={setEditName}
                      onStartEdit={startEdit}
                      onSaveEdit={submitEdit}
                      onCancelEdit={cancelEdit}
                      onDeleteClick={handleDeleteClick}
                      onColorChange={handleColorChange}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>

            {isAdding && (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2">
                <TagIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
                  placeholder={t('services.categoryNamePlaceholder')}
                  className="h-8 flex-1"
                  autoFocus
                />
                <button
                  onClick={submitAdd}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  aria-label="Save"
                >
                  <CheckIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                  aria-label="Cancel"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {!isAdding && (
            <Button variant="outline" size="sm" onClick={startAdd} className="w-full">
              <PlusIcon className="mr-1.5 h-4 w-4" />
              {t('services.categories.add')}
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <DeleteCategoryDialog
        open={!!deletingCategory}
        category={deletingCategory}
        serviceCount={deletingServiceCount}
        otherCategories={otherCategories}
        onMove={handleMoveServices}
        onDeleteServices={handleDeleteServices}
        onCancel={() => setDeletingCategory(null)}
      />
    </>
  );
}
