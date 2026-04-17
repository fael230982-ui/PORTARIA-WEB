export const ROLES = {
  MASTER: "MASTER",
  ADMIN: "ADMIN",
  OPERADOR: "OPERADOR",
  CENTRAL: "CENTRAL",
  MORADOR: "MORADOR",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
