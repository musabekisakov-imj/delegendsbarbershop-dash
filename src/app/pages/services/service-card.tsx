import { useState } from 'react';
import { motion } from 'motion/react';
import {
  CalendarDaysIcon,
  ClockIcon,
  CurrencyEuroIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../components/ui/utils';
import { usePriceFormatter } from '../../hooks/use-price-formatter';
import { useT } from '../../hooks/use-t';
import { MOTION_DUR, MOTION_EASE, getCategoryColor, colorForCategoryFallback } from '../../lib/tokens';
import type { Service, Category } from '../../types';

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

export const dotForId = (id: string) => {
  const n = [...id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return CATEGORY_DOTS[n % CATEGORY_DOTS.length];
};

// ─── ServiceCard ─────────────────────────────────────────────────
export function ServiceCard({
  service, category, onClick, onDelete, onBook, selected, onSelect,
}: {
  service: Service;
  category: Category | undefined;
  onClick: () => void;
  onDelete: () => void;
  onBook: () => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}) {
  const t = useT();
  const fmt = usePriceFormatter();
  const initial = service.name.charAt(0).toUpperCase() || 'S';
  // Track runtime image-load failure so we swap in the placeholder letter
  // + scissors (same UI as "no photo yet") instead of showing a blank card.
  // Previously onError just `display:none`d the img, leaving an empty tile.
  const [imgFailed, setImgFailed] = useState(false);
  const showPlaceholder = !service.imageUrl || imgFailed;
  const catColor = category
    ? getCategoryColor(category.color ?? colorForCategoryFallback(category.id))
    : null;

  return (
    <motion.article
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ duration: MOTION_DUR.fast, ease: MOTION_EASE }}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl border bg-card transition-all',
        selected ? 'border-primary shadow-[0_18px_44px_-32px_rgba(37,99,235,0.85)] ring-2 ring-primary/15' : 'border-border hover:border-primary/30 hover:shadow-[0_18px_44px_-34px_rgba(15,23,42,0.65)]',
      )}
    >
      {/* Hero — photo if present, else a muted neutral fallback.
          Dropped the per-service rainbow gradient: next to real photos it read
          as chromatic noise. Now missing-photo tiles all share one quiet neutral
          so the eye groups them as "placeholders" instead of "loud cards". */}
      <div className={cn(
        'relative aspect-[4/3] overflow-hidden',
        showPlaceholder && (catColor?.tintBg ?? 'bg-muted'),
      )}>
        {/* Selection checkbox — visible when any item selected or on hover */}
        {onSelect && (
          <div className={cn('absolute top-3 left-3 z-10 transition-opacity', selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
            <input
              type="checkbox"
              checked={selected ?? false}
              onChange={(e) => { e.stopPropagation(); onSelect(e.target.checked); }}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${service.name}`}
              className="h-5 w-5 cursor-pointer rounded-md border-white/70 bg-white/90 accent-primary shadow-sm"
            />
          </div>
        )}

        {service.imageUrl && !imgFailed && (
          <img
            {...responsiveImg(service.imageUrl)}
            alt={service.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={() => setImgFailed(true)}
          />
        )}

        {/* No-photo placeholder — a single centered monogram chip tinted to the
            service's category. Replaced the old giant ghost letter + corner-clipping
            scissors, which collided with the action buttons and read as clutter. */}
        {showPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn('flex h-20 w-20 items-center justify-center rounded-3xl bg-card/75 shadow-sm ring-1 backdrop-blur-sm', catColor?.ring ?? 'ring-border')}>
              <span className={cn(
                'text-3xl font-black leading-none select-none',
                catColor?.tintText ?? 'text-muted-foreground',
              )}>
                {initial}
              </span>
            </div>
          </div>
        )}

        {/* Dark overlay — only over a real loaded photo, not over the placeholder
            fallback (otherwise the placeholder letter gets darkened for no reason).
            Softened from /60 → /40 because the price pill already has backdrop-blur
            and the stronger ramp was muddying already-dim barbershop interiors. */}
        {!showPlaceholder && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-black/5" />
        )}

        {/* Category marker — simplified from a heavy white-glass pill to a
            colored dot with a small label. Category is already shown in the
            filter chips above; this is just a reminder, not primary info.
            Keeps the visual weight in the price pill (top-right) where it belongs. */}
        {category && (
          <div className={cn(
            'absolute top-3 inline-flex max-w-[calc(100%-7rem)] items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm',
            selected && onSelect ? 'left-10' : 'left-3',
            !showPlaceholder ? 'bg-black/30 text-white backdrop-blur-sm' : 'bg-card/75 text-muted-foreground ring-1 ring-border/70',
          )}>
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotForId(category.id))} />
            <span className="truncate">{category.name}</span>
          </div>
        )}

        <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-black tabular-nums text-slate-950 shadow-sm dark:bg-black/80 dark:text-white">
          <CurrencyEuroIcon className="h-3.5 w-3.5 text-muted-foreground" />
          {fmt(service.price)}
        </div>

        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-100 transition-opacity lg:opacity-90 lg:group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); onBook(); }}
            aria-label={t('services.card.actions.book')}
            title={t('services.card.actions.book')}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-3 text-[11px] font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <CalendarDaysIcon className="h-3.5 w-3.5" />
            {t('services.card.actions.book')}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            aria-label={t('services.card.actions.edit')}
            title={t('services.card.actions.edit')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition-colors hover:bg-white hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 dark:bg-black/80 dark:text-white dark:hover:bg-black/80"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label={t('services.card.actions.delete')}
            title={t('services.card.actions.delete')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-rose-600 shadow-sm transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 dark:bg-black/80 dark:hover:bg-rose-950/80"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate text-base font-black tracking-[-0.02em] text-foreground">{service.name}</h3>
          <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
            <ClockIcon className="h-3.5 w-3.5" />
            <span className="tabular-nums">{service.duration}m</span>
          </div>
        </div>
        {/* Description — always reserve 2 lines of space so the grid rows line
            up even when some services have no description. `min-h` locks the
            footer height; `line-clamp-2` truncates if someone writes a novel. */}
        <p className="mt-2 text-xs leading-5 text-muted-foreground line-clamp-2 min-h-[2.5rem]">
          {service.description || '\u00A0'}
        </p>
      </div>
    </motion.article>
  );
}
