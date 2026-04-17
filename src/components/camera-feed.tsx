'use client';

import { Camera } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CameraSnapshot } from '@/components/camera-snapshot';
import { useAuth } from '@/hooks/use-auth';
import { useCameraStreaming } from '@/hooks/use-camera-streaming';
import {
  getCameraPreviewMode,
  getPreferredImageStreamUrl,
  getPreferredSnapshotUrl,
  getPreferredVideoStreamUrl,
  isRtspUrl,
} from '@/features/cameras/camera-media';
import type { Camera as CameraRecord } from '@/types/camera';

type CameraFeedProps = {
  camera?: CameraRecord | null;
  className?: string;
  imageClassName?: string;
  emptyLabel?: string;
  emptyHint?: string;
  refreshMs?: number;
  preferStreaming?: boolean;
  controls?: boolean;
  compactErrors?: boolean;
  showModeBadge?: boolean;
};

export function CameraFeed({
  camera,
  className = '',
  imageClassName = 'h-full w-full object-cover',
  emptyLabel = 'Nenhum preview dispon\u00edvel',
  emptyHint = 'A c\u00e2mera precisa responder ao snapshot autenticado ou expor stream pelo backend.',
  refreshMs = 15000,
  preferStreaming = true,
  controls = true,
  compactErrors = false,
  showModeBadge = false,
}: CameraFeedProps) {
  const { token, user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { data: streamingData, error: streamingError } = useCameraStreaming(camera?.id, Boolean(camera?.id) && preferStreaming);
  const previewMode = getCameraPreviewMode(camera, streamingData);
  const videoStreamUrl = getPreferredVideoStreamUrl(camera, streamingData);
  const imageStreamUrl = getPreferredImageStreamUrl(camera, streamingData);
  const snapshotUrl = getPreferredSnapshotUrl(camera, streamingData);
  const hasOnlyRtsp = Boolean(camera?.streamUrl) && isRtspUrl(camera?.streamUrl) && !videoStreamUrl && !imageStreamUrl && !snapshotUrl;
  const mediaKey = `${camera?.id ?? 'none'}|${videoStreamUrl ?? ''}|${imageStreamUrl ?? ''}|${snapshotUrl ?? ''}`;
  const [failedVideoMediaKey, setFailedVideoMediaKey] = useState<string | null>(null);
  const [failedImageMediaKey, setFailedImageMediaKey] = useState<string | null>(null);
  const [loadedImageMediaKey, setLoadedImageMediaKey] = useState<string | null>(null);
  const videoError = failedVideoMediaKey === mediaKey;
  const imageError = failedImageMediaKey === mediaKey;
  const shouldUseVideo = previewMode === 'video-stream' && Boolean(videoStreamUrl) && !videoError;
  const shouldUseImageStream = Boolean(imageStreamUrl) && !imageError && (previewMode === 'image-stream' || videoError);
  const shouldUseSnapshot = previewMode === 'snapshot' || Boolean(snapshotUrl && (videoError || imageError));
  const cookieSecure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (token) {
      document.cookie = `camera_proxy_token=${encodeURIComponent(token)}; Path=/api/proxy; SameSite=Lax${cookieSecure}`;
    } else {
      document.cookie = `camera_proxy_token=; Path=/api/proxy; Max-Age=0; SameSite=Lax${cookieSecure}`;
    }

    if (user?.selectedUnitId) {
      document.cookie = `camera_selected_unit_id=${encodeURIComponent(user.selectedUnitId)}; Path=/api/proxy; SameSite=Lax${cookieSecure}`;
    } else {
      document.cookie = `camera_selected_unit_id=; Path=/api/proxy; Max-Age=0; SameSite=Lax${cookieSecure}`;
    }
  }, [cookieSecure, token, user?.selectedUnitId]);

  useEffect(() => {
    if (!shouldUseImageStream || !imageStreamUrl) return;

    const timeoutId = window.setTimeout(() => {
      setFailedImageMediaKey((current) => current ?? mediaKey);
    }, 6000);

    if (loadedImageMediaKey === mediaKey) {
      window.clearTimeout(timeoutId);
    }

    return () => window.clearTimeout(timeoutId);
  }, [imageStreamUrl, loadedImageMediaKey, mediaKey, shouldUseImageStream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!shouldUseVideo || !videoStreamUrl || !video) return;

    const isHls = videoStreamUrl.toLowerCase().split('?')[0].endsWith('.m3u8');
    if (!isHls) return;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoStreamUrl;
      return;
    }

    let disposed = false;
    let hlsInstance: { destroy: () => void; loadSource: (source: string) => void; attachMedia: (media: HTMLMediaElement) => void; on: (event: string, callback: () => void) => void } | null = null;

    import('hls.js')
      .then(({ default: Hls }) => {
        if (disposed || !Hls.isSupported()) {
          if (!disposed) setFailedVideoMediaKey(mediaKey);
          return;
        }

        hlsInstance = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsInstance.loadSource(videoStreamUrl);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.ERROR, () => setFailedVideoMediaKey(mediaKey));
      })
      .catch(() => setFailedVideoMediaKey(mediaKey));

    return () => {
      disposed = true;
      hlsInstance?.destroy();
    };
  }, [mediaKey, shouldUseVideo, videoStreamUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!shouldUseVideo || !video) return;

    const tryPlay = () => {
      const playResult = video.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => setFailedVideoMediaKey((current) => current ?? mediaKey));
      }
    };

    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;

    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener('loadedmetadata', tryPlay, { once: true });
    }

    return () => {
      video.removeEventListener('loadedmetadata', tryPlay);
    };
  }, [mediaKey, shouldUseVideo]);

  const currentModeLabel = shouldUseVideo
    ? 'Ao vivo'
    : shouldUseImageStream
      ? 'Preview'
      : shouldUseSnapshot
        ? 'Snapshot'
        : 'Sem imagem';

  const modeBadge = showModeBadge ? (
    <span className="absolute right-3 top-3 z-10 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-lg backdrop-blur">
      {currentModeLabel}
    </span>
  ) : null;

  if (!camera) {
    return (
      <div className={`flex items-center justify-center text-slate-600 ${className}`}>
        <div className="text-center">
          <Camera className="mx-auto mb-4 h-14 w-14 opacity-30" />
          <p className="text-sm text-slate-400">{emptyLabel}</p>
          <p className="mt-1 text-xs text-slate-500">{emptyHint}</p>
        </div>
      </div>
    );
  }

  if (shouldUseVideo && videoStreamUrl) {
    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`.trim()}>
        {modeBadge}
        <video
          ref={videoRef}
          key={`${camera.id}-${videoStreamUrl}`}
          src={videoStreamUrl.toLowerCase().split('?')[0].endsWith('.m3u8') ? undefined : videoStreamUrl}
          className={imageClassName}
          autoPlay
          muted
          playsInline
          preload="auto"
          controls={controls}
          onError={() => setFailedVideoMediaKey(mediaKey)}
        />
      </div>
    );
  }

  if (shouldUseImageStream && imageStreamUrl) {
    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`.trim()}>
        {modeBadge}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageStreamUrl}
          alt={camera.name}
          className={imageClassName}
          onLoad={() => setLoadedImageMediaKey(mediaKey)}
          onError={() => setFailedImageMediaKey(mediaKey)}
        />
      </div>
    );
  }

  if (shouldUseSnapshot && snapshotUrl) {
    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`.trim()}>
        {modeBadge}
        <CameraSnapshot
          cameraId={camera.id}
          alt={camera.name}
          fallbackSrc={snapshotUrl}
          className={imageClassName}
          refreshMs={refreshMs}
          errorLabel={compactErrors ? 'Imagem indispon\u00edvel agora.' : undefined}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center text-slate-600 ${className}`}>
      <div className="text-center">
        <Camera className="mx-auto mb-4 h-14 w-14 opacity-30" />
        <p className="text-sm text-slate-400">
          {hasOnlyRtsp ? 'C\u00e2mera cadastrada, mas sem preview no navegador' : emptyLabel}
        </p>
        <p className="mt-1 text-xs text-slate-500">{emptyHint}</p>
        {hasOnlyRtsp ? (
          <p className="mx-auto mt-3 max-w-md text-xs text-amber-200">
            {'A URL cadastrada \u00e9 RTSP. Para aparecer imagem aqui, o backend precisa converter essa c\u00e2mera para '}
            `liveUrl` ou `hlsUrl`.
          </p>
        ) : null}
        {streamingError && !compactErrors ? (
          <p className="mx-auto mt-3 max-w-md text-xs text-red-200">
            {'O contrato de streaming da c\u00e2mera n\u00e3o respondeu agora. Use o bot\u00e3o atualizar ou pe\u00e7a ao backend para validar '}
            `/cameras/{'{id}'}/streaming`, `liveUrl` e `hlsUrl`.
          </p>
        ) : null}
        {(videoError || imageError) && !compactErrors ? (
          <p className="mx-auto mt-3 max-w-md text-xs text-red-200">
            {'A fonte principal n\u00e3o carregou no navegador. O front tentou v\u00eddeo, preview e snapshot conforme dispon\u00edvel.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
