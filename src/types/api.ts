export interface PublicPersonResponse { id: string; name?: string; category?: string; status?: string; /* + campos */ }
export interface PublicAlertResponse { id: string; title?: string; status?: string; /* + */ }
export interface PublicCameraResponse { id: string; name?: string; status?: string; /* + */ }
export interface PaginatedResponse<T> { data: T[]; page: number; limit: number; total: number; }