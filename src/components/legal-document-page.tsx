import Link from 'next/link';
import { brandClasses } from '@/config/brand-classes';

type LegalDocumentPageProps = {
  title: string;
  summary: string;
  version: string;
  sections: Array<{
    title: string;
    items: string[];
  }>;
};

export function LegalDocumentPage({
  title,
  summary,
  version,
  sections,
}: LegalDocumentPageProps) {
  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">LGPD e Governanca</p>
          <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
          <p className="mt-3 text-sm text-zinc-300">{summary}</p>
          <p className="mt-3 text-xs text-zinc-500">Versao de referencia: {version}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/termos" className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/15">
              Termo de Uso
            </Link>
            <Link href="/privacidade" className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/15">
              Politica de Privacidade
            </Link>
            <Link href="/login" className={`rounded-xl border px-4 py-2 ${brandClasses.outlineAccent}`}>
              Voltar ao login
            </Link>
          </div>
        </div>

        {sections.map((section) => (
          <section key={section.title} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-xl font-medium">{section.title}</h2>
            <div className="mt-4 space-y-2 text-sm text-zinc-300">
              {section.items.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
