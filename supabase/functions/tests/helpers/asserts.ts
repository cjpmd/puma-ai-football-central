import { assert, assertEquals } from '@std/assert';
import type { InvokeResult } from './invoke.ts';

export { assert, assertEquals };

export function assertStatus(res: InvokeResult, expected: number | number[], label = ''): void {
  const ok = Array.isArray(expected) ? expected.includes(res.status) : res.status === expected;
  assert(
    ok,
    `${label ? label + ': ' : ''}expected status ${
      Array.isArray(expected) ? expected.join('/') : expected
    }, got ${res.status} — body: ${JSON.stringify(res.json)?.slice(0, 300)}`,
  );
}

// deno-lint-ignore no-explicit-any
export function assertHasKeys(obj: any, keys: string[], label = ''): void {
  assert(obj && typeof obj === 'object', `${label}: expected an object, got ${JSON.stringify(obj)}`);
  for (const k of keys) {
    assert(k in obj, `${label}: missing key "${k}" in ${JSON.stringify(obj)?.slice(0, 300)}`);
  }
}

/** Assert a 429 with the blocked_until field our rate-limited functions return. */
export function assert429(res: InvokeResult, label = ''): void {
  assertStatus(res, 429, label);
  assertHasKeys(res.json, ['blocked_until'], `${label} 429 body`);
}

export function assertCorsPreflight(res: InvokeResult, fn: string): void {
  assert(
    res.status === 200 || res.status === 204,
    `${fn}: preflight returned ${res.status}`,
  );
  assert(
    res.headers.get('access-control-allow-origin') !== null,
    `${fn}: preflight missing Access-Control-Allow-Origin`,
  );
}
