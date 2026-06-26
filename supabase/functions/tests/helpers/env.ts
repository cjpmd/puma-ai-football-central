// Loads env vars from .env.test (local) or process env (CI).
// Importing this module MUST NOT throw — tests decide whether to run
// based on `hasTestEnv()` so missing secrets cleanly skip instead of
// failing the whole test runner at module-load time.
import "https://deno.land/std@0.224.0/dotenv/load.ts";

export const REQUIRED_ENV_VARS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
] as const;

export function getEnv(name: string): string | undefined {
  return Deno.env.get(name) ?? undefined;
}

export function required(name: string): string {
  const v = Deno.env.get(name);
  if (!v) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.test.example to .env.test and fill it in, or set it in CI secrets.`,
    );
  }
  return v;
}

export function hasTestEnv(): boolean {
  return REQUIRED_ENV_VARS.every((n) => !!Deno.env.get(n));
}

export function missingTestEnv(): string[] {
  return REQUIRED_ENV_VARS.filter((n) => !Deno.env.get(n));
}

// Lazy accessors — safe to call only from inside a test body.
export const env = {
  get SUPABASE_URL() {
    return required("SUPABASE_URL");
  },
  get SUPABASE_ANON_KEY() {
    return required("SUPABASE_ANON_KEY");
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return getEnv("SUPABASE_SERVICE_ROLE_KEY");
  },
};
