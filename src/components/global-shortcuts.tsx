'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Keyboard, X } from 'lucide-react';

const shortcutHelp = [
  { keys: 'Ctrl + M', label: 'Abrir Moradores' },
  { keys: 'Ctrl + E', label: 'Abrir Encomendas' },
  { keys: 'Ctrl + B', label: 'Busca rápida' },
];

const shortcutRoutes: Record<string, string> = {
  m: '/admin/moradores',
  e: '/admin/encomendas',
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable ||
    target.closest('[data-disable-global-shortcuts="true"]') !== null
  );
}

export function GlobalShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const isPrimaryModifier = event.ctrlKey || event.metaKey;
      const route = shortcutRoutes[key];

      if (!isPrimaryModifier || event.altKey || !route) return;

      event.preventDefault();
      router.push(route);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 shadow-2xl shadow-black/30 backdrop-blur transition hover:bg-slate-900"
        aria-label="Ver atalhos do sistema"
      >
        <Keyboard className="h-3.5 w-3.5" />
        Atalhos
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-end bg-black/35 p-4 backdrop-blur-sm sm:items-end">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Fechar atalhos"
          />
          <section className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950/95 p-4 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Navegação</p>
                <h2 className="mt-1 text-lg font-semibold">Atalhos disponíveis</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {shortcutHelp.map((shortcut) => (
                <div key={shortcut.keys} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <span className="text-sm text-slate-300">{shortcut.label}</span>
                  <kbd className="shrink-0 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] font-semibold text-cyan-100">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Os atalhos ficam desativados enquanto você digita em campos de formulário.
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}
