'use client';

import { AlertsPanel } from '@/components/alerts/alerts-panel';
import { useProtectedRoute } from '@/hooks/use-protected-route';

export default function AdminAlertasPage() {
  const { canAccess, isChecking } = useProtectedRoute({
    allowedRoles: ['ADMIN', 'GERENTE', 'MASTER'],
  });

  if (isChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white">
        Carregando alertas...
      </div>
    );
  }

  if (!canAccess) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Monitoramento</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Alertas</h1>
        <p className="mt-2 text-sm text-slate-400">
          Acompanhe ocorrências, eventos e notificações operacionais em um só lugar.
        </p>
      </section>

      <AlertsPanel
        title="Painel de alertas"
        description="Eventos consolidados para acompanhamento da operação."
        limit={30}
      />
    </div>
  );
}
