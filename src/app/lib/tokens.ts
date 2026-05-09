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
  // FAB-specific: tighter shadow geometry so the puck sits above the page
  // without competing with modals. Token isolates the magic numbers.
  fab:      'shadow-[0_8px_24px_-6px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.45)]',
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

// Status pills — light theme uses fully-tinted bg (not the 10% alpha trick
// which fails AA on white) plus a deeper text shade. Dark stays softer
// since the dark canvas already provides contrast for the lighter shades.
//
// Reference: WCAG AA requires 4.5:1 for body text. All light pairs clear
// the bar at 4.5:1+; the previous /10 alpha trick was 3.1:1 and failed.
//
// SCHEDULED = grey neutral — booked but client hasn't confirmed yet, no
// celebration warranted. CONFIRMED = green — client said yes. COMPLETED =
// green — service finished. The two greens are intentional: both are
// "positive states", but operators distinguish them via the explicit label
// + the `STATUS_DOT` (blue/emerald/muted) on the booking tile.
export const STATUS_PILL = {
  scheduled: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  confirmed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  completed: 'bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  no_show:   'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
} as const;

// Human-readable labels — status enum values are snake_case
// ('no_show') but must never render that way in UI.
export const STATUS_LABEL = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show:   'No-show',
} as const;

// ─── Recency buckets for client last-seen ─────────────────
export const RECENCY_STYLE = {
  fresh: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  warm: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  cold: { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
  new: { dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
} as const;

// ─── Role identity ───────────────────────────────────────
// Single source of truth for role hues + labels. Promoted from
// duplicated local maps in accounts.tsx + staff.tsx. Static Tailwind
// classes only (so JIT picks them up); for runtime CSS values
// (left rail, ring color), use ROLE_BAR / ROLE_RING with inline style.
export type Role = 'owner' | 'manager' | 'receptionist' | 'barber';

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  receptionist: 'Receptionist',
  barber: 'Barber',
};

export const ROLE_CHIP: Record<Role, string> = {
  owner:        'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  manager:      'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  receptionist: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  barber:       'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
};

export const ROLE_DOT: Record<Role, string> = {
  owner: 'bg-amber-500',
  manager: 'bg-violet-500',
  receptionist: 'bg-blue-500',
  barber: 'bg-emerald-500',
};

// Raw oklch values driven via inline style — used for the role-tinted
// left rail on the tree node and the avatar ring color. Tailwind's JIT
// can't ingest a runtime CSS var inside arbitrary-value brackets without
// a theme.css declaration, so we keep these as strings consumed via
// `style={{ background: ROLE_BAR[role] }}` / `style={{ '--tw-ring-color': ROLE_RING[role] }}`.
export const ROLE_BAR: Record<Role, string> = {
  owner:        'oklch(0.74 0.16 70)',
  manager:      'oklch(0.62 0.21 295)',
  receptionist: 'oklch(0.62 0.18 250)',
  barber:       'oklch(0.66 0.16 160)',
};
export const ROLE_RING = ROLE_BAR;

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
// CSS-string variant (transitions, animation-duration, transition-timing-function).
export const MOTION = {
  fast: '150ms',
  base: '220ms',
  slow: '320ms',
  spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

// framer-motion-friendly numeric companions — same values, different shape.
// Use these wherever you'd write `transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}`.
export const MOTION_EASE = [0.16, 1, 0.3, 1] as const;
export const MOTION_DUR = { fast: 0.15, base: 0.22, slow: 0.32 } as const;
