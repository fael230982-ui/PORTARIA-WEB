'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { canAccessRole } from '@/features/auth/access-control';
import { hasAcceptedCurrentLegalVersion } from '@/features/legal/legal-documents';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/store/auth.store';

type UseProtectedRouteOptions = {
  allowedRoles?: UserRole[];
  redirectTo?: string;
};

export function useProtectedRoute(options: UseProtectedRouteOptions = {}) {
  const { allowedRoles, redirectTo = '/login' } = options;
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const hasSessionSnapshot = Boolean(auth.token && auth.user);

  const canAccess = useMemo(() => {
    if (auth.loading || !auth.hydrated) {
      if (!hasSessionSnapshot || !auth.user) return false;
      return canAccessRole(auth.user.role, allowedRoles);
    }
    if (!auth.isAuthenticated || !auth.user) return false;
    return canAccessRole(auth.user.role, allowedRoles);
  }, [allowedRoles, auth.hydrated, auth.isAuthenticated, auth.loading, auth.user, hasSessionSnapshot]);

  useEffect(() => {
    if ((auth.loading || !auth.hydrated) && !hasSessionSnapshot) return;

    if (!auth.isAuthenticated || !auth.user) {
      router.replace(redirectTo);
      return;
    }

    if (!canAccessRole(auth.user.role, allowedRoles)) {
      router.replace(redirectTo);
      return;
    }

    if (pathname !== '/acordo' && !hasAcceptedCurrentLegalVersion()) {
      router.replace('/acordo');
    }
  }, [allowedRoles, auth.hydrated, auth.isAuthenticated, auth.loading, auth.user, hasSessionSnapshot, pathname, redirectTo, router]);

  return {
    ...auth,
    canAccess,
    isChecking: (auth.loading || !auth.hydrated) && !hasSessionSnapshot,
  };
}
