import { test } from './helpers/test.ts';
import { invoke } from './helpers/invoke.ts';
import { assert, assertHasKeys, assertStatus } from './helpers/asserts.ts';
import { cfg } from './helpers/env.ts';
import { getAnyRow, setupSuite } from './helpers/db.ts';
import { authRejectionTests, corsTest, rateLimitBurnTest } from './helpers/shared.ts';

const FN = 'send-availability-notification';
const ctx = await setupSuite('availnotif');

corsTest(FN);
authRejectionTests(FN, { codeLevelUserCheck: true });

test(`${FN}: invalid payload (no recipient) does not send`, async () => {
  const res = await invoke(FN, { token: ctx.user.token, body: {} });
  assertStatus(res, [400, 422, 500], 'empty payload');
});

rateLimitBurnTest(FN, {
  quota: 30, // rate_limiting_config: notification_send 30/hour
  body: { user_email: 'not-an-email' },
  userId: () => ctx.user.id,
  token: () => ctx.user.token,
});

test(`${FN}: sends a real availability email (quota keys on caller, not recipient)`, async () => {
  assert(cfg.testInboxEmail !== '', 'TEST_INBOX_EMAIL must be set for this test');
  const event = await getAnyRow('events');
  assert(event !== null, 'needs at least one event row in the target project');
  const res = await invoke(FN, {
    token: ctx.user.token,
    body: {
      event_id: event!.id,
      user_id: ctx.user.id,
      user_email: cfg.testInboxEmail,
      user_name: 'Edge Test',
      role: 'player',
      event_title: 'Edge Function Test Event',
      event_date: '2099-01-01',
    },
  });
  assertStatus(res, 200, 'happy path');
  assertHasKeys(res.json, ['success'], 'happy path body');
}, { tier2: true });

test('teardown', () => ctx.cleanup());
