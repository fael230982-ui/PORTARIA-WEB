"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Cctv, Search, Users } from "lucide-react";
import { mockAlerts, mockCameras, mockPeople } from "@/services/mock-data";
import type { Alert, Camera as CameraType, Person } from "@/types";

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
    if (query.length < 2) return [];

    const lowerQ = query.toLowerCase();

    const peopleResults = mockPeople
      .filter((person: Person) => person.name?.toLowerCase().includes(lowerQ) || person.unitId?.toLowerCase().includes(lowerQ))
      .slice(0, 3)
      .map((person: Person) => ({
        id: `person-${person.id}`,
        title: person.name || "Pessoa sem nome",
        description: `${person.categoryLabel || "N/A"} • ${
          person.unit?.label
            ? [person.unit.condominium?.name, person.unit.structure?.label, person.unit.label].filter(Boolean).join(" / ")
            : person.unitId
              ? `Unidade não resolvida (${person.unitId})`
              : "Sem unidade vinculada"
        }`,
        type: "person" as const,
        icon: Users,
        action: () => {
          router.push("/admin/moradores");
          setOpen(false);
        },
      }));

    const alertResults = mockAlerts
      .filter((alert: Alert) => alert.title?.toLowerCase().includes(lowerQ) || alert.location?.toLowerCase().includes(lowerQ))
      .slice(0, 3)
      .map((alert: Alert) => ({
        id: `alert-${alert.id}`,
        title: alert.title || "Alerta sem título",
        description: `${alert.location || "N/A"} • Há pouco`,
        type: "alert" as const,
        icon: AlertTriangle,
        action: () => {
          router.push("/admin/alertas");
          setOpen(false);
        },
      }));

    const cameraResults = mockCameras
      .filter((camera: CameraType) =>
        camera.name?.toLowerCase().includes(lowerQ) ||
        camera.location?.toLowerCase().includes(lowerQ) ||
        camera.id?.toLowerCase().includes(lowerQ)
      )
      .slice(0, 3)
      .map((camera: CameraType) => ({
        id: `camera-${camera.id}`,
        title: camera.name || "Câmera sem nome",
        description: `${camera.location || "N/A"} • ${camera.status || "Desconhecido"}`,
        type: "camera" as const,
        icon: Cctv,
        action: () => {
          router.push("/admin/cameras");
          setOpen(false);
        },
      }));

    return [...peopleResults, ...alertResults, ...cameraResults];
  }, [query, router]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        event.stopPropagation();
        setOpen((current) => {
          if (current) setQuery("");
          return !current;
        });
      }
      if (event.key === "Escape") {
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
      <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[15vh]">
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-white/10 p-4">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar pessoas, câmeras, alertas... (Ctrl+B)"
              className="flex-1 bg-transparent text-lg text-white outline-none placeholder:text-slate-500"
              autoFocus
            />
          </div>

          <div className="max-h-96 overflow-y-auto">
            {query.length < 2 ? (
              <div className="p-8 text-center text-slate-500">
                <Users className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                <p className="text-sm">Digite para buscar pessoas, câmeras ou alertas</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Search className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                <p className="text-sm">Nenhum resultado encontrado</p>
              </div>
            ) : (
              results.map((result) => (
                <button
                  key={result.id}
                  onClick={result.action}
                  className="flex w-full items-center gap-4 border-b border-white/5 p-4 transition-colors last:border-b-0 hover:bg-white/5 focus:bg-white/10"
                >
                  <result.icon className="h-5 w-5 flex-shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate font-medium text-white">{result.title}</p>
                    <p className="truncate text-sm text-slate-500">{result.description}</p>
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
