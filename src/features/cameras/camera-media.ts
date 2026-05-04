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

type VmsNativeCameraSource = Pick<
  Camera,
  'vmsStreamingUrl' | 'vmsStreamingUrls' | 'preferredLiveUrl' | 'liveUrl' | 'cameraUuid' | 'selectedStreamUuid' | 'playback'
>;

type VmsNativeStreamingSource = Pick<
  CameraStreamingResponse,
  | 'vmsStreamingUrl'
  | 'vmsStreamingUrls'
  | 'preferredLiveUrl'
  | 'liveUrl'
  | 'transport'
  | 'cameraUuid'
  | 'selectedStreamUuid'
  | 'liveProxyPath'
  | 'replayProxyPath'
  | 'playback'
>;

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

function resolvePlayableVideoUrl(value?: string | null) {
  return resolveCameraMediaUrl(value);
}

function isImageStreamLikeUrl(value?: string | null) {
  const url = String(value ?? '').trim().toLowerCase().split('?')[0];
  return url.includes('/image-stream') || url.includes('/mjpeg') || url.includes('/frame') || url.endsWith('.mjpg') || url.endsWith('.mjpeg') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.webp');
}

export function getPreferredVideoStreamUrl(
  camera?: Pick<Camera, 'streamUrl' | 'preferredLiveUrl' | 'liveUrl' | 'hlsUrl' | 'webRtcUrl' | 'vmsStreamingUrl' | 'vmsStreamingUrls' | 'playback'> | null,
  streaming?: Partial<Pick<CameraStreamingResponse, 'preferredLiveUrl' | 'liveUrl' | 'hlsUrl' | 'webRtcUrl' | 'vmsStreamingUrl' | 'vmsStreamingUrls' | 'transport' | 'playback'>> | null
) {
  const playback = streaming?.playback ?? camera?.playback ?? null;
  const isNativeVms =
    String(streaming?.transport ?? '').toUpperCase() === 'VMS_NATIVE' ||
    String(playback?.mode ?? '').toUpperCase() === 'VMS_NATIVE' ||
    String(playback?.player ?? '').toUpperCase() === 'INCORESOFT_VMS_NATIVE';
  const requiresNativePlayer = isNativeVms && playback?.backendProcessesStream === false;

  if (requiresNativePlayer) {
    return null;
  }

  const candidates = [
    streaming?.preferredLiveUrl,
    camera?.preferredLiveUrl,
    streaming?.liveUrl,
    camera?.liveUrl,
    streaming?.hlsUrl,
    camera?.hlsUrl,
    streaming?.vmsStreamingUrls?.external,
    camera?.vmsStreamingUrls?.external,
    streaming?.vmsStreamingUrl,
    camera?.vmsStreamingUrl,
    camera?.streamUrl,
  ];

  for (const candidate of candidates) {
    const resolved = resolvePlayableVideoUrl(candidate);
    if (isBrowserPlayableVideoUrl(resolved) && !isImageStreamLikeUrl(resolved)) return resolved;
  }

  return null;
}

export function getPreferredWebRtcUrl(
  camera?: Pick<Camera, 'webRtcUrl'> | null,
  streaming?: Pick<CameraStreamingResponse, 'webRtcUrl'> | null
) {
  return resolveCameraMediaUrl(streaming?.webRtcUrl || camera?.webRtcUrl || null);
}

export function getPreferredImageStreamUrl(
  camera?: Pick<Camera, 'imageStreamUrl'> | null,
  streaming?: Partial<Pick<CameraStreamingResponse, 'imageStreamUrl' | 'mjpegUrl' | 'frameUrl' | 'preferredLiveUrl' | 'liveUrl' | 'transport'>> | null
) {
  const liveCandidate =
    String(streaming?.transport ?? '').toUpperCase() === 'MJPEG' || isImageStreamLikeUrl(streaming?.preferredLiveUrl) || isImageStreamLikeUrl(streaming?.liveUrl)
      ? streaming?.preferredLiveUrl || streaming?.liveUrl
      : null;

  return resolveCameraMediaUrl(streaming?.frameUrl || streaming?.imageStreamUrl || streaming?.mjpegUrl || liveCandidate || camera?.imageStreamUrl || null);
}

export function getPreferredSnapshotUrl(
  camera?: Pick<Camera, 'snapshotUrl' | 'thumbnailUrl'> | null,
  streaming?: Pick<CameraStreamingResponse, 'snapshotUrl' | 'thumbnailUrl' | 'previewUrl'> | null
) {
  return resolveCameraMediaUrl(
    streaming?.snapshotUrl || camera?.snapshotUrl || streaming?.previewUrl || streaming?.thumbnailUrl || camera?.thumbnailUrl || null
  );
}

export function getPreferredStillImageUrl(
  camera?: Pick<Camera, 'snapshotUrl' | 'thumbnailUrl' | 'imageStreamUrl'> | null,
  streaming?: Pick<CameraStreamingResponse, 'snapshotUrl' | 'thumbnailUrl' | 'previewUrl' | 'imageStreamUrl' | 'mjpegUrl' | 'frameUrl'> | null
) {
  return getPreferredSnapshotUrl(camera, streaming) || getPreferredImageStreamUrl(camera, streaming);
}

export function getCameraMediaAvailabilityLabels(
  camera?: Pick<
    Camera,
    | 'streamUrl'
    | 'preferredLiveUrl'
    | 'liveUrl'
    | 'hlsUrl'
    | 'webRtcUrl'
    | 'snapshotUrl'
    | 'thumbnailUrl'
    | 'imageStreamUrl'
    | 'vmsStreamingUrl'
    | 'vmsStreamingUrls'
    | 'cameraUuid'
    | 'selectedStreamUuid'
    | 'playback'
    | 'lastSeen'
  > | null,
  streaming?: Pick<
    CameraStreamingResponse,
    | 'preferredLiveUrl'
    | 'liveUrl'
    | 'hlsUrl'
    | 'webRtcUrl'
    | 'snapshotUrl'
    | 'thumbnailUrl'
    | 'previewUrl'
    | 'imageStreamUrl'
    | 'mjpegUrl'
    | 'frameUrl'
    | 'vmsStreamingUrl'
    | 'vmsStreamingUrls'
    | 'cameraUuid'
    | 'selectedStreamUuid'
    | 'transport'
    | 'playback'
  > | null
) {
  const labels: string[] = [];
  const videoStreamUrl = getPreferredVideoStreamUrl(camera, streaming);
  if (isBrowserPlayableVideoUrl(videoStreamUrl)) labels.push('ao vivo');
  if (getVmsNativePlayerPayload(camera, streaming)) labels.push('vms nativo');
  if (getPreferredWebRtcUrl(camera, streaming)) labels.push('webrtc');
  if (getPreferredImageStreamUrl(camera, streaming)) labels.push('preview');
  if (getPreferredSnapshotUrl(camera, streaming)) labels.push('snapshot');
  if (camera?.streamUrl) labels.push('stream');
  if (camera?.lastSeen) labels.push('último contato registrado');
  return labels;
}

export function isRtspUrl(value?: string | null) {
  return String(value ?? '').trim().toLowerCase().startsWith('rtsp://');
}

export function isVmsNativeStreamUrl(value?: string | null) {
  return String(value ?? '').trim().toLowerCase().startsWith('wss://');
}

export function getVmsNativeStreamUrl(
  camera?: Pick<Camera, 'vmsStreamingUrl' | 'vmsStreamingUrls' | 'preferredLiveUrl' | 'liveUrl' | 'playback'> | null,
  streaming?: Pick<CameraStreamingResponse, 'vmsStreamingUrl' | 'vmsStreamingUrls' | 'preferredLiveUrl' | 'liveUrl' | 'transport' | 'playback'> | null
) {
  const candidate =
    streaming?.playback?.nativePlayerPayload?.url ||
    camera?.playback?.nativePlayerPayload?.url ||
    streaming?.vmsStreamingUrls?.external ||
    camera?.vmsStreamingUrls?.external ||
    streaming?.vmsStreamingUrl ||
    streaming?.preferredLiveUrl ||
    streaming?.liveUrl ||
    camera?.vmsStreamingUrl ||
    camera?.preferredLiveUrl ||
    camera?.liveUrl ||
    null;

  return isVmsNativeStreamUrl(candidate) ? candidate : null;
}

export function getVmsNativePlayerPayload(camera?: VmsNativeCameraSource | null, streaming?: VmsNativeStreamingSource | null) {
  const playback = streaming?.playback ?? camera?.playback ?? null;
  const nativePayload = playback?.nativePlayerPayload ?? null;
  const url = getVmsNativeStreamUrl(camera, streaming);
  const cameraUuid = nativePayload?.cameraUuid || streaming?.cameraUuid || camera?.cameraUuid || null;
  const streamUuid = nativePayload?.streamUuid || streaming?.selectedStreamUuid || camera?.selectedStreamUuid || null;
  const liveProxyPath = streaming?.liveProxyPath || playback?.nativeWebSocketProtocol?.liveProxyPath || null;
  const replayProxyPath = streaming?.replayProxyPath || playback?.nativeWebSocketProtocol?.replayProxyPath || null;

  if (!url && !cameraUuid && !streamUuid && !liveProxyPath && !replayProxyPath) return null;

  return {
    url,
    cameraUuid,
    streamUuid,
    liveProxyPath,
    replayProxyPath,
    player: playback?.player ?? null,
    mode: playback?.mode ?? streaming?.transport ?? null,
    nativeWebSocketProtocol: playback?.nativeWebSocketProtocol ?? null,
    backendProcessesStream: playback?.backendProcessesStream ?? null,
  };
}

export function isVmsNativeStreaming(
  camera?: Pick<Camera, 'vmsStreamingUrl' | 'vmsStreamingUrls' | 'preferredLiveUrl' | 'liveUrl' | 'playback'> | null,
  streaming?: Pick<CameraStreamingResponse, 'vmsStreamingUrl' | 'vmsStreamingUrls' | 'preferredLiveUrl' | 'liveUrl' | 'transport' | 'playback'> | null
) {
  const playbackMode = String(streaming?.playback?.mode ?? camera?.playback?.mode ?? '').toUpperCase();
  const playbackPlayer = String(streaming?.playback?.player ?? camera?.playback?.player ?? '').toUpperCase();
  return (
    String(streaming?.transport ?? '').toUpperCase() === 'VMS_NATIVE' ||
    playbackMode === 'VMS_NATIVE' ||
    playbackPlayer === 'INCORESOFT_VMS_NATIVE' ||
    Boolean(getVmsNativeStreamUrl(camera, streaming))
  );
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
    'streamUrl' | 'preferredLiveUrl' | 'liveUrl' | 'hlsUrl' | 'webRtcUrl' | 'snapshotUrl' | 'thumbnailUrl' | 'imageStreamUrl'
  > | null,
  streaming?: Pick<
    CameraStreamingResponse,
    'preferredLiveUrl' | 'liveUrl' | 'hlsUrl' | 'webRtcUrl' | 'snapshotUrl' | 'thumbnailUrl' | 'previewUrl' | 'imageStreamUrl' | 'mjpegUrl' | 'frameUrl'
  > | null
) {
  const videoStreamUrl = getPreferredVideoStreamUrl(camera, streaming);
  if (isBrowserPlayableVideoUrl(videoStreamUrl)) return 'video-stream';

  const webRtcUrl = getPreferredWebRtcUrl(camera, streaming);
  if (webRtcUrl) return 'none';

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
    | 'preferredLiveUrl'
    | 'liveUrl'
    | 'hlsUrl'
    | 'webRtcUrl'
    | 'snapshotUrl'
    | 'thumbnailUrl'
    | 'imageStreamUrl'
    | 'vmsStreamingUrl'
    | 'vmsStreamingUrls'
    | 'cameraUuid'
    | 'selectedStreamUuid'
    | 'playback'
    | 'status'
    | 'lastSeen'
  > | null,
  streaming?: Pick<
    CameraStreamingResponse,
    | 'preferredLiveUrl'
    | 'liveUrl'
    | 'hlsUrl'
    | 'webRtcUrl'
    | 'snapshotUrl'
    | 'thumbnailUrl'
    | 'previewUrl'
    | 'imageStreamUrl'
    | 'mjpegUrl'
    | 'frameUrl'
    | 'vmsStreamingUrl'
    | 'vmsStreamingUrls'
    | 'cameraUuid'
    | 'selectedStreamUuid'
    | 'mediaRoute'
    | 'transport'
    | 'provider'
    | 'playback'
  > | null
): CameraDiagnostics {
  const videoStreamUrl = getPreferredVideoStreamUrl(camera, streaming);
  const webRtcUrl = getPreferredWebRtcUrl(camera, streaming);
  const imageStreamUrl = getPreferredImageStreamUrl(camera, streaming);
  const snapshotUrl = getPreferredSnapshotUrl(camera, streaming);
  const rawRtspUrl = camera?.streamUrl;
  const previewMode = getCameraPreviewMode(camera, streaming);
  const hasRtsp = isRtspUrl(rawRtspUrl);
  const hasBrowserVideo = isBrowserPlayableVideoUrl(videoStreamUrl) && !hasRtsp;
  const hasVmsNative = isVmsNativeStreaming(camera, streaming);
  const nativePayload = getVmsNativePlayerPayload(camera, streaming);
  const previewReady = previewMode !== 'none';

  const items: CameraDiagnosticItem[] = [
    {
      label: 'Vídeo ao vivo',
      ok: hasBrowserVideo,
      detail: hasBrowserVideo ? 'Disponível para o navegador.' : 'HLS/WebRTC reproduzível não informado.',
    },
    {
      label: 'Rota VMS externa',
      ok: Boolean(nativePayload?.url || streaming?.vmsStreamingUrls?.external || camera?.vmsStreamingUrls?.external),
      detail: nativePayload?.url || streaming?.vmsStreamingUrls?.external || camera?.vmsStreamingUrls?.external ? 'Endereço externo recebido da API.' : 'Endereço externo não informado.',
    },
    {
      label: 'VMS nativo',
      ok: hasVmsNative,
      detail:
        nativePayload?.liveProxyPath || nativePayload?.replayProxyPath
          ? 'Proxy WebSocket nativo recebido para live/replay; falta acoplar decoder H264/ISPlayer.'
          : nativePayload?.cameraUuid && nativePayload?.streamUuid
          ? 'Payload nativo recebido com cameraUuid e streamUuid.'
          : hasVmsNative
            ? 'Recebido como WebSocket nativo do VMS; precisa de bind/live do player Incoresoft.'
            : 'Não informado.',
    },
    {
      label: 'MJPEG/frame',
      ok: Boolean(imageStreamUrl),
      detail: imageStreamUrl ? 'Disponível como preview em frames.' : 'Não informado.',
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

  items.splice(1, 0, {
    label: 'WebRTC',
    ok: Boolean(webRtcUrl),
    detail: webRtcUrl ? 'Disponível, mas fora do player principal.' : 'Não informado.',
  });

  if (previewReady) {
    return {
      previewReady,
      previewMode,
      severity: 'ok',
      summary:
        previewMode === 'video-stream'
          ? 'Vídeo ao vivo disponível.'
          : previewMode === 'image-stream'
            ? hasVmsNative
              ? 'VMS nativo recebido. Exibindo fallback em frames.'
              : 'Preview em frames disponível.'
            : 'Imagem atual disponível para consulta.',
      recommendation:
        previewMode === 'image-stream' && hasVmsNative
          ? nativePayload?.cameraUuid && nativePayload?.streamUuid
            ? 'A API já envia o payload nativo. Falta integrar o protocolo/player Incoresoft para transformar o WebSocket em vídeo renderizável.'
            : 'A API envia rota VMS nativa, mas ainda falta payload completo ou integração do player Incoresoft para vídeo contínuo.'
          : 'A câmera já possui uma fonte de imagem utilizável.',
      backendMessage:
        'Para vídeo contínuo com VMS_NATIVE, o front precisa do protocolo/player Incoresoft. imageStreamUrl e mjpegUrl são apenas fallback por frames.',
      items,
    };
  }

  if (webRtcUrl) {
    return {
      previewReady,
      previewMode,
      severity: 'warning',
      summary: 'Câmera com conexão WebRTC, mas sem fonte principal compatível com o navegador.',
      recommendation: 'Adicione também uma fonte de vídeo compatível para a visualização principal.',
      backendMessage:
        'A câmera informou apenas WebRTC. Para reprodução principal nesta tela, mantenha também uma fonte compatível com o navegador.',
      items,
    };
  }

  if (hasVmsNative) {
    return {
      previewReady,
      previewMode,
      severity: 'warning',
      summary: 'VMS nativo recebido, mas sem vídeo compatível com o navegador.',
      recommendation: 'Usar HLS/WebRTC ou integrar o player/protocolo nativo do VMS.',
      backendMessage:
        'A API retornou WebSocket nativo do VMS. Sem HLS, WebRTC ou SDK compatível, o front só consegue exibir preview em frames.',
      items,
    };
  }

  if (hasRtsp) {
    return {
      previewReady,
      previewMode,
      severity: 'warning',
      summary: 'Câmera cadastrada com RTSP, mas sem vídeo no navegador.',
      recommendation: 'Prepare uma fonte de vídeo compatível com o navegador para exibir a câmera ao vivo.',
      backendMessage:
        'A câmera possui RTSP, mas esta tela precisa de uma fonte compatível com o navegador para reproduzir vídeo ao vivo.',
      items,
    };
  }

  return {
    previewReady,
    previewMode,
    severity: 'error',
    summary: 'Câmera sem fonte de imagem disponível.',
    recommendation: 'Configure uma fonte de vídeo ou imagem compatível com o navegador.',
    backendMessage:
      'A câmera ainda não possui uma fonte compatível para vídeo ou imagem nesta tela.',
    items,
  };
}
