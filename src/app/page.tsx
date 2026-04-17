'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { resolveAuthenticatedRoute } from '@/features/auth/access-control';
import { useAuth } from '@/hooks/use-auth';

export default function Page() {
  const router = useRouter();
  const {
    token,
    user,
    isAuthenticated,
    loading,
    hydrated,
  } = useAuth();

  const targetRoute = useMemo(() => {
    return resolveAuthenticatedRoute({
      token,
      user,
      isAuthenticated,
      loading,
      hydrated,
    });
  }, [hydrated, loading, token, user, isAuthenticated]);

  useEffect(() => {
    if (!targetRoute) return;
    router.replace(targetRoute);
  }, [targetRoute, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
      Carregando...
    </div>
  );
}
