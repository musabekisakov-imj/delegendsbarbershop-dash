// Customer-site mirror of src/app/lib/tokens.ts in the dashboard.
// Same gradient palettes, same hashing function so an entity (a staff
// member, a service) gets the same color across the dashboard and the
// customer site.

export const AVATAR_GRADIENTS = [
  'from-blue-500 to-cyan-500',
  'from-violet-500 to-fuchsia-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-cyan-500 to-sky-500',
  'from-orange-500 to-red-500',
] as const;

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

export const CATEGORY_DOTS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-cyan-500',
] as const;

// Stable hash → palette index. Same ID always picks the same color.
export function hashToIndex(id: string, paletteSize: number): number {
  const n = [...id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return n % paletteSize;
}

export const gradientFor = (id: string) => AVATAR_GRADIENTS[hashToIndex(id, AVATAR_GRADIENTS.length)];
export const serviceGradientFor = (id: string) => SERVICE_GRADIENTS[hashToIndex(id, SERVICE_GRADIENTS.length)];
export const dotFor = (id: string) => CATEGORY_DOTS[hashToIndex(id, CATEGORY_DOTS.length)];
