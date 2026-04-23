'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandMark } from '@/components/branding/brand-mark';
import { BrandPoweredBy } from '@/components/branding/brand-powered-by';
import { getBrandEyebrowClassName } from '@/config/brand-classes';
import { brandConfig } from '@/config/brand';
import { ActiveUnitSelector } from '@/components/auth/active-unit-selector';
import { useAuth } from '@/hooks/use-auth';
import { getCurrentCondominium } from '@/features/condominiums/condominium-contract';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';

const residentPageLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/profile': 'Perfil',
  '/dashboard/people': 'Pessoas',
  '/dashboard/vehicles': 'Veículos',
  '/dashboard/alerts': 'Alertas',
  '/dashboard/encomendas': 'Encomendas',
  '/dashboard/cameras': 'Câmeras',
};

export function Topbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { condominiums, isLoading } = useResidenceCatalog(Boolean(user?.condominiumId));
  const currentCondominium = getCurrentCondominium(condominiums, user?.condominiumId);
  const condominiumName = currentCondominium?.name ?? null;
  const residentName = user?.personName || user?.name || 'Morador';
  const activeUnitLabel = user?.selectedUnitName || user?.unitName || 'Nenhuma unidade selecionada';
  const residentPageLabel = residentPageLabels[pathname] || 'Portal do morador';

  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <BrandMark collapsed imageClassName="h-8 w-auto object-contain" />
        {user?.role === 'MORADOR' ? (
          <div className="hidden min-w-0 md:block">
            <p className={`text-xs uppercase tracking-[0.2em] ${getBrandEyebrowClassName()}`}>{residentPageLabel}</p>
            <h2 className="truncate text-base font-semibold text-white">{activeUnitLabel}</h2>
          </div>
        ) : (
          <div className="hidden md:block">
            <p className={`text-xs uppercase tracking-[0.2em] ${getBrandEyebrowClassName()}`}>{brandConfig.topbarEyebrow}</p>
            <h2 className="text-base font-semibold text-white">{brandConfig.topbarTitle}</h2>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user?.role === 'MORADOR' ? (
          <>
            <div className="hidden min-w-[240px] md:block">
              <ActiveUnitSelector className="p-3" />
            </div>
            <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-right md:block">
              <p className="text-xs text-slate-400">Morador</p>
              <p className="text-sm font-medium text-white">{residentName}</p>
              <p className="text-xs text-slate-500">{user?.email || 'E-mail não informado'}</p>
            </div>
            <Link
              href="/dashboard/profile"
              className="hidden rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15 md:inline-flex"
            >
              Meu perfil
            </Link>
          </>
        ) : null}
        <div className="hidden text-right md:block">
          <p className="text-xs text-slate-400">Condomínio ativo</p>
          <p className="text-sm font-medium text-white">
            {condominiumName ?? (isLoading ? 'Carregando...' : 'Não vinculado')}
          </p>
        </div>
        <BrandPoweredBy compact imageClassName="h-7 w-auto object-contain opacity-85" />
      </div>
    </header>
  );
}
