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
  scheduled: 'bg-zinc-400',
  confirmed: 'bg-emerald-500',
  completed: 'bg-teal-500',
  cancelled: 'bg-red-500',
  no_show:   'bg-amber-500',
} as const;

export const STATUS_STRIPE = {
  scheduled: 'bg-zinc-400',
  confirmed: 'bg-emerald-500',
  completed: 'bg-teal-500',
  cancelled: 'bg-red-500',
  no_show:   'bg-amber-500',
} as const;

// Status pills — light theme uses fully-tinted bg (not the 10% alpha trick
// which fails AA on white) plus a deeper text shade. Dark stays softer
// since the dark canvas already provides contrast for the lighter shades.
//
// Reference: WCAG AA requires 4.5:1 for body text. All light pairs clear
// the bar at 4.5:1+; the previous /10 alpha trick was 3.1:1 and failed.
// Dark variants lifted from /10→/15–/20 + text bumped 300→200 so the pills
// actually read on --card (which is only slightly lighter than --background).
//
// SCHEDULED = grey neutral. CONFIRMED = emerald green. COMPLETED = teal
// (distinct from confirmed so operators can scan at a glance). NO_SHOW =
// amber. CANCELLED = red (not rose — red reads unambiguously as "stop").
export const STATUS_PILL = {
  scheduled: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200',
  confirmed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
  completed: 'bg-teal-50 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200',
  no_show:   'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
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

// ─── Per-staff accent colors ──────────────────────────────
// Single source of truth — promoted from calendar.tsx so bookings + calendar
// + week-view + day-agenda all share one definition.
// Light-theme stripes use -600 (deep/saturated against #FFFFFF); dark uses -500.
export const STAFF_COLORS = [
  { bg: 'bg-card', border: 'border-l-blue-600 dark:border-l-blue-500',     text: 'text-foreground', sub: 'text-muted-foreground', dot: 'bg-blue-500',    light: 'bg-blue-100 dark:bg-blue-900/70',       label: 'text-blue-700 dark:text-blue-200',       ring: 'ring-blue-400'    },
  { bg: 'bg-card', border: 'border-l-violet-600 dark:border-l-violet-500', text: 'text-foreground', sub: 'text-muted-foreground', dot: 'bg-violet-500',  light: 'bg-violet-100 dark:bg-violet-900/70',   label: 'text-violet-700 dark:text-violet-200',   ring: 'ring-violet-400'  },
  { bg: 'bg-card', border: 'border-l-amber-600 dark:border-l-amber-500',   text: 'text-foreground', sub: 'text-muted-foreground', dot: 'bg-amber-500',   light: 'bg-amber-100 dark:bg-amber-900/70',     label: 'text-amber-700 dark:text-amber-200',     ring: 'ring-amber-400'   },
  { bg: 'bg-card', border: 'border-l-green-600 dark:border-l-emerald-500', text: 'text-foreground', sub: 'text-muted-foreground', dot: 'bg-emerald-500', light: 'bg-emerald-100 dark:bg-emerald-900/70', label: 'text-emerald-700 dark:text-emerald-200', ring: 'ring-emerald-400' },
  { bg: 'bg-card', border: 'border-l-rose-600 dark:border-l-rose-500',     text: 'text-foreground', sub: 'text-muted-foreground', dot: 'bg-rose-500',    light: 'bg-rose-100 dark:bg-rose-900/70',       label: 'text-rose-700 dark:text-rose-200',       ring: 'ring-rose-400'    },
  { bg: 'bg-card', border: 'border-l-cyan-600 dark:border-l-cyan-500',     text: 'text-foreground', sub: 'text-muted-foreground', dot: 'bg-cyan-500',    light: 'bg-cyan-100 dark:bg-cyan-900/70',       label: 'text-cyan-700 dark:text-cyan-200',       ring: 'ring-cyan-400'    },
  { bg: 'bg-card', border: 'border-l-orange-600 dark:border-l-orange-500', text: 'text-foreground', sub: 'text-muted-foreground', dot: 'bg-orange-500',  light: 'bg-orange-100 dark:bg-orange-900/70',   label: 'text-orange-700 dark:text-orange-200',   ring: 'ring-orange-400'  },
] as const;

export const getStaffColor = (idx: number) => STAFF_COLORS[idx % STAFF_COLORS.length];

// ─── Client avatar colors ─────────────────────────────────
// 8 hues deliberately disjoint from the 7 STAFF_COLORS hues above so a
// client avatar never reads as a staff member's color in the same row.
// slate / teal / indigo / pink / lime / sky / fuchsia / stone — none overlap
// blue / violet / amber / emerald / rose / cyan / orange.
export const CLIENT_AVATAR_COLORS = [
  { bg: 'bg-slate-400',   text: 'text-white' },
  { bg: 'bg-teal-500',    text: 'text-white' },
  { bg: 'bg-indigo-400',  text: 'text-white' },
  { bg: 'bg-pink-400',    text: 'text-white' },
  { bg: 'bg-lime-500',    text: 'text-white' },
  { bg: 'bg-sky-500',     text: 'text-white' },
  { bg: 'bg-fuchsia-500', text: 'text-white' },
  { bg: 'bg-stone-500',   text: 'text-white' },
] as const;

export const getClientAvatarColor = (clientId: string) =>
  CLIENT_AVATAR_COLORS[hashToIndex(clientId, CLIENT_AVATAR_COLORS.length)];

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

// ─── Booking filter UI tokens ─────────────────────────────
// Badge tint for unselected status pills — colored hint before selection.
export const STATUS_BADGE_TINT = {
  scheduled: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  completed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  no_show:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
} as const;

// Icon stroke color for unselected status pills.
export const STATUS_ICON_COLOR = {
  scheduled: 'text-zinc-500 dark:text-zinc-400',
  confirmed: 'text-emerald-600 dark:text-emerald-400',
  completed: 'text-teal-600 dark:text-teal-400',
  cancelled: 'text-red-600 dark:text-red-400',
  no_show:   'text-amber-600 dark:text-amber-400',
} as const;

// Tinted hover bg — previews selection color before click.
export const STATUS_HOVER = {
  scheduled: 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50',
  confirmed: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
  completed: 'hover:bg-teal-50 dark:hover:bg-teal-950/30',
  cancelled: 'hover:bg-red-50 dark:hover:bg-red-950/30',
  no_show:   'hover:bg-amber-50 dark:hover:bg-amber-950/30',
} as const;

// Colored glow for selected pills — matches 500-weight fill at ~40% opacity.
export const STATUS_GLOW = {
  scheduled: '0 4px 14px -3px rgba(113,113,122,0.40)',
  confirmed: '0 4px 14px -3px rgba(16,185,129,0.45)',
  completed: '0 4px 14px -3px rgba(20,184,166,0.45)',
  cancelled: '0 4px 14px -3px rgba(239,68,68,0.40)',
  no_show:   '0 4px 14px -3px rgba(245,158,11,0.40)',
} as const;

// Logical next-state map — forward transitions highlighted in the modal status
// picker; anything not in this list for the current status is a backwards move
// and gets dimmed (still clickable).
export const STATUS_NEXT: Record<string, string[]> = {
  scheduled: ['confirmed', 'completed', 'no_show', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  completed: [],
  no_show:   [],
  cancelled: ['scheduled', 'confirmed'],
};

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

// ─── Role color palette ───────────────────────────────────
// 8 hues deliberately disjoint from the 7 STAFF_COLORS hues above:
// fuchsia / indigo / teal / slate / lime / pink / sky / stone
// none overlap blue / violet / amber / emerald / rose / cyan / orange.
import type { CategoryColorKey, RoleColorKey, StaffRole } from '../types';

export const ROLE_COLOR_PALETTE: Record<RoleColorKey, {
  chip: string;
  dot: string;
  tintBg: string;
  tintText: string;
  ring: string;
}> = {
  fuchsia: { chip: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300', dot: 'bg-fuchsia-500', tintBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40', tintText: 'text-fuchsia-700 dark:text-fuchsia-300', ring: 'ring-fuchsia-400' },
  indigo:  { chip: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',   dot: 'bg-indigo-500',  tintBg: 'bg-indigo-100 dark:bg-indigo-900/40',   tintText: 'text-indigo-700 dark:text-indigo-300',   ring: 'ring-indigo-400'  },
  teal:    { chip: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',           dot: 'bg-teal-500',    tintBg: 'bg-teal-100 dark:bg-teal-900/40',       tintText: 'text-teal-700 dark:text-teal-300',       ring: 'ring-teal-400'    },
  slate:   { chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',      dot: 'bg-slate-400',   tintBg: 'bg-slate-100 dark:bg-slate-800',         tintText: 'text-slate-700 dark:text-slate-300',     ring: 'ring-slate-400'   },
  lime:    { chip: 'bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300',           dot: 'bg-lime-500',    tintBg: 'bg-lime-100 dark:bg-lime-900/40',       tintText: 'text-lime-700 dark:text-lime-300',       ring: 'ring-lime-400'    },
  pink:    { chip: 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300',           dot: 'bg-pink-500',    tintBg: 'bg-pink-100 dark:bg-pink-900/40',       tintText: 'text-pink-700 dark:text-pink-300',       ring: 'ring-pink-400'    },
  sky:     { chip: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',               dot: 'bg-sky-500',     tintBg: 'bg-sky-100 dark:bg-sky-900/40',         tintText: 'text-sky-700 dark:text-sky-300',         ring: 'ring-sky-400'     },
  stone:   { chip: 'bg-stone-100 text-stone-700 dark:bg-stone-800/60 dark:text-stone-300',      dot: 'bg-stone-400',   tintBg: 'bg-stone-100 dark:bg-stone-800',         tintText: 'text-stone-700 dark:text-stone-300',     ring: 'ring-stone-400'   },
};

export const ROLE_TO_COLOR: Record<StaffRole, RoleColorKey> = {
  owner:        'fuchsia',
  manager:      'indigo',
  receptionist: 'teal',
  barber:       'slate',
};

export const getRoleColor = (role: StaffRole) => ROLE_COLOR_PALETTE[ROLE_TO_COLOR[role]];

const ROLE_COLOR_KEYS = Object.keys(ROLE_COLOR_PALETTE) as RoleColorKey[];

export const colorForCustomRole = (id: string): RoleColorKey =>
  ROLE_COLOR_KEYS[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % ROLE_COLOR_KEYS.length];

// ─── Category color palette ───────────────────────────────

export const CATEGORY_COLOR_PALETTE: Record<CategoryColorKey, {
  dot: string;
  tintBg: string;
  tintText: string;
  ring: string;
}> = {
  slate:   { dot: 'bg-slate-400',   tintBg: 'bg-slate-100 dark:bg-slate-800',        tintText: 'text-slate-700 dark:text-slate-300',   ring: 'ring-slate-400' },
  rose:    { dot: 'bg-rose-400',    tintBg: 'bg-rose-100 dark:bg-rose-900/40',        tintText: 'text-rose-700 dark:text-rose-300',     ring: 'ring-rose-400' },
  amber:   { dot: 'bg-amber-400',   tintBg: 'bg-amber-100 dark:bg-amber-900/40',      tintText: 'text-amber-700 dark:text-amber-300',   ring: 'ring-amber-400' },
  emerald: { dot: 'bg-emerald-400', tintBg: 'bg-emerald-100 dark:bg-emerald-900/40',  tintText: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-400' },
  sky:     { dot: 'bg-sky-400',     tintBg: 'bg-sky-100 dark:bg-sky-900/40',          tintText: 'text-sky-700 dark:text-sky-300',       ring: 'ring-sky-400' },
  violet:  { dot: 'bg-violet-400',  tintBg: 'bg-violet-100 dark:bg-violet-900/40',    tintText: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-400' },
  fuchsia: { dot: 'bg-fuchsia-400', tintBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40',  tintText: 'text-fuchsia-700 dark:text-fuchsia-300', ring: 'ring-fuchsia-400' },
  teal:    { dot: 'bg-teal-400',    tintBg: 'bg-teal-100 dark:bg-teal-900/40',        tintText: 'text-teal-700 dark:text-teal-300',     ring: 'ring-teal-400' },
  orange:  { dot: 'bg-orange-400',  tintBg: 'bg-orange-100 dark:bg-orange-900/40',    tintText: 'text-orange-700 dark:text-orange-300', ring: 'ring-orange-400' },
  indigo:  { dot: 'bg-indigo-400',  tintBg: 'bg-indigo-100 dark:bg-indigo-900/40',    tintText: 'text-indigo-700 dark:text-indigo-300', ring: 'ring-indigo-400' },
};

const COLOR_KEYS = Object.keys(CATEGORY_COLOR_PALETTE) as CategoryColorKey[];

export const getCategoryColor = (key: CategoryColorKey) => CATEGORY_COLOR_PALETTE[key];

/** Maps any category id to a palette key via char-code sum — no randomness. */
export const colorForCategoryFallback = (id: string): CategoryColorKey =>
  COLOR_KEYS[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLOR_KEYS.length];
