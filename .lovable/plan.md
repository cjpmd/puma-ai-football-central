## Root Cause

The "Error creating academy" failure happens because the database tables that the code tries to insert into (`academies`, `academy_clubs`, `user_academies`) do **not exist** in the Supabase project. A query of `information_schema.tables` confirmed there are no academy tables in the `public` schema.

The frontend code in `src/pages/ClubManagement.tsx` (and `useSmartNavigation.ts`, `AcademyDashboard.tsx`, `AcademyDashboardMobile.tsx`) was added recently and casts the Supabase client to `any` to bypass type errors — but Supabase still rejects the inserts at runtime because the tables aren't there.

## Fix

Create a migration that adds the three missing tables, plus RLS policies and helper functions. After this, "Create Academy" in `/clubs` will work.

### 1. Tables

**`public.academies`**
- `id uuid pk default gen_random_uuid()`
- `name text not null`
- `logo_url text`
- `fa_registration_number text`
- `eppp_category int` (1–4)
- `founded_year int`
- `head_of_academy_user_id uuid` (references `profiles.id` on delete set null)
- `created_at`, `updated_at` timestamps with `update_updated_at_column` trigger

**`public.academy_clubs`** (link table)
- `academy_id uuid not null references academies(id) on delete cascade`
- `club_id uuid not null references clubs(id) on delete cascade`
- `created_at timestamptz default now()`
- Primary key `(academy_id, club_id)`

**`public.user_academies`** (membership)
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null` (references `auth.users(id)` on delete cascade — read-only fk)
- `academy_id uuid not null references academies(id) on delete cascade`
- `role text not null check (role in ('academy_admin','head_of_academy','academy_coach','academy_staff'))`
- `created_at timestamptz default now()`
- Unique `(user_id, academy_id, role)`

### 2. Security Definer Helper

```sql
create or replace function public.is_academy_member(_academy_id uuid, _roles text[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_academies
    where user_id = auth.uid()
      and academy_id = _academy_id
      and (_roles is null or role = any(_roles))
  )
$$;
```

### 3. RLS Policies

Enable RLS on all three tables.

- **`academies` SELECT**: global admins, or any user in `user_academies` for that academy, or any user in a club linked via `academy_clubs` (so club members can see linked academies).
- **`academies` INSERT**: `is_global_admin(auth.uid())` only.
- **`academies` UPDATE/DELETE**: global admin or `is_academy_member(id, ARRAY['academy_admin','head_of_academy'])`.
- **`academy_clubs` SELECT**: global admin, academy member, or member of the linked club.
- **`academy_clubs` INSERT/DELETE**: global admin or academy admin.
- **`user_academies` SELECT**: own row, global admin, or academy admin of that academy.
- **`user_academies` INSERT/UPDATE/DELETE**: global admin or academy admin.

### 4. Storage

The code uploads to the existing `logos` bucket under `academy-logos/...`. No new bucket needed; existing bucket policies should already allow authenticated uploads. (If upload fails, it gracefully continues without a logo, so this won't block academy creation.)

## What this does NOT include

- Cross-project integration with **[Origin Sports Performance](/projects/cb1a7443-dfe7-4413-bc7a-813cf6770aa3)**. That's a separate project with its own Supabase backend, so wiring requires deciding whether you want (a) a shared Supabase project, (b) edge functions calling across, or (c) just shared identifiers. We can scope that as a follow-up once academy creation works — please confirm which integration model you want.

## Files touched

- New migration: creates tables, trigger, RLS, helper function.
- No frontend code changes required — existing `ClubManagement.tsx` already targets these table names correctly.
