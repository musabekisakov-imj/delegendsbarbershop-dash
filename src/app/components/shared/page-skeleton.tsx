import { cn } from '../ui/utils';

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
// Shown during lazy-chunk load on route change. Previously 48px — users asked
// for something bigger and more intentional-feeling. Now: 96px conic spinner,
// brand mark inside, larger "Loading" text + dots. Reads as "the product is
// working on your request", not "something tiny is spinning in a corner".
export function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        {/* Soft halo behind the spinner so it has presence on both themes. */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/5 animate-[skeleton-pulse_2s_ease-in-out_infinite]" aria-hidden />
          <Spinner size={96} />
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute h-9 w-9 text-primary"
          >
            {/* Scissors glyph — same icon as the brand header */}
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M20 4L8.12 15.88" />
            <path d="M14.47 14.48L20 20" />
            <path d="M8.12 8.12L12 12" />
          </svg>
        </div>
        <span className="inline-flex items-center gap-2 text-base font-medium text-foreground">
          Loading
          <span className="text-primary"><Dots /></span>
        </span>
      </div>
    </div>
  );
}
