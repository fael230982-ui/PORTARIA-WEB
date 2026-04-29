'use client';

import { Moon, Palette, Sun } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { themePresets } from '@/config/theme-presets';
import { useAppTheme } from '@/components/theme/app-theme-provider';

const hiddenPrefixes = ['/login', '/privacidade', '/termos', '/acordo'];

export function ThemeControl() {
  const pathname = usePathname();
  const { mode, preset, setMode, setPreset } = useAppTheme();

  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[95] w-[min(92vw,320px)] rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface)] p-3 text-[color:var(--text-main)] shadow-[var(--shadow-elevated)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Tema visual</p>
            <p className="text-sm font-medium text-[color:var(--text-soft)]">Claro, escuro e paletas white label</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-muted)] p-1">
          <button
            type="button"
            onClick={() => setMode('light')}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${mode === 'light' ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]' : 'text-[color:var(--text-soft)] hover:bg-white/10'}`}
          >
            <Sun className="mr-1 inline h-3.5 w-3.5" />
            Claro
          </button>
          <button
            type="button"
            onClick={() => setMode('dark')}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${mode === 'dark' ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]' : 'text-[color:var(--text-soft)] hover:bg-white/10'}`}
          >
            <Moon className="mr-1 inline h-3.5 w-3.5" />
            Escuro
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {themePresets.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setPreset(item.key)}
            className={`rounded-2xl border px-3 py-3 text-left transition ${
              preset === item.key
                ? 'border-[color:var(--nav-active-bg)] bg-[var(--surface-strong)] shadow-[var(--shadow-elevated)]'
                : 'border-[color:var(--surface-border)] bg-[var(--surface-muted)] hover:bg-[var(--surface-strong)]'
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: `hsl(${item.primary})` }}
              />
              <p className="text-sm font-semibold text-[color:var(--text-main)]">{item.label}</p>
            </div>
            <p className="text-xs text-[color:var(--text-muted)]">{item.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
