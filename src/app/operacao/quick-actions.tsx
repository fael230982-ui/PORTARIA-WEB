'use client';

export function QuickActions() {
  const acoes = ['Registrar visitante', 'Cadastrar morador', 'Registrar encomenda', 'Abrir portão'];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <h3 className="mb-4 text-lg font-semibold">Ações rápidas</h3>
      <div className="grid gap-3">
        {acoes.map((acao) => (
          <button
            key={acao}
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-left text-sm text-white hover:bg-slate-800"
          >
            {acao}
          </button>
        ))}
      </div>
    </div>
  );
}