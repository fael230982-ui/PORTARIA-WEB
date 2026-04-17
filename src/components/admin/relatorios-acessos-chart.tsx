'use client';

import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';

export function RelatoriosAcessosChart() {
  const data = useMemo(
    () => [
      { day: 'Seg', value: 45 },
      { day: 'Ter', value: 67 },
      { day: 'Qua', value: 52 },
      { day: 'Qui', value: 78 },
      { day: 'Sex', value: 91 },
      { day: 'Sáb', value: 34 },
      { day: 'Dom', value: 23 },
    ],
    []
  );

  const max = Math.max(...data.map((item) => item.value));

  return (
    <div className="space-y-4">
      <div className="h-64 rounded-lg bg-slate-800 p-4">
        <div className="mb-4 flex items-center gap-2 text-slate-300">
          <BarChart3 className="h-4 w-4 text-blue-400" />
          <span className="text-sm">Acessos por dia</span>
        </div>

        <div className="flex h-[calc(100%-2rem)] items-end gap-3">
          {data.map((item) => (
            <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end justify-center">
                <div
                  className="w-full max-w-[36px] rounded-t-md bg-gradient-to-t from-blue-600 to-cyan-400"
                  style={{ height: `${(item.value / max) * 100}%` }}
                />
              </div>
              <div className="text-xs text-slate-300">{item.day}</div>
              <div className="text-xs font-medium text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}