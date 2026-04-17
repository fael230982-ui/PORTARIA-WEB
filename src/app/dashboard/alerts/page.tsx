'use client';

import { AlertsPanel } from '@/components/alerts/alerts-panel';
import { PageContainer } from '@/components/layout/page-container';

export default function AlertsPage() {
  return (
    <PageContainer
      title="Alertas"
      description="Veja os avisos e ocorrencias mais recentes da sua unidade."
    >
      <AlertsPanel
        title="Avisos recentes"
        description="Aqui ficam os alertas mais recentes para voce acompanhar."
        limit={20}
      />
    </PageContainer>
  );
}
