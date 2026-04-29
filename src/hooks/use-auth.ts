'use client';

import { useEffect } from 'react';
import { useAuthStore, type AuthUser } from '@/store/auth.store';

type PersistedAuthStorage = {
  state?: {
    token?: string | null;
    user?: AuthUser | null;
  };
};

function readPersistedSession() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem('auth-storage');
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedAuthStorage;
    const token = parsed?.state?.token ?? null;
    const user = parsed?.state?.user ?? null;

    if (!token || !user) return null;

    return { token, user };
  } catch {
    return null;
  }
}

export const useAuth = () => {
  const {
    token,
    user,
    isAuthenticated,
    loading,
    hydrated,
    setSession,
    setUser,
    clearSession,
    setLoading,
  } = useAuthStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncPersistedSession = () => {
      const state = useAuthStore.getState();
      if (!state.hydrated || state.loading) {
        const persistedSession = readPersistedSession();

        if (persistedSession) {
          state.setSession(persistedSession.token, persistedSession.user);
          return true;
        }

        state.clearSession();
        return true;
      }
      return false;
    };

    syncPersistedSession();

    const fallbackTimer = window.setTimeout(() => {
      syncPersistedSession();
    }, 1200);

    return () => window.clearTimeout(fallbackTimer);
  }, [clearSession, hydrated, loading, setSession]);

  return {
    token,
    user,
    isAuthenticated,
    loading,
    hydrated,
    setSession,
    setUser,
    clearSession,
    setLoading,
  };
};
