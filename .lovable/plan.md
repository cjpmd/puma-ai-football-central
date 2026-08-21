## Verify GitHub sync and fix the broken preview

### Current state

- The workspace is exactly on `origin/main` (`git rev-parse HEAD` matches `refs/heads/main`).
- Recent PRs #69–#73 are merged and present: mobile scroll shell, cache correctness, dashboard query, mobile detection, and durable storage.
- The preview is **not** showing the latest code. The runtime error `useAuth must be used within an AuthProvider` is being thrown from a stale Vite-transformed module (`src/contexts/AuthContext.tsx?t=1787315495296`). The stack-trace line numbers (AuthProvider at line 22, useAuth at line 744) do not match the current file (AuthProvider at line 44, useAuth at line 839), proving the browser is running cached code.

### Plan

1. **Clear the Vite dev cache and restart the dev server**
   - Kill the Vite process so the supervisor respawns it.
   - Wait for `http://localhost:8080/` to respond.
   - This forces the preview to load the files that are already in the workspace.

2. **Verify the browser loads without the auth error**
   - Use the preview to confirm the dashboard renders and no `useAuth` error appears in the console.

3. **Cross-check the recent GitHub merges are visible**
   - Confirm mobile scroll works on `/dashboard` and `/my-team`.
   - Confirm the dashboard hydrates from localStorage (no spinner on reload).

4. **Clean up the stale plan file**
   - The previous `.lovable/plan.md` relates to edge-function tests; overwrite it with this plan so the workspace reflects the current task.

### Out of scope

No new features, no GitHub Actions changes, no database edits. This is purely a sync/cache verification pass.
