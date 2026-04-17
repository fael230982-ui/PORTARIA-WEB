'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useCameras } from '@/hooks/use-cameras';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';
import { CameraGrid } from '@/components/operacao/camera-grid';
import { CameraPlayer } from '@/components/operacao/camera-player';

const allowedRoles = ['OPERADOR', 'CENTRAL', 'MASTER'] as const;

function getCameraUnitLabel(unitId: string | null | undefined, unitLabels: Map<string, string>) {
  if (!unitId) return 'Sem unidade vinculada';
  return unitLabels.get(unitId) ?? 'Unidade não identificada';
}

export default function CamerasPremiumPage() {
  const { user, canAccess, isChecking } = useProtectedRoute({
    allowedRoles: [...allowedRoles],
  });
  const { data: camerasData, isLoading } = useCameras();
  const { units } = useResidenceCatalog(Boolean(user));
  const [activeCameraId, setActiveCameraId] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const accessibleUnits = useMemo(() => {
    if (!user) return [];
    if (user.role === 'MASTER' || user.role === 'CENTRAL') return units;
    if (user.unitId) return units.filter((unit) => unit.id === user.unitId);
    if (user.condominiumId) return units.filter((unit) => unit.condominiumId === user.condominiumId);
    return [];
  }, [units, user]);

  const accessibleUnitIds = useMemo(
    () => new Set(accessibleUnits.map((unit) => unit.id)),
    [accessibleUnits]
  );

  const unitLabels = useMemo(
    () =>
      new Map(
        accessibleUnits.map((unit) => [
          unit.id,
          [unit.condominium?.name, unit.structure?.label, unit.label].filter(Boolean).join(' / '),
        ])
      ),
    [accessibleUnits]
  );

  const cameras = useMemo(() => {
    const items = camerasData?.data ?? [];

    return items
      .filter((camera) => {
        if (!user) return false;
        if (user.role === 'MASTER' || user.role === 'CENTRAL') return true;
        if (!camera.unitId) return false;
        return accessibleUnitIds.has(camera.unitId);
      })
      .map((camera) => ({
        ...camera,
        unitLabel: getCameraUnitLabel(camera.unitId, unitLabels),
        thumbnail: camera.snapshotUrl,
      }));
  }, [accessibleUnitIds, camerasData, unitLabels, user]);

  const activeCamera = cameras.find((camera) => camera.id === activeCameraId) ?? cameras[0];

  if (isChecking) {
    return <div className="flex min-h-[60vh] items-center justify-center text-white">Carregando câmeras...</div>;
  }

  if (!canAccess || !user) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Monitoramento de câmeras</h2>
          <p className="text-sm text-slate-400">
            {cameras.filter((camera) => camera.status === 'ONLINE').length}/{cameras.length} câmeras online
          </p>
        </div>
        <Button size="sm" onClick={() => setIsFullScreen((value) => !value)}>
          <Maximize2 className="mr-2 h-4 w-4" />
          {isFullScreen ? 'Sair' : 'Tela cheia'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <CameraGrid
          cameras={cameras}
          onSelectCamera={setActiveCameraId}
          selectedCamera={activeCamera?.id}
          loading={isLoading}
          className="content-start"
        />

        <CameraPlayer
          cameraId={activeCamera?.id ?? ''}
          cameraData={activeCamera}
          isFullScreen={isFullScreen}
          onToggleFullScreen={() => setIsFullScreen((value) => !value)}
        />
      </div>
    </div>
  );
}
