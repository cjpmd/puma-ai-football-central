
## Plan: Fix Shona's Incorrect Links + Prevent Future Cross-Team Parent Linking Errors

### Part 1: Immediate Fix - Delete Incorrect Associations

The following records need to be deleted to fix Shona McDonald's account:

| Table | Record ID | Description |
|-------|-----------|-------------|
| `user_players` | `14bcfda5-14bf-4bf1-9ac4-876108a0d6a9` | Incorrect link to Bruno Fernandes as parent |
| `user_teams` | `c2c1d7a9-a095-413b-b2e6-35b4db99400b` | Incorrect team_parent role for Panthers |

**SQL to run in Supabase SQL Editor:**
```sql
-- Delete incorrect parent-player link
DELETE FROM user_players 
WHERE id = '14bcfda5-14bf-4bf1-9ac4-876108a0d6a9';

-- Delete incorrect team membership
DELETE FROM user_teams 
WHERE id = 'c2c1d7a9-a095-413b-b2e6-35b4db99400b';
```

---

### Part 2: Prevention - Add Validation for Parent Linking

#### Root Cause Analysis

The issue likely occurred because:
1. When a parent enters a code or is linked by email, there's **no check** to verify they aren't already linked to a different team
2. The PlayerParentLinkManager only checks if the user is already linked to **that specific player**, not if they're already in a different team as a parent

#### Solution: Add Cross-Team Validation

**Before creating a parent link, check:**
1. Is this user already linked as a parent to players on OTHER teams?
2. If yes, show a warning and require confirmation (or block entirely)

---

### Implementation Details

#### File 1: `src/services/playerCodeService.ts` - Add validation in `linkUserToPlayerAsParent`

Add a check before inserting the user_players record:

```typescript
async linkUserToPlayerAsParent(parentCode: string): Promise<void> {
  const player = await this.getPlayerByParentLinkingCode(parentCode);
  if (!player) {
    throw new Error('Invalid parent linking code');
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to link as parent');
  }
  
  // NEW: Check if user is already linked to this player
  const { data: existingLink } = await supabase
    .from('user_players')
    .select('id')
    .eq('player_id', player.id)
    .eq('user_id', user.id)
    .eq('relationship', 'parent')
    .maybeSingle();
  
  if (existingLink) {
    throw new Error('You are already linked as a parent to this player');
  }
  
  // NEW: Check for cross-team parent links
  const { data: existingLinks } = await supabase
    .from('user_players')
    .select(`
      id,
      players!inner(team_id, name, teams(name))
    `)
    .eq('user_id', user.id)
    .eq('relationship', 'parent');
  
  if (existingLinks && existingLinks.length > 0) {
    // User is already a parent to other players
    const otherTeamLinks = existingLinks.filter(
      link => link.players.team_id !== player.team_id
    );
    
    if (otherTeamLinks.length > 0) {
      const teamNames = otherTeamLinks.map(l => l.players.teams?.name).join(', ');
      throw new Error(
        `You are already linked as a parent to players on other teams (${teamNames}). ` +
        `Please contact the team manager if you need to link to players on multiple teams.`
      );
    }
  }
  
  // Existing code continues...
}
```

#### File 2: `src/components/players/PlayerParentLinkManager.tsx` - Add validation in `handleInviteParent`

Add validation when linking an existing user by email:

```typescript
const handleInviteParent = async () => {
  // ... existing validation ...
  
  if (existingProfile) {
    // NEW: Check if this user is already a parent on a DIFFERENT team
    const { data: currentPlayer } = await supabase
      .from('players')
      .select('team_id')
      .eq('id', playerId)
      .single();
    
    if (currentPlayer) {
      const { data: existingLinks } = await supabase
        .from('user_players')
        .select(`
          id,
          players!inner(team_id, name, teams(name))
        `)
        .eq('user_id', existingProfile.id)
        .eq('relationship', 'parent');
      
      if (existingLinks && existingLinks.length > 0) {
        const otherTeamLinks = existingLinks.filter(
          link => link.players.team_id !== currentPlayer.team_id
        );
        
        if (otherTeamLinks.length > 0) {
          const linkedTeams = otherTeamLinks
            .map(l => l.players.teams?.name)
            .filter(Boolean)
            .join(', ');
          
          toast({
            title: 'Warning: Cross-Team Link',
            description: `This user is already a parent on: ${linkedTeams}. Are you sure this is correct?`,
            variant: 'destructive'
          });
          // Optionally: block the action or add a confirmation dialog
          return;
        }
      }
    }
    
    // Continue with existing link logic...
  }
};
```

#### File 3: `src/components/auth/UnifiedSignupWizard.tsx` - Add validation during signup

For parents signing up with a code, add validation before creating links:

```typescript
} else if (selectedRole === "parent" && matchedPlayer) {
  // NEW: This is a new account, so no need to check for existing cross-team links
  // The matchedPlayer already contains the team_id from the code
  // But we should validate the team_id matches the team they entered the code for
  
  if (matchedPlayer.team_id !== teamInfo?.id) {
    console.warn("Player team doesn't match selected team - potential code mismatch");
    // This could indicate a bug or incorrect code handling
  }
  
  // Existing code to create parent link...
}
```

---

### Part 3: Add Audit Logging for Parent Links

#### Database Migration: Add `created_by` column to `user_players`

```sql
-- Add tracking columns to user_players
ALTER TABLE user_players 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS creation_method text;

-- Add comment for documentation
COMMENT ON COLUMN user_players.created_by IS 'User who created this link (manager, self-signup, etc.)';
COMMENT ON COLUMN user_players.creation_method IS 'How link was created: signup_code, manager_invite, manager_direct, code_link';
```

#### Update Link Creation Code

When creating user_players records, include the creation method:

```typescript
// In playerCodeService.linkUserToPlayerAsParent
const { error: linkError } = await supabase
  .from('user_players')
  .insert({
    player_id: player.id,
    user_id: user.id,
    relationship: 'parent',
    created_by: user.id,
    creation_method: 'code_link'  // or 'signup_code' for UnifiedSignupWizard
  });
```

---

### Summary of Changes

| File | Change |
|------|--------|
| **SQL (Manual)** | Delete 2 incorrect records for Shona McDonald |
| `src/services/playerCodeService.ts` | Add cross-team validation in `linkUserToPlayerAsParent()` |
| `src/components/players/PlayerParentLinkManager.tsx` | Add cross-team validation in `handleInviteParent()` |
| `src/components/auth/UnifiedSignupWizard.tsx` | Add team_id consistency check during signup |
| **Database Migration** | Add `created_by` and `creation_method` columns to `user_players` |

---

### Expected Behavior After Implementation

1. **Shona McDonald's account** will only show Andrew McDonald (Pumas) - Bruno Fernandes link will be removed
2. **Future parent signups/links** will check for existing cross-team associations and warn/block
3. **Audit trail** will track who created each parent-player link and how

---

### Verification Steps

After implementation:
1. Query Shona's links - should only see Andrew McDonald
2. Try to link a user who is already a parent on Team A to a player on Team B - should show warning/error
3. Verify new `user_players` records have `created_by` and `creation_method` populated
