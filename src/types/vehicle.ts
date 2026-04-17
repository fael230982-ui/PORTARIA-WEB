export type VehicleStatus = 'ativo' | 'inativo' | 'bloqueado';

export type VehicleType =
  | 'carro'
  | 'moto'
  | 'caminhao'
  | 'outro';

export type Vehicle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  color: string;
  type: VehicleType;
  status: VehicleStatus;
  ownerId?: string;
  ownerName?: string;
  unitId?: string;
  unitLabel?: string;
  structureLabel?: string;
  condominiumName?: string;
  tag?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type VehiclePayload = {
  plate: string;
  brand: string;
  model: string;
  color: string;
  type: VehicleType;
  status: VehicleStatus;
  ownerId?: string;
  ownerName?: string;
  unitId?: string;
  unitLabel?: string;
  structureLabel?: string;
  condominiumName?: string;
  tag?: string;
  notes?: string;
};

export type VehiclePlateLookupResponse = {
  plate: string;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  type?: VehicleType | null;
  year?: string | number | null;
  city?: string | null;
  state?: string | null;
  situation?: string | null;
  stolen?: boolean | null;
  source?: string | null;
  raw?: unknown;
};

export type VehiclesPaginationMeta = {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
};

export type VehiclesListResponse = {
  success: boolean;
  data: Vehicle[];
  total: number;
  meta?: VehiclesPaginationMeta;
};
