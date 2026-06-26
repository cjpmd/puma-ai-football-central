import { admin, createTestUser, deleteTestUser, type TestUser } from './auth.ts';

/** Remove every rate-limit counter/violation/audit row for a test user. */
export async function resetRateLimits(userId: string): Promise<void> {
  await admin.from('rate_limits').delete().eq('user_id', userId);
  await admin.from('rate_limit_violations').delete().eq('user_id', userId);
}

/**
 * Put a user directly into the blocked state for an action, so 429 handling
 * can be tested without burning through a 20-30 request quota.
 */
export async function seedRateLimitBlock(userId: string, action: string): Promise<void> {
  const { error } = await admin.from('rate_limits').insert({
    user_id: userId,
    action,
    attempt_count: 999,
    window_start: new Date().toISOString(),
    blocked_until: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (error) throw new Error(`Failed to seed rate limit block: ${error.message}`);
}

/** Fetch one existing row id from a table (production fixture lookup). */
export async function getAnyRow<T = { id: string }>(
  table: string,
  select = 'id',
  // deno-lint-ignore no-explicit-any
  filter?: (q: any) => any,
): Promise<T | null> {
  let q = admin.from(table).select(select).limit(1);
  if (filter) q = filter(q);
  const { data, error } = await q.maybeSingle();
  if (error) {
    console.warn(`Fixture lookup on ${table} failed: ${error.message}`);
    return null;
  }
  return data as T | null;
}

export interface SuiteContext {
  user: TestUser;
  cleanup: () => Promise<void>;
}

/**
 * Per-file setup: one disposable user with a clean rate-limit slate.
 * Call ctx.cleanup() in a final `test('teardown', ...)`.
 */
export async function setupSuite(label: string): Promise<SuiteContext> {
  const user = await createTestUser(label);
  await resetRateLimits(user.id);
  return {
    user,
    cleanup: async () => {
      await resetRateLimits(user.id);
      await deleteTestUser(user.id);
    },
  };
}
