'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useAllDeliveries } from '@/hooks/use-deliveries';
import {
  getDeliveryWithdrawalCode,
  getDeliveryStatusBadgeClass,
  getDeliveryStatusLabel,
  normalizeDeliveries,
  safeDeliveryText,
} from '@/features/deliveries/delivery-normalizers';
import { maskSecretCode } from '@/features/legal/data-masking';
import { Badge } from '@/components/ui/badge';

function formatDate(value?: string | null) {
  if (!value) return 'Não informado';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function DeliveryDetailsPage() {
  const params = useParams<{ id: string }>();
  const { user, canAccess, isChecking } = useProtectedRoute({
    allowedRoles: ['ADMIN', 'MASTER', 'OPERADOR'],
  });
  const { data, isLoading } = useAllDeliveries({ limit: 100, enabled: Boolean(user) });
  const deliveries = useMemo(() => normalizeDeliveries(data), [data]);
  const delivery = deliveries.find((item) => item.id === params.id) ?? null;

  if (isChecking) {
    return <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white">Carregando encomenda...</div>;
  }

  if (!canAccess || !user) return null;

  return (
    <div className="space-y-6 text-white">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <Link href="/admin/encomendas" className="inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
          <ArrowLeft className="h-4 w-4" />
          Voltar para encomendas
        </Link>
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Detalhes</p>
          <h1 className="mt-2 text-2xl font-semibold">Encomenda</h1>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-slate-300">Carregando...</div>
      ) : !delivery ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
          <Package className="mx-auto mb-3 h-10 w-10 text-slate-500" />
          Encomenda não encontrada na listagem atual.
        </div>
      ) : (
        <section className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{safeDeliveryText(delivery.deliveryCompany, 'Transportadora')}</h2>
                <p className="mt-1 text-sm text-slate-400">{safeDeliveryText(delivery.trackingCode, 'Sem rastreio')}</p>
              </div>
              <Badge className={getDeliveryStatusBadgeClass(delivery.status)}>
                {getDeliveryStatusLabel(delivery.status)}
              </Badge>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <Info label="Unidade" value={delivery.recipientUnitId} />
              <Info label="Pessoa vinculada" value={delivery.recipientPersonName || delivery.recipientPersonId || 'Sem pessoa vinculada'} />
              <Info label="Criada em" value={formatDate(delivery.createdAt)} />
              <Info label="Atualizada em" value={formatDate(delivery.updatedAt)} />
              <Info label="Entrada na portaria" value={formatDate(delivery.receivedAt)} />
              <Info label="Recebida por" value={delivery.receivedByName || delivery.receivedByUserId || delivery.receivedBy || 'Não informado'} />
              <Info label="Aviso enviado em" value={formatDate(delivery.notificationSentAt)} />
              <Info label="Código de retirada" value={maskSecretCode(getDeliveryWithdrawalCode(delivery)) || 'Não informado'} />
              <Info label="Foto do pacote" value={delivery.packagePhotoUrl || 'Não informada'} />
              <Info label="Foto da etiqueta" value={delivery.labelPhotoUrl || 'Não informada'} />
              <Info label="Client request id" value={delivery.clientRequestId || 'Não informado'} />
              <Info label="Retirada em" value={formatDate(delivery.withdrawnAt)} />
              <Info label="Retirado por" value={delivery.withdrawnByName || delivery.withdrawnBy || 'Não informado'} />
              <Info label="Validado por" value={delivery.withdrawalValidatedByUserName || delivery.withdrawalValidatedByUserId || 'Não informado'} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Linha do tempo</h2>
            <div className="mt-5 space-y-3 text-sm">
              <TimelineItem label="Entrada na portaria" value={formatDate(delivery.receivedAt)} />
              <TimelineItem label="Aviso enviado" value={formatDate(delivery.notificationSentAt)} />
              <TimelineItem label="Validação da retirada" value={formatDate(delivery.withdrawalValidatedAt)} />
              <TimelineItem label="Retirada confirmada" value={formatDate(delivery.withdrawnAt)} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm text-white">{value}</p>
    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <p className="font-medium text-white">{label}</p>
      <p className="mt-1 text-slate-400">{value}</p>
    </div>
  );
}
