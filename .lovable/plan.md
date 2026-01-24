

## Plan: Fix Player Card Customization (FIFA Stats, Play Styles, Photos)

### Problem Summary
When editing a player's FIFA card:
- Card design changes don't persist after refresh
- FIFA stats changes don't persist
- Play style changes don't persist
- Photo uploads may not persist

The toast notifications show "success" but the database isn't actually updated.

---

### Root Cause Analysis

After thorough investigation, I found multiple overlapping issues:

#### Issue 1: RLS Policy Function Overload Ambiguity
There are TWO versions of the `is_global_admin` function:
- `is_global_admin()` - no parameters, uses `auth.uid()` internally
- `is_global_admin(user_uuid uuid)` - takes a parameter

The RLS policy calls `is_global_admin(auth.uid())` which should resolve to the second version. However, this creates potential ambiguity that should be cleaned up.

#### Issue 2: Silent Update Failures
The Supabase client returns `{ error: null }` even when RLS blocks an update (0 rows affected). The code doesn't validate that rows were actually updated:

```typescript
const { error } = await supabase.from('players').update({ ... }).eq('id', player.id);
if (error) throw error; // error is null, but 0 rows updated!
toast({ title: 'Success' }); // Shows success incorrectly
```

#### Issue 3: Missing Row Count Validation
The save handlers don't verify the update actually affected a row, leading to false success messages.

---

### Solution

#### Phase 1: Clean Up Function Overloads (Database Migration)

Remove the no-argument version of `is_global_admin` to eliminate ambiguity:

```sql
-- Drop the no-argument version that can cause confusion
DROP FUNCTION IF EXISTS public.is_global_admin();

-- Keep only the version with the uuid parameter
-- (already exists: is_global_admin(user_uuid uuid))
```

#### Phase 2: Add Row Count Validation to Save Handlers

Update all save handlers in `DashboardMobile.tsx` to check if rows were actually updated:

```typescript
const handleSaveFunStats = async (player: any, stats: Record<string, number>) => {
  try {
    const { error, count } = await supabase
      .from('players')
      .update({ fun_stats: stats })
      .eq('id', player.id)
      .select('id', { count: 'exact', head: true });
    
    if (error) throw error;
    
    // Check if any rows were updated
    if (count === 0) {
      throw new Error('Update blocked by security policy. You may not have permission to edit this player.');
    }
    
    // Update local state
    setSelectedPlayerData(prev => prev ? {
      ...prev,
      player: { ...prev.player, funStats: stats }
    } : null);
    
    toast({ title: 'Stats Updated' });
  } catch (error: any) {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  }
};
```

Apply the same pattern to:
- `handleSavePlayStyle`
- `handleSaveCardDesign`
- `handleUpdatePhoto` (for the player table update)
- `handleDeletePhoto`

#### Phase 3: Also Update PlayerManagementMobile.tsx

Apply the same row count validation to the identical handlers in `PlayerManagementMobile.tsx` to ensure consistency.

---

### Technical Details

#### Files to Modify

| File | Changes |
|------|---------|
| Database Migration | Drop `is_global_admin()` no-arg function |
| `src/pages/DashboardMobile.tsx` | Add `.select()` with count validation to all save handlers |
| `src/pages/PlayerManagementMobile.tsx` | Add `.select()` with count validation to all save handlers |

#### Updated Handler Pattern

Each handler will follow this pattern:

```typescript
const { data, error, count } = await supabase
  .from('players')
  .update({ column_name: value })
  .eq('id', player.id)
  .select('id')  // Returns data to confirm update
  .single();     // Expect exactly one row

if (error) throw error;
if (!data) {
  throw new Error('Permission denied: Unable to update this player.');
}
```

#### Database Migration SQL

```sql
-- Clean up function overload ambiguity
-- Drop the no-argument version
DROP FUNCTION IF EXISTS public.is_global_admin();

-- Ensure the parameterized version exists and is correct
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
```

---

### Verification Steps

1. Apply database migration to clean up function overloads
2. Update save handlers with row count validation
3. Test saving card design - should either save successfully or show clear error message
4. Test saving fun stats - should work and reflect immediately in UI
5. Test saving play styles - should persist after card close/reopen
6. Test photo upload - should upload and display correctly
7. Test as a non-admin linked parent - should be able to customize their child's card

