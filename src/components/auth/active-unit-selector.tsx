'use client';

import { useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { me } from '@/services/auth.service';

type ActiveUnitSelectorProps = {
  forceSelection?: boolean;
  className?: string;
};

function normalizeOptions(user: NonNullable<ReturnType<typeof useAuth>['user']>) {
  const ids = user.unitIds ?? [];
  const names = user.unitNames ?? [];

  return ids.map((id, index) => ({
    id,
    name: names[index] ?? `Unidade ${index + 1}`,
  }));
}

function getSelectedUnitDisplayName(
  user: NonNullable<ReturnType<typeof useAuth>['user']>,
  options: Array<{ id: string; name: string }>
) {
  const selectedUnitId = user.selectedUnitId?.trim();
  if (!selectedUnitId) return 'Escolha a unidade usada nesta sessão.';

  const matchedOption = options.find((option) => option.id === selectedUnitId);
  if (matchedOption?.name?.trim()) return matchedOption.name;

  if (user.selectedUnitName?.trim()) return user.selectedUnitName;
  return `Unidade não resolvida (${selectedUnitId})`;
}

export function ActiveUnitSelector({ forceSelection = false, className = '' }: ActiveUnitSelectorProps) {
  const { user, setUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => {
    if (!user) return [];
    return normalizeOptions(user);
  }, [user]);
  const selectedUnitDisplayName = useMemo(() => {
    if (!user) return 'Escolha a unidade usada nesta sessão.';
    return getSelectedUnitDisplayName(user, options);
  }, [options, user]);

  const selectedUnitId = user?.selectedUnitId ?? '';

  if (!user || user.role !== 'MORADOR' || options.length === 0) {
    return null;
  }

  async function handleChange(nextUnitId: string) {
    if (!nextUnitId || nextUnitId === user.selectedUnitId) return;

    setSubmitting(true);
    setError(null);

    try {
      const refreshedUser = await me(nextUnitId);
      setUser(refreshedUser);
    } catch (currentError) {
      const message =
        currentError instanceof Error ? currentError.message : 'Não foi possível selecionar a unidade ativa.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-2 text-slate-200">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Unidade ativa</p>
          <p className="mt-1 text-sm text-white">
            {forceSelection
              ? 'Selecione a unidade antes de continuar.'
              : selectedUnitDisplayName}
          </p>
          <select
            value={selectedUnitId}
            onChange={(event) => void handleChange(event.target.value)}
            disabled={submitting}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none disabled:opacity-60"
          >
            <option value="">Selecione a unidade</option>
            {options.map((option) => (
              <option key={option.id} value={option.id} className="bg-slate-950 text-white">
                {option.name}
              </option>
            ))}
          </select>
          {error ? (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
