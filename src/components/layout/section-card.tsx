import React from 'react';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
};

export function SectionCard({ title, subtitle, children, className }: Props) {
  return (
    <Card className={cn('border-white/10 bg-white/5 backdrop-blur-xl', className)}>
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        {subtitle && <CardDescription className="text-slate-400">{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}