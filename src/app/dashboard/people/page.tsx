'use client';

import { PageContainer } from '@/components/layout/page-container';
import { PeopleTable } from '@/components/people/people-table';
import { getCondominiumEnabledModules, getCurrentCondominium, isModuleEnabled } from '@/features/condominiums/condominium-contract';
import { useAuth } from '@/hooks/use-auth';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';

export default function PeoplePage() {
  const { user } = useAuth();
  const { condominiums } = useResidenceCatalog(Boolean(user), user?.condominiumId ?? undefined);
  const currentCondominium = getCurrentCondominium(condominiums, user?.condominiumId);
  const enabledModules = getCondominiumEnabledModules(currentCondominium);
  const peopleEnabled = isModuleEnabled(enabledModules, 'people');

  return (
    <PageContainer title="Pessoas" description="Acompanhe e atualize as pessoas vinculadas a sua unidade.">
      {!peopleEnabled ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
          O acesso a pessoas não está disponível para a sua unidade neste momento.
        </div>
      ) : (
        <PeopleTable />
      )}
    </PageContainer>
  );
}
