

## Plan: Simplify Team Selection Header

Reorganise the top of the Team Selection modal to free up vertical space and give the formation pitch more room.

### 1. Remove from top action bar
- Team tabs (T1, T2, +) — multi-team selection moves elsewhere later if needed
- AI Builder button (hidden, code preserved for later)
- Lock Team button
- Performance Category dropdown
- Separate Save + X buttons

### 2. New top action bar (single row)
- Left: back chevron / close (X)
- Right: **Save & Close** button (combines save + dismiss)

### 3. Repurpose the 3 hero boxes (persistent across Squad / Staff / Formation tabs)

| Box | Content | Behaviour |
|-----|---------|-----------|
| Left | **Performance Category** chip (e.g. "A Team") | Tap → opens picker (replaces removed top dropdown) |
| Centre | **Formation** (e.g. "1-2-3-1") | Tap → opens formation picker (replaces removed dropdown under tabs) |
| Right | **Opponent** + event date (e.g. "vs Forfar Blacks · H" / "Sat 19 Apr") | Read-only |

### 4. Remove from below tabs
- Standalone opponent line ("vs Forfar Blacks · H") — now lives in right box
- Formation dropdown above the pitch — now lives in centre box
- Period label ("Period 1/1") stays where it is, paired with the period nav arrows

### 5. Multi-team handling
Single-team events: works as-is. Multi-team events (rare): default to first team; we'll add a small inline switcher later if needed (out of scope this round).

### 6. Files to modify

| File | Change |
|------|--------|
| `src/components/events/EnhancedTeamSelectionManager.tsx` | Strip top action bar to back + Save & Close; remove team tabs / AI / Lock / Perf-cat buttons; rebuild 3 hero boxes (perf-cat picker, formation picker, opponent+date); make hero persistent across all tabs; remove standalone opponent line under header |
| `src/components/events/GameDayStyleFormationEditor.tsx` | Remove inline `FormationSelector` dropdown above the pitch (now controlled by hero centre box); keep period nav + pitch + bench |

### 7. Out of scope
- Restoring AI Builder UI (kept hidden, re-introduce later)
- Multi-team switcher replacement
- Real values for projected pts / season best (still placeholders — left box now uses that slot for perf-cat instead)

