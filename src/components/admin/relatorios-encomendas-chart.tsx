'use client';

import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';

export function RelatoriosEncomendasChart() {
  const data = useMemo(
    () => [
      { week: 'Sem 1', value: 18 },
      { week: 'Sem 2', value: 24 },
      { week: 'Sem 3', value: 16 },
      { week: 'Sem 4', value: 31 },
    ],
    []
  );

  const max = Math.max(...data.map((item) => item.value));

  return (
    <div className="space-y-4">
      <div className="h-64 rounded-lg bg-slate-800 p-4">
        <div className="mb-4 flex items-center gap-2 text-slate-300">
          <BarChart3 className="h-4 w-4 text-green-400" />
          <span className="text-sm">Distribuição semanal</span>
        </div>

        <div className="flex h-[calc(100%-2rem)] items-end gap-4">
          {data.map((item) => (
            <div key={item.week} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end justify-center">
                <div
                  className="w-full max-w-[44px] rounded-t-md bg-gradient-to-t from-green-600 to-emerald-400"
                  style={{ height: `${(item.value / max) * 100}%` }}
                />
              </div>
              <div className="text-xs text-slate-300">{item.week}</div>
              <div className="text-xs font-medium text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}