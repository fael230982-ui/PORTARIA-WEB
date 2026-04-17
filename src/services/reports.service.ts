import type { ReportPayload, ReportResponse, ReportsListResponse } from '@/types/report';

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = 'Não foi possível concluir a operação.';

    try {
      const errorData = (await response.json()) as { message?: string };
      if (errorData.message) {
        message = errorData.message;
      }
    } catch {
      // Mantém a mensagem padrão quando a resposta não é JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function getReports() {
  const response = await fetch('/api/admin/relatorios', {
    cache: 'no-store',
  });

  return parseJson<ReportsListResponse>(response);
}

export async function createReport(payload: ReportPayload) {
  const response = await fetch('/api/admin/relatorios', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseJson<ReportResponse>(response);
}

export async function updateReport(id: string, payload: ReportPayload) {
  const response = await fetch(`/api/admin/relatorios/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseJson<ReportResponse>(response);
}

export async function deleteReport(id: string) {
  const response = await fetch(`/api/admin/relatorios/${id}`, {
    method: 'DELETE',
  });

  return parseJson<ReportResponse>(response);
}
