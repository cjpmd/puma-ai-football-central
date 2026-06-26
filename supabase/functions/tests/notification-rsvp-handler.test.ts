import { test } from './helpers/test.ts';
import { invoke } from './helpers/invoke.ts';
import { assert, assertStatus } from './helpers/asserts.ts';
import { admin } from './helpers/auth.ts';
import { getAnyRow, setupSuite } from './helpers/db.ts';
import { corsTest } from './helpers/shared.ts';

// verify_jwt = false by design: auth is the single-use token in the body.
const FN = 'notification-rsvp-handler';
const ctx = await setupSuite('rsvp');

corsTest(FN);

test(`${FN}: empty payload is rejected`, async () => {
  const res = await invoke(FN, { body: {} });
  assertStatus(res, [400, 401, 500], 'empty payload');
});

test(`${FN}: unknown token is rejected`, async () => {
  const res = await invoke(FN, {
    body: {
      token: crypto.randomUUID(),
      action: 'accept',
      userId: ctx.user.id,
      eventId: crypto.randomUUID(),
    },
  });
  assertStatus(res, 401, 'unknown token');
});

test(`${FN}: valid token works once and is single-use`, async () => {
  const event = await getAnyRow('events');
  assert(event !== null, 'needs at least one event row in the target project');

  const token = crypto.randomUUID();
  const { error: seedErr } = await admin.from('secure_notification_tokens').insert({
    token,
    user_id: ctx.user.id,
    event_id: event!.id,
    expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
  });
  assert(!seedErr, `could not seed token: ${seedErr?.message}`);

  try {
    const body = { token, action: 'accept', userId: ctx.user.id, eventId: event!.id };
    const first = await invoke(FN, { body });
    assertStatus(first, 200, 'first use');

    const second = await invoke(FN, { body });
    assertStatus(second, 401, 'second use (token already consumed)');
  } finally {
    await admin.from('secure_notification_tokens').delete().eq('token', token);
    await admin.from('event_availability').delete().eq('user_id', ctx.user.id);
  }
}, { tier2: true });

test('teardown', () => ctx.cleanup());
