'use client';

import { useState } from 'react';

export type ReportFormData = {
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  visibility: string;
};

type ReportFormProps = {
  initialData?: Partial<ReportFormData>;
  onSubmit: (data: ReportFormData) => Promise<void> | void;
  onCancel: () => void;
  loading?: boolean;
};

const defaultValues: ReportFormData = {
  title: '',
  description: '',
  category: 'geral',
  status: 'ativo',
  priority: 'normal',
  visibility: 'publico',
};

function getInitialValues(initialData?: Partial<ReportFormData>): ReportFormData {
  return {
    ...defaultValues,
    ...initialData,
  };
}

export function ReportForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}: ReportFormProps) {
  const [form, setForm] = useState<ReportFormData>(() => getInitialValues(initialData));

  const handleChange = (
    field: keyof ReportFormData,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Título</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            placeholder="Digite o título"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Categoria</span>
          <select
            value={form.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            <option value="geral">Geral</option>
            <option value="operacional">Operacional</option>
            <option value="seguranca">Segurança</option>
            <option value="financeiro">Financeiro</option>
            <option value="manutencao">Manutenção</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Status</span>
          <select
            value={form.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="rascunho">Rascunho</option>
            <option value="arquivado">Arquivado</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Prioridade</span>
          <select
            value={form.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            <option value="baixa">Baixa</option>
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm text-slate-300">Visibilidade</span>
        <select
          value={form.visibility}
          onChange={(e) => handleChange('visibility', e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
        >
          <option value="publico">Público</option>
          <option value="interno">Interno</option>
          <option value="restrito">Restrito</option>
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-slate-300">Descrição</span>
        <textarea
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={6}
          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500"
          placeholder="Digite a descrição"
          required
        />
      </label>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Salvando...' : 'Salvar na API'}
        </button>
      </div>
    </form>
  );
}
