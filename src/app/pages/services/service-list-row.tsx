import { useState } from 'react';
import {
  ClockIcon,
  PencilSquareIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ScissorsIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../components/ui/utils';
import { getCategoryColor, colorForCategoryFallback } from '../../lib/tokens';
import { usePriceFormatter } from '../../hooks/use-price-formatter';
import { useT } from '../../hooks/use-t';
import type { Service, Category } from '../../types';

interface ServiceListRowProps {
  service: Service;
  category: Category | undefined;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function ServiceListRow({
  service,
  category,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
}: ServiceListRowProps) {
  const t = useT();
  const fmt = usePriceFormatter();
  const [imgFailed, setImgFailed] = useState(false);
  const showPlaceholder = !service.imageUrl || imgFailed;
  const initial = service.name.charAt(0).toUpperCase() || 'S';

  const colorKey = category?.color ?? colorForCategoryFallback(service.categoryId);
  const dotClass = getCategoryColor(colorKey).dot;

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        selected
          ? 'border-foreground/20 bg-accent/60'
          : 'border-border bg-card hover:bg-accent/30',
      )}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onSelect(service.id, e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select ${service.name}`}
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-foreground"
      />

      {/* Thumbnail */}
      <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-muted to-accent/60 dark:from-muted dark:to-accent/20">
        {service.imageUrl && !imgFailed && (
          <img
            src={service.imageUrl}
            alt={service.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        )}
        {showPlaceholder && (
          <>
            <span className="absolute inset-0 flex items-center justify-center text-foreground/20 text-xl font-black select-none">
              {initial}
            </span>
            <ScissorsIcon className="absolute -bottom-1 -right-1 h-6 w-6 text-foreground/10 rotate-12" />
          </>
        )}
      </div>

      {/* Name + category */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{service.name}</p>
        {category && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotClass)} />
            {category.name}
          </span>
        )}
      </div>

      {/* Duration */}
      <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex shrink-0">
        <ClockIcon className="h-3.5 w-3.5" />
        <span className="tabular-nums">{service.duration}m</span>
      </div>

      {/* Price */}
      <div className="w-16 text-right text-sm font-semibold text-foreground tabular-nums shrink-0">
        {fmt(service.price)}
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          aria-label={t('services.card.actions.edit')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <PencilSquareIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          aria-label={t('services.card.actions.duplicate')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <DocumentDuplicateIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label={t('services.card.actions.delete')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
