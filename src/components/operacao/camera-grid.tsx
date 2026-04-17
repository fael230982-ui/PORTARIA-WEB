'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Camera } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CameraSnapshot } from '@/components/camera-snapshot';
import { CameraStatusIndicator } from '@/components/operacao/camera-status-indicator';
import { brandClasses } from '@/config/brand-classes';
import { getCameraMediaAvailabilityLabels, getPreferredImageStreamUrl, getPreferredSnapshotUrl } from '@/features/cameras/camera-media';
import type { Camera as CameraRecord } from '@/types/camera';

export type CameraGridItem = CameraRecord & {
  unitLabel?: string;
  alerts?: number;
  thumbnail?: string | null;
};

type CameraGridProps = {
  cameras: CameraGridItem[];
  onSelectCamera: (cameraId: string) => void;
  selectedCamera?: string;
  loading?: boolean;
  className?: string;
};

export function CameraGrid({
  cameras,
  onSelectCamera,
  selectedCamera,
  loading = false,
  className = '',
}: CameraGridProps) {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {cameras.map((camera) => {
        const isActive = selectedCamera === camera.id;
        const imageStreamUrl = getPreferredImageStreamUrl(camera);
        const snapshotUrl = getPreferredSnapshotUrl(camera);
        const previewUrl = imageStreamUrl || camera.thumbnail || snapshotUrl || null;
        const mediaLabels = getCameraMediaAvailabilityLabels(camera);

        return (
          <Card
            key={camera.id}
            className={`group relative cursor-pointer overflow-hidden border-2 transition-all ${
              isActive
                ? brandClasses.activeCard
                : 'border-transparent hover:border-white/20'
            }`}
            onClick={() => onSelectCamera(camera.id)}
          >
            <div className="relative h-48 bg-gradient-to-br from-slate-900 to-black">
              {previewUrl ? (
                camera.snapshotUrl ? (
                  <CameraSnapshot
                    cameraId={camera.id}
                    alt={camera.name}
                    fallbackSrc={previewUrl}
                    className="h-full w-full object-cover"
                    refreshMs={20000}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt={camera.name} className="h-full w-full object-cover" />
                )
              ) : (
                <div className="flex h-full items-center justify-center text-slate-600">
                  <Camera className="h-12 w-12 opacity-20" />
                </div>
              )}

              <div className="absolute left-2 top-2 z-10">
                <CameraStatusIndicator status={camera.status} alerts={camera.alerts} size="sm" />
              </div>

              {isActive ? (
                <div className={`absolute inset-0 flex items-center justify-center ${brandClasses.activeOverlay}`}>
                  <div className="text-center">
                    <Camera className={`mx-auto mb-2 h-12 w-12 ${brandClasses.accentTextSoft}`} />
                    <p className="font-medium text-white">Camera ativa</p>
                  </div>
                </div>
              ) : null}
            </div>

            <CardContent className="p-4 pt-0">
              <div className="space-y-1">
                <h3 className="truncate font-medium text-white">{camera.name}</h3>
                <p className="truncate text-xs text-slate-400">{camera.location || 'Local nao informado'}</p>
                <p className="truncate text-xs text-slate-500">{camera.unitLabel || 'Sem unidade vinculada'}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                  {mediaLabels.map((label) => (
                    <span key={`${camera.id}-${label}`}>{label}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
