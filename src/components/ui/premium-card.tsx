import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PremiumCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function PremiumCard({ title, children, className }: PremiumCardProps) {
  return (
    <div className={cn(
      "bg-slate-900/60 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-6 shadow-2xl relative overflow-hidden",
      "before:absolute before:inset-0 before:bg-gradient-to-br before:from-cyan-500/5 before:to-blue-500/5 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500",
      className
    )}>
      <div className="relative z-10">
        {title && (
          <h2 className="text-xl font-semibold text-white mb-4 border-b border-slate-700 pb-2">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}