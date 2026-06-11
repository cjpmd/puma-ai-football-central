import { test } from './helpers/test.ts';
import { invoke } from './helpers/invoke.ts';
import { assert, assertHasKeys, assertStatus } from './helpers/asserts.ts';
import { admin } from './helpers/auth.ts';
import { getAnyRow } from './helpers/db.ts';
import { corsTest } from './helpers/shared.ts';

// verify_jwt = false; inserts a video_clip row under the service role.
const FN = 'import-hudl-clip';

corsTest(FN);

test(`${FN}: missing required fields returns 400`, async () => {
  const res = await invoke(FN, { body: {} });
  assertStatus(res, 400, 'empty payload');
});

test(`${FN}: title without player_id returns 400`, async () => {
  const res = await invoke(FN, { body: { title: 'edge test' } });
  assertStatus(res, 400, 'missing player_id');
});

test(`${FN}: imports a clip for an existing player`, async () => {
  const player = await getAnyRow('players');
  assert(player !== null, 'needs at least one player in the target project');
  const res = await invoke(FN, {
    body: {
      player_id: player!.id,
      title: 'edge-function-test clip (safe to delete)',
      source: 'other',
    },
  });
  assertStatus(res, 200, 'import');
  assertHasKeys(res.json, ['id'], 'import body');
  // Clean up the row we created.
  await admin.from('video_clip').delete().eq('id', res.json.id);
}, { tier2: true });
