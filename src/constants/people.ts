export const PERSON_CATEGORIES = {
  RESIDENT: "RESIDENT",
  VISITOR: "VISITOR",
  SERVICE_PROVIDER: "SERVICE_PROVIDER",
  RENTER: "RENTER",
} as const;

export const PERSON_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  BLOCKED: "BLOCKED",
  EXPIRED: "EXPIRED",
} as const;

export const personCategoryLabels = {
  RESIDENT: "Morador",
  VISITOR: "Visitante",
  SERVICE_PROVIDER: "Prestador",
  RENTER: "Alugante",
} as const;

export const personStatusLabels = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  BLOCKED: "Bloqueado",
  EXPIRED: "Vencido",
} as const;

export const personCategoryColors = {
  RESIDENT: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  VISITOR: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  SERVICE_PROVIDER: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  RENTER: "bg-violet-500/15 text-violet-400 border-violet-500/20",
} as const;

export const personStatusColors = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  INACTIVE: "bg-slate-500/15 text-slate-300 border-slate-500/20",
  BLOCKED: "bg-red-500/15 text-red-400 border-red-500/20",
  EXPIRED: "bg-amber-500/15 text-amber-300 border-amber-500/20",
} as const;
