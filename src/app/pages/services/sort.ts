import type { Service } from '../../types';

export type SortKey =
  | 'manual'
  | 'name-asc'
  | 'price-asc'
  | 'price-desc'
  | 'duration-asc'
  | 'duration-desc'
  | 'popularity-desc';

export function compareServices(a: Service, b: Service, sort: SortKey): number {
  switch (sort) {
    case 'name-asc': return a.name.localeCompare(b.name);
    case 'price-asc': return a.price - b.price;
    case 'price-desc': return b.price - a.price;
    case 'duration-asc': return a.duration - b.duration;
    case 'duration-desc': return b.duration - a.duration;
    case 'popularity-desc': return 0; // mock — no real data yet
    case 'manual':
    default: return 0;
  }
}
