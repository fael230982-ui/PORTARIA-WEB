'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type FeedbackDialogProps = {
  open: boolean;
  title: string;
  message: string;
  tone?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
};

const toneClasses = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  error: 'border-red-500/30 bg-red-500/10 text-red-100',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  info: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100',
};

const buttonClasses = {
  success: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
  error: 'bg-red-500 text-white hover:bg-red-400',
  warning: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
  info: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300',
};

export function FeedbackDialog({ open, title, message, tone = 'info', onClose }: FeedbackDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose();
    }}>
      <AlertDialogContent className={`${toneClasses[tone]} max-w-md`}>
        <AlertDialogTitle className="text-white">{title}</AlertDialogTitle>
        <AlertDialogDescription className="whitespace-pre-line text-current">{message}</AlertDialogDescription>
        <AlertDialogAction onClick={onClose} className={buttonClasses[tone]}>
          Entendi
        </AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  );
}
