'use client';

import { BrandMark } from '@/components/branding/brand-mark';
import { PanelLeftClose, PanelLeftOpen, Bell, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getCurrentCondominium } from '@/features/condominiums/condominium-contract';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';
import { useRouter } from 'next/navigation';

type HeaderProps = {
  title: string;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
};

export function Header({
  title,
  onToggleSidebar,
  sidebarCollapsed,
}: HeaderProps) {
  const router = useRouter();
  const { clearSession, user } = useAuth();
  const { condominiums, isLoading } = useResidenceCatalog(Boolean(user?.condominiumId));
  const currentCondominium = getCurrentCondominium(condominiums, user?.condominiumId);
  const condominiumName = currentCondominium?.name ?? null;

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="flex h-12 items-center justify-between gap-3 px-3 md:px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-xl bg-white/10 p-2 transition hover:bg-white/15"
            aria-label="Alternar sidebar"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-3">
            <BrandMark collapsed imageClassName="h-7 w-auto object-contain" />
            <div>
              <h1 className="text-sm font-semibold text-white md:text-base">{title}</h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === 'ADMIN' || user?.role === 'GERENTE' ? (
            <div className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-right md:block">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Condomínio</p>
              <p className="text-sm font-medium text-white">
                {condominiumName ?? (isLoading ? 'Carregando...' : 'Não vinculado')}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            className="rounded-xl bg-white/10 p-2 transition hover:bg-white/15"
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="rounded-xl bg-white/10 p-2 transition hover:bg-white/15"
            aria-label="Configurações"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
