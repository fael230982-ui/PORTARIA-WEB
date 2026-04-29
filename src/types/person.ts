import type { Unit } from './condominium';

export type PersonCategory =
  | 'RESIDENT'
  | 'VISITOR'
  | 'SERVICE_PROVIDER'
  | 'DELIVERER'
  | 'RENTER';

export type PersonDocumentType = 'CPF' | 'RG' | 'CNH';

export type PersonStatus = 'ACTIVE' | 'BLOCKED' | 'INACTIVE' | 'EXPIRED';
export type FaceStatus =
  | 'NO_PHOTO'
  | 'PHOTO_ONLY'
  | 'FACE_PENDING_SYNC'
  | 'FACE_SYNCED'
  | 'FACE_ERROR';

export type Person = {
  id: string;
  name: string;
  document?: string | null;
  documentType?: PersonDocumentType | null;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  category: PersonCategory;
  categoryLabel?: string | null;
  status: PersonStatus;
  statusLabel?: string | null;
  photoUrl?: string | null;
  unitId?: string | null;
  unitIds?: string[];
  unitName?: string | null;
  unitNames?: string[];
  unit?: Unit | null;
  accessGroupIds?: string[];
  accessGroupNames?: string[];
  faceListId?: number | null;
  faceListItemId?: number | null;
  hasFacialCredential?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  faceStatus?: FaceStatus | null;
  faceUpdatedAt?: string | null;
  faceErrorMessage?: string | null;
  faceListSyncStatus?: string | null;
  faceListSyncError?: string | null;
};

export type MinorFacialAuthorization = {
  authorized: boolean;
  guardianName: string;
  guardianDocument: string;
  relationship?: string | null;
  authorizationSource?: string | null;
};

export type PeopleListResponse = {
  data: Person[];
  meta?: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  };
};

export type CreatePersonRequest = {
  name: string;
  document?: string | null;
  documentType?: PersonDocumentType | null;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  category: PersonCategory;
  unitId?: string | null;
  unitIds?: string[];
  accessGroupIds?: string[];
  unit?: Unit | null;
  photoUrl?: string | null;
  minorFacialAuthorization?: MinorFacialAuthorization | null;
  source?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type UpdatePersonRequest = Partial<CreatePersonRequest>;

export type UpdatePersonStatusRequest = {
  status: PersonStatus;
};

export type PersonDocumentOcrRequest = {
  photoUrl?: string | null;
  photoBase64?: string | null;
  fileName?: string | null;
  cameraId?: string | null;
};

export type PersonDocumentOcrCandidate = {
  document: string;
  documentType: PersonDocumentType;
  score: number;
};

export type PersonDocumentOcrNameCandidate = {
  name: string;
  score: number;
};

export type PersonDocumentOcrBirthDateCandidate = {
  birthDate: string;
  score: number;
};

export type PersonDocumentOcrSuggestionResponse = {
  photoUrl: string;
  rawText: string;
  normalizedText: string;
  suggestedName?: string | null;
  suggestedDocument?: string | null;
  suggestedDocumentType?: PersonDocumentType | null;
  suggestedBirthDate?: string | null;
  confidence?: number | null;
  prefill?: Record<string, unknown>;
  documentCandidates?: PersonDocumentOcrCandidate[];
  nameCandidates?: PersonDocumentOcrNameCandidate[];
  birthDateCandidates?: PersonDocumentOcrBirthDateCandidate[];
};
