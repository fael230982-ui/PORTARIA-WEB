'use client';

import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type ActivityItem = {
  id: string;
  time: string;
  description: string;
  status: 'success' | 'warning' | 'info' | 'error';
};

const statusMap = {
  success: {
    icon: CheckCircle,
    color: 'text-green-400',
    badgeVariant: 'default' as const,
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    badgeVariant: 'destructive' as const,
  },
  info: {
    icon: Info,
    color: 'text-cyan-400',
    badgeVariant: 'secondary' as const,
  },
  error: {
    icon: XCircle,
    color: 'text-red-400',
    badgeVariant: 'destructive' as const,
  },
};

export function ActivityFeed({ items = [] }: { items?: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
            Nenhuma atividade recente disponível.
          </div>
        ) : (
          items.map((activity) => {
            const { icon: Icon, color, badgeVariant } = statusMap[activity.status];
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <Icon className={cn('h-5 w-5 shrink-0', color)} />
                <div className="flex-1">
                  <p className="text-sm text-white">{activity.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-slate-500">{activity.time}</span>
                    <Badge variant={badgeVariant} className="text-[10px] uppercase">
                      {activity.status}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
