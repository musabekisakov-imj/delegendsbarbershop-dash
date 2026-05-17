import { useState } from 'react';
import { motion } from 'motion/react';
import { ClockIcon, ScissorsIcon, PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { cn } from '../../components/ui/utils';
import { usePriceFormatter } from '../../hooks/use-price-formatter';
import { useT } from '../../hooks/use-t';
import { MOTION_DUR, MOTION_EASE } from '../../lib/tokens';
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

  return (
    <motion.article
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ duration: MOTION_DUR.fast, ease: MOTION_EASE }}
      className="group relative cursor-pointer rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:border-foreground/20"
    >
      {/* Hero — photo if present, else a muted neutral fallback.
          Dropped the per-service rainbow gradient: next to real photos it read
          as chromatic noise. Now missing-photo tiles all share one quiet neutral
          so the eye groups them as "placeholders" instead of "loud cards". */}
      <div className={cn(
        'relative aspect-[4/3] overflow-hidden',
        showPlaceholder && 'bg-gradient-to-br from-muted to-accent/60 dark:from-muted dark:to-accent/20',
      )}>
        {/* Selection checkbox — visible when any item selected or on hover */}
        {onSelect && (
          <div className={`absolute top-2 left-2 z-10 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <input
              type="checkbox"
              checked={selected ?? false}
              onChange={(e) => { e.stopPropagation(); onSelect(e.target.checked); }}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${service.name}`}
              className="h-4 w-4 cursor-pointer rounded border-white/60 bg-white/80 accent-foreground shadow-sm"
            />
          </div>
        )}

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
        <div className="absolute top-2 right-2 inline-flex items-center rounded-full bg-white dark:bg-black/80 px-2.5 py-0.5 text-xs font-bold tabular-nums text-foreground shadow-sm">
          {fmt(service.price)}
        </div>

        {/* Action row — always visible (touch devices don't have hover), dims to
            70% when idle, pops to 100% on hover. Adds a primary "Book" CTA so
            receptionists can jump straight into /bookings/new with this service
            pre-selected — the most common action, now one click away. */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onBook(); }}
            aria-label={t('services.card.actions.book')}
            title={t('services.card.actions.book')}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-primary text-primary-foreground px-2.5 text-[11px] font-semibold shadow-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <PlusIcon className="h-3 w-3" />
            {t('services.card.actions.book')}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            aria-label={t('services.card.actions.edit')}
            title={t('services.card.actions.edit')}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-black/80 text-foreground shadow-sm hover:bg-white dark:hover:bg-black/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <PencilSquareIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label={t('services.card.actions.delete')}
            title={t('services.card.actions.delete')}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-black/80 text-rose-600 shadow-sm hover:bg-white dark:hover:bg-black/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
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
    </motion.article>
  );
}
