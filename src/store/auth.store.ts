'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserScopeType } from '@/types/user';

export type UserRole = 'MASTER' | 'PARCEIRO' | 'ADMIN' | 'OPERADOR' | 'CENTRAL' | 'MORADOR';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  personName?: string | null;
  role: UserRole;
  permissions: string[];
  scopeType?: UserScopeType | null;
  condominiumId?: string | null;
  condominiumIds?: string[];
  unitId?: string | null;
  unitName?: string | null;
  unitIds?: string[];
  unitNames?: string[];
  selectedUnitId?: string | null;
  selectedUnitName?: string | null;
  requiresUnitSelection?: boolean;
  streetIds?: string[];
  profileSource?: 'CANONICAL_RESIDENT_PROFILE' | string | null;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  hydrated: boolean;

  setSession: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
  hydrateSession: () => void;
  setLoading: (value: boolean) => void;
};

const isBrowser = typeof window !== 'undefined';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      loading: true,
      hydrated: false,

      setSession: (token, user) =>
        set({
          token,
          user,
          isAuthenticated: !!token && !!user,
          loading: false,
          hydrated: true,
        }),

      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: !!state.token && !!user,
          loading: false,
          hydrated: true,
        })),

      clearSession: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          loading: false,
          hydrated: true,
        }),

      hydrateSession: () => {
        const state = get();
        set({
          hydrated: true,
          loading: false,
          isAuthenticated: !!state.token && !!state.user,
        });
      },

      setLoading: (value) =>
        set({
          loading: value,
        }),
    }),
    {
      name: 'auth-storage',
      version: 1,
      storage: createJSONStorage(() => (isBrowser ? localStorage : (undefined as never))),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        const valid = !!state.token && !!state.user;

        state.hydrated = true;
        state.loading = false;
        state.isAuthenticated = valid;

        if (!valid) {
          state.token = null;
          state.user = null;
          state.isAuthenticated = false;
        }
      },
    }
  )
);
