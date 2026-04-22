'use client';

import { BrandFooter } from '@/components/branding/brand-footer';
import { BrandMark } from '@/components/branding/brand-mark';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  KeyRound,
  LayoutDashboard,
  Menu,
  Puzzle,
  Users,
} from 'lucide-react';
import { brandConfig } from '@/config/brand';

type MasterSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const navigation = [
  {
    label: 'Dashboard',
    href: '/master?section=overview',
    icon: LayoutDashboard,
  },
  {
    label: 'Cadastrar Cliente',
    href: '/master?section=create',
    icon: Building2,
  },
  {
    label: 'Licencas',
    href: '/master?section=licenses',
    icon: KeyRound,
  },
  {
    label: 'Administradores',
    href: '/master?section=admins',
    icon: Users,
  },
  {
    label: 'Modulos',
    href: '/master?section=modules',
    icon: Puzzle,
  },
  {
    label: 'Monitoramento',
    href: '/master?section=monitoring',
    icon: Cpu,
  },
];

export function MasterSidebar({ collapsed, onToggle }: MasterSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get('section') ?? 'overview';

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/10 bg-slate-950/95 text-white shadow-2xl backdrop-blur transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <BrandMark
          collapsed={collapsed}
          title="Painel Master"
          subtitle="Gestão global da plataforma"
          imageClassName={collapsed ? 'h-10 w-10 rounded-xl object-contain' : 'h-11 w-auto object-contain'}
        />

        <button
          type="button"
          onClick={onToggle}
          className="hidden rounded-lg bg-white/10 p-2 transition hover:bg-white/15 md:flex"
          aria-label="Alternar sidebar"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const itemUrl = new URL(item.href, 'http://localhost');
          const itemSection = itemUrl.searchParams.get('section');
          const active = pathname === '/master' && activeSection === itemSection;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                active
                  ? brandConfig.navigation.activeItemClassName
                  : brandConfig.navigation.inactiveItemClassName
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-3 text-sm text-white transition hover:bg-white/15 md:hidden"
        >
          <Menu className="h-4 w-4" />
          {collapsed ? 'Expandir' : 'Recolher'}
        </button>

        {!collapsed && (
          <div className="mt-3 rounded-xl bg-white/5 p-3 text-xs text-slate-400">
            MASTER cria condomínios e provisiona administradores.
          </div>
        )}

        <BrandFooter collapsed={collapsed} />
      </div>
    </aside>
  );
}
