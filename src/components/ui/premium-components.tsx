import type { ReactNode } from 'react';

type PremiumCardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
};

export function PremiumCard({
  children,
  className = '',
  hover = true,
}: PremiumCardProps) {
  return (
    <div
      className={`relative group rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-6 backdrop-blur-xl transition-all duration-300 ${hover ? 'hover:border-white/20 hover:bg-slate-900/70' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

type GradientButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
};

const buttonVariants = {
  primary:
    'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-cyan-500',
  secondary:
    'border border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900 text-slate-100 hover:border-slate-600 hover:from-slate-700 hover:to-slate-800',
  danger:
    'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/25 hover:from-red-500 hover:to-rose-500',
  success:
    'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500',
  warning:
    'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:from-amber-500 hover:to-orange-500',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function GradientButton({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  className = '',
  fullWidth = false,
}: GradientButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl font-semibold shadow-lg transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : 'inline-flex items-center'} ${className}`}
    >
      {children}
    </button>
  );
}

type MetricCardProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  trend?: { direction: 'up' | 'down'; value: string; color: 'green' | 'red' };
};

export function MetricCard({ icon, label, value, unit, trend }: MetricCardProps) {
  return (
    <div className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/40 to-slate-950/60 p-6 transition-all duration-300 hover:border-white/20 hover:bg-slate-900/60">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-slate-300">
            {label}
          </p>
          <div className="mt-3 flex items-baseline justify-center gap-2">
            <span className="text-center text-3xl font-black tabular-nums text-white">{value}</span>
            {unit && <span className="text-sm text-slate-400">{unit}</span>}
          </div>
          {trend && (
            <p
              className={`mt-1 text-xs font-bold ${trend.color === 'green' ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {trend.direction === 'up' ? 'up' : 'down'} {trend.value}
            </p>
          )}
        </div>
        <div className="ml-4 flex-shrink-0">{icon}</div>
      </div>
    </div>
  );
}

type StatusIndicatorProps = {
  status: 'online' | 'offline' | 'warning' | 'critical';
  label: string;
  className?: string;
};

export function StatusIndicator({
  status,
  label,
  className = '',
}: StatusIndicatorProps) {
  const colors = {
    online: 'bg-emerald-500',
    offline: 'bg-red-500',
    warning: 'bg-amber-500',
    critical: 'bg-rose-500',
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/50 px-3 py-1.5 text-sm ${className}`}
    >
      <div className={`h-2 w-2 rounded-full ${colors[status]}`} />
      <span className="font-medium text-white">{label}</span>
    </div>
  );
}

type BadgeProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
};

const badgeVariants = {
  primary: 'border-blue-500 bg-blue-600 text-white',
  secondary: 'border-slate-700 bg-slate-800 text-slate-300',
  success: 'border-emerald-500 bg-emerald-600 text-white',
  warning: 'border-amber-500 bg-amber-600 text-white',
  danger: 'border-red-500 bg-red-600 text-white',
  info: 'border-cyan-500 bg-cyan-600 text-white',
};

const badgeSizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export function Badge({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${badgeVariants[variant]} ${badgeSizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}
