import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Office } from '../types';
import { defaultOffices } from '../lib/mock-data';

interface OfficeState {
  offices: Office[];
  currentOfficeId: string;
  setOfficeId: (id: string) => void;
  setOffices: (offices: Office[]) => void;
}

export const useOfficeStore = create<OfficeState>()(
  persist(
    (set) => ({
      offices: defaultOffices,
      currentOfficeId: defaultOffices[0].id,

      setOfficeId: (id) => set({ currentOfficeId: id }),
      setOffices: (offices) => set({ offices }),
    }),
    {
      name: 'barber-dash-office',
      version: 1,
      partialize: (state) => ({
        currentOfficeId: state.currentOfficeId,
      }),
    },
  ),
);

export const useCurrentOffice = (): Office => {
  const offices = useOfficeStore((s) => s.offices);
  const currentOfficeId = useOfficeStore((s) => s.currentOfficeId);
  return offices.find((o) => o.id === currentOfficeId) ?? offices[0];
};
