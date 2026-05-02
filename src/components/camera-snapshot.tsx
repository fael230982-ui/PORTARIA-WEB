'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { resolveCameraMediaUrl } from '@/features/cameras/camera-media';

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
  loadingLabel = 'Carregando imagem...',
  errorLabel = 'Não foi possível carregar a imagem da câmera.',
}: CameraSnapshotProps) {
  const { token } = useAuth();
  const normalizedFallbackSrc = resolveCameraMediaUrl(fallbackSrc);
  const [src, setSrc] = useState<string | null>(normalizedFallbackSrc);
  const [loading, setLoading] = useState(Boolean(cameraId));
  const [error, setError] = useState<string | null>(null);
  const currentSrcRef = useRef<string | null>(normalizedFallbackSrc);

  useEffect(() => {
    setSrc(normalizedFallbackSrc);
    setLoading(Boolean(cameraId));
    setError(null);
  }, [cameraId, normalizedFallbackSrc]);

  useEffect(() => {
    currentSrcRef.current = src;
  }, [src]);

  useEffect(() => {
    if (!cameraId || !token) {
      setSrc(normalizedFallbackSrc);
      setLoading(false);
      return;
    }

    let active = true;
    let timerId: number | null = null;

    const blobToDataUrl = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Snapshot inválido.'));
          }
        };
        reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler snapshot.'));
        reader.readAsDataURL(blob);
      });

    const loadSnapshot = async () => {
      try {
        setLoading((currentLoading) => currentLoading || !currentSrcRef.current);
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
        if (!blob.type.startsWith('image/')) {
          throw new Error(`Tipo de mídia inválido: ${blob.type || 'desconhecido'}`);
        }

        const nextSrc = await blobToDataUrl(blob);

        if (!active) {
          return;
        }

        setSrc(nextSrc);
      } catch {
        if (!active) return;

        setError(currentSrcRef.current || normalizedFallbackSrc ? null : errorLabel);
        setSrc((currentSrc) => currentSrc || normalizedFallbackSrc);
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
    };
  }, [cameraId, errorLabel, normalizedFallbackSrc, refreshMs, token]);

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
