'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ProxyAuthCookies } from '@/components/auth/proxy-auth-cookies';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem('dashboard-sidebar-collapsed');
    setCollapsed(raw === 'true');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('dashboard-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <ProxyAuthCookies />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((current) => !current)} />
      <div className={`flex min-h-screen flex-1 flex-col transition-[padding] duration-300 ${collapsed ? 'md:pl-20' : 'md:pl-72'}`}>
        <Topbar />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
