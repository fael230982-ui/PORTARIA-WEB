'use client';

import { useMemo } from 'react';
import { WifiOff, Cctv } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CameraFeed } from '@/components/camera-feed';
import { useCameras } from '@/hooks/use-cameras';

type Camera = {
  id: string;
  name: string;
  location?: string;
  status: 'ONLINE' | 'OFFLINE';
  streamUrl?: string;
  snapshotUrl?: string;
  lastSeen?: string;
};

type CameraViewProps = {
  activeCameraId?: string | null;
};

export function CameraView({ activeCameraId }: CameraViewProps) {
  const { data: camerasData, isLoading } = useCameras();
  const cameras = useMemo(
    () => ((camerasData?.data as Camera[] | undefined) ?? []),
    [camerasData?.data]
  );

  const camera = useMemo(() => {
    if (!activeCameraId) {
      return null;
    }

    return cameras.find((item) => item.id === activeCameraId) ?? cameras[0] ?? null;
  }, [activeCameraId, cameras]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
          <p className="text-sm">Carregando câmera...</p>
        </div>
      </div>
    );
  }

  if (!activeCameraId && cameras.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/15 bg-slate-950 text-slate-400">
        <div className="text-center">
          <Cctv className="mx-auto mb-3 h-10 w-10" />
          <p className="text-sm">Nenhuma câmera disponível</p>
        </div>
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-slate-950 text-white">
        <div className="text-center">
          <WifiOff className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="text-sm text-slate-300">Câmera offline ou não encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="h-full border-white/10 bg-slate-950 text-white">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 truncate text-base">
              <Cctv className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{camera.name}</span>
            </CardTitle>
            <p className="mt-1 truncate text-sm text-slate-400">
              {camera.location || 'Local não informado'}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={`${
              camera.status === 'ONLINE'
                ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
                : 'border-red-500/20 bg-red-500/15 text-red-300'
            }`}
          >
            {camera.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
          <div className="relative h-[420px] w-full">
            <CameraFeed
              camera={camera}
              className="absolute inset-0 bg-black"
              imageClassName="h-full w-full object-cover"
              emptyLabel="Nenhuma imagem disponível"
              emptyHint="A câmera ainda não possui imagem liberada para visualização."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
