'use client';

import { ActiveUnitSelector } from '@/components/auth/active-unit-selector';
import { useAuth } from '@/hooks/use-auth';

export function ResidentUnitGate() {
  const { user } = useAuth();

  if (!user || user.role !== 'MORADOR' || !user.requiresUnitSelection) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-white">
      <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Seleção obrigatória</p>
      <h2 className="mt-2 text-lg font-semibold">Escolha a unidade ativa para continuar</h2>
      <p className="mt-2 text-sm text-amber-100/90">
        Selecione uma unidade ativa para continuar com os cadastros e consultas desta área.
      </p>
      <ActiveUnitSelector forceSelection className="mt-4 bg-black/10" />
    </div>
  );
}
