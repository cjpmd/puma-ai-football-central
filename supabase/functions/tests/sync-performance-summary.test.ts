import { test } from './helpers/test.ts';
import { invoke } from './helpers/invoke.ts';
import { assert, assertHasKeys, assertStatus } from './helpers/asserts.ts';
import { corsTest } from './helpers/shared.ts';

// verify_jwt = false and no code-level auth: callable by anyone. The writes
// are idempotent (recomputed from source data) but it remains an open,
// unauthenticated write endpoint — flagged in the original audit.
const FN = 'sync-performance-summary';

corsTest(FN);

test(`${FN}: recomputes summaries for every active player`, async () => {
  const res = await invoke(FN, { body: {} });
  assertStatus(res, 200, 'sync run');
  assertHasKeys(res.json, ['updated', 'total'], 'sync body');
  assert(
    res.json.updated === res.json.total,
    `expected updated === total, got ${JSON.stringify(res.json)}`,
  );
}, { tier2: true });
