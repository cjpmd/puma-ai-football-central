import { test } from './helpers/test.ts';
import { invoke } from './helpers/invoke.ts';
import { assertStatus } from './helpers/asserts.ts';
import { cfg } from './helpers/env.ts';
import { authRejectionTests, corsTest } from './helpers/shared.ts';

// verify_jwt = true; invoked by pg_cron with the service-role key.
const FN = 'enhanced-notification-scheduler';

corsTest(FN);
authRejectionTests(FN);

test(`${FN}: runs a scheduling pass under the service role`, async () => {
  // Processes any due scheduled notifications — may send real reminders,
  // exactly like the cron invocation it mirrors.
  const res = await invoke(FN, { token: cfg.serviceRoleKey, body: {} });
  assertStatus(res, 200, 'scheduler pass');
}, { tier2: true });
