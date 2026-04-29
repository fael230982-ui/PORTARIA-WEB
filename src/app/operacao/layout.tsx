import type { ReactNode } from 'react';
import { ProxyAuthCookies } from '@/components/auth/proxy-auth-cookies';

export default function OperacaoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#07111f] text-white">
      <ProxyAuthCookies />
      {children}
    </div>
  );
}
