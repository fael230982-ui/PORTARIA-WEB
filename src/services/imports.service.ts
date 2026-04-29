import { api } from '@/lib/axios';

export type CsvImportRequest = {
  filename?: string | null;
  contentBase64: string;
  dryRun?: boolean;
};

export type CsvImportResponse = {
  jobId: string;
  status: string;
  dryRun: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  requiredColumns: string[];
  optionalColumns: string[];
  errors: Array<Record<string, unknown>>;
  createdRows?: number;
  updatedRows?: number;
  skippedRows?: number;
};

export async function createCsvImportJob(payload: CsvImportRequest): Promise<CsvImportResponse> {
  const { data } = await api.post<CsvImportResponse>('/imports/csv', payload);
  return data;
}

