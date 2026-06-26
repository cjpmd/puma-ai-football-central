import { test } from './test.ts';
import { invoke, preflight } from './invoke.ts';
import { assert429, assertCorsPreflight, assertStatus } from './asserts.ts';
import { cfg } from './env.ts';
import { resetRateLimits } from './db.ts';

/** Standard CORS preflight test, identical for every function. */
export function corsTest(fn: string): void {
  test(`${fn}: answers CORS preflight`, async () => {
    assertCorsPreflight(await preflight(fn), fn);
  });
}

/**
 * Standard auth-rejection tests for functions behind verify_jwt = true.
 * `codeLevelUserCheck` adds the anon-key case for functions that also
 * resolve a user from the token in code (a bare anon key passes the
 * gateway but must be rejected by the function).
 */
export function authRejectionTests(fn: string, opts: { codeLevelUserCheck?: boolean } = {}): void {
  test(`${fn}: rejects request with no Authorization header`, async () => {
    assertStatus(await invoke(fn), 401, 'no auth');
  });
  test(`${fn}: rejects garbage bearer token`, async () => {
    assertStatus(await invoke(fn, { token: 'not.a.jwt' }), 401, 'garbage token');
  });
  if (opts.codeLevelUserCheck) {
    test(`${fn}: rejects anon-role key as bearer (code-level user check)`, async () => {
      assertStatus(await invoke(fn, { token: cfg.anonKey }), 401, 'anon key');
    });
  }
}

/**
 * Burn through a per-user quota with harmless payloads, then assert 429.
 * Resets the counter before and after so other tests aren't affected.
 * The payloads never reach external services: the rate-limit check runs
 * before the work in every wired function.
 */
export function rateLimitBurnTest(
  fn: string,
  opts: {
    quota: number;
    body: unknown;
    userId: () => string;
    token: () => string;
    /** Extra check while blocked, e.g. a sibling function sharing the quota. */
    whileBlocked?: (token: string) => Promise<void>;
  },
): void {
  test(`${fn}: blocks with 429 after ${opts.quota} requests in the window`, async () => {
    await resetRateLimits(opts.userId());
    try {
      for (let i = 1; i <= opts.quota; i++) {
        const res = await invoke(fn, { token: opts.token(), body: opts.body });
        if (res.status === 429) {
          throw new Error(`Blocked early: request ${i}/${opts.quota} returned 429`);
        }
      }
      const blocked = await invoke(fn, { token: opts.token(), body: opts.body });
      assert429(blocked, `request ${opts.quota + 1}`);
      if (opts.whileBlocked) await opts.whileBlocked(opts.token());
    } finally {
      await resetRateLimits(opts.userId());
    }
  }, { slow: true });
}
