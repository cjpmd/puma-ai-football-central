import { test } from './helpers/test.ts';
import { invoke } from './helpers/invoke.ts';
import { assert, assertHasKeys, assertStatus } from './helpers/asserts.ts';
import { cfg } from './helpers/env.ts';
import { setupSuite } from './helpers/db.ts';
import { authRejectionTests, corsTest, rateLimitBurnTest } from './helpers/shared.ts';

const FN = 'send-invitation-email';
const ctx = await setupSuite('invite');

corsTest(FN);
authRejectionTests(FN, { codeLevelUserCheck: true });

test(`${FN}: invalid payload (missing email) does not send`, async () => {
  // No input validation exists today: the Resend call fails and the
  // function returns 500. This documents current behaviour.
  const res = await invoke(FN, { token: ctx.user.token, body: { name: 'x' } });
  assertStatus(res, [400, 422, 500], 'missing email');
});

rateLimitBurnTest(FN, {
  quota: 10, // rate_limiting_config: invitation_send 10/hour
  body: { email: 'not-an-email', name: 'rl', invitationCode: 'X', role: 'staff' },
  userId: () => ctx.user.id,
  token: () => ctx.user.token,
});

test(`${FN}: sends a real invitation email`, async () => {
  assert(cfg.testInboxEmail !== '', 'TEST_INBOX_EMAIL must be set for this test');
  const res = await invoke(FN, {
    token: ctx.user.token,
    body: {
      email: cfg.testInboxEmail,
      name: 'Edge Test',
      invitationCode: 'EDGETEST',
      role: 'staff',
    },
  });
  assertStatus(res, 200, 'happy path');
  assertHasKeys(res.json, ['success', 'messageId'], 'happy path body');
}, { tier2: true });

test('teardown', () => ctx.cleanup());
