'use client';

import React from 'react';
import { ResidentUnitGate } from '@/components/auth/resident-unit-gate';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
};

export function PageContainer({ children, className, title, description }: Props) {
  const { user } = useAuth();
  const needsUnitGate = Boolean(user?.role === 'MORADOR' && user.requiresUnitSelection);
  const hideHeaderForResident = user?.role === 'MORADOR';

  return (
    <main className={cn('mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8', className)}>
      <ResidentUnitGate />
      {title && !hideHeaderForResident ? (
        <div className={cn('mb-8', needsUnitGate && 'mt-8')}>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
          {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </main>
  );
}
