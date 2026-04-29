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
  ScanFace,
  Server,
  Menu,
  UserCircle,
} from 'lucide-react';
import { brandConfig } from '@/config/brand';
import { useAuth } from '@/hooks/use-auth';
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
  { label: 'Usuários', href: '/admin/usuarios', icon: Shield, moduleKey: 'users' },
  { label: 'Encomendas', href: '/admin/encomendas', icon: Package, moduleKey: 'deliveries' },
  { label: 'Pendências', href: '/admin/pendencias', icon: AlertTriangle, moduleKey: 'alerts' },
  { label: 'Veículos', href: '/admin/veiculos', icon: Car, moduleKey: 'vehicles' },
  { label: 'Relatórios', href: '/admin/relatorios', icon: FileText, moduleKey: 'reports' },
  { label: 'Alertas', href: '/admin/alertas', icon: Bell, moduleKey: 'alerts' },
  { label: 'Câmeras', href: '/admin/cameras', icon: Cctv, moduleKey: 'cameras' },
  { label: 'Dispositivos', href: '/admin/dispositivos', icon: Cpu, moduleKey: 'devices' },
  { label: 'Servidores VMS', href: '/admin/servidores-vms', icon: Server, moduleKey: 'cameras' },
  { label: 'Servidores faciais', href: '/admin/servidores-faciais', icon: ScanFace, moduleKey: 'cameras' },
  { label: 'Grupos de acesso', href: '/admin/grupos-acesso', icon: Shield, moduleKey: 'access-groups' },
];

const residentNavigation: NavigationItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Perfil', href: '/dashboard/profile', icon: UserCircle },
  { label: 'Pessoas', href: '/dashboard/people', icon: Users, moduleKey: 'people' },
  { label: 'Veículos', href: '/dashboard/vehicles', icon: Car, moduleKey: 'vehicles' },
  { label: 'Alertas', href: '/dashboard/alerts', icon: Bell, moduleKey: 'alerts' },
  { label: 'Encomendas', href: '/dashboard/encomendas', icon: Package, moduleKey: 'deliveries' },
  { label: 'Câmeras', href: '/dashboard/cameras', icon: Cctv, moduleKey: 'cameras' },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  useResidenceCatalog(Boolean(user), user?.condominiumId ?? undefined);
  const baseNavigation = user?.role === 'MORADOR' ? residentNavigation : adminNavigation;
  const visibleNavigation =
    user?.role === 'GERENTE'
      ? baseNavigation.filter(
          (item) =>
            ![
              '/admin/cameras',
              '/admin/dispositivos',
              '/admin/servidores-vms',
              '/admin/servidores-faciais',
              '/admin/grupos-acesso',
            ].includes(item.href)
        )
      : baseNavigation;

  const navigateTo = (href: string) => {
    if (pathname === href) return;
    router.push(href);
  };

  return (
    <aside
      className={`app-sidebar fixed left-0 top-0 z-[80] flex h-screen flex-col border-r pointer-events-auto transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-[color:var(--surface-border)] px-4">
        <BrandMark
          collapsed={collapsed}
          title={user?.role === 'MORADOR' ? 'Portal do Morador' : user?.role === 'GERENTE' ? 'Painel Gerencial' : 'Painel Admin'}
          subtitle={user?.role === 'MORADOR' ? 'Acesso pessoal da unidade' : 'Gestão completa do condomínio'}
          imageClassName={collapsed ? 'h-10 w-10 rounded-xl object-contain' : 'h-11 w-auto object-contain'}
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={!onToggle}
          className="hidden rounded-lg border border-[color:var(--surface-border)] bg-[var(--surface-muted)] p-2 text-[color:var(--text-main)] transition hover:brightness-105 md:flex"
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
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-muted)] px-3 py-3 text-sm text-[color:var(--text-main)] transition hover:brightness-105 md:hidden"
        >
          <Menu className="h-4 w-4" />
          {collapsed ? 'Expandir' : 'Recolher'}
        </button>

        <BrandFooter collapsed={collapsed} />
      </div>
    </aside>
  );
}
