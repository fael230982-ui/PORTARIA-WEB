import type { Camera, CameraStreamingResponse } from '@/types/camera';

export type CameraDiagnosticItem = {
  label: string;
  ok: boolean;
  detail: string;
};

export type CameraDiagnostics = {
  previewReady: boolean;
  previewMode: 'video-stream' | 'image-stream' | 'snapshot' | 'none';
  severity: 'ok' | 'warning' | 'error';
  summary: string;
  recommendation: string;
  backendMessage: string;
  items: CameraDiagnosticItem[];
};

export function resolveCameraMediaUrl(value?: string | null) {
  const url = String(value ?? '').trim();
  if (!url) return null;

  if (url.startsWith('/api/proxy/')) return url;
  if (url.startsWith('/api/v1/')) return `/api/proxy/${url.slice('/api/v1/'.length)}`;
  if (url.startsWith('api/v1/')) return `/api/proxy/${url.slice('api/v1/'.length)}`;
  if (url.startsWith('/cameras/')) return `/api/proxy${url}`;
  if (url.startsWith('/media-hls/') || url.startsWith('/media/') || url.startsWith('/uploads/') || url.startsWith('/files/') || url.startsWith('/storage/')) {
    return `/api/proxy${url}`;
  }

  try {
    const parsed = new URL(url);
    const pathWithQuery = `${parsed.pathname}${parsed.search}`;

    if (parsed.pathname.startsWith('/api/v1/')) {
      return `/api/proxy/${pathWithQuery.slice('/api/v1/'.length)}`;
    }

    if (parsed.pathname.startsWith('/cameras/')) {
      return `/api/proxy${pathWithQuery}`;
    }

    if (
      parsed.pathname.startsWith('/media-hls/') ||
      parsed.pathname.startsWith('/media/') ||
      parsed.pathname.startsWith('/uploads/') ||
      parsed.pathname.startsWith('/files/') ||
      parsed.pathname.startsWith('/storage/')
    ) {
      return `/api/proxy${pathWithQuery}`;
    }
  } catch {
    // Keep original URL when it is not an absolute URL or cannot be parsed.
  }

  return url;
}

function isUnavailableLocalHlsUrl(value?: string | null) {
  const url = String(value ?? '').trim().toLowerCase();
  return url.includes('/media-hls/') && url.endsWith('/index.m3u8');
}

function resolvePlayableVideoUrl(value?: string | null) {
  if (isUnavailableLocalHlsUrl(value)) return null;
  return resolveCameraMediaUrl(value);
}

export function getPreferredVideoStreamUrl(
  camera?: Pick<Camera, 'streamUrl' | 'liveUrl' | 'hlsUrl' | 'webRtcUrl'> | null,
  streaming?: Pick<CameraStreamingResponse, 'liveUrl' | 'hlsUrl' | 'webRtcUrl'> | null
) {
  return (
    resolvePlayableVideoUrl(streaming?.liveUrl) ||
    resolvePlayableVideoUrl(camera?.liveUrl) ||
    resolvePlayableVideoUrl(streaming?.hlsUrl) ||
    resolvePlayableVideoUrl(camera?.hlsUrl) ||
    resolvePlayableVideoUrl(streaming?.webRtcUrl) ||
    resolvePlayableVideoUrl(camera?.webRtcUrl) ||
    resolvePlayableVideoUrl(camera?.streamUrl) ||
    null
  );
}

export function getPreferredImageStreamUrl(
  camera?: Pick<Camera, 'imageStreamUrl'> | null,
  streaming?: Pick<CameraStreamingResponse, 'imageStreamUrl' | 'mjpegUrl' | 'frameUrl'> | null
) {
  return resolveCameraMediaUrl(streaming?.imageStreamUrl || streaming?.mjpegUrl || streaming?.frameUrl || camera?.imageStreamUrl || null);
}

export function getPreferredSnapshotUrl(
  camera?: Pick<Camera, 'snapshotUrl' | 'thumbnailUrl'> | null,
  streaming?: Pick<CameraStreamingResponse, 'snapshotUrl' | 'thumbnailUrl' | 'previewUrl'> | null
) {
  return resolveCameraMediaUrl(
    streaming?.snapshotUrl || camera?.snapshotUrl || streaming?.previewUrl || streaming?.thumbnailUrl || camera?.thumbnailUrl || null
  );
}

export function getCameraMediaAvailabilityLabels(
  camera?: Pick<
    Camera,
    'streamUrl' | 'liveUrl' | 'hlsUrl' | 'webRtcUrl' | 'snapshotUrl' | 'thumbnailUrl' | 'imageStreamUrl' | 'lastSeen'
  > | null,
  streaming?: Pick<
    CameraStreamingResponse,
    'liveUrl' | 'hlsUrl' | 'webRtcUrl' | 'snapshotUrl' | 'thumbnailUrl' | 'previewUrl' | 'imageStreamUrl' | 'mjpegUrl' | 'frameUrl'
  > | null
) {
  const labels: string[] = [];
  if (getPreferredVideoStreamUrl(camera, streaming)) labels.push('ao vivo');
  if (getPreferredImageStreamUrl(camera, streaming)) labels.push('preview');
  if (getPreferredSnapshotUrl(camera, streaming)) labels.push('snapshot');
  if (camera?.streamUrl) labels.push('stream');
  if (camera?.lastSeen) labels.push('ultimo contato registrado');
  return labels;
}

export function isRtspUrl(value?: string | null) {
  return String(value ?? '').trim().toLowerCase().startsWith('rtsp://');
}

export function isBrowserPlayableVideoUrl(value?: string | null) {
  const url = String(value ?? '').trim().toLowerCase();

  if (!url) return false;
  if (url.startsWith('rtsp://') || url.startsWith('rtmp://')) return false;

  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('/') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  );
}

export function getCameraPreviewMode(
  camera?: Pick<
    Camera,
    'streamUrl' | 'liveUrl' | 'hlsUrl' | 'webRtcUrl' | 'snapshotUrl' | 'thumbnailUrl' | 'imageStreamUrl'
  > | null,
  streaming?: Pick<
    CameraStreamingResponse,
    'liveUrl' | 'hlsUrl' | 'webRtcUrl' | 'snapshotUrl' | 'thumbnailUrl' | 'previewUrl' | 'imageStreamUrl' | 'mjpegUrl' | 'frameUrl'
  > | null
) {
  const videoStreamUrl = getPreferredVideoStreamUrl(camera, streaming);
  if (isBrowserPlayableVideoUrl(videoStreamUrl)) return 'video-stream';

  const imageStreamUrl = getPreferredImageStreamUrl(camera, streaming);
  if (imageStreamUrl) return 'image-stream';

  const snapshotUrl = getPreferredSnapshotUrl(camera, streaming);
  if (snapshotUrl) return 'snapshot';

  return 'none';
}

export function getCameraDiagnostics(
  camera?: Pick<
    Camera,
    | 'id'
    | 'name'
    | 'streamUrl'
    | 'liveUrl'
    | 'hlsUrl'
    | 'webRtcUrl'
    | 'snapshotUrl'
    | 'thumbnailUrl'
    | 'imageStreamUrl'
    | 'vmsStreamingUrl'
    | 'status'
    | 'lastSeen'
  > | null,
  streaming?: Pick<
    CameraStreamingResponse,
    'liveUrl' | 'hlsUrl' | 'webRtcUrl' | 'snapshotUrl' | 'thumbnailUrl' | 'previewUrl' | 'imageStreamUrl' | 'mjpegUrl' | 'frameUrl' | 'transport' | 'provider'
  > | null
): CameraDiagnostics {
  const videoStreamUrl = getPreferredVideoStreamUrl(camera, streaming);
  const imageStreamUrl = getPreferredImageStreamUrl(camera, streaming);
  const snapshotUrl = getPreferredSnapshotUrl(camera, streaming);
  const rawRtspUrl = camera?.streamUrl;
  const previewMode = getCameraPreviewMode(camera, streaming);
  const hasRtsp = isRtspUrl(rawRtspUrl);
  const hasBrowserVideo = isBrowserPlayableVideoUrl(videoStreamUrl) && !hasRtsp;
  const previewReady = previewMode !== 'none';

  const items: CameraDiagnosticItem[] = [
    {
      label: 'HLS/live',
      ok: hasBrowserVideo,
      detail: hasBrowserVideo ? 'Disponível para vídeo ao vivo.' : 'Não informado.',
    },
    {
      label: 'MJPEG/frame',
      ok: Boolean(imageStreamUrl),
      detail: imageStreamUrl ? 'Disponível para visualização alternativa.' : 'Não informado.',
    },
    {
      label: 'Snapshot',
      ok: Boolean(snapshotUrl),
      detail: snapshotUrl ? 'Disponível para imagem atualizada.' : 'Não informado.',
    },
    {
      label: 'RTSP',
      ok: hasRtsp,
      detail: hasRtsp ? 'Cadastrado, mas precisa de conversão para o navegador.' : 'Não cadastrado.',
    },
  ];

  if (previewReady) {
    return {
      previewReady,
      previewMode,
      severity: 'ok',
      summary:
        previewMode === 'video-stream'
          ? 'Video ao vivo disponivel.'
          : previewMode === 'image-stream'
            ? 'Preview por MJPEG/frame disponivel.'
            : 'Snapshot disponivel para visualizacao.',
      recommendation: 'A camera ja possui uma fonte utilizavel pelo front.',
      backendMessage:
        'Para video real, manter liveUrl ou hlsUrl estavel no contrato da camera. imageStreamUrl deve ficar como fallback/preview.',
      items,
    };
  }

  if (hasRtsp) {
    return {
      previewReady,
      previewMode,
      severity: 'warning',
      summary: 'Camera cadastrada com RTSP, mas sem video no navegador.',
      recommendation: 'Solicite ao backend/VMS converter o RTSP para liveUrl ou hlsUrl.',
      backendMessage:
        'A camera possui streamUrl RTSP, mas o front precisa receber liveUrl ou hlsUrl em GET /api/v1/cameras/{id}/streaming para video real. imageStreamUrl deve ser apenas fallback/preview.',
      items,
    };
  }

  return {
    previewReady,
    previewMode,
    severity: 'error',
    summary: 'Camera sem fonte de imagem utilizavel.',
    recommendation: 'Solicite ao backend retornar liveUrl/hlsUrl e manter snapshotUrl/imageStreamUrl como fallback.',
    backendMessage:
      'A camera nao possui liveUrl, hlsUrl, snapshotUrl, imageStreamUrl nem streamUrl compativel. Validar contrato de GET /api/v1/cameras/{id}/streaming.',
    items,
  };
}
