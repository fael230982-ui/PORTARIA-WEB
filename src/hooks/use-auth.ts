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
  }, [hydrated, hydrateSession]);

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
