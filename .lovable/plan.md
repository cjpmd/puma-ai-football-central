

## Plan: Opponent box → Team switcher; preserve players when changing formation

Two scoped fixes in `src/components/events/EnhancedTeamSelectionManager.tsx` (the Team Selection modal hero).

### 1. Make the right-hand "Opponent" box act as a team switcher

Today the third hero box is a static card showing `Home/Away · vs · {opponent}` plus date. The Category and Formation boxes are interactive `Select` triggers. We mirror the same pattern for the opponent box:

- When `teamSelections.length > 1`, render the opponent card inside a `<Select>` whose:
  - `value` = `String(currentTeamIndex)`
  - `onValueChange` = `(v) => setCurrentTeamIndex(parseInt(v, 10))`
  - `SelectContent` lists every team as `Team {i+1}` plus its performance category name when set (e.g. "Team 1 · Messi", "Team 2 · Ronaldo"), so the user can tell them apart.
- When `teamSelections.length <= 1`, keep the existing static card (no chevron, no menu) so single-team events look unchanged.
- Visible content of the trigger stays exactly as today: the opponent + date stack (or date-only when no opponent). Nothing about the displayed text changes — only the box becomes tappable.
- Style: match the existing `ios-card` / `[&>svg]:hidden` pattern used by the Category trigger so the chevron is hidden and the box looks identical to its static form.
- Apply the same treatment in the Formation tab's restricted-user fallback (no change needed there since the hero is shared).

No new state, no schema, no extra props. Switching the index already triggers re-render of Squad / Staff / Formation tabs via the existing `key={`team-${currentTeamIndex}`}` pattern.

### 2. Preserve player positions when changing formation from the hero

The hero's Formation `Select` (line ~1010) currently does:

```
i === 0 ? { ...p, formation: value, positions: [] } : p
```

Wiping `positions` is what loses every player. The Formation editor itself already has the right algorithm in `updatePeriodFormation` / `preservePlayerAssignments` (`GameDayStyleFormationEditor.tsx` lines 247–338): it builds new slots for the chosen formation, re-assigns players to slots with the same `positionName`, falls back to same `positionGroup` (GK / DEF / MID / FWD), and any orphaned players drop to the substitutes bench.

Fix:

- Extract the same preservation logic into a small local helper inside `EnhancedTeamSelectionManager.tsx` (so the hero doesn't depend on the editor mounting). Reuse `getPositionsForFormation` from `@/utils/formationUtils` (already imported via `getFormationsByFormat`) to build the new slots.
- In the hero's `onValueChange`, replace the `positions: []` line with:
  - Build `newSlots` from `getPositionsForFormation(value, event.game_format)`.
  - Run `preservePlayerAssignments(p.positions, newSlots)` — exact same matching: same name → same group → else orphan.
  - Compute orphaned player IDs and append them to `p.substitutes` (deduped), matching the editor's behaviour.
  - Return `{ ...p, formation: value, positions: preserved, substitutes: updatedSubs }`.
- Apply this to the **first period only** (which is what the hero edits today). Other periods are untouched, same as current behaviour.

Net result: changing 1-2-3-1 → 1-3-2-1 keeps GK, both fullbacks, the centre defender, etc., wherever the names match. A defender that no longer fits goes to the bench instead of vanishing.

### Files modified

| File | Change |
|------|--------|
| `src/components/events/EnhancedTeamSelectionManager.tsx` | (a) Wrap the opponent hero box in a `<Select>` team switcher when `teamSelections.length > 1`. (b) Replace the `positions: []` formation-change handler with a `preservePlayerAssignments` helper that keeps players in same/group-matched slots and benches orphans. |

### Out of scope

- Editing the per-period Formation `Select` inside `GameDayStyleFormationEditor` — already correct.
- Persisting / saving — `handlePeriodsChange` → `updateCurrentTeam` already triggers the existing save flow.
- Desktop layout — desktop already uses tabs/buttons for team switching; the hero is mobile-only.
- Changes to opponent text, date format, or card styling.

### Verification (390x844)

- Open an event with 2 teams → hero opponent box now shows a chevron-less tappable card that, when pressed, lists "Team 1 · Messi" / "Team 2 · Ronaldo". Selecting Team 2 swaps Squad / Staff / Formation contents.
- Open Formation tab on Team 1 → place 7 players in 1-2-3-1 → return to Squad → tap hero Formation, switch to 1-3-2-1 → reopen Formation: GK still in goal, defenders fill DL/DC/DR, the orphaned midfielder is on the bench.
- Single-team event → opponent box behaves exactly as before (static, not tappable).

