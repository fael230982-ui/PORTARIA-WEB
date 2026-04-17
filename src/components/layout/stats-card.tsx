import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  value: string;
  description?: string;
  icon?: React.ElementType;
  iconColorClass?: string;
  className?: string;
};

export function StatsCard({ title, value, description, icon: Icon, iconColorClass, className }: Props) {
  return (
    <Card className={cn('flex flex-col justify-between border-white/10 bg-white/5 backdrop-blur-xl', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
        {Icon && <Icon className={cn('h-4 w-4', iconColorClass || 'text-slate-500')} />}
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-center text-2xl font-semibold tabular-nums text-white">{value}</div>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </CardContent>
    </Card>
  );
}
