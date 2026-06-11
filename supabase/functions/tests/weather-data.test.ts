import { test } from './helpers/test.ts';
import { invoke } from './helpers/invoke.ts';
import { assertHasKeys, assertStatus } from './helpers/asserts.ts';
import { setupSuite } from './helpers/db.ts';
import { authRejectionTests, corsTest } from './helpers/shared.ts';

const FN = 'weather-data';
const ctx = await setupSuite('weather');

corsTest(FN);
authRejectionTests(FN); // verify_jwt = true; no code-level user check inside

test(`${FN}: invalid payload (no coordinates) returns 400`, async () => {
  const res = await invoke(FN, { token: ctx.user.token, body: {} });
  assertStatus(res, 400, 'no coordinates');
});

test(`${FN}: returns current weather for valid coordinates`, async () => {
  // One OpenWeather call per run — read-only, free-tier quota.
  const res = await invoke(FN, {
    token: ctx.user.token,
    body: { lat: 51.5074, lng: -0.1278 },
  });
  assertStatus(res, 200, 'current weather');
  assertHasKeys(res.json, ['temp', 'description', 'icon', 'humidity'], 'weather body');
});

test('teardown', () => ctx.cleanup());
