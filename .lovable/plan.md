## Two separate failures

### 1. PR #68 (`claude/peaceful-thompson-iqfb4z`) — exit 127
That branch was opened before `scripts/test-edge-functions.sh` was added to the repo, so the workflow can't find the script. No code fix needed: **either rebase the PR on `main` or close it.** Tell me which and I'll proceed; otherwise just close it in GitHub.

### 2. `main` run — `Unable to validate email address: invalid format`

Tests are actually executing now (secrets work). 10 suites fail at the same line in `supabase/functions/tests/helpers/auth.ts` — `supabase.auth.admin.createUser({ email: ... })` is being rejected by Supabase Auth's email validator.

Root cause: the helper generates emails on a TLD Supabase's GoTrue validator refuses (commonly `.test`, `.local`, `.invalid`, or a malformed `@example` form). The whole-module `Uncaught error` shape (10 of 10 affected modules) confirms it's the shared helper, not anything function-specific.

**Fix:** change the synthetic email in `helpers/auth.ts` to use a real-looking domain. The safest, well-supported pattern in CI is:
```ts
const email = `lovable-ci+${crypto.randomUUID()}@example.com`;
```
`example.com` is IANA-reserved, accepted by GoTrue, and the `+tag` keeps each run unique without polluting auth.users with reused addresses (suite teardown still deletes the user).

If the helper is already on `example.com` and still failing, the next most likely cause is no `@` / empty local part — same one-line fix covers both.

### Blocker

Both files I need to inspect/edit live only on GitHub right now (added by Claude Code, not yet synced into Lovable):
- `supabase/functions/tests/helpers/auth.ts`
- `scripts/test-edge-functions.sh`

I need one of:
- Paste the current contents of `helpers/auth.ts` here, **or**
- Trigger a GitHub → Lovable sync (any commit on `main` from GitHub should do it) so the files appear in the workspace, then approve this plan and I'll edit `auth.ts` in one line.

### Out of scope
No changes to the workflow YAML, no changes to function runtime code, no new secrets.
