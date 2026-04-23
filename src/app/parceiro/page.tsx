'use client';

import { Building2, KeyRound, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProtectedRoute } from '@/hooks/use-protected-route';

export default function PartnerPage() {
  const { isChecking, canAccess } = useProtectedRoute({ allowedRoles: ['PARCEIRO'] });

  if (isChecking || !canAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Carregando...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-200">Área do parceiro</p>
          <h1 className="mt-2 text-3xl font-semibold">Clientes e chaves de ativação</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Este painel ficará disponível para empresas parceiras criarem e acompanharem apenas os próprios clientes, usando chaves de ativação emitidas pelo Master.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-white/10 bg-white/[0.04] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-5 w-5 text-cyan-200" /> Clientes próprios</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              Listagem e cadastro serão liberados quando o backend publicar `/partner/clients`.
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.04] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-5 w-5 text-emerald-200" /> Chaves disponíveis</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              O parceiro verá saldo, validade e uso das chaves emitidas para ele.
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.04] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-fuchsia-200" /> Escopo protegido</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              O perfil Parceiro não acessa clientes da plataforma fora do próprio vínculo.
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
