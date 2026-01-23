
## Plan: Fix Infinite Recursion in RLS Policies

### Problem
The new RLS policies I added created circular dependencies between tables:
- `players` policy → queries `profiles` to check global_admin
- `profiles` policies → query `players` via joins
- `user_players` policies → query `players` via joins
- This creates infinite loops when evaluating any of these policies

### Solution

Replace inline subqueries with **security definer functions** that bypass RLS evaluation, breaking the recursion chain.

---

### Phase 1: Create Security Definer Helper Functions

Create two helper functions that run with elevated privileges (bypassing RLS):

```sql
-- Function to check if user is a global admin
CREATE OR REPLACE FUNCTION public.is_global_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid
    AND 'global_admin' = ANY(roles)
  )
$$;

-- Function to check if user is linked to a player
CREATE OR REPLACE FUNCTION public.is_linked_to_player(user_uuid uuid, player_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_players
    WHERE user_id = user_uuid
    AND player_id = player_uuid
  )
$$;
```

---

### Phase 2: Drop the Problematic Policies

Remove the two policies that are causing recursion:

```sql
DROP POLICY IF EXISTS "Global admins can manage all players" ON public.players;
DROP POLICY IF EXISTS "Linked users can update player card customization" ON public.players;
```

---

### Phase 3: Recreate Policies Using Security Definer Functions

Recreate the policies using the helper functions instead of inline subqueries:

```sql
-- Global admins can manage all players (using function)
CREATE POLICY "Global admins can manage all players"
ON public.players FOR ALL
TO authenticated
USING (public.is_global_admin(auth.uid()))
WITH CHECK (public.is_global_admin(auth.uid()));

-- Linked users can update their player's card (using function)
CREATE POLICY "Linked users can update player card customization"
ON public.players FOR UPDATE
TO authenticated
USING (public.is_linked_to_player(auth.uid(), id))
WITH CHECK (public.is_linked_to_player(auth.uid(), id));
```

---

### Technical Details

| Step | Action |
|------|--------|
| 1 | Create `is_global_admin(uuid)` security definer function |
| 2 | Create `is_linked_to_player(uuid, uuid)` security definer function |
| 3 | Drop "Global admins can manage all players" policy |
| 4 | Drop "Linked users can update player card customization" policy |
| 5 | Recreate both policies using the helper functions |

### Why This Works

Security definer functions execute with the **privileges of the function owner** (typically the database owner), which bypasses RLS policies. This breaks the circular chain:

- Old: `players` policy → inline query to `profiles` → triggers `profiles` RLS → queries `players` → infinite loop
- New: `players` policy → calls `is_global_admin()` → function runs with SECURITY DEFINER, no RLS triggered → returns result

### Files Modified
- New database migration to create functions and fix policies

### Verification
1. Load `/dashboard` - should not error
2. Connected players should load successfully
3. Try editing a player card - should save and persist
4. Photo upload should work
