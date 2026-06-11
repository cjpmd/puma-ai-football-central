import { cfg } from './env.ts';

/**
 * Test registration wrapper.
 * - tier2 tests are ignored unless RUN_SIDE_EFFECT_TESTS=1
 * - slow tests are ignored when SKIP_SLOW_TESTS=1
 * - op/resource sanitizers are off: the supabase-js client keeps
 *   connections alive between tests, which is fine for integration tests.
 *
 * Ignored tests are reported as "skipped" in the JUnit output, which feeds
 * the per-function summary table.
 */
export function test(
  name: string,
  fn: () => Promise<void> | void,
  opts: { tier2?: boolean; slow?: boolean } = {},
) {
  const tags = `${opts.tier2 ? '[tier2] ' : ''}${opts.slow ? '[slow] ' : ''}`;
  const ignore = (opts.tier2 === true && !cfg.sideEffects) ||
    (opts.slow === true && cfg.skipSlow);
  Deno.test({
    name: `${tags}${name}`,
    ignore,
    sanitizeOps: false,
    sanitizeResources: false,
    fn,
  });
}
