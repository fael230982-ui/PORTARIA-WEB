'use client';

import { brandClasses } from '@/config/brand-classes';

type SwitchProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  id?: string;
};

export function Switch({ checked = false, onCheckedChange, className = '', id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={`inline-flex h-6 w-11 items-center rounded-full border border-white/10 transition ${
        checked ? `justify-end ${brandClasses.switchOn}` : 'justify-start bg-slate-700'
      } ${className}`}
    >
      <span className="mx-1 h-4 w-4 rounded-full bg-white" />
    </button>
  );
}
