'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { canAccessRole } from '@/features/auth/access-control';
import {
  getDeliveryWithdrawalQr,
  validateDeliveryWithdrawal,
} from '@/services/deliveries.service';
import type { Delivery } from '@/types/delivery';
import {
  getDeliveryStatusBadgeClass,
  getDeliveryStatusLabel,
  safeDeliveryText,
} from '@/features/deliveries/delivery-normalizers';
import { Badge } from '@/components/ui/badge';

export default function OperacaoQuickWithdrawalPage() {
  const { user, hydrated, loading } = useAuth();
  const isChecking = loading || !hydrated;
  const canAccess = canAccessRole(user?.role, ['OPERADOR', 'CENTRAL', 'MASTER', 'ADMIN']);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [validating, setValidating] = useState(false);
  const [matchedDelivery, setMatchedDelivery] = useState<Delivery | null>(null);

  async function handleLookup() {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      setMatchedDelivery(null);
      setMessage('Digite um código para localizar a encomenda.');
      return;
    }

    setLoadingDelivery(true);
    setMessage(null);

    try {
      const delivery = await getDeliveryWithdrawalQr(normalizedCode);
      setMatchedDelivery(delivery);
    } catch (error) {
      setMatchedDelivery(null);
      setMessage(error instanceof Error ? error.message : 'Não foi possível localizar a encomenda por esse código.');
    } finally {
      setLoadingDelivery(false);
    }
  }

  async function handleValidate() {
    if (!matchedDelivery) {
      setMessage('Localize primeiro a encomenda antes de validar a retirada.');
      return;
    }

    setValidating(true);
    setMessage(null);

    try {
      const response = await validateDeliveryWithdrawal(matchedDelivery.id, { code: code.trim() });
      setMessage(response.valid ? 'Código validado e retirada confirmada.' : 'Código inválido para esta encomenda.');
      if (response.valid) {
        const refreshedDelivery = await getDeliveryWithdrawalQr(code.trim()).catch(() => null);
        setMatchedDelivery(refreshedDelivery);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível validar a retirada.');
    } finally {
      setValidating(false);
    }
  }

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111f] text-white">
        Carregando retirada rápida...
      </div>
    );
  }

  if (!canAccess || !user) return null;

  return (
    <main className="min-h-screen space-y-6 bg-[#07111f] p-6 text-white">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <Link href="/operacao" className="inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
          <ArrowLeft className="h-4 w-4" />
          Voltar para operação
        </Link>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Operação</p>
            <h1 className="mt-2 text-2xl font-semibold">Retirada rápida</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 text-justify">
              Digite o código apresentado pelo morador. A tela consulta só a encomenda correspondente e valida a retirada sem carregar toda a base.
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
              onClick={() => void handleLookup()}
              disabled={loadingDelivery || !code.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search className="h-4 w-4" />
              {loadingDelivery ? 'Buscando...' : 'Localizar'}
            </button>
            <button
              type="button"
              onClick={() => void handleValidate()}
              disabled={validating || !code.trim() || !matchedDelivery}
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
        ) : null}

        {message ? (
          <div className="mt-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
            {message}
          </div>
        ) : null}
      </section>
    </main>
  );
}
