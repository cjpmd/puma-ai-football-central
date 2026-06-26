// Shared test helpers. Re-exports a `testIfEnv` wrapper that skips
// (via Deno.test.ignore) when required env vars are missing, so CI
// without secrets doesn't crash at import time.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { env, hasTestEnv, missingTestEnv } from "./env.ts";

let _client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  }
  return _client;
}

type TestFn = (t: Deno.TestContext) => void | Promise<void>;

export function testIfEnv(name: string, fn: TestFn) {
  if (hasTestEnv()) {
    Deno.test(name, fn);
  } else {
    Deno.test.ignore(
      `${name} [skipped: missing ${missingTestEnv().join(", ")}]`,
      fn,
    );
  }
}

export { hasTestEnv, missingTestEnv, env };
