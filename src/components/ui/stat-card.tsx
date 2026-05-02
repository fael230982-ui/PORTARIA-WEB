import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  label: string;
  value: string | number;
  helper?: string;
  trend?: {
    direction: "up" | "down";
    percentage: number;
  };
};

export function StatCard({ icon, label, value, helper, trend }: Props) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <h3 className="mt-3 text-center text-4xl font-semibold tabular-nums text-white">{value}</h3>
          {helper ? (
            <p className="mt-3 text-sm text-slate-500">{helper}</p>
          ) : null}
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400">
          {icon}
        </div>
      </div>

      {trend ? (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              trend.direction === "up" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.percentage}%
          </span>
          <span className="text-xs text-slate-500">vs. semana anterior</span>
        </div>
      ) : null}
    </div>
  );
}
