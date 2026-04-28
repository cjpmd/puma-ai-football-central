# Restore Performance Category filter in Team Analytics

## Problem

On `/my-team` (mobile), only the Season selector chip is visible. The Performance Category filter row ("All / Messi / Ronaldo") that used to appear is gone.

## Root cause

In `src/pages/MyTeamMobile.tsx`:

```ts
const categoryKeys = analytics.categoryStats.map(c => c.categoryName);
...
{categoryKeys.length > 1 && ( /* render chips */ )}
```

`categoryStats` is built only from played matches in the selected season. Broughty United Jags 2015s currently has just **one** match logged in 2026, so `categoryStats` returns a single entry and the chip row is hidden — even though the team has two configured categories ("Messi" and "Ronaldo", confirmed in `performance_categories`).

## Fix

Source the chip list from the team's configured `performance_categories` (always available), independent of how many matches have been played. Match-data still drives the breakdown card lower down.

### Changes (single file: `src/pages/MyTeamMobile.tsx`)

1. **Load configured categories once per team**
   - Add a `teamCategories: string[]` state.
   - In a new effect keyed on `currentTeam?.id`, fetch `performance_categories` for the current team (`select('name').eq('team_id', currentTeam.id).order('name')`) and store the names.

2. **Use configured categories for the filter chips**
   - Replace `const categoryKeys = analytics.categoryStats.map(c => c.categoryName);` with `const categoryKeys = teamCategories;`.
   - Render the chip row whenever `categoryKeys.length > 1` (unchanged condition, now fed by team config).

3. **Reset selection on team switch**
   - When `currentTeam.id` changes, reset `selectedCategory` to `'all'` so a stale category from a previous team doesn't filter to nothing.

4. **Keep the breakdown card behaviour**
   - The "By Performance Category" card lower down continues to use `displayStats.categoryStats` (match-derived). No change needed there.

## Out of scope

- Event-type filter logic (already correctly conditional on actual event types in season).
- Analytics calculations and queries.
- Desktop `Analytics.tsx`.

## Files touched

- `src/pages/MyTeamMobile.tsx` (one fetch effect, one state, one line swap, one reset)
