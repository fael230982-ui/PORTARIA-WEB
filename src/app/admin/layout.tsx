'use client';

import { useEffect, useState } from 'react';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

const ADMIN_MONITOR_MODE_KEY = 'admin-dashboard-monitor-mode';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, canAccess, isChecking } = useProtectedRoute({
    allowedRoles: ['ADMIN', 'MASTER', 'OPERADOR', 'CENTRAL'],
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [monitorMode, setMonitorMode] = useState(false);

  useEffect(() => {
    const syncMonitorMode = () => {
      if (typeof window === 'undefined') return;
      setMonitorMode(window.localStorage.getItem(ADMIN_MONITOR_MODE_KEY) === 'true');
    };

    syncMonitorMode();
    window.addEventListener('storage', syncMonitorMode);
    window.addEventListener('admin-monitor-mode-change', syncMonitorMode as EventListener);

    return () => {
      window.removeEventListener('storage', syncMonitorMode);
      window.removeEventListener('admin-monitor-mode-change', syncMonitorMode as EventListener);
    };
  }, []);

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
        {!monitorMode ? (
          <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((prev) => !prev)} />
        ) : null}

        <div
          className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${
            monitorMode ? 'md:ml-0' : sidebarCollapsed ? 'md:ml-20' : 'md:ml-72'
          }`}
        >
          {!monitorMode ? (
            <Header
              title="Administração"
              subtitle="Gestão de moradores, encomendas, usuários e relatórios"
              onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
              sidebarCollapsed={sidebarCollapsed}
            />
          ) : null}

          <main className={`flex-1 ${monitorMode ? 'px-0 py-0' : 'px-4 py-6 md:px-6'}`}>{children}</main>
        </div>
      </div>
    </div>
  );
}
