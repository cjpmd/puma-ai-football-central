## Status check

The previously claimed fix was NOT applied. Verified:
- `src/pages/ClubManagement.tsx` lines 218–225 still only insert a `user_academies` row when a separate Head of Academy email is supplied. No creator auto-grant exists.
- `useAuth()` destructure on line 32 does not include `user`.
- Database confirms Dundee FC (`2ff65b09-8291-46cd-af96-1c796307475e`) has 0 rows in `user_academies`.

So the user is correctly seeing "Academy not found" unless they're the global admin (`chrisjpmcdonald@gmail.com`).

## Fix

### 1. `src/pages/ClubManagement.tsx`

- Line 32: add `user` to the `useAuth()` destructure.
- After the academies insert (after line 208, before the `academy_clubs` link block), upsert a `user_academies` row for the creator:

```ts
if (user?.id) {
  const { error: creatorErr } = await supabase
    .from('user_academies')
    .upsert(
      { user_id: user.id, academy_id: data.id, role: 'academy_admin' },
      { onConflict: 'user_id,academy_id,role' }
    );
  if (creatorErr) logger.warn('Failed to add creator to user_academies:', creatorErr);
}
```

This guarantees the creator (whether or not they're a global admin) immediately satisfies the `academies` SELECT RLS policy.

### 2. Backfill Dundee FC via migration

Insert a `user_academies` row so the existing Dundee FC academy becomes accessible. We don't know which user clicked Create, so grant access to the only `global_admin` (the most likely creator):

```sql
insert into public.user_academies (user_id, academy_id, role)
values (
  'bdc91e32-bf4c-4e86-bd99-252ba43e3cc2',
  '2ff65b09-8291-46cd-af96-1c796307475e',
  'academy_admin'
)
on conflict (user_id, academy_id, role) do nothing;
```

If the actual creator was `cmcdonald002@dundee.ac.uk` instead, say so and I'll insert that user_id too.

## Out of scope

- Cross-project link to Origin Sports Performance.
- Adding `academy_welfare_officer` to the role CHECK constraint (referenced in `AcademyDashboard.tsx` but not in DB).

## Files touched

- `src/pages/ClubManagement.tsx` — add `user` to `useAuth()` destructure + creator upsert after academy insert.
- New migration — backfill Dundee FC `user_academies` row.
