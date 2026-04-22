import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

const API_ORIGIN = env.apiBaseUrl.replace(/\/api\/v1\/?$/i, '');
const UPSTREAM_TIMEOUT_MS = 15000;

function buildTargetUrl(path: string[], request: NextRequest) {
  const target = new URL(`${API_ORIGIN}/media/${path.join('/')}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });
  return target;
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const targetUrl = buildTargetUrl(path, request);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstreamResponse = await fetch(targetUrl, {
      cache: 'no-store',
      signal: controller.signal,
    });

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        'content-type': upstreamResponse.headers.get('content-type') || 'application/octet-stream',
        'cache-control': upstreamResponse.headers.get('cache-control') || 'no-store',
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'Imagem indisponível no momento.' },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
