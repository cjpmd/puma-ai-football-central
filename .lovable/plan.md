## Plan: Staff duplication, signup audit, and join code fix

### 1. Staff duplication — root cause

In `StaffManagementModal.tsx`, the staff list is built from two sources:

- `team_staff` rows for the team
- Plus extra rows synthesized from `user_teams` for staff-role users not yet in `team_staff` (id prefixed `ut_…`)

The sections "Linked Staff" vs "Not Yet Linked" are split purely on `s.user_id` (line 598-599).

Looking at the DB for Broughty Jags 2015s, there are genuinely **two `team_staff` rows** for the same email (`chrisjpmcdonald@gmail.com`):

- `a0427e24…` — created 2026-04-27, role `team_manager`, `user_id` set → "Linked"
- `b45a1bb3…` — created 2026-04-28, role `team_manager`, `user_id` NULL → "Not Linked"

The duplicate was created by `handleAddStaff` because it does not check whether a `team_staff` row with the same email already exists for the team before inserting.

### Fixes for duplication

1. **One-time cleanup** (migration): for each `team_id` + `lower(email)`, keep the row with `user_id` set (or the oldest), delete the rest. Add a partial unique index `unique (team_id, lower(email)) where email is not null` to prevent recurrence.
2. **Frontend guard in `handleAddStaff`**: before insert, query `team_staff` for `team_id` + `email` (case-insensitive). If it exists:
   - If existing row has no `user_id` and a matching profile is found, UPDATE it with `user_id` (auto-link) instead of inserting.
   - Otherwise, show a toast: "A staff member with this email already exists" and abort.
3. **De-dupe at render time** as a safety net: in the `staff` array, collapse rows sharing the same `lower(email)` keeping the linked one first.

### 2. Staff signup form audit (Add Staff Member)

Current behaviour in `StaffManagementModal.handleAddStaff`:

- Name field uses a search dropdown of existing team members (parents/players from `user_teams`).
- Email is always shown as required (`*`) in the UI but the validation only enforces it `if (!selectedUser && !newStaff.email.trim())`. So the **logic is already correct** — but the asterisk and "Used to automatically link…" helper text are misleading.

Changes:

- When `selectedUser` is set (existing member chosen), drop the `*` on Email, make the field optional, pre-fill with their profile email (read-only), and change helper text to "Linked to existing account".
- When no user is selected (typing a new name), keep Email required with current helper text.
- Apply the same treatment in `StaffManagementMobile.tsx` (mirror logic).

### 3. Where do staff/notification emails come from? How are they branded?

Audit findings to surface in the response (no code change unless the user asks):

- The project uses Supabase auth + several custom edge functions: `send-invitation-email`, `send-availability-notification`, `send-push-notification`, `auth-email-hook` is **not** present.
- That means transactional emails (invites, availability) are sent via the existing edge functions (likely Resend or default Supabase SMTP — will confirm by reading `supabase/functions/send-invitation-email/index.ts` during implementation), and **auth emails (signup confirmation, password reset, magic link) currently use Supabase's default unbranded templates**.

Recommendation (only act on this if approved): scaffold Lovable's auth email templates so password-reset / signup emails are branded with Puma AI colors and logo, and confirm the sender domain.

### 4. "Invalid team code" for `BROUGH02`

Root cause: the `teams` SELECT RLS policies require the user to already be a member of the team or its club:

```
- Authenticated users can view teams: auth.uid() IS NOT NULL  ← (is enabled but combined with OR of others, currently restrictive)
- Users can view teams they are members of (user_teams)
- Club members can view club teams (user_clubs)
```

When a user tries to join a team they're not yet in, `teamCodeService.getTeamByJoinCode` runs a plain `from('teams').select(...).eq('team_join_code', joinCode).single()`, RLS hides the row, PostgREST returns `PGRST116`, and the service returns `null` → "Invalid join code".

The code `BROUGH02` is correctly stored on team `Broughty United Jags 2015s` and is not expired.

### Fix

Add a `SECURITY DEFINER` RPC and use it from the frontend:

```sql
create or replace function public.get_team_by_join_code(_code text)
returns table (
  id uuid, name text, team_join_code text,
  team_join_code_expires_at timestamptz, logo_url text,
  club_id uuid, club_name text
)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.team_join_code, t.team_join_code_expires_at,
         t.logo_url, t.club_id, c.name as club_name
  from public.teams t
  left join public.clubs c on c.id = t.club_id
  where t.team_join_code = upper(_code)
    and t.team_join_code_expires_at > now()
  limit 1;
$$;
grant execute on function public.get_team_by_join_code(text) to authenticated, anon;
```

Update `teamCodeService.getTeamByJoinCode` to call `supabase.rpc('get_team_by_join_code', { _code: joinCode })` and return the first row.

Also normalize the input: `.trim().toUpperCase()` already happens in the modal, but mirror it in the service for safety.

### Files to change

- `supabase/migrations/<new>.sql` — cleanup duplicates + partial unique index + `get_team_by_join_code` RPC
- `src/services/teamCodeService.ts` — use the new RPC
- `src/components/teams/StaffManagementModal.tsx` — duplicate guard, email-required logic, render-time de-dup
- `src/pages/StaffManagementMobile.tsx` — mirror email-required logic and de-dup

### Out of scope (will mention in response, ask before doing)

- Branding auth emails (would need `scaffold_auth_email_templates` + domain setup).
