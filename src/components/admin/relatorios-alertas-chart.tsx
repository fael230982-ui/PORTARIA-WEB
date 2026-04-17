'use client';

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';

export function RelatoriosAlertasChart() {
  const data = useMemo(
    () => [
      { label: 'Acesso', value: 12 },
      { label: 'Câmera', value: 8 },
      { label: 'Faces', value: 5 },
      { label: 'Sistema', value: 3 },
    ],
    []
  );

  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-800 p-4">
        <div className="mb-4 flex items-center gap-2 text-slate-300">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="text-sm">Alertas por categoria</span>
        </div>

        <div className="space-y-3">
          {data.map((item) => {
            const percent = Math.round((item.value / total) * 100);
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{item.label}</span>
                  <span className="text-white">{item.value} ({percent}%)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-700">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-red-500 to-orange-400"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}