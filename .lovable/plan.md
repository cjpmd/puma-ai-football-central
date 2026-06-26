## Problem

The GitHub Actions edge-function test job fails before running any test because `supabase/functions/tests/helpers/env.ts` throws at import time when `SUPABASE_URL` is not set. CI has no `.env.test` and no env vars exported, so all 15 test files fail with `Missing required env var SUPABASE_URL`.

The test files (`supabase/functions/tests/**`) and `scripts/test-edge-functions.sh` were added by Claude Code and exist on GitHub but are not present in the Lovable workspace yet, so I'll edit them in place once the next GitHub→Lovable sync brings them in (or you confirm they're there).

## Fix

Two coordinated changes:

### 1. Make the env helper CI-friendly

Update `supabase/functions/tests/helpers/env.ts` so a missing `SUPABASE_URL`/`SUPABASE_ANON_KEY` does **not** throw at module load. Instead expose:

- `hasTestEnv(): boolean` — true only when all required vars are present.
- `getEnv(name)` — returns the value or `undefined`.
- Keep `required(name)` but only call it from inside tests, not at top-level.

Then in `helpers/test.ts`, wrap the Supabase client + shared fixtures in a lazy getter, and export a `describeIfEnv` / `testIfEnv` that calls `Deno.test.ignore` when `hasTestEnv()` is false. Result: locally with `.env.test` the suite runs; in CI without secrets it cleanly skips instead of erroring.

### 2. Wire real secrets into GitHub Actions

Add a `.github/workflows/edge-function-tests.yml` step (or update the existing one) to export the needed vars from repository secrets before `bash scripts/test-edge-functions.sh`:

```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

You'll need to add those three values once in **GitHub → repo Settings → Secrets and variables → Actions**. Use the project URL `https://pdarngodvrzehnpvdrii.supabase.co`, the publishable/anon key already in `.env`, and the service-role key from the Supabase dashboard. Until those secrets are added the workflow will still pass (tests skip), and it will start actually executing tests as soon as they exist.

## Out of scope

No changes to edge-function runtime code, no changes to the `.env` used by the app, and no secret values committed to the repo.

## Questions before I build

1. Do you want CI to **skip** edge-function tests when secrets are absent (safer default), or **fail loudly** so you remember to add them? I've planned skip; say the word if you'd prefer fail.
2. Confirm you're OK adding `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to GitHub Actions secrets so the tests can actually hit Supabase in CI.