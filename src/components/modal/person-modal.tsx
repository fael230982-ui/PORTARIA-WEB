"use client";

import { useState } from "react";
import { X, UserPlus, BadgeCheck, AlertCircle } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import type { Person, PersonCategory } from "@/types";

interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (person: Person) => void;
}

export function PersonModal({ isOpen, onClose, onSave }: PersonModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    phone: "",
    email: "",
    category: "RESIDENT" as PersonCategory,
    unitId: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = "Nome é obrigatório";
    if (!formData.document.trim()) newErrors.document = "CPF/CNPJ é obrigatório";
    if (!formData.phone.trim()) newErrors.phone = "Telefone é obrigatório";
    if (!formData.unitId.trim()) newErrors.unitId = "Unidade é obrigatória";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    // Simula API + integra com mockPeople
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onSave({
      ...formData,
      id: `p${Date.now()}`,
      categoryLabel: formData.category === "RESIDENT" ? "Morador" : 
                     formData.category === "VISITOR" ? "Visitante" :
                     formData.category === "SERVICE_PROVIDER" ? "Prestador" : "Alugante",
      status: "ACTIVE",
      statusLabel: "Ativo",
      createdAt: new Date().toISOString(),
      photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`,
    });

    setFormData({ name: "", document: "", phone: "", email: "", category: "RESIDENT", unitId: "" });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Novo Cadastro</h2>
                <p className="text-sm text-slate-400">Preencha os dados da pessoa</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nome Completo *</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border border-white/20 bg-slate-800/50 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all ${errors.name ? 'border-red-500 ring-red-500/50' : ''}`}
                placeholder="Ex: Rafael Bezerra"
              />
              {errors.name && <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">CPF/CNPJ *</label>
                <input
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border border-white/20 bg-slate-800/50 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all ${errors.document ? 'border-red-500 ring-red-500/50' : ''}`}
                  placeholder="123.456.789-00"
                />
                {errors.document && <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.document}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Telefone *</label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border border-white/20 bg-slate-800/50 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all ${errors.phone ? 'border-red-500 ring-red-500/50' : ''}`}
                  placeholder="(13) 99999-0001"
                />
                {errors.phone && <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.phone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">E-mail</label>
                <input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-white/20 bg-slate-800/50 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  placeholder="rafael@v8.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Unidade *</label>
                <input
                  value={formData.unitId}
                  onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border border-white/20 bg-slate-800/50 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all ${errors.unitId ? 'border-red-500 ring-red-500/50' : ''}`}
                  placeholder="A-101"
                />
                {errors.unitId && <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.unitId}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as PersonCategory })}
                className="w-full px-4 py-3 rounded-xl border border-white/20 bg-slate-800/50 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all"
              >
                <option value="RESIDENT">Morador</option>
                <option value="VISITOR">Visitante</option>
                <option value="SERVICE_PROVIDER">Prestador</option>
                <option value="RENTER">Alugante</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <GradientButton type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancelar
              </GradientButton>
              <GradientButton 
                type="submit" 
                variant="success" 
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <BadgeCheck className="h-4 w-4 mr-2" />
                    Salvar Pessoa
                  </>
                )}
              </GradientButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
