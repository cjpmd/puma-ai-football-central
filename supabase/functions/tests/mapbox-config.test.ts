import { test } from './helpers/test.ts';
import { invoke } from './helpers/invoke.ts';
import { assertHasKeys, assertStatus } from './helpers/asserts.ts';
import { setupSuite } from './helpers/db.ts';
import { corsTest } from './helpers/shared.ts';

// verify_jwt = false on this function: auth is enforced in code, so the
// rejection tests exercise the function's own 401 paths.
const FN = 'mapbox-config';
const ctx = await setupSuite('mapbox');

corsTest(FN);

test(`${FN}: rejects request with no Authorization header`, async () => {
  const res = await invoke(FN);
  assertStatus(res, 401, 'no auth');
});

test(`${FN}: rejects garbage bearer token`, async () => {
  const res = await invoke(FN, { token: 'not.a.jwt' });
  assertStatus(res, 401, 'garbage token');
});

test(`${FN}: returns the public Mapbox token for a valid user`, async () => {
  const res = await invoke(FN, { token: ctx.user.token, body: {} });
  assertStatus(res, 200, 'happy path');
  assertHasKeys(res.json, ['token'], 'happy path body');
});

test('teardown', () => ctx.cleanup());
