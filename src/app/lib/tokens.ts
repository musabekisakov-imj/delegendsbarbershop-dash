// Centralized design tokens — every page imports from here so palette drift is impossible.

// ─── Text tiers — three levels, stop there ───────────────
// Refactoring UI principle: don't invent fourth/fifth/sixth tier of "muted".
// If you need another weight, you actually need a different component.
//
//   foreground                  → primary readable text (names, prices, values)
//   text-muted-foreground       → supporting text (labels, hints, metadata)
//   text-muted-foreground/70    → ghost text (timestamps, "never signed in", etc.)
//
// If you find yourself writing `/80` or `/50` stop and pick one of these three.
export const TEXT_TIERS = {
  primary: 'text-foreground',
  muted:   'text-muted-foreground',
  ghost:   'text-muted-foreground/70',
} as const;

// ─── Elevation tiers — pick ONE per surface, not both ────
// Refactoring UI: shadows imply real elevation (dialogs, popovers), borders
// imply structural separation (rows, sections). Don't stack both on one card.
//
//   ELEVATION.surface           → plain border, no lift; use for row lists + side panels
//   ELEVATION.card              → border + subtle shadow; standard data cards
//   ELEVATION.floating          → heavier shadow, no border; dialogs + popovers
export const ELEVATION = {
  surface:  'border border-border bg-card',
  card:     'rounded-xl border border-border bg-card shadow-sm',
  floating: 'rounded-xl bg-popover shadow-lg',
} as const;


// ─── Avatar / deterministic gradient palette ──────────────
// Used for client/booking avatar circles. Index is hashed from the entity ID.
export const AVATAR_GRADIENTS = [
  'from-blue-500 to-cyan-500',
  'from-violet-500 to-fuchsia-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-cyan-500 to-sky-500',
  'from-orange-500 to-red-500',
] as const;

// ─── Service card hero gradients ──────────────────────────
// 8 distinct 3-stop gradients for service tile heroes without a photo.
export const SERVICE_GRADIENTS = [
  'from-rose-400 via-fuchsia-500 to-purple-600',
  'from-blue-400 via-indigo-500 to-violet-600',
  'from-amber-400 via-orange-500 to-rose-600',
  'from-emerald-400 via-teal-500 to-cyan-600',
  'from-fuchsia-400 via-pink-500 to-rose-600',
  'from-sky-400 via-blue-500 to-indigo-600',
  'from-lime-400 via-emerald-500 to-teal-600',
  'from-orange-400 via-red-500 to-pink-600',
] as const;

// ─── Category / filter dots ───────────────────────────────
export const CATEGORY_DOTS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-cyan-500',
] as const;

// ─── Appointment status colors ────────────────────────────
// Amber is reserved for "attention needed" states (no_show = client didn't
// show, owner needs to take action). Rose stays for actively cancelled.
export const STATUS_DOT = {
  scheduled: 'bg-blue-500',
  confirmed: 'bg-emerald-500',
  completed: 'bg-muted-foreground/50',
  cancelled: 'bg-rose-500',
  no_show:   'bg-amber-500',
} as const;

export const STATUS_STRIPE = {
  scheduled: 'bg-blue-500',
  confirmed: 'bg-emerald-500',
  completed: 'bg-muted-foreground/40',
  cancelled: 'bg-rose-500',
  no_show:   'bg-amber-500',
} as const;

// ─── Recency buckets for client last-seen ─────────────────
export const RECENCY_STYLE = {
  fresh: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  warm: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  cold: { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
  new: { dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
} as const;

// ─── Deterministic hash → palette index ──────────────────
// Stable across sessions: same ID always picks the same color.
export function hashToIndex(id: string, paletteSize: number): number {
  const n = [...id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return n % paletteSize;
}

export const gradientFor = (id: string) => AVATAR_GRADIENTS[hashToIndex(id, AVATAR_GRADIENTS.length)];
export const serviceGradientFor = (id: string) => SERVICE_GRADIENTS[hashToIndex(id, SERVICE_GRADIENTS.length)];
export const dotFor = (id: string) => CATEGORY_DOTS[hashToIndex(id, CATEGORY_DOTS.length)];

// ─── Motion — reusable durations ──────────────────────────
export const MOTION = {
  fast: '150ms',
  base: '220ms',
  slow: '320ms',
  spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;
