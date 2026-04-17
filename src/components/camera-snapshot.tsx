'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

type CameraSnapshotProps = {
  cameraId: string;
  alt: string;
  className?: string;
  refreshMs?: number;
  fallbackSrc?: string | null;
  fallback?: ReactNode;
  loadingLabel?: string;
  errorLabel?: string;
};

export function CameraSnapshot({
  cameraId,
  alt,
  className,
  refreshMs = 15000,
  fallbackSrc = null,
  fallback = null,
  loadingLabel = 'Carregando snapshot...',
  errorLabel = 'Não foi possível carregar o snapshot da câmera.',
}: CameraSnapshotProps) {
  const { token } = useAuth();
  const [src, setSrc] = useState<string | null>(fallbackSrc);
  const [loading, setLoading] = useState(Boolean(cameraId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cameraId || !token) {
      setSrc(fallbackSrc);
      setLoading(false);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    let timerId: number | null = null;

    const loadSnapshot = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/proxy/cameras/${cameraId}/snapshot`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const nextObjectUrl = URL.createObjectURL(blob);

        if (!active) {
          URL.revokeObjectURL(nextObjectUrl);
          return;
        }

        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }

        objectUrl = nextObjectUrl;
        setSrc(nextObjectUrl);
      } catch {
        if (!active) return;

        setError(fallbackSrc ? null : errorLabel);
        setSrc(fallbackSrc);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSnapshot();

    if (refreshMs > 0) {
      timerId = window.setInterval(() => {
        void loadSnapshot();
      }, refreshMs);
    }

    return () => {
      active = false;

      if (timerId) {
        window.clearInterval(timerId);
      }

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [cameraId, errorLabel, fallbackSrc, refreshMs, token]);

  if (loading && !src) {
    return <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">{loadingLabel}</div>;
  }

  if (error && !src) {
    if (fallback) return <>{fallback}</>;
    return <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-slate-300">{error}</div>;
  }

  if (!src) {
    if (fallback) return <>{fallback}</>;
    return null;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}
