export const ROLES = {
  MASTER: "MASTER",
  PARCEIRO: "PARCEIRO",
  ADMIN: "ADMIN",
  GERENTE: "GERENTE",
  OPERADOR: "OPERADOR",
  CENTRAL: "CENTRAL",
  MORADOR: "MORADOR",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
