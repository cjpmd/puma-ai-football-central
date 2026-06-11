import { test } from './helpers/test.ts';
import { invoke } from './helpers/invoke.ts';
import { assert, assert429, assertHasKeys, assertStatus } from './helpers/asserts.ts';
import { admin } from './helpers/auth.ts';
import { setupSuite } from './helpers/db.ts';
import { authRejectionTests, corsTest, rateLimitBurnTest } from './helpers/shared.ts';

const FN = 'ai-team-builder';
const ctx = await setupSuite('aiteam');

corsTest(FN);
authRejectionTests(FN, { codeLevelUserCheck: true });

test(`${FN}: invalid payload fails before the AI call`, async () => {
  // Missing teamId makes the squad query fail (500) before any Gemini cost.
  const res = await invoke(FN, { token: ctx.user.token, body: {} });
  assertStatus(res, [400, 500], 'empty payload');
});

rateLimitBurnTest(FN, {
  quota: 20, // rate_limiting_config: ai_generation 20/hour
  body: {}, // 500s on the squad query — never reaches Gemini
  userId: () => ctx.user.id,
  token: () => ctx.user.token,
  // ai_generation is shared with ai-training-builder: while blocked here,
  // the sibling function must also return 429.
  whileBlocked: async (token) => {
    const res = await invoke('ai-training-builder', { token, body: {} });
    assert429(res, 'ai-training-builder while ai_generation blocked');
  },
});

test(`${FN}: generates a team selection (one paid Gemini call)`, async () => {
  const { data: players } = await admin
    .from('players')
    .select('id, team_id')
    .eq('status', 'active')
    .limit(7);
  assert((players?.length ?? 0) > 0, 'needs at least one active player in the target project');
  const res = await invoke(FN, {
    token: ctx.user.token,
    body: {
      teamId: players![0].team_id,
      gameFormat: '7-a-side',
      gameDuration: 60,
      squadPlayerIds: players!.map((p) => p.id),
      prompt: 'Create a balanced line-up with fair playing time.',
    },
  });
  assertStatus(res, 200, 'generation');
  assertHasKeys(res.json, ['periods', 'reasoning'], 'generation body');
  assert(Array.isArray(res.json.periods) && res.json.periods.length > 0, 'periods non-empty');
}, { tier2: true });

test('teardown', () => ctx.cleanup());
