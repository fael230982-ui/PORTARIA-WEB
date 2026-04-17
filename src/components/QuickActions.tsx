'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DoorOpen, ShieldCheck, UserPlus, Megaphone, Package, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

type QuickActionsProps = {
  onOpenDoor?: () => void;
  onCallSecurity?: () => void;
  onRegisterVisitor?: () => void;
  onAcknowledgeAlert?: () => void;
};

export function QuickActions({
  onOpenDoor,
  onCallSecurity,
  onRegisterVisitor,
  onAcknowledgeAlert,
}: QuickActionsProps) {
  const router = useRouter();

  const actions = [
    {
      label: 'Abrir Porta',
      icon: DoorOpen,
      onClick: onOpenDoor || (() => alert('Porta aberta!')),
      variant: 'default' as const,
    },
    {
      label: 'Acionar Segurança',
      icon: ShieldCheck,
      onClick: onCallSecurity || (() => alert('Segurança acionada!')),
      variant: 'secondary' as const,
    },
    {
      label: 'Registrar Visitante',
      icon: UserPlus,
      onClick: onRegisterVisitor || (() => router.push('/operacao/visitantes')),
      variant: 'secondary' as const,
    },
    {
      label: 'Reconhecer Alerta',
      icon: Megaphone,
      onClick: onAcknowledgeAlert || (() => alert('Alerta reconhecido!')),
      variant: 'outline' as const,
    },
    {
      label: 'Encomendas',
      icon: Package,
      onClick: () => router.push('/operacao/encomendas'),
      variant: 'outline' as const,
    },
    {
      label: 'Moradores',
      icon: Users,
      onClick: () => router.push('/operacao/moradores'),
      variant: 'outline' as const,
    },
  ];

  return (
    <Card className="border-white/10 bg-slate-950 text-white">
      <CardHeader>
        <CardTitle className="text-base">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-3 lg:grid-cols-6">
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              variant={action.variant}
              className="gap-2 h-auto py-3 flex-1"
            >
              <action.icon className="h-4 w-4" />
              <span className="text-xs whitespace-nowrap">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}