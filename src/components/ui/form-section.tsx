import { ReactNode } from 'react';

type FormSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function FormSection({ title, children, className = '' }: FormSectionProps) {
  return (
    <div className={`space-y-6 rounded-xl border border-white/10 bg-slate-900/50 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">{title}</h3>
      {children}
    </div>
  );
}