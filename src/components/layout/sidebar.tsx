'use client';

import { BrandFooter } from '@/components/branding/brand-footer';
import { BrandMark } from '@/components/branding/brand-mark';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Building2,
  Users,
  Package,
  FileText,
  Shield,
  Bell,
  Cctv,
  Car,
  AlertTriangle,
  Cpu,
  Menu,
  UserCircle,
} from 'lucide-react';
import { brandConfig } from '@/config/brand';
import { useAuth } from '@/hooks/use-auth';
import {
  getCondominiumEnabledModules,
  getCurrentCondominium,
} from '@/features/condominiums/condominium-contract';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';

type SidebarProps = {
  collapsed: boolean;
  onToggle?: () => void;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  moduleKey?: string;
};

const adminNavigation: NavigationItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Unidades', href: '/admin/unidades', icon: Building2, moduleKey: 'units' },
  { label: 'Moradores', href: '/admin/moradores', icon: Users, moduleKey: 'people' },
  { label: 'Usuarios', href: '/admin/usuarios', icon: Shield, moduleKey: 'users' },
  { label: 'Encomendas', href: '/admin/encomendas', icon: Package, moduleKey: 'deliveries' },
  { label: 'Pendencias', href: '/admin/pendencias', icon: AlertTriangle, moduleKey: 'alerts' },
  { label: 'Veiculos', href: '/admin/veiculos', icon: Car, moduleKey: 'vehicles' },
  { label: 'Relatorios', href: '/admin/relatorios', icon: FileText, moduleKey: 'reports' },
  { label: 'Alertas', href: '/admin/alertas', icon: Bell, moduleKey: 'alerts' },
  { label: 'Cameras', href: '/admin/cameras', icon: Cctv, moduleKey: 'cameras' },
  { label: 'Dispositivos', href: '/admin/dispositivos', icon: Cpu, moduleKey: 'devices' },
  { label: 'Grupos de acesso', href: '/admin/grupos-acesso', icon: Shield, moduleKey: 'access-groups' },
];

const residentNavigation: NavigationItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Perfil', href: '/dashboard/profile', icon: UserCircle },
  { label: 'Pessoas', href: '/dashboard/people', icon: Users, moduleKey: 'people' },
  { label: 'Veiculos', href: '/dashboard/vehicles', icon: Car, moduleKey: 'vehicles' },
  { label: 'Alertas', href: '/dashboard/alerts', icon: Bell, moduleKey: 'alerts' },
  { label: 'Encomendas', href: '/dashboard/encomendas', icon: Package, moduleKey: 'deliveries' },
  { label: 'Cameras', href: '/dashboard/cameras', icon: Cctv, moduleKey: 'cameras' },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { condominiums } = useResidenceCatalog(Boolean(user), user?.condominiumId ?? undefined);
  const currentCondominium = getCurrentCondominium(condominiums, user?.condominiumId);
  const enabledModules = getCondominiumEnabledModules(currentCondominium);
  const baseNavigation = user?.role === 'MORADOR' ? residentNavigation : adminNavigation;
  const visibleNavigation = baseNavigation;

  const navigateTo = (href: string) => {
    if (pathname === href) return;
    router.push(href);
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-[80] flex h-screen flex-col border-r border-white/10 bg-slate-950/95 text-white shadow-2xl backdrop-blur pointer-events-auto transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <BrandMark
          collapsed={collapsed}
          title={user?.role === 'MORADOR' ? 'Portal do Morador' : 'Painel Admin'}
          subtitle={user?.role === 'MORADOR' ? 'Acesso pessoal da unidade' : 'Gestao completa do condominio'}
          imageClassName={collapsed ? 'h-10 w-10 rounded-xl object-contain' : 'h-11 w-auto object-contain'}
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={!onToggle}
          className="hidden rounded-lg bg-white/10 p-2 transition hover:bg-white/15 md:flex"
          aria-label="Alternar sidebar"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNavigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => navigateTo(item.href)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                active
                  ? brandConfig.navigation.activeItemClassName
                  : brandConfig.navigation.inactiveItemClassName
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={!onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-3 text-sm text-white transition hover:bg-white/15 md:hidden"
        >
          <Menu className="h-4 w-4" />
          {collapsed ? 'Expandir' : 'Recolher'}
        </button>

        {!collapsed && (
          <div className="mt-3 rounded-xl bg-white/5 p-3 text-xs text-slate-400">
            Use o menu lateral para acessar as areas da sua conta.
          </div>
        )}

        <BrandFooter collapsed={collapsed} />
      </div>
    </aside>
  );
}
