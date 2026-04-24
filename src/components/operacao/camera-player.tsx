'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Camera,
  Volume2,
  VolumeX,
  Maximize2,
  AlertTriangle,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Users,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CameraFeed } from '@/components/camera-feed';
import { CameraStatusIndicator } from '@/components/operacao/camera-status-indicator';
import { brandClasses } from '@/config/brand-classes';
import { useCameraStreaming } from '@/hooks/use-camera-streaming';
import { getPreferredImageStreamUrl, getPreferredSnapshotUrl, getPreferredVideoStreamUrl, getPreferredWebRtcUrl } from '@/features/cameras/camera-media';
import type { Camera as CameraRecord } from '@/types/camera';

export type CameraPlayerData = CameraRecord & {
  unitLabel?: string;
  alerts?: number;
};

type CameraPlayerProps = {
  cameraId: string;
  cameraData?: CameraPlayerData;
  onAction?: (action: string, cameraId: string) => void;
  className?: string;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
};

export function CameraPlayer({
  cameraId,
  cameraData,
  onAction,
  className = '',
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
  const { data: streamingData } = useCameraStreaming(cameraData?.id, Boolean(cameraData?.id));
  const preferredVideoStreamUrl = getPreferredVideoStreamUrl(cameraData, streamingData);
  const preferredWebRtcUrl = getPreferredWebRtcUrl(cameraData, streamingData);
  const preferredImageStreamUrl = getPreferredImageStreamUrl(cameraData, streamingData);
  const preferredSnapshotUrl = getPreferredSnapshotUrl(cameraData, streamingData);
  const hasVideoStream = Boolean(cameraData?.streamUrl);

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

  if (!cameraData) {
    return (
      <Card className={className}>
        <CardContent className="p-0">
          <div className="flex h-64 items-center justify-center rounded-lg bg-slate-900">
            <div className="text-center">
              <Camera className="mx-auto mb-4 h-12 w-12 text-slate-600" />
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
            {selectedAction === 'share-security' && 'Compartilhar o feed com a central de seguranca.'}
          </AlertDialogDescription>
          <AlertDialogAction onClick={confirmAction} className={brandClasses.solidAccent}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <Card className={`overflow-hidden ${isFullScreen ? 'fixed inset-0 z-50 border-0' : 'border-white/10'}`}>
        <CardContent className={`relative p-0 ${isFullScreen ? 'h-screen' : 'h-96'}`}>
          <div className="relative h-full w-full bg-black">
            <div className="absolute left-4 top-4 z-20 space-y-2">
              <div className="flex items-center gap-2">
                <CameraStatusIndicator status={cameraData.status} alerts={cameraData.alerts} />

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

              <div className="max-w-sm rounded-lg border border-white/20 bg-black/60 p-3 text-sm backdrop-blur-sm">
                <div className="font-medium text-white">{cameraData.name}</div>
                <div className="text-slate-300">{cameraData.location || 'Local não informado'}</div>
                <div className="mt-2 text-xs text-slate-400">
                  {cameraData.unitLabel || 'Sem unidade vinculada'}
                </div>
                {cameraData.lastSeen ? (
                  <div className="mt-1 text-xs text-slate-500">Último contato: {cameraData.lastSeen}</div>
                ) : null}
              </div>
            </div>

            {hasVideoStream && cameraData.streamUrl && !preferredVideoStreamUrl ? (
              <video
                ref={videoRef}
                className={`h-full w-full object-cover ${cameraData.status === 'OFFLINE' ? 'opacity-40' : ''}`}
                playsInline
                muted={isMuted}
                controls={false}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              >
                <source src={cameraData.streamUrl} type="video/mp4" />
                Seu navegador não suporta o elemento de vídeo.
              </video>
            ) : (
              <CameraFeed
                camera={cameraData}
                className={`h-full ${cameraData.status === 'OFFLINE' ? 'opacity-40' : ''}`}
                imageClassName="h-full w-full object-cover"
                emptyLabel="Nenhum preview disponível"
                emptyHint="Valide liveUrl, hlsUrl e webRtcUrl no contrato da cÃ¢mera. imageStreamUrl e snapshotUrl devem ficar como apoio."
                controls={false}
              />
            )}

            {cameraData.status === 'OFFLINE' ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
                <div className="text-center">
                  <Camera className="mx-auto mb-4 h-16 w-16 text-red-500" />
                  <p className="mb-2 text-white">Câmera offline</p>
                  <p className="text-sm text-slate-400">{cameraData.lastSeen || 'Sem último contato informado'}</p>
                </div>
              </div>
            ) : null}

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
                      <Camera className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="ml-4 w-56 border-white/10 bg-slate-800 p-3">
                    <div className="space-y-3 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white">Detecção de movimento</span>
                          <Switch
                            checked={motionDetection}
                            onCheckedChange={setMotionDetection}
                            className="ml-auto"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-white">Visão noturna</span>
                          <Switch
                            checked={nightVision}
                            onCheckedChange={setNightVision}
                            className="ml-auto"
                          />
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

            {cameraData.status === 'ONLINE' ? (
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
                    <Camera className="mr-2 h-3 w-3 text-green-400" />
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
