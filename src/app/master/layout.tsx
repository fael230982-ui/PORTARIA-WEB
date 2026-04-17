'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BrandPoweredBy } from '@/components/branding/brand-powered-by';
import { BrandMark } from '@/components/branding/brand-mark';
import { MasterSidebar } from '@/components/layout/master-sidebar';
import { useAuth } from '@/hooks/use-auth';
import { useProtectedRoute } from '@/hooks/use-protected-route';

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { clearSession, user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { canAccess, isChecking } = useProtectedRoute({
    allowedRoles: ['MASTER'],
  });

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Carregando painel master...
      </div>
    );
  }

  if (!canAccess || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <MasterSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((current) => !current)} />

      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-72'}`}>
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
            <div className="flex items-center gap-4">
              <BrandMark
                title="Painel Master"
                subtitle="Gestao global da plataforma"
                imageClassName="h-11 w-auto object-contain"
              />
            </div>

            <div className="flex items-center gap-4">
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

        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>

        <footer className="mt-auto px-4 pb-6 md:px-6">
          <div className="flex justify-center rounded-xl bg-white px-3 py-2 shadow-sm md:justify-end">
            <BrandPoweredBy compact imageClassName="h-16 w-auto object-contain" />
          </div>
        </footer>
      </div>
    </div>
  );
}
