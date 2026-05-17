import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BookingsDensity = 'comfortable' | 'compact';
export type SortCol = 'time' | 'client' | 'service' | 'price' | 'status';
export type SortDir = 'asc' | 'desc';

interface BookingsPrefsState {
  density: BookingsDensity;
  sortCol: SortCol;
  sortDir: SortDir;
  staffFilterIds: string[];
  setDensity: (d: BookingsDensity) => void;
  setSort: (col: SortCol, dir: SortDir) => void;
  toggleSort: (col: SortCol) => void;
  setStaffFilter: (ids: string[]) => void;
  toggleStaffFilter: (id: string, activeStaffIds: string[]) => void;
}

export const useBookingsPrefsStore = create<BookingsPrefsState>()(
  persist(
    (set, get) => ({
      density: 'comfortable',
      sortCol: 'time',
      sortDir: 'asc',
      staffFilterIds: [],

      setDensity: (density) => set({ density }),

      setSort: (sortCol, sortDir) => set({ sortCol, sortDir }),

      toggleSort: (col) => {
        const { sortCol, sortDir } = get();
        if (sortCol === col) {
          set({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' });
        } else {
          set({ sortCol: col, sortDir: 'asc' });
        }
      },

      setStaffFilter: (staffFilterIds) => set({ staffFilterIds }),

      toggleStaffFilter: (id, activeStaffIds) => {
        const { staffFilterIds } = get();
        const next = new Set(staffFilterIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        if (next.size === activeStaffIds.length) {
          set({ staffFilterIds: [] });
        } else {
          set({ staffFilterIds: Array.from(next) });
        }
      },
    }),
    { name: 'bookings-prefs-v1' },
  ),
);
