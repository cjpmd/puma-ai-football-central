
## Plan: Fix Player Card Saves (Design, Stats, Photos)

### Problem Summary
When editing a player's FIFA card on `/dashboard`:
- Card design changes don't persist
- FIFA stats changes don't persist  
- Photo uploads may not persist
- Even successful saves don't update the card UI immediately

### Root Cause

**1. Database RLS Policy Blocking Updates**

The `players` table has an UPDATE policy that only allows users with specific team staff roles:
```sql
Team staff can manage their team players (cmd: ALL)
WHERE ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
```

This policy does NOT allow:
- `global_admin` users (your current role)
- Parents/players editing their own card customizations (fun stats, play styles, card design)

The Supabase API returns `204 No Content` even when RLS blocks the update (0 rows affected), so it appears to succeed but nothing is saved.

**2. UI State Not Updating After Save**

The save handlers in `DashboardMobile.tsx` update the database but don't update `selectedPlayerData`:
```tsx
const handleSaveFunStats = async (player, stats) => {
  await supabase.update(...); // Updates DB
  toast({ title: 'Stats Updated' }); // Shows success
  // BUT: selectedPlayerData is NOT updated
};
```

So even if the save worked, the card shows stale data until closed and reopened.

---

### Solution

#### Phase 1: Fix RLS Policy for Players Table

Add a new policy (or modify existing) to allow:
1. **Global admins** can manage all players
2. **Parents/players** can update specific customization fields on their linked players

```sql
-- Allow global admins to manage all players
CREATE POLICY "Global admins can manage all players"
ON players FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'global_admin' = ANY(profiles.roles)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'global_admin' = ANY(profiles.roles)
  )
);

-- Allow linked users (parents/self) to update card customization
CREATE POLICY "Linked users can update player card customization"
ON players FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_players
    WHERE user_players.player_id = players.id
    AND user_players.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_players
    WHERE user_players.player_id = players.id
    AND user_players.user_id = auth.uid()
  )
);
```

#### Phase 2: Update Local State After Saves

Modify the save handlers in `DashboardMobile.tsx` to update `selectedPlayerData` immediately after successful database updates:

```tsx
const handleSaveFunStats = async (player: any, stats: Record<string, number>) => {
  try {
    const { error } = await supabase
      .from('players')
      .update({ fun_stats: stats })
      .eq('id', player.id);
    if (error) throw error;
    
    // UPDATE LOCAL STATE IMMEDIATELY
    setSelectedPlayerData(prev => prev ? {
      ...prev,
      player: { ...prev.player, funStats: stats }
    } : null);
    
    toast({ title: 'Stats Updated' });
  } catch (error: any) {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  }
};

const handleSavePlayStyle = async (player: any, playStyles: string[]) => {
  try {
    const { error } = await supabase
      .from('players')
      .update({ play_style: JSON.stringify(playStyles) })
      .eq('id', player.id);
    if (error) throw error;
    
    // UPDATE LOCAL STATE IMMEDIATELY
    setSelectedPlayerData(prev => prev ? {
      ...prev,
      player: { ...prev.player, playStyle: playStyles }
    } : null);
    
    toast({ title: 'Play Style Updated' });
  } catch (error: any) {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  }
};

const handleSaveCardDesign = async (player: any, designId: string) => {
  try {
    const { error } = await supabase
      .from('players')
      .update({ card_design_id: designId })
      .eq('id', player.id);
    if (error) throw error;
    
    // UPDATE LOCAL STATE IMMEDIATELY
    setSelectedPlayerData(prev => prev ? {
      ...prev,
      player: { ...prev.player, cardDesignId: designId }
    } : null);
    
    toast({ title: 'Card Design Updated' });
  } catch (error: any) {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  }
};
```

---

### Technical Details

#### Files to Modify:

| File | Change |
|------|--------|
| `supabase/migrations/` | Add RLS policies for global_admin and linked users |
| `src/pages/DashboardMobile.tsx` | Update save handlers to set local state |

#### Database Migration SQL:
```sql
-- Add global admin policy for players
CREATE POLICY "Global admins can manage all players"
ON public.players FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'global_admin' = ANY(profiles.roles)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'global_admin' = ANY(profiles.roles)
  )
);

-- Add policy for linked users to update their player's card
CREATE POLICY "Linked users can update player card customization"
ON public.players FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_players
    WHERE user_players.player_id = players.id
    AND user_players.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_players
    WHERE user_players.player_id = players.id
    AND user_players.user_id = auth.uid()
  )
);
```

### Verification Steps

1. Apply the database migration
2. Test saving card design as global_admin - should persist
3. Test saving fun stats - should persist and update immediately
4. Test saving play styles - should persist and update immediately
5. Test photo upload - should persist and show in card immediately
6. Close and reopen the card - changes should still be there
7. Refresh the page - changes should persist from database
