

## Plan: Fix "Failed to load child progress data" Error on Player Progress Pages

### Problem Summary
Both the Player (Mobile) and My Team (Desktop) pages on `/child-progress` are showing:
- Error toast: "Failed to load child progress data"
- "No Players Found" / "No Children Found" despite user being linked to 2 players

### Root Cause Analysis

The console logs reveal the exact error:
```
TypeError: (r.recentGames || []).map is not a function
```

**What's happening:**
1. The user IS correctly linked to 2 players in `user_players` table (verified in database)
2. The players have valid `match_stats` JSON data with `recentGames` array
3. However, `childProgressService.ts` line 104-105 assumes `matchStats.recentGames` is always an array:

```typescript
const recentGames = matchStats.recentGames || [];
const matchHistory = recentGames.map((game: any) => ({ ... }));
```

4. Due to how Supabase returns nested JSON objects, `recentGames` could occasionally be:
   - A JSON string that needs parsing
   - An object instead of an array
   - Some other unexpected type

5. When `.map()` is called on a non-array, it throws the TypeError and the entire function fails

---

### Solution

#### Part 1: Add Robust Array Validation in `childProgressService.ts`

Create a safe helper to ensure `recentGames` is always treated as an array:

```typescript
// Helper to safely get recentGames as an array
const getRecentGamesArray = (matchStats: any): any[] => {
  if (!matchStats) return [];
  
  let recentGames = matchStats.recentGames;
  
  // If it's a string, try to parse it
  if (typeof recentGames === 'string') {
    try {
      recentGames = JSON.parse(recentGames);
    } catch {
      return [];
    }
  }
  
  // Ensure it's an array
  return Array.isArray(recentGames) ? recentGames : [];
};
```

Then update line 104-105:
```typescript
// Before:
const recentGames = matchStats.recentGames || [];

// After:
const recentGames = getRecentGamesArray(matchStats);
```

**Files:** `src/services/childProgressService.ts`

#### Part 2: Add Defensive Checks for Other JSON Fields

The same issue could affect other JSON fields. Add similar defensive parsing for:
- `matchStats.minutesByPosition` (ensure it's an object)
- `matchStats.performanceCategoryStats` (ensure it's an object)
- `player.match_stats` (ensure the top-level parse is correct)

```typescript
// Safer extraction of match_stats
const matchStats = (() => {
  const raw = player.match_stats;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } 
    catch { return {}; }
  }
  return typeof raw === 'object' ? raw : {};
})();
```

**Files:** `src/services/childProgressService.ts`

#### Part 3: Wrap Player Processing in Try-Catch

To prevent one malformed player record from breaking the entire list, wrap the per-player processing in a try-catch:

```typescript
for (const userPlayer of userPlayers || []) {
  try {
    const player = userPlayer.players;
    // ... existing processing logic ...
    childrenData.push(childData);
  } catch (playerError) {
    console.error(`Error processing player ${userPlayer.player_id}:`, playerError);
    // Continue processing other players
  }
}
```

This ensures that even if one player's data is malformed, the other linked players will still load.

**Files:** `src/services/childProgressService.ts`

---

### Technical Changes Summary

| File | Change |
|------|--------|
| `src/services/childProgressService.ts` | Add `getRecentGamesArray()` helper function |
| `src/services/childProgressService.ts` | Update `matchStats` extraction to handle string/object edge cases |
| `src/services/childProgressService.ts` | Wrap per-player processing in try-catch to prevent single failures from breaking the entire load |

---

### Expected Results After Fix

1. **Both linked players will load successfully** on the Player Progress page
2. **No more "No Players Found" error** for users with valid `user_players` links
3. **Graceful handling of malformed data** - if one player has bad data, others still display
4. **Console will show specific errors** for any problematic player records (helpful for debugging)

---

### Verification Steps

1. Navigate to `/child-progress` as user `chrisjpmcdonald@gmail.com`
2. Should see a player selection UI with both "Andrew McDonald" and "Bruno Fernandes"
3. Clicking on each player should show their progress summary, match history, training, and calendar tabs

