import { test } from './helpers/test.ts';
import { invoke } from './helpers/invoke.ts';
import { assert, assertStatus } from './helpers/asserts.ts';
import { cfg } from './helpers/env.ts';
import { admin } from './helpers/auth.ts';
import { setupSuite } from './helpers/db.ts';
import { authRejectionTests, corsTest, rateLimitBurnTest } from './helpers/shared.ts';

const FN = 'send-push-notification';
const ctx = await setupSuite('push');

corsTest(FN);
authRejectionTests(FN, { codeLevelUserCheck: true });

test(`${FN}: service-role caller bypasses the per-user quota`, async () => {
  const res = await invoke(FN, { token: cfg.serviceRoleKey, body: {} });
  assertStatus(res, 200, 'service-role empty payload');
  assert(res.json?.success === true, `expected success:true, got ${JSON.stringify(res.json)}`);
  // The bypass must not create a rate-limit counter.
  const { count } = await admin
    .from('rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('action', 'push_notification_send')
    .gte('window_start', new Date(Date.now() - 60_000).toISOString())
    .is('user_id', null);
  assert((count ?? 0) === 0, 'service-role call should not write a rate_limits row');
});

test(`${FN}: empty payload resolves to "no users to notify"`, async () => {
  const res = await invoke(FN, { token: ctx.user.token, body: {} });
  assertStatus(res, 200, 'empty payload');
  assert(res.json?.success === true, `expected success:true, got ${JSON.stringify(res.json)}`);
});

test(`${FN}: user with no device tokens is a safe no-op`, async () => {
  const res = await invoke(FN, {
    token: ctx.user.token,
    body: { userIds: [ctx.user.id], title: 'edge test', body: 'edge test' },
  });
  assertStatus(res, 200, 'no tokens');
  assert(
    String(res.json?.message ?? '').includes('No push tokens'),
    `expected "No push tokens found", got ${JSON.stringify(res.json)}`,
  );
});

rateLimitBurnTest(FN, {
  quota: 30, // rate_limiting_config: push_notification_send 30/hour
  body: {}, // resolves to "no users to notify" — nothing is sent
  userId: () => ctx.user.id,
  token: () => ctx.user.token,
});

test('teardown', () => ctx.cleanup());
