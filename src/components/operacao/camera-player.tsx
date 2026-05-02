'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Cctv,
  Download,
  History,
  LoaderCircle,
  Maximize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { CameraFeed } from '@/components/camera-feed';
import { CameraStatusIndicator } from '@/components/operacao/camera-status-indicator';
import { brandClasses } from '@/config/brand-classes';
import {
  getPreferredImageStreamUrl,
  getPreferredSnapshotUrl,
  getPreferredVideoStreamUrl,
  getPreferredWebRtcUrl,
} from '@/features/cameras/camera-media';
import { useAuth } from '@/hooks/use-auth';
import { useCameraStreaming } from '@/hooks/use-camera-streaming';
import { camerasService } from '@/services/cameras.service';
import type { Camera as CameraRecord, CameraReplayResponse, CameraStatus } from '@/types/camera';

export type CameraPlayerData = CameraRecord & {
  unitLabel?: string;
  alerts?: number;
};

type CameraPlayerProps = {
  cameraId: string;
  cameraData?: CameraPlayerData;
  onAction?: (action: string, cameraId: string) => void;
  className?: string;
  heightClassName?: string;
  emptyHint?: string;
  compactOverlay?: boolean;
  onStatusChange?: (status: CameraStatus) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
};

function getReplayStatusLabel(status?: string | null) {
  const normalized = String(status ?? '').toUpperCase();
  if (normalized === 'READY') return 'Pronto';
  if (normalized === 'FAILED') return 'Falhou';
  if (normalized === 'PROCESSING') return 'Processando';
  if (normalized === 'EXPIRED') return 'Expirado';
  return 'Pendente';
}

export function CameraPlayer({
  cameraId,
  cameraData,
  onAction,
  className = '',
  heightClassName = 'h-96',
  emptyHint,
  compactOverlay = false,
  onStatusChange,
  isFullScreen = false,
  onToggleFullScreen,
}: CameraPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState('');
  const [motionDetection, setMotionDetection] = useState(true);
  const [nightVision, setNightVision] = useState(false);
  const [replay, setReplay] = useState<CameraReplayResponse | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayError, setReplayError] = useState<string | null>(null);
  const { token, hydrated, loading } = useAuth();

  const streamingReady = Boolean(cameraData?.id) && Boolean(token) && hydrated && !loading;
  const { data: streamingData } = useCameraStreaming(cameraData?.id, streamingReady);
  const preferredVideoStreamUrl = getPreferredVideoStreamUrl(cameraData, streamingData);
  const preferredWebRtcUrl = getPreferredWebRtcUrl(cameraData, streamingData);
  const preferredImageStreamUrl = getPreferredImageStreamUrl(cameraData, streamingData);
  const preferredSnapshotUrl = getPreferredSnapshotUrl(cameraData, streamingData);
  const hasVideoStream = Boolean(cameraData?.streamUrl);
  const replayReady = Boolean(replay?.replayUrl) && String(replay?.status ?? '').toUpperCase() === 'READY';
  const effectiveStatus: CameraStatus = preferredVideoStreamUrl || preferredImageStreamUrl || preferredSnapshotUrl ? 'ONLINE' : cameraData?.status ?? 'OFFLINE';
  const compactVisualMode = compactOverlay;

  useEffect(() => {
    onStatusChange?.(effectiveStatus);
  }, [effectiveStatus, onStatusChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;
    video.volume = isMuted ? 0 : volume / 100;
  }, [isMuted, volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasVideoStream || !cameraData?.streamUrl) return;

    video.src = cameraData.streamUrl;
    const playPromise = video.play();
    if (playPromise) {
      playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [cameraData?.id, cameraData?.streamUrl, hasVideoStream]);

  useEffect(() => {
    setReplay(null);
    setReplayError(null);
    setReplayLoading(false);
  }, [cameraData?.id]);

  const handleAction = (action: string) => {
    setSelectedAction(action);
    setShowAlertDialog(true);
  };

  const confirmAction = () => {
    onAction?.(selectedAction, cameraId);
    setShowAlertDialog(false);
    setSelectedAction('');
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      return;
    }

    video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  const refreshReplayStatus = async (currentReplay: CameraReplayResponse) => {
    if (!cameraData?.id) return;

    setReplayLoading(true);
    setReplayError(null);

    try {
      const latestReplay = await camerasService.getReplay(cameraData.id, currentReplay.id);
      setReplay(latestReplay);

      if (String(latestReplay.status ?? '').toUpperCase() === 'FAILED') {
        setReplayError(latestReplay.errorMessage || 'Não foi possível preparar o replay agora.');
      }
    } catch (error) {
      setReplayError(error instanceof Error ? error.message : 'Não foi possível atualizar o replay.');
    } finally {
      setReplayLoading(false);
    }
  };

  const createQuickReplay = async () => {
    if (!cameraData?.id) return;

    setReplayLoading(true);
    setReplayError(null);

    try {
      const createdReplay = await camerasService.createReplay(cameraData.id, {
        eventTime: new Date().toISOString(),
        secondsBefore: 300,
        secondsAfter: 0,
      });

      setReplay(createdReplay);

      if (String(createdReplay.status ?? '').toUpperCase() !== 'READY') {
        window.setTimeout(() => {
          void refreshReplayStatus(createdReplay);
        }, 2500);
      }
    } catch (error) {
      setReplayError(error instanceof Error ? error.message : 'Não foi possível gerar o replay.');
    } finally {
      setReplayLoading(false);
    }
  };

  const downloadCurrentImage = () => {
    const imageUrl = preferredSnapshotUrl || preferredImageStreamUrl;
    if (!imageUrl) {
      setReplayError('Esta câmera não possui imagem disponível para download agora.');
      return;
    }

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${cameraData?.name || 'camera'}-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!cameraData) {
    return (
      <Card className={className}>
        <CardContent className="p-0">
          <div className="flex h-64 items-center justify-center rounded-lg bg-slate-900">
            <div className="text-center">
              <Cctv className="mx-auto mb-4 h-12 w-12 text-slate-600" />
              <p className="text-slate-400">Selecione uma câmera</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <AlertDialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <AlertDialogContent className="max-w-md border-white/10 bg-slate-900">
          <AlertDialogTitle className="text-white">Ação na câmera {cameraData.name}</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300">
            {selectedAction === 'suspicious' && 'Marcar movimento suspeito para acompanhamento operacional.'}
            {selectedAction === 'approach' && 'Solicitar aproximação da equipe para a área desta câmera.'}
            {selectedAction === 'siren' && 'Ativar sirene local integrada a esta câmera.'}
            {selectedAction === 'save-clip' && 'Salvar um clipe curto associado ao feed atual.'}
            {selectedAction === 'share-security' && 'Compartilhar o feed com a central de segurança.'}
          </AlertDialogDescription>
          <AlertDialogAction onClick={confirmAction} className={brandClasses.solidAccent}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <Card className={`overflow-hidden ${isFullScreen ? 'fixed inset-0 z-50 border-0' : 'border-white/10'}`}>
        <CardContent className={`relative p-0 ${isFullScreen ? 'h-screen' : heightClassName}`}>
          <div className="relative h-full w-full bg-black">
            <div className={`absolute left-4 top-4 z-20 ${compactOverlay ? 'space-y-1.5' : 'space-y-2'}`}>
              {!compactOverlay ? (
              <div className="flex items-center gap-2">
                <CameraStatusIndicator status={effectiveStatus} alerts={cameraData.alerts} />

                {preferredVideoStreamUrl ? (
                  <Badge className={brandClasses.softAccent}>liveUrl/hlsUrl</Badge>
                ) : null}

                {preferredWebRtcUrl ? (
                  <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-200">webRtcUrl</Badge>
                ) : null}

                {preferredImageStreamUrl ? (
                  <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-200">preview</Badge>
                ) : null}

                {preferredSnapshotUrl ? (
                  <Badge className="border-white/20 bg-white/10 text-slate-200">snapshotUrl</Badge>
                ) : null}
              </div>
              ) : null}

              {compactOverlay ? (
                <div className="flex w-[min(92vw,28rem)] items-center justify-between gap-3 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
                  <div className="shrink-0">
                    <CameraStatusIndicator status={effectiveStatus} alerts={cameraData.alerts} size="sm" />
                  </div>
                  <span className="min-w-0 truncate text-right font-medium">{cameraData.name}</span>
                </div>
              ) : (
                <div className="max-w-sm rounded-lg border border-white/20 bg-black/60 p-3 text-sm backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <CameraStatusIndicator status={effectiveStatus} alerts={cameraData.alerts} />
                  <div className="font-medium text-white">{cameraData.name}</div>
                </div>
                <div className="text-slate-300">{cameraData.location || 'Local não informado'}</div>
                <div className="mt-2 text-xs text-slate-400">
                  {cameraData.unitLabel || 'Área comum do condomínio'}
                </div>
                {cameraData.lastSeen ? (
                  <div className="mt-1 text-xs text-slate-500">Último contato: {cameraData.lastSeen}</div>
                ) : null}
                </div>
              )}

              {!compactOverlay ? (
              <div className="max-w-sm rounded-lg border border-white/20 bg-black/60 p-3 text-sm backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">Revisão rápida</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Gera um replay recente e permite baixar a imagem atual.
                    </p>
                  </div>
                  {replay ? (
                    <Badge className="border-white/15 bg-white/10 text-slate-100">
                      {getReplayStatusLabel(replay.status)}
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={createQuickReplay}
                    disabled={replayLoading}
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    {replayLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <History className="mr-2 h-4 w-4" />}
                    Últimos 5 min
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadCurrentImage}
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar imagem
                  </Button>

                  {replay && !replayReady ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void refreshReplayStatus(replay)}
                      disabled={replayLoading}
                      className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                    >
                      Atualizar replay
                    </Button>
                  ) : null}

                  {replayReady && replay?.replayUrl ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(replay.replayUrl, '_blank', 'noopener,noreferrer')}
                      className="border-emerald-500/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                    >
                      Abrir replay
                    </Button>
                  ) : null}
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-400">
                  <p>A janela rápida atual cobre até 5 minutos, conforme o limite documentado da API v6.0.</p>
                  {replay?.startTime && replay?.endTime ? (
                    <p>
                      Intervalo: {format(new Date(replay.startTime), 'HH:mm:ss')} até {format(new Date(replay.endTime), 'HH:mm:ss')}
                    </p>
                  ) : null}
                  {replayError ? <p className="text-red-200">{replayError}</p> : null}
                </div>
              </div>
              ) : null}
            </div>

            {hasVideoStream && cameraData.streamUrl && !preferredVideoStreamUrl ? (
              <video
                ref={videoRef}
                className={`h-full w-full object-contain bg-black ${effectiveStatus === 'OFFLINE' && !compactVisualMode ? 'opacity-40' : ''}`}
                playsInline
                muted={isMuted}
                controls={false}
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
              >
                <source src={cameraData.streamUrl} type="video/mp4" />
                Seu navegador não suporta o elemento de vídeo.
              </video>
            ) : (
              <CameraFeed
                camera={cameraData}
                className={`h-full ${effectiveStatus === 'OFFLINE' && !compactVisualMode ? 'opacity-40' : ''}`}
                imageClassName="h-full w-full object-contain bg-black"
                emptyLabel="Nenhum preview disponível"
                emptyHint="Valide liveUrl, hlsUrl e webRtcUrl no contrato da câmera. imageStreamUrl e snapshotUrl devem ficar como apoio."
                controls={false}
              />
            )}

            {effectiveStatus === 'OFFLINE' && !compactVisualMode ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
                <div className="text-center">
                  <Cctv className="mx-auto mb-4 h-16 w-16 text-red-500" />
                  <p className="mb-2 text-white">Câmera offline</p>
                  <p className="text-sm text-slate-400">{cameraData.lastSeen || 'Sem último contato informado'}</p>
                </div>
              </div>
            ) : null}

            {!compactVisualMode ? (
            <div className={`absolute bottom-4 left-4 right-4 z-20 transition-all ${isFullScreen ? 'left-8 right-8' : ''}`}>
              <div className="flex items-center gap-3 rounded-lg bg-black/70 p-3 backdrop-blur-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                    }
                  }}
                  disabled={!hasVideoStream}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size={isFullScreen ? 'lg' : 'sm'}
                  className={`h-12 w-12 p-0 ${!isPlaying ? brandClasses.softAccent : ''}`}
                  onClick={togglePlayPause}
                  disabled={!hasVideoStream}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
                    }
                  }}
                  disabled={!hasVideoStream}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>

                <div className="ml-4 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 ${isMuted ? 'text-red-400' : ''}`}
                    onClick={() => setIsMuted(!isMuted)}
                    disabled={!hasVideoStream}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>

                  {!isMuted ? (
                    <Slider
                      value={[volume]}
                      onValueChange={(value) => setVolume(value[0])}
                      max={100}
                      step={5}
                      className="h-3 w-20"
                      disabled={!hasVideoStream}
                    />
                  ) : null}
                </div>

                <div className="ml-4 min-w-[120px] text-right text-xs text-white">
                  {hasVideoStream
                    ? `${format(new Date(currentTime * 1000), 'mm:ss')} / ${duration ? format(new Date(duration * 1000), 'mm:ss') : 'LIVE'}`
                    : preferredVideoStreamUrl
                      ? 'LIVE'
                      : preferredImageStreamUrl
                        ? 'PREVIEW'
                        : 'PREVIEW'}
                </div>

                <Popover open={showSettings} onOpenChange={setShowSettings}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="ml-auto h-10 w-10 p-0">
                      <Cctv className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="ml-4 w-56 border-white/10 bg-slate-800 p-3">
                    <div className="space-y-3 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white">Detecção de movimento</span>
                          <Switch checked={motionDetection} onCheckedChange={setMotionDetection} className="ml-auto" />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-white">Visão noturna</span>
                          <Switch checked={nightVision} onCheckedChange={setNightVision} className="ml-auto" />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button variant="ghost" size="sm" className="ml-2 h-10 w-10 p-0" onClick={onToggleFullScreen}>
                  <Maximize2 className={`h-4 w-4 ${isFullScreen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </div>
            ) : null}

            {cameraData.status === 'ONLINE' && !compactVisualMode ? (
              <div className="absolute right-4 top-4 z-20 space-y-2 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="space-y-1 rounded-lg bg-black/60 p-2 backdrop-blur-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start text-left text-xs hover:bg-red-500/20"
                    onClick={() => handleAction('suspicious')}
                  >
                    <AlertTriangle className="mr-2 h-3 w-3 text-red-400" />
                    Movimento suspeito
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start text-left text-xs hover:bg-blue-500/20"
                    onClick={() => handleAction('approach')}
                  >
                    <Users className="mr-2 h-3 w-3 text-blue-400" />
                    Solicitar aproximação
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start text-left text-xs hover:bg-yellow-500/20"
                    onClick={() => handleAction('siren')}
                  >
                    <AlertTriangle className="mr-2 h-3 w-3 text-yellow-400" />
                    Ativar sirene
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start text-left text-xs hover:bg-green-500/20"
                    onClick={() => handleAction('save-clip')}
                  >
                    <Cctv className="mr-2 h-3 w-3 text-green-400" />
                    Salvar clipe
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start text-left text-xs hover:bg-white/10"
                    onClick={() => handleAction('share-security')}
                  >
                    <Users className="mr-2 h-3 w-3 text-slate-200" />
                    Compartilhar feed
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
