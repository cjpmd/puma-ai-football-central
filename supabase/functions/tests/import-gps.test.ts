import { test } from './helpers/test.ts';
import { invoke } from './helpers/invoke.ts';
import { assertStatus } from './helpers/asserts.ts';
import { corsTest } from './helpers/shared.ts';

// verify_jwt = false; multipart CSV import running under the service role.
const FN = 'import-gps';

corsTest(FN);

test(`${FN}: request without a file returns 400`, async () => {
  const form = new FormData();
  form.set('source', 'other');
  const res = await invoke(FN, { body: form });
  assertStatus(res, 400, 'no file');
});

test(`${FN}: CSV with headers only returns 400`, async () => {
  const form = new FormData();
  form.set('file', new File(['total_distance,max_speed\n'], 'empty.csv', { type: 'text/csv' }));
  const res = await invoke(FN, { body: form });
  assertStatus(res, 400, 'csv too short');
});

test(`${FN}: CSV with an unmatchable row imports nothing but succeeds`, async () => {
  const form = new FormData();
  form.set(
    'file',
    new File(
      ['player,total_distance,max_speed\nEdgeTest NonexistentPlayer,1000,25\n'],
      'edge-test.csv',
      { type: 'text/csv' },
    ),
  );
  form.set('source', 'other');
  form.set('session_date', '2099-01-01');
  const res = await invoke(FN, { body: form });
  // No player named "EdgeTest NonexistentPlayer" exists, so nothing is written.
  assertStatus(res, 200, 'unmatchable row');
}, { tier2: true });
