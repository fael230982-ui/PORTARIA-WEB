export type BackgroundJobStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export type BackgroundJob = {
  id: string;
  jobType: string;
  status: BackgroundJobStatus | string;
  attempts: number;
  maxAttempts: number;
  result?: Record<string, unknown> | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  finishedAt?: string | null;
};

export type BackgroundJobsListResponse = {
  data: BackgroundJob[];
  meta: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  };
};

export type BackgroundJobsParams = {
  page?: number;
  limit?: number;
  status?: BackgroundJobStatus;
  jobType?: string;
};
