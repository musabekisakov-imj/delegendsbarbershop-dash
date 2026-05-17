import { create } from 'zustand';

export type AccountsView = 'list' | 'tree';
export type RoleFilter = 'all' | 'owner' | 'manager' | 'receptionist' | 'barber';

interface AccountsPrefsState {
  view: AccountsView;
  roleFilter: RoleFilter;
  search: string;
  setView: (v: AccountsView) => void;
  setRoleFilter: (r: RoleFilter) => void;
  setSearch: (s: string) => void;
}

function readView(): AccountsView {
  try {
    const p = new URLSearchParams(window.location.search);
    const v = p.get('view');
    if (v === 'tree' || v === 'list') return v;
  } catch {
    // SSR
  }
  return 'list';
}

function writeView(v: AccountsView) {
  try {
    const url = new URL(window.location.href);
    if (v === 'list') url.searchParams.delete('view');
    else url.searchParams.set('view', v);
    window.history.replaceState(null, '', url);
  } catch {
    // SSR
  }
}

export const useAccountsPrefs = create<AccountsPrefsState>((set) => ({
  view: readView(),
  roleFilter: 'all',
  search: '',
  setView: (v) => { writeView(v); set({ view: v }); },
  setRoleFilter: (r) => set({ roleFilter: r }),
  setSearch: (s) => set({ search: s }),
}));
