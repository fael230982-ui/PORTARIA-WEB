import type { Role } from "@/constants/roles";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
  condominiumId?: string | null;
  unitId?: string | null;
  streetIds?: string[];
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};
