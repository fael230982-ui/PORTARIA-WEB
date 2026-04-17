import { api } from '@/lib/axios';
import type { BackgroundJob, BackgroundJobsListResponse, BackgroundJobsParams } from '@/types/job';

export const jobsService = {
  async list(params?: BackgroundJobsParams): Promise<BackgroundJobsListResponse> {
    const { data } = await api.get<BackgroundJobsListResponse>('/jobs', { params });
    return data;
  },

  async findById(id: string): Promise<BackgroundJob> {
    const { data } = await api.get<BackgroundJob>(`/jobs/${id}`);
    return data;
  },
};
