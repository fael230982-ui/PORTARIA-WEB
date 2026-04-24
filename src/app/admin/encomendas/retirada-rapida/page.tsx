'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useAllDeliveries } from '@/hooks/use-deliveries';
import { validateDeliveryWithdrawal } from '@/services/deliveries.service';
import {
  getDeliveryWithdrawalCode,
  getDeliveryStatusBadgeClass,
  getDeliveryStatusLabel,
  normalizeDeliveries,
  normalizeDeliveryStatus,
  safeDeliveryText,
} from '@/features/deliveries/delivery-normalizers';
import { Badge } from '@/components/ui/badge';

export default function QuickWithdrawalPage() {
  const { user, hydrated, loading } = useAuth();
  const isChecking = loading || !hydrated;
  const { data, isLoading, refetch } = useAllDeliveries({ limit: 100, enabled: Boolean(user && hydrated) });
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const deliveries = useMemo(() => normalizeDeliveries(data), [data]);
  const matchedDelivery = useMemo(() => {
    const normalizedCode = code.trim();
    if (!normalizedCode) return null;

    return deliveries.find(
      (delivery) =>
        normalizeDeliveryStatus(delivery.status) !== 'WITHDRAWN' &&
        String(getDeliveryWithdrawalCode(delivery) ?? '').trim() === normalizedCode
    ) ?? null;
  }, [code, deliveries]);

  async function handleValidate() {
    if (!matchedDelivery) {
      setMessage('Nenhuma encomenda aguardando retirada foi encontrada com esse código.');
      return;
    }

    setValidating(true);
    setMessage(null);

    try {
      const response = await validateDeliveryWithdrawal(matchedDelivery.id, { code: code.trim() });
      setMessage(response.valid ? 'Código validado e retirada confirmada.' : 'Código inválido para esta encomenda.');
      await refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível validar a retirada.');
    } finally {
      setValidating(false);
    }
  }

  if (isChecking) {
    return <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white">Carregando retirada...</div>;
  }

  if (!user) return null;

  return (
    <div className="space-y-6 text-white">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <Link href="/admin/encomendas" className="inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
          <ArrowLeft className="h-4 w-4" />
          Voltar para encomendas
        </Link>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Portaria</p>
            <h1 className="mt-2 text-2xl font-semibold">Retirada rápida</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 text-justify">
              Digite o código apresentado pelo morador. Se estiver correto, a retirada será confirmada automaticamente.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Código de retirada</span>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  setMessage(null);
                }}
                className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                placeholder="Ex.: 154840"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleValidate()}
              disabled={validating || isLoading || !code.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              {validating ? 'Validando...' : 'Validar retirada'}
            </button>
          </div>
        </label>

        {matchedDelivery ? (
          <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-100">
                  {matchedDelivery.recipientPersonName || 'Destinatário não vinculado'}
                </p>
                <p className="font-medium text-white">{safeDeliveryText(matchedDelivery.deliveryCompany, 'Transportadora')}</p>
                <p className="mt-1 text-sm text-emerald-100/80">{safeDeliveryText(matchedDelivery.trackingCode, 'Sem rastreio')}</p>
              </div>
              <Badge className={getDeliveryStatusBadgeClass(matchedDelivery.status)}>
                {getDeliveryStatusLabel(matchedDelivery.status)}
              </Badge>
            </div>
          </div>
        ) : code.trim() ? (
          <p className="mt-4 text-sm text-amber-200">Nenhuma encomenda pendente encontrada para este código.</p>
        ) : null}

        {message ? (
          <div className="mt-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
            {message}
          </div>
        ) : null}
      </section>
    </div>
  );
}
