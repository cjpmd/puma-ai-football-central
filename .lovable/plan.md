# Restore missing performance category data in Team Analytics

## Problem

In the screenshot, the "Ronaldo" performance category shows 0 games / 0 stats even though the 26 Apr fixture vs Arbroath Blues has scores recorded for both teams:

- `team_1: 5, opponent_1: 2` → Messi
- `team_2: 5, opponent_2: 8` → Ronaldo

Confirmed in the database: that event has scores for both `team_1` and `team_2`, but only the **Messi** row exists in `event_selections`. There is no `event_selections` row with `team_number = 2` for that match.

The analytics loader in `src/pages/MyTeamMobile.tsx` builds its category map purely from `event_selections`. Any team-number score that doesn't have a matching selection row is silently dropped — so Ronaldo's 5–8 result is never counted, and the filter chip shows nothing.

## Fix

Update `loadAnalyticsData` in `src/pages/MyTeamMobile.tsx` so it processes every `team_N` score present on an event, even when there is no corresponding `event_selections` row for that team number.

### Logic change

For each match event:

1. Build the existing list of categories from `event_selections` (unchanged).
2. **Additionally** scan `event.scores` for every `team_N` / `opponent_N` pair.
3. For any `team_N` that does not already have an entry from step 1, synthesize a category entry using:
   - `categoryId: null`
   - `categoryName`: look up the team's configured performance categories by ordinal — `team_1` → first configured category by `name`, `team_2` → second, etc. (matches how the squad is created when a team plays in two performance groups). Fall back to `"Team N"` if no category exists at that index.
   - `teamNumber: N`
4. Continue with the existing loop that adds wins/draws/losses, goalsFor/Against, and `matchResults` rows for each team number.

This guarantees that:
- Filtering by **Ronaldo** on the 26 Apr match shows a 5–8 loss.
- "All" totals reflect both team performances (today the Ronaldo result is missing entirely from goals/wins/losses).
- Future matches with `team_3` etc. are also captured.

### Secondary tidy

The `Default` synthetic category (used when a match has no selections at all) currently reuses the literal string `"Default"`, which won't match any real chip. Leave the behaviour as-is for matches with no selection rows and no `team_N` keys, but make sure the new ordinal-based lookup runs first so it takes precedence whenever scores carry team numbers.

## Files

- `src/pages/MyTeamMobile.tsx` — extend the per-event loop in `loadAnalyticsData` as described. No schema or RLS changes required.

## Out of scope

- Backfilling missing `event_selections` rows for historical matches (data fix, not a UI concern).
- Changing how Game Day writes selections.
