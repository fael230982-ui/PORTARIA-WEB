"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, AlertTriangle, Camera } from "lucide-react";
import { mockPeople, mockAlerts, mockCameras } from "@/services/mock-data";
import type { Person, Alert, Camera as CameraType } from "@/types";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: "person" | "alert" | "camera";
  icon: React.ElementType;
  action: () => void;
}

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const results = useMemo<SearchResult[]>(() => {
    if (query.length < 2) {
      return [];
    }

    const lowerQ = query.toLowerCase();

    // Pessoas
    const peopleResults = mockPeople
      .filter((p: Person) => p.name?.toLowerCase().includes(lowerQ) || p.unitId?.toLowerCase().includes(lowerQ))
      .slice(0, 3)
      .map((p: Person) => ({
        id: `person-${p.id}`,
        title: p.name || 'Pessoa sem nome',
        description: `${p.categoryLabel || 'N/A'} • ${p.unit?.label ? [p.unit.condominium?.name, p.unit.structure?.label, p.unit.label].filter(Boolean).join(' / ') : p.unitId ? `Unidade não resolvida (${p.unitId})` : 'Sem unidade vinculada'}`,
        type: 'person' as const,
        icon: Users,
        action: () => {
          router.push('/people');
          setOpen(false);
        }
      }));

    // Alertas
    const alertResults = mockAlerts
      .filter((a: Alert) => a.title?.toLowerCase().includes(lowerQ) || a.location?.toLowerCase().includes(lowerQ))
      .slice(0, 3)
      .map((a: Alert) => ({
        id: `alert-${a.id}`,
        title: a.title || 'Alerta sem título',
        description: `${a.location || 'N/A'} • Há pouco`,
        type: 'alert' as const,
        icon: AlertTriangle,
        action: () => {
          router.push('/alerts');
          setOpen(false);
        }
      }));

    // Câmeras (agora busca ID também: "cam")
    const cameraResults = mockCameras
      .filter((c: CameraType) => 
        c.name?.toLowerCase().includes(lowerQ) || 
        c.location?.toLowerCase().includes(lowerQ) || 
        c.id?.toLowerCase().includes(lowerQ)
      )
      .slice(0, 3)
      .map((c: CameraType) => ({
        id: `camera-${c.id}`,
        title: c.name || 'Câmera sem nome',
        description: `${c.location || 'N/A'} • ${c.status || 'Desconhecido'}`,
        type: 'camera' as const,
        icon: Camera,
        action: () => {
          router.push('/cameras');
          setOpen(false);
        }
      }));

    return [...peopleResults, ...alertResults, ...cameraResults];
  }, [query, router]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        setOpen((prevOpen) => {
          if (prevOpen) {
            setQuery("");
          }
          return !prevOpen;
        });
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm" 
        onClick={() => setOpen(false)}
      />
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4">
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-white/10 p-4">
            <Search className="text-slate-400 h-5 w-5 shrink-0" />
            <input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pessoas, câmeras, alertas... (Ctrl+K)"
              className="flex-1 bg-transparent text-white placeholder:text-slate-500 outline-none text-lg"
              autoFocus
            />
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {query.length < 2 ? (
              <div className="p-8 text-center text-slate-500">
                <Users className="mx-auto h-12 w-12 mb-4 text-slate-600" />
                <p className="text-sm">Digite para buscar pessoas, câmeras ou alertas</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Search className="mx-auto h-12 w-12 mb-4 text-slate-600" />
                <p className="text-sm">Nenhum resultado encontrado</p>
              </div>
            ) : (
              results.map((result) => (
                <button
                  key={result.id}
                  onClick={result.action}
                  className="flex w-full items-center gap-4 p-4 hover:bg-white/5 focus:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
                >
                  <result.icon className="h-5 w-5 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-white font-medium truncate">{result.title}</p>
                    <p className="text-sm text-slate-500 truncate">{result.description}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

