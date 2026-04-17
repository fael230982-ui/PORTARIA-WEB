function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function ensureApiV1BaseUrl(value: string) {
  const normalized = trimTrailingSlash(value);

  if (normalized.endsWith('/api/v1')) {
    return normalized;
  }

  if (normalized.endsWith('/api')) {
    return `${normalized}/v1`;
  }

  return `${normalized}/api/v1`;
}

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const rawSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3333';

export const env = {
  apiBaseUrl: ensureApiV1BaseUrl(rawApiUrl),
  socketUrl: trimTrailingSlash(rawSocketUrl),
};
