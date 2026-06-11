import { cn } from '../ui/utils';
import { useT } from '../../hooks/use-t';

/**
 * Loading primitives — designed together so every loading state reads as "the
 * same product" rather than a grab-bag of spinners.
 *
 *   Shimmer     → skeleton placeholder (base pulse + sweep highlight)
 *   Dots        → inline pending indicator (route change, buttons, toasts)
 *   Spinner     → icon-scale rotating arc (submit buttons)
 *   RouteFallback → brand-aware centered loader for lazy chunk loads
 */

// ─── Shimmer skeleton ─────────────────────────────────
// Two-layer motion: subtle `skeleton-base` breathing + `skeleton-sweep` wipe.
// Use rounded-*, h-* and w-* on the caller to shape each placeholder.
export function Shimmer({ className }: { className?: string }) {
  return (
    <div
      role="presentation"
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-md skeleton-base skeleton-sweep',
        className,
      )}
    />
  );
}

// ─── Dots loader ───────────────────────────────────────
// Three staggered dots. Inherits `currentColor`, so put it inside a colored
// wrapper: <span className="text-primary"><Dots /></span>.
export function Dots({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const gap = size === 'sm' ? 'gap-1' : size === 'lg' ? 'gap-2' : 'gap-1.5';
  const scale = size === 'sm' ? 'scale-75' : size === 'lg' ? 'scale-125' : '';
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-flex items-center loader-dots', gap, scale, className)}
    >
      <span />
      <span />
      <span />
    </span>
  );
}

// ─── Conic spinner ─────────────────────────────────────
// CSS-only (no SVG) so it renders crisp at any size without sub-pixel jitter.
// Reuses --primary so it matches the active theme without extra props.
export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('spinner-conic shrink-0', className)}
      style={{ width: size, height: size }}
    />
  );
}

// ─── Page-level skeletons ──────────────────────────────
export function PageSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-6 w-40" />
          <Shimmer className="h-3 w-60" />
        </div>
        <Shimmer className="h-9 w-32 rounded-md" />
      </div>

      {/* Filter chips row */}
      <div className="flex gap-2">
        <Shimmer className="h-8 w-20 rounded-full" />
        <Shimmer className="h-8 w-28 rounded-full" />
        <Shimmer className="h-8 w-24 rounded-full" />
      </div>

      {/* Content grid (cards) */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Shimmer className="h-32 w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-3 w-1/2" />
        <div className="flex justify-between pt-2">
          <Shimmer className="h-3 w-16" />
          <Shimmer className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <Shimmer className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Shimmer className="h-3.5 w-1/3" />
        <Shimmer className="h-3 w-1/2" />
      </div>
      <Shimmer className="h-3 w-16" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Route fallback ─────────────────────────────────────
// Shown during lazy-chunk load on route change. The brand mark (same asset as
// the favicon) sits inside a rotating conic arc with a breathing halo, so the
// wait reads as "DE Legends is working" rather than a generic spinner. The
// whole block is wrapped in `route-fallback-enter`, which holds it invisible
// for 150ms — fast chunk loads never flash a loader.
export function RouteFallback() {
  const t = useT();
  return (
    // NOT `fixed`: the page-enter wrapper animates `transform`, which turns it
    // into the containing block for fixed children — the loader would anchor
    // to the content div instead of the viewport and sit near the top. Flex
    // centering inside a viewport-height box lands in the true screen center
    // (100dvh minus the h-14 header and main's py-6 padding).
    <div className="flex min-h-[calc(100dvh-6.5rem)] items-center justify-center">
      <div className="route-fallback-enter flex flex-col items-center gap-6">
        {/* Soft halo behind the spinner so it has presence on both themes. */}
        <div className="relative flex h-36 w-36 items-center justify-center">
          <div className="absolute -inset-4 rounded-full bg-primary/5 animate-[skeleton-pulse_2s_ease-in-out_infinite]" aria-hidden />
          <Spinner size={144} />
          <img
            src="/icon-192.png"
            alt=""
            aria-hidden
            draggable={false}
            className="absolute h-[88px] w-[88px] select-none rounded-full shadow-md"
          />
        </div>
        <span className="inline-flex items-center gap-2 text-lg font-medium text-foreground">
          {t('common.loading')}
          <span className="text-primary"><Dots size="lg" /></span>
        </span>
      </div>
    </div>
  );
}
