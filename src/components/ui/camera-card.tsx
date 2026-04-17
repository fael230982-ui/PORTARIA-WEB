import React from 'react';
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
      <h3 className="mb-2 text-lg font-semibold text-white">{name}</h3>
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-sm ${statusColors[normalizedStatus]}`}>Status: {normalizedStatus}</span>
        <span className="text-sm text-gray-400">Ultima Atividade: {lastActivity ?? 'Sem dados'}</span>
      </div>
    </div>
  );
};
