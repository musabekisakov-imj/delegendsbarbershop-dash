// Zustand store for authentication state

import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  
  login: (user, token) => {
    localStorage.setItem('barberpro_auth_token', token);
    localStorage.setItem('barberpro_auth_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('barberpro_auth_token');
    localStorage.removeItem('barberpro_auth_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  initialize: () => {
    const token = localStorage.getItem('barberpro_auth_token');
    const userStr = localStorage.getItem('barberpro_auth_user');
    if (!token || !userStr) return;

    // Be defensive: if the persisted user is malformed or missing a valid role,
    // clear auth and force a fresh login instead of white-screening downstream.
    const VALID_ROLES = ['owner', 'manager', 'barber', 'receptionist'];
    try {
      const user = JSON.parse(userStr);
      if (!user?.id || !user?.email || !VALID_ROLES.includes(user.role)) {
        localStorage.removeItem('barberpro_auth_token');
        localStorage.removeItem('barberpro_auth_user');
        return;
      }
      set({ user, token, isAuthenticated: true });
    } catch {
      localStorage.removeItem('barberpro_auth_token');
      localStorage.removeItem('barberpro_auth_user');
    }
  }
}));
