'use client';

import { Package, QrCode, RefreshCw } from 'lucide-react';
import { ResidentUnitGate } from '@/components/auth/resident-unit-gate';
import { PageContainer } from '@/components/layout/page-container';
import { brandClasses } from '@/config/brand-classes';
import {
  getDeliveryPhotoUrl,
  getDeliveryWithdrawalCode,
  getDeliveryWithdrawalQrUrl,
} from '@/features/deliveries/delivery-normalizers';
import { useAuth } from '@/hooks/use-auth';
import { useResidentDeliveries } from '@/hooks/use-resident';
import type { DeliveryStatus } from '@/types/delivery';

function formatDate(value?: string | null) {
  if (!value) return 'Sem data';

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

function statusLabel(status: DeliveryStatus | string) {
  const normalized = String(status).toUpperCase();
  if (normalized === 'WITHDRAWN') return 'Retirada';
  if (normalized === 'NOTIFIED') return 'Aviso enviado';
  return 'Aguardando retirada';
}

function statusClass(status: DeliveryStatus | string) {
  const normalized = String(status).toUpperCase();
  if (normalized === 'WITHDRAWN') return 'bg-slate-500/15 text-slate-200';
  if (normalized === 'NOTIFIED') return 'bg-sky-500/15 text-sky-200';
  return 'bg-emerald-500/15 text-emerald-200';
}

export default function ResidentDeliveriesPage() {
  const { user } = useAuth();
  const activeUnitId = user?.selectedUnitId ?? user?.unitId ?? null;

  const { data, isLoading, error, refetch } = useResidentDeliveries({
    page: 1,
    limit: 50,
    recipientUnitId: activeUnitId ?? undefined,
    enabled: Boolean(user?.role === 'MORADOR' && activeUnitId),
  });
  const deliveries = data?.data ?? [];

  return (
    <PageContainer title="Minhas encomendas" description="Acompanhe as encomendas que chegaram para a sua unidade.">
      <div className="space-y-6">
        <ResidentUnitGate />

        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-white md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-300">
            Apresente o codigo de retirada na portaria. Quando a retirada for confirmada, o status muda para retirada.
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </section>

        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300">Carregando encomendas...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-100">
            Nao foi possivel carregar suas encomendas agora.
          </div>
        ) : deliveries.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
            <Package className="mx-auto mb-3 h-10 w-10 text-slate-500" />
            Nenhuma encomenda aguardando retirada.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {deliveries.map((delivery) => {
              const code = getDeliveryWithdrawalCode(delivery);
              const photoUrl = getDeliveryPhotoUrl(delivery);
              const qrUrl = getDeliveryWithdrawalQrUrl(delivery);

              return (
                <article key={delivery.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold">{delivery.deliveryCompany || 'Transportadora'}</p>
                      <p className="mt-1 text-sm text-slate-400">{delivery.trackingCode || 'Sem codigo de rastreio'}</p>
                    </div>
                    <span className={`rounded-lg px-3 py-1 text-xs font-medium ${statusClass(delivery.status)}`}>
                      {statusLabel(delivery.status)}
                    </span>
                  </div>

                  {photoUrl ? (
                    <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-slate-950/60">
                      <img
                        src={photoUrl}
                        alt={`Foto da encomenda ${delivery.trackingCode || delivery.deliveryCompany || delivery.id}`}
                        className="h-52 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                      Esta encomenda nao possui foto disponivel.
                    </div>
                  )}

                  <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
                      <p className="text-slate-500">Entrada na portaria</p>
                      <p className="mt-1 text-white">{formatDate(delivery.receivedAt)}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
                      <p className="text-slate-500">Codigo de retirada</p>
                      <p className={`mt-1 font-mono text-lg ${brandClasses.accentTextSoft}`}>{code || 'Aguardando codigo'}</p>
                    </div>
                  </div>

                  {qrUrl ? (
                    <div className={`mt-4 rounded-lg border p-4 text-sm text-white ${brandClasses.softAccentPanel}`}>
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        Codigo de retirada disponivel
                      </div>
                      <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white p-3">
                        <img
                          src={qrUrl}
                          alt={`QR da encomenda ${delivery.trackingCode || delivery.id}`}
                          className="mx-auto h-44 w-44 object-contain"
                          loading="lazy"
                        />
                      </div>
                      <p className={`mt-3 text-center text-xs ${brandClasses.accentTextSoft}`}>
                        Mostre este QR code na retirada. Ele representa o mesmo codigo exibido acima.
                      </p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
