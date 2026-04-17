'use client';

import { CameraCard } from '@/components/ui/camera-card';
import type { Camera } from '@/types/camera';

type CameraMonitorProps = {
  cameras?: Camera[];
};

export function CameraMonitor({ cameras = [] }: CameraMonitorProps) {
  return (
    <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Monitor separado</h3>
        <span className="text-xs text-slate-400">Tela dedicada</span>
      </div>

      <div className="space-y-4">
        {cameras.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">
            Nenhuma camera disponivel para o monitor secundario.
          </div>
        ) : (
          cameras.map((camera) => (
            <CameraCard
              key={camera.id}
              name={camera.name}
              status={camera.status}
              lastActivity={camera.lastSeen || 'Sem ultimo contato'}
            />
          ))
        )}
      </div>
    </aside>
  );
}
