/**
 * Test environment configuration. Load via:
 *   deno test --env-file=.env.test ...
 * (the runner script does this for you).
 */

function required(name: string): string {
  const v = Deno.env.get(name);
  if (!v) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.test.example to .env.test and fill it in.`,
    );
  }
  return v;
}

export const cfg = {
  supabaseUrl: required('SUPABASE_URL').replace(/\/+$/, ''),
  anonKey: required('SUPABASE_ANON_KEY'),
  serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  /** Domain for disposable test user emails (never actually mailed). */
  testEmailDomain: Deno.env.get('TEST_EMAIL_DOMAIN') ?? 'example.com',
  /** Real inbox for Tier 2 email happy-path tests. */
  testInboxEmail: Deno.env.get('TEST_INBOX_EMAIL') ?? '',
  /** Tier 2: tests with real side effects (emails, AI calls, DB writes). */
  sideEffects: Deno.env.get('RUN_SIDE_EFFECT_TESTS') === '1',
  /** Skip the slow rate-limit burn tests (each fires 10-31 requests). */
  skipSlow: Deno.env.get('SKIP_SLOW_TESTS') === '1',
};

export const functionsUrl = `${cfg.supabaseUrl}/functions/v1`;
