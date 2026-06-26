import { test } from './helpers/test.ts';
import { invoke } from './helpers/invoke.ts';
import { assert, assertHasKeys, assertStatus } from './helpers/asserts.ts';
import { cfg } from './helpers/env.ts';
import { setupSuite } from './helpers/db.ts';
import { corsTest } from './helpers/shared.ts';

// verify_jwt = false: auth enforced in code via getClaims.
const FN = 'drill-video-url';
const ctx = await setupSuite('drillvid');

corsTest(FN);

test(`${FN}: rejects request with no Authorization header`, async () => {
  assertStatus(await invoke(FN), 401, 'no auth');
});

test(`${FN}: rejects garbage bearer token`, async () => {
  assertStatus(await invoke(FN, { token: 'not.a.jwt' }), 401, 'garbage token');
});

test(`${FN}: missing file_path returns 400`, async () => {
  const res = await invoke(FN, { token: ctx.user.token, body: {} });
  assertStatus(res, 400, 'missing file_path');
});

test(`${FN}: returns a presigned URL for a valid user`, async () => {
  // Presigning is pure crypto — no external call, safe in Tier 1.
  const res = await invoke(FN, {
    token: ctx.user.token,
    body: { file_path: 'edge-tests/nonexistent.mp4' },
  });
  assertStatus(res, 200, 'presign');
  assertHasKeys(res.json, ['url', 'expires_in'], 'presign body');
  assert(String(res.json.url).includes('X-Amz-Signature='), 'url is presigned');
});

test(`${FN}: accepts the anon-role key as auth (documents current behaviour)`, async () => {
  // getClaims() validates any project JWT, including the public anon key.
  // This means presigned URLs are obtainable without a user account —
  // worth tightening to require an authenticated role. If this test starts
  // failing with 401, that's an improvement: flip the assertion.
  const res = await invoke(FN, {
    token: cfg.anonKey,
    body: { file_path: 'edge-tests/nonexistent.mp4' },
  });
  assertStatus(res, 200, 'anon key presign (current behaviour)');
});

test('teardown', () => ctx.cleanup());
