import { Badge } from '@/components/ui/badge';
import { Camera, Monitor, AlertTriangle } from 'lucide-react';
import type { CameraStatus } from '@/types/camera';

type CameraStatusIndicatorProps = {
  status: CameraStatus;
  alerts?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const statusConfig = {
  ONLINE: {
    label: 'Online',
    color: 'bg-green-500/20 text-green-300 border-green-500/30',
    icon: Monitor,
  },
  OFFLINE: {
    label: 'Offline',
    color: 'bg-red-500/20 text-red-300 border-red-500/30',
    icon: Camera,
  },
} as const;

export function CameraStatusIndicator({
  status,
  alerts,
  className = '',
  size = 'md',
}: CameraStatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const sizeClasses = {
    sm: 'text-xs h-4 w-4',
    md: 'text-sm h-3 w-3',
    lg: 'text-base h-4 w-4',
  };

  return (
    <div className="flex items-center gap-1">
      <Badge className={`${config.color} ${sizeClasses[size]} ${className}`}>
        <Icon className={`h-3 w-3 flex-shrink-0 ${size === 'sm' ? 'h-2.5 w-2.5' : ''}`} />
        {config.label}
      </Badge>

      {alerts && alerts > 0 ? (
        <Badge variant="destructive" className={`animate-pulse ${sizeClasses[size]} gap-0.5`}>
          <AlertTriangle className={`h-2.5 w-2.5 ${size === 'sm' ? 'h-2 w-2' : ''}`} />
          {alerts}
        </Badge>
      ) : null}
    </div>
  );
}
