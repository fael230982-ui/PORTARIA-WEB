'use client';

import type React from 'react';

export function AlertDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4" onClick={() => onOpenChange?.(false)}>
      <div onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>
  );
}

export function AlertDialogContent({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`w-full max-w-lg rounded-xl border border-white/10 bg-slate-900 p-6 shadow-2xl ${className}`}>{children}</div>;
}

export function AlertDialogTitle({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h2 className={`text-lg font-semibold ${className}`}>{children}</h2>;
}

export function AlertDialogDescription({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={`mt-2 text-sm ${className}`}>{children}</p>;
}

export function AlertDialogAction({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={`mt-4 rounded-lg px-4 py-2 text-white ${className}`}>
      {children}
    </button>
  );
}
