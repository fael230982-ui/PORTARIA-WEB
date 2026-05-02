import React from 'react';
import { Cctv } from 'lucide-react';
import type { CameraStatus } from '@/types/camera';

export interface CameraCardProps {
  name: string;
  status: CameraStatus | 'online' | 'offline';
  lastActivity?: string;
}

export const CameraCard: React.FC<CameraCardProps> = ({ name, status, lastActivity }) => {
  const normalizedStatus = status === 'ONLINE' ? 'online' : status === 'OFFLINE' ? 'offline' : status;
  const statusColors = {
    online: 'text-green-400',
    offline: 'text-red-400',
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-lg transition-shadow duration-200 hover:shadow-xl">
      <div className="mb-3 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
          <Cctv className="h-5 w-5" />
        </span>
        <h3 className="min-w-0 truncate text-lg font-semibold text-white">{name}</h3>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2 sm:items-center">
        <span className={statusColors[normalizedStatus]}>Status: {normalizedStatus}</span>
        <span className="text-gray-400 sm:text-right">Última atividade: {lastActivity ?? 'Sem dados'}</span>
      </div>
    </div>
  );
};
