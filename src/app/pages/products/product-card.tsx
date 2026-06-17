import { useState } from 'react';
import { motion } from 'motion/react';
import { CurrencyEuroIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { cn } from '../../components/ui/utils';
import { usePriceFormatter } from '../../hooks/use-price-formatter';
import { useT } from '../../hooks/use-t';
import { MOTION_DUR, MOTION_EASE, getCategoryColor } from '../../lib/tokens';
import type { Product, ProductCategory } from '../../types';

// Product categories are a fixed enum (mirrors the website storefront), so we
// map each to a stable palette key instead of the per-id hashing services use.
const CATEGORY_COLOR: Record<ProductCategory, Parameters<typeof getCategoryColor>[0]> = {
  'hair-care': 'sky',
  'face-body': 'violet',
  'beards': 'amber',
  'hairdressing-supplies': 'slate',
};

export function ProductCard({
  product, onEdit, onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const fmt = usePriceFormatter();
  const initial = product.name.charAt(0).toUpperCase() || 'P';
  const [imgFailed, setImgFailed] = useState(false);
  const showPlaceholder = !product.imageUrl || imgFailed;
  const color = getCategoryColor(CATEGORY_COLOR[product.category]);
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;

  return (
    <motion.article
      onClick={onEdit}
      whileHover={{ y: -2 }}
      transition={{ duration: MOTION_DUR.fast, ease: MOTION_EASE }}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-[0_18px_44px_-34px_rgba(15,23,42,0.65)]"
    >
      <div className={cn('relative aspect-[4/3] overflow-hidden', showPlaceholder && color.tintBg)}>
        {product.imageUrl && !imgFailed && (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={() => setImgFailed(true)}
          />
        )}

        {showPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn('flex h-20 w-20 items-center justify-center rounded-3xl bg-card/75 shadow-sm ring-1 backdrop-blur-sm', color.ring)}>
              <span className={cn('text-3xl font-black leading-none select-none', color.tintText)}>
                {initial}
              </span>
            </div>
          </div>
        )}

        {/* Brand chip — top-left */}
        <div className={cn(
          'absolute top-3 left-3 inline-flex max-w-[calc(100%-7rem)] items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm',
          !showPlaceholder ? 'bg-black/30 text-white backdrop-blur-sm' : 'bg-card/75 text-muted-foreground ring-1 ring-border/70',
        )}>
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', color.dot)} />
          <span className="truncate">{product.brand}</span>
        </div>

        {/* Price pill — top-right */}
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-black tabular-nums text-slate-950 shadow-sm dark:bg-black/80 dark:text-white">
          <CurrencyEuroIcon className="h-3.5 w-3.5 text-muted-foreground" />
          {fmt(product.price)}
        </div>

        {/* Action row — bottom-right */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-100 transition-opacity lg:opacity-90 lg:group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            aria-label={t('products.editor.editTitle')}
            title={t('products.editor.editTitle')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-foreground shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 dark:bg-black/80 dark:hover:bg-black/80"
          >
            <PencilSquareIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label={t('common.delete')}
            title={t('common.delete')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-rose-600 shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 dark:bg-black/80 dark:hover:bg-black/80"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{product.name}</h3>
          <span className="shrink-0 text-xs text-muted-foreground">{product.size}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums',
            outOfStock ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300'
              : lowStock ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', outOfStock ? 'bg-rose-500' : lowStock ? 'bg-amber-500' : 'bg-emerald-500')} />
            {outOfStock ? t('products.card.out') : t('products.card.stock', { count: product.stock })}
          </span>
          {product.isPublic === false && (
            <span className="shrink-0 text-[11px] font-medium text-muted-foreground">{t('products.card.hidden')}</span>
          )}
        </div>
      </div>
    </motion.article>
  );
}
