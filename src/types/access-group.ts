export type AccessGroup = {
  id: string;
  name: string;
  condominiumId?: string | null;
  personIds: string[];
  cameraIds: string[];
  faceListId?: number | null;
  faceListName?: string | null;
  faceListSyncStatus?: string | null;
  faceListSyncError?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AccessGroupPayload = {
  name: string;
  condominiumId?: string | null;
  personIds?: string[];
  cameraIds?: string[];
};
