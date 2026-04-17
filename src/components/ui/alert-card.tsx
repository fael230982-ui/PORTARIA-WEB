import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface AlertCardProps {
  title: string;
  description: string;
  time: string;
  status: string;
  icon?: LucideIcon;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  title,
  description,
  time,
  status,
  icon: Icon,
}) => {
  const severityColors: Record<string, string> = {
    Informativo: 'bg-green-500',
    Alerta: 'bg-yellow-500',
    Crítico: 'bg-red-500',
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-lg transition-shadow duration-200 hover:shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-3 w-3 rounded-full ${severityColors[status] ?? 'bg-slate-500'}`}></span>
          {Icon ? <Icon className="h-4 w-4 text-slate-300" /> : null}
        </div>
        <span className="text-sm text-gray-400">{time}</span>
      </div>
      <p className="text-base font-medium text-white">{title}</p>
      <p className="mt-1 text-sm text-gray-400">{description}</p>
      <p className="mt-2 text-sm text-gray-400">Status: {status}</p>
    </div>
  );
};
