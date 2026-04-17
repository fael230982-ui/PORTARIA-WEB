import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

const API_BASE = env.apiBaseUrl;

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

function buildTargetUrl(path: string[], request: NextRequest) {
  const target = new URL(`${API_BASE}/${path.join('/')}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });
  return target;
}

function copyHeaders(request: NextRequest) {
  const headers = new Headers();
  const cookieToken = request.cookies.get('camera_proxy_token')?.value;
  const authorization = request.headers.get('authorization') || (cookieToken ? `Bearer ${cookieToken}` : null);
  const contentType = request.headers.get('content-type');
  const selectedUnitCookie = request.cookies.get('camera_selected_unit_id')?.value;
  const selectedUnitId = request.headers.get('x-selected-unit-id') || selectedUnitCookie;

  if (authorization) {
    headers.set('authorization', authorization);
  }

  if (contentType) {
    headers.set('content-type', contentType);
  }

  if (selectedUnitId) {
    headers.set('x-selected-unit-id', selectedUnitId);
  }

  return headers;
}

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const targetUrl = buildTargetUrl(path, request);
    const headers = copyHeaders(request);

    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: METHODS_WITH_BODY.has(request.method) ? await request.text() : undefined,
      cache: 'no-store',
    });

    if (!upstreamResponse.ok) {
      const responseText = await upstreamResponse.text();
      console.error('[proxy] upstream request failed', {
        method: request.method,
        path,
        targetUrl: targetUrl.toString(),
        status: upstreamResponse.status,
        body: responseText.slice(0, 1000),
      });

      return new NextResponse(responseText, {
        status: upstreamResponse.status,
        headers: {
          'content-type': upstreamResponse.headers.get('content-type') || 'application/json',
          'x-proxy-target': targetUrl.toString(),
        },
      });
    }

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        'content-type': upstreamResponse.headers.get('content-type') || 'application/json',
        'cache-control': upstreamResponse.headers.get('cache-control') || 'no-store',
        'x-proxy-target': targetUrl.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown proxy error';

    console.error('[proxy] request failed before reaching upstream', {
      method: request.method,
      url: request.nextUrl.toString(),
      apiBase: API_BASE,
      message,
    });

    return NextResponse.json(
      {
        error: 'ProxyError',
        message,
        apiBase: API_BASE,
      },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context);
}
