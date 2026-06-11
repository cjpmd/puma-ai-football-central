import { test } from './helpers/test.ts';
import { invoke } from './helpers/invoke.ts';
import { assert, assertHasKeys, assertStatus } from './helpers/asserts.ts';
import { setupSuite } from './helpers/db.ts';
import { authRejectionTests, corsTest } from './helpers/shared.ts';

const FN = 'google-maps-config';
const ctx = await setupSuite('gmaps');

corsTest(FN);
authRejectionTests(FN, { codeLevelUserCheck: true });

test(`${FN}: returns the Maps script URL for a valid user`, async () => {
  const res = await invoke(FN, { token: ctx.user.token, body: {} });
  assertStatus(res, 200, 'happy path');
  assertHasKeys(res.json, ['scriptUrl'], 'happy path body');
  assert(
    String(res.json.scriptUrl).startsWith('https://maps.googleapis.com/'),
    'scriptUrl points at maps.googleapis.com',
  );
});

test('teardown', () => ctx.cleanup());
