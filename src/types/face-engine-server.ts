export type FaceEngineServerStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';

export type FaceEngineServer = {
  id: string;
  name: string;
  vendor?: string | null;
  model?: string | null;
  coreBaseUrl?: string | null;
  faceBaseUrl?: string | null;
  username?: string | null;
  verifySsl?: boolean | null;
  condominiumId?: string | null;
  status?: FaceEngineServerStatus | null;
};

export type FaceEngineServerPayload = {
  name: string;
  vendor?: string | null;
  model?: string | null;
  coreBaseUrl?: string | null;
  faceBaseUrl?: string | null;
  username?: string | null;
  password?: string | null;
  verifySsl?: boolean | null;
  condominiumId?: string | null;
  status?: FaceEngineServerStatus | null;
};
