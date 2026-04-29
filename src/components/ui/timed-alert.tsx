'use client';

import { useEffect, useState } from 'react';

type TimedAlertProps = {
  children: React.ReactNode;
  tone?: 'success' | 'error' | 'info' | 'warning';
  durationMs?: number;
  onClose?: () => void;
  className?: string;
};

function getToneClasses(tone: TimedAlertProps['tone']) {
  if (tone === 'success') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
  if (tone === 'error') return 'border-red-500/30 bg-red-500/10 text-red-100';
  if (tone === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100';
}

function getProgressClasses(tone: TimedAlertProps['tone']) {
  if (tone === 'success') return 'bg-emerald-300/80';
  if (tone === 'error') return 'bg-red-300/80';
  if (tone === 'warning') return 'bg-amber-300/80';
  return 'bg-cyan-300/80';
}

export function TimedAlert({
  children,
  tone = 'info',
  durationMs = 20000,
  onClose,
  className = '',
}: TimedAlertProps) {
  const [progressActive, setProgressActive] = useState(false);

  useEffect(() => {
    const startTimer = window.setTimeout(() => setProgressActive(true), 20);
    const closeTimer = window.setTimeout(() => onClose?.(), durationMs);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(closeTimer);
    };
  }, [durationMs, onClose]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border px-4 py-3 text-sm ${getToneClasses(tone)} ${className}`}>
      <div>{children}</div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
        <div
          className={`h-full ${getProgressClasses(tone)}`}
          style={{
            width: progressActive ? '0%' : '100%',
            transition: `width ${durationMs}ms linear`,
          }}
        />
      </div>
    </div>
  );
}
