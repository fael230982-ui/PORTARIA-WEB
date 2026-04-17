import { normalizeMoradorStatus } from './morador-normalizers';

export function getPersonStatusBadgeClass(status: string | null | undefined) {
  const normalized = normalizeMoradorStatus(status);

  if (normalized === 'ativo') {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20';
  }

  if (normalized === 'bloqueado') {
    return 'bg-red-500/15 text-red-300 border-red-500/20';
  }

  if (normalized === 'vencido') {
    return 'bg-amber-500/15 text-amber-300 border-amber-500/20';
  }

  return 'bg-slate-500/15 text-slate-300 border-slate-500/20';
}
