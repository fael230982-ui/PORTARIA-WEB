type ApiErrorData =
  | string
  | {
      detail?: unknown;
      message?: unknown;
      error?: unknown;
    }
  | null
  | undefined;

type ApiLikeError = {
  response?: {
    status?: number;
    data?: ApiErrorData;
  };
  message?: string;
};

type ApiErrorOverrides = {
  fallback: string;
  byStatus?: Partial<Record<number, string>>;
  keywordMap?: Array<{ includes: string[]; message: string }>;
};

export function getApiErrorStatus(error: unknown) {
  return (error as ApiLikeError)?.response?.status;
}

function extractApiMessage(data?: ApiErrorData) {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) return '';

    const withoutHtml = trimmed
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (withoutHtml && withoutHtml.length < trimmed.length) {
      if (/bad gateway/i.test(withoutHtml)) return 'Bad gateway';
      if (/error code 502/i.test(withoutHtml)) return 'Bad gateway';
      return withoutHtml;
    }

    return trimmed;
  }

  if (!data || typeof data !== 'object') {
    return '';
  }

  const detail = typeof data.detail === 'string' ? data.detail.trim() : '';
  const message = typeof data.message === 'string' ? data.message.trim() : '';
  const errorMessage = typeof data.error === 'string' ? data.error.trim() : '';

  return detail || message || errorMessage || '';
}

export function getApiErrorMessage(error: unknown, overrides: ApiErrorOverrides) {
  if (typeof error !== 'object' || error === null) {
    return overrides.fallback;
  }

  const apiError = error as ApiLikeError;
  const status = apiError.response?.status;
  const rawMessage = extractApiMessage(apiError.response?.data);
  const normalizedMessage = rawMessage.toLowerCase();

  for (const entry of overrides.keywordMap ?? []) {
    if (entry.includes.some((candidate) => normalizedMessage.includes(candidate.toLowerCase()))) {
      return entry.message;
    }
  }

  if (status && overrides.byStatus?.[status]) {
    return overrides.byStatus[status]!;
  }

  if (rawMessage) {
    return rawMessage;
  }

  if (error instanceof Error && error.message && !error.message.includes('Request failed with status code')) {
    return error.message;
  }

  return overrides.fallback;
}
