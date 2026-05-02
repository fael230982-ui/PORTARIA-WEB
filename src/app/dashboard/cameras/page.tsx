'use client';

import { useMemo, useState } from 'react';
import { CameraFeed } from '@/components/camera-feed';
import { PageContainer } from '@/components/layout/page-container';
import { useAuth } from '@/hooks/use-auth';
import { useCameras } from '@/hooks/use-cameras';
import type { Camera } from '@/types/camera';

function compareResidentCameras(left: Camera, right: Camera) {
  if (left.residentMainSuggested !== right.residentMainSuggested) {
    return left.residentMainSuggested ? -1 : 1;
  }

  const leftGroupOrder = left.residentCameraGroupOrder ?? Number.MAX_SAFE_INTEGER;
  const rightGroupOrder = right.residentCameraGroupOrder ?? Number.MAX_SAFE_INTEGER;
  if (leftGroupOrder !== rightGroupOrder) return leftGroupOrder - rightGroupOrder;

  const leftOrder = left.residentDisplayOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.residentDisplayOrder ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;

  return String(left.name ?? '').localeCompare(String(right.name ?? ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
}

export default function CamerasPage() {
  const { user } = useAuth();
  const activeUnitId = user?.selectedUnitId ?? user?.unitId ?? null;

  const { data, isLoading, error, refetch } = useCameras({
    unitId: activeUnitId ?? undefined,
    enabled: Boolean(activeUnitId),
  });
  const [selectedProfile, setSelectedProfile] = useState('');
  const cameras = useMemo(() => [...(data?.data ?? [])].sort(compareResidentCameras), [data?.data]);
  const profileOptions = useMemo(() => {
    const profiles = cameras
      .map((camera) => camera.location?.trim())
      .filter((profile): profile is string => Boolean(profile));

    return Array.from(new Set(profiles)).sort((left, right) =>
      left.localeCompare(right, 'pt-BR', { numeric: true, sensitivity: 'base' })
    );
  }, [cameras]);
  const visibleCameras = selectedProfile ? cameras.filter((camera) => camera.location?.trim() === selectedProfile) : cameras;

  return (
    <PageContainer title="Câmeras" description="Veja as câmeras da sua unidade e das áreas comuns do condomínio.">
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
        <div>As câmeras da unidade ativa e das áreas comuns aparecem aqui.</div>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedProfile}
            onChange={(event) => setSelectedProfile(event.target.value)}
            className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-white outline-none"
          >
            <option value="">Todos os perfis</option>
            {profileOptions.map((profile) => (
              <option key={profile} value={profile}>
                {profile}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-white hover:bg-white/15"
          >
            Atualizar
          </button>
        </div>
      </div>

      {!activeUnitId ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
          Selecione uma unidade ativa para consultar câmeras.
        </div>
      ) : isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300">Carregando câmeras...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-100">
          Não foi possível carregar as câmeras da unidade agora.
        </div>
      ) : visibleCameras.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300">
          Nenhuma câmera disponível para a unidade ativa ou para as áreas comuns.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleCameras.map((camera) => (
            <div key={camera.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="aspect-video bg-black">
                <CameraFeed camera={camera} imageClassName="h-full w-full object-cover" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{camera.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{camera.location || 'Sem localização'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {camera.unitId ? 'Vinculada à unidade selecionada' : 'Área comum do condomínio'}
                    </p>
                  </div>
                  <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-slate-200">
                    {camera.status === 'ONLINE' ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
