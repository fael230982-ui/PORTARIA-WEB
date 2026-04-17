'use client';

export function AdminQuickLinks() {
  const links = ['Novo usuário', 'Novo morador', 'Cadastrar face', 'Registrar encomenda'];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <h3 className="mb-4 text-lg font-semibold">Atalhos administrativos</h3>
      <div className="grid gap-3">
        {links.map((link) => (
          <button
            key={link}
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-left text-sm text-white hover:bg-slate-800"
          >
            {link}
          </button>
        ))}
      </div>
    </div>
  );
}