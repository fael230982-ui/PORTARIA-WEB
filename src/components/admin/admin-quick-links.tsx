'use client';

import Link from 'next/link';
import { ArrowRight, FileText, Package, Settings, Shield, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';

type QuickLink = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  colorClass: string;
};

const quickLinks: QuickLink[] = [
  {
    title: 'Moradores',
    description: 'Gerencie perfis e acessos.',
    href: ROUTES.adminMoradores,
    icon: Users,
    colorClass: 'text-cyan-300',
  },
  {
    title: 'Encomendas',
    description: 'Controle o fluxo de entregas.',
    href: ROUTES.adminEncomendas,
    icon: Package,
    colorClass: 'text-amber-300',
  },
  {
    title: 'Relatórios',
    description: 'Acesse dados e estatísticas.',
    href: ROUTES.adminRelatorios,
    icon: FileText,
    colorClass: 'text-blue-300',
  },
  {
    title: 'Usuários',
    description: 'Administre contas de acesso.',
    href: ROUTES.adminUsuarios,
    icon: Shield,
    colorClass: 'text-green-300',
  },
  {
    title: 'Unidades',
    description: 'Gerencie blocos, ruas e unidades.',
    href: '/admin/unidades',
    icon: Settings,
    colorClass: 'text-slate-300',
  },
];

export function AdminQuickLinks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acesso Rápido</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className="group">
            <div className="flex h-full flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-all duration-200 hover:border-cyan-500/30 hover:bg-white/10">
              <div className="flex items-start gap-3">
                <link.icon className={cn('h-6 w-6', link.colorClass)} />
                <div>
                  <h4 className="text-base font-semibold text-white">{link.title}</h4>
                  <p className="text-sm text-slate-400">{link.description}</p>
                </div>
              </div>
              <Button variant="link" className="mt-3 self-end p-0 text-cyan-300 hover:text-cyan-400">
                Acessar <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
