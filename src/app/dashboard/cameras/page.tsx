'use client';

import { CameraFeed } from '@/components/camera-feed';
import { PageContainer } from '@/components/layout/page-container';
import { useAuth } from '@/hooks/use-auth';
import { useCameras } from '@/hooks/use-cameras';

export default function CamerasPage() {
  const { user } = useAuth();
  const activeUnitId = user?.selectedUnitId ?? user?.unitId ?? null;

  const { data, isLoading, error, refetch } = useCameras({
    unitId: activeUnitId ?? undefined,
    enabled: Boolean(activeUnitId),
  });
  const cameras = data?.data ?? [];

  return (
    <PageContainer title="Cameras" description="Veja as cameras disponiveis para a sua unidade.">
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
        <div>As cameras liberadas para a unidade ativa aparecem aqui.</div>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-white hover:bg-white/15"
        >
          Atualizar
        </button>
      </div>

      {!activeUnitId ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
          Selecione uma unidade ativa para consultar cameras.
        </div>
      ) : isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300">Carregando cameras...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-100">
          Nao foi possivel carregar cameras para esta unidade.
        </div>
      ) : cameras.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300">
          Nenhuma camera liberada para a unidade ativa.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cameras.map((camera) => (
            <div key={camera.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="aspect-video bg-black">
                <CameraFeed camera={camera} imageClassName="h-full w-full object-cover" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{camera.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{camera.location || 'Sem localizacao'}</p>
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
