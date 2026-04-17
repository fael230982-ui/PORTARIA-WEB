'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRouteForRole } from '@/features/auth/access-control';
import {
  acceptCurrentLegalVersion,
  hasAcceptedCurrentLegalVersion,
  LEGAL_VERSION,
} from '@/features/legal/legal-documents';
import { useAuth } from '@/hooks/use-auth';

export default function AcordoPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }
    if (hasAcceptedCurrentLegalVersion()) {
      router.replace(getRouteForRole(user.role));
    }
  }, [isAuthenticated, loading, router, user]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Primeiro acesso</p>
        <h1 className="mt-2 text-3xl font-semibold">Termo e privacidade</h1>
        <p className="mt-3 text-sm text-zinc-300">
          Antes de continuar, leia os documentos de uso e privacidade da plataforma. Esta confirmacao e registrada localmente nesta versao do sistema.
        </p>
        <p className="mt-2 text-xs text-zinc-500">Versao dos documentos: {LEGAL_VERSION}</p>

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link href="/termos" className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/15">
            Ler Termo de Uso
          </Link>
          <Link href="/privacidade" className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/15">
            Ler Politica de Privacidade
          </Link>
        </div>

        <label className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span className="text-sm text-zinc-200">
            Li e estou ciente do Termo de Uso e da Politica de Privacidade desta plataforma para continuar utilizando o sistema.
          </span>
        </label>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={!accepted || !user}
            onClick={() => {
              acceptCurrentLegalVersion();
              if (user) {
                router.replace(getRouteForRole(user.role));
              }
            }}
            className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Concordo e continuar
          </button>
        </div>
      </div>
    </div>
  );
}
