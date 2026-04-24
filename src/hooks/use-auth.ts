'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';

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
    hydrateSession,
    setLoading,
  } = useAuthStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!hydrated) {
      hydrateSession();
    }

    const fallbackTimer = window.setTimeout(() => {
      const state = useAuthStore.getState();
      if (!state.hydrated || state.loading) {
        state.hydrateSession();
      }
    }, 1200);

    return () => window.clearTimeout(fallbackTimer);
  }, [hydrated, hydrateSession, loading]);

  return {
    token,
    user,
    isAuthenticated,
    loading,
    hydrated,
    setSession,
    setUser,
    clearSession,
    hydrateSession,
    setLoading,
  };
};
