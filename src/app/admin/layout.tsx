'use client';

import { useState } from 'react';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, canAccess, isChecking } = useProtectedRoute({
    allowedRoles: ['ADMIN', 'MASTER', 'OPERADOR', 'CENTRAL'],
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Carregando painel administrativo...
      </div>
    );
  }

  if (!canAccess || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((prev) => !prev)} />

        <div
          className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${
            sidebarCollapsed ? 'md:ml-20' : 'md:ml-72'
          }`}
        >
          <Header
            title="Administração"
            subtitle="Gestão de moradores, encomendas, usuários e relatórios"
            onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
            sidebarCollapsed={sidebarCollapsed}
          />

          <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
