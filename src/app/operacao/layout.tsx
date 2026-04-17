import type { ReactNode } from 'react';

export default function OperacaoLayout({ children }: { children: ReactNode }) {
  return <div className="h-screen w-screen overflow-hidden bg-[#07111f] text-white">{children}</div>;
}
