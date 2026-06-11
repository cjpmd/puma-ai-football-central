import { functionsUrl } from './env.ts';

export interface InvokeResult {
  status: number;
  // deno-lint-ignore no-explicit-any
  json: any;
  headers: Headers;
}

/**
 * Call an edge function. Only sends the headers you ask for:
 * no token => no Authorization header at all (tests the gateway 401 path).
 * Pass a FormData body for multipart endpoints (import-gps).
 */
export async function invoke(
  fn: string,
  opts: { token?: string; body?: unknown; method?: string } = {},
): Promise<InvokeResult> {
  const headers: Record<string, string> = {};
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body ?? {});
  }

  const res = await fetch(`${functionsUrl}/${fn}`, {
    method: opts.method ?? 'POST',
    headers,
    body,
  });

  const text = await res.text();
  // deno-lint-ignore no-explicit-any
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, headers: res.headers };
}

/** CORS preflight request, as a browser would send it. */
export async function preflight(fn: string): Promise<InvokeResult> {
  const res = await fetch(`${functionsUrl}/${fn}`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, content-type',
    },
  });
  await res.body?.cancel();
  return { status: res.status, json: null, headers: res.headers };
}
