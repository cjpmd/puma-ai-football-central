
## Plan: Make Formation Tab Read-Only for Parent and Player Profiles

### Overview
When privacy settings allow parents or players (who don't have staff access) to view the Formation tab, they should see a **read-only view**. This means they can see the formation, periods, and player placements but cannot modify anything.

---

### What Will Be Locked for Restricted Parents/Players

| Element | Current Location | Read-Only Behavior |
|---------|-----------------|-------------------|
| AI Builder button | EnhancedTeamSelectionManager (line 979-988) | Hidden |
| Lock/Unlock button | EnhancedTeamSelectionManager (line 991-1007) | Hidden |
| Performance Category selector | EnhancedTeamSelectionManager (line 1009-1026) | Hidden |
| Save button | EnhancedTeamSelectionManager (line 1045-1048) | Hidden |
| Add Period (+) button | GameDayStyleFormationEditor (line 703-711) | Hidden |
| Delete Period option | GameDayStyleFormationEditor (line 672-685) | Hidden |
| Edit Period duration | GameDayStyleFormationEditor (line 655-687) | Popover disabled or duration input hidden |
| Drag and drop of players | DraggablePitchPlayer + DndContext | Disabled (no drag interactions) |

---

### Implementation Approach

#### Step 1: Add `isReadOnly` Detection in EnhancedTeamSelectionManager

Create a new variable that determines if the view should be read-only:

```typescript
// In EnhancedTeamSelectionManager.tsx
const { isRestrictedParent, isRestrictedPlayer } = useEffectiveRole();

// Formation tab is visible but read-only for restricted parents/players
const isFormationReadOnly = isRestrictedParent || isRestrictedPlayer;
```

This will be `true` only when:
- User has no staff access (pure parent or player role)
- They're viewing as parent or player

#### Step 2: Hide AI Builder, Lock, Category, and Save Buttons

Update the button visibility conditions in EnhancedTeamSelectionManager:

```typescript
// AI Builder - hide if read-only
{activeTab === 'formation' && !isTrainingEvent && currentTeam && 
 currentTeam.squadPlayers.length > 0 && !isFormationReadOnly && (
  <Button onClick={() => setShowAIBuilder(true)} ... />
)}

// Lock/Unlock - hide if read-only
{activeTab === 'formation' && currentTeam && 
 currentTeam.squadPlayers.length > 0 && !isFormationReadOnly && (
  <Button onClick={handleTogglePositionsLock} ... />
)}

// Performance Category - hide if read-only
{performanceCategories.length > 0 && currentTeam && !isFormationReadOnly && (
  <Select value={currentTeam.performanceCategory || 'none'} ... />
)}

// Save button - hide if read-only
{!isFormationReadOnly && (
  <Button onClick={saveSelections} ... />
)}
```

#### Step 3: Pass `readOnly` Prop to GameDayStyleFormationEditor

Add a new prop to control read-only mode in the formation editor:

```typescript
// In EnhancedTeamSelectionManager.tsx
<GameDayStyleFormationEditor
  squadPlayers={currentTeam.squadPlayers}
  periods={currentTeam.periods}
  // ... other props ...
  readOnly={isFormationReadOnly}  // NEW PROP
/>
```

#### Step 4: Update GameDayStyleFormationEditor Interface

Add the `readOnly` prop to the component:

```typescript
interface GameDayStyleFormationEditorProps {
  squadPlayers: SquadPlayer[];
  periods: FormationPeriod[];
  // ... existing props ...
  readOnly?: boolean;  // NEW
}
```

#### Step 5: Disable Interactions in GameDayStyleFormationEditor

When `readOnly` is true:

**Hide Add Period button:**
```typescript
{!readOnly && (
  <Button onClick={addPeriod}>
    <Plus />
  </Button>
)}
```

**Disable period popover (edit duration / delete):**
```typescript
<Popover 
  open={!readOnly && editingPeriodId === period.id}
  onOpenChange={(open) => !readOnly && setEditingPeriodId(open ? period.id : null)}
>
```

Or simply make the period tabs non-interactive (just display, no popover):
```typescript
{readOnly ? (
  <button className="..." onClick={() => setActivePeriodIndex(index)}>
    {calculateTimeRange(index)}
  </button>
) : (
  <Popover>...</Popover>
)}
```

**Disable drag-and-drop:**
Pass `readOnly` to `DraggablePitchPlayer` and disable the drag sensor when in read-only mode.

Or the simpler approach: when `readOnly` is true, treat it like `isPositionsLocked`:
```typescript
const effectivelyLocked = isPositionsLocked || readOnly;
```

Then pass `effectivelyLocked` to `DraggablePitchPlayer` as `isPositionsLocked`.

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/events/EnhancedTeamSelectionManager.tsx` | Add `isFormationReadOnly` logic, hide AI/Lock/Category/Save buttons, pass `readOnly` prop to formation editor |
| `src/components/events/GameDayStyleFormationEditor.tsx` | Add `readOnly` prop, disable add/edit/delete period controls, disable drag-and-drop |

---

### User Experience

**For coaches/managers (staff access):**
- No change - full editing capability as before

**For parents/players WITH staff access:**
- No change - full editing capability (their staff role gives them permissions)

**For parents/players WITHOUT staff access (when Formation tab is visible via privacy settings):**
- Can view the formation layout and player positions
- Can navigate between periods using left/right arrows
- Can view the substitute bench
- Can view playing time summary
- **Cannot**: Use AI Builder, lock/unlock, change categories, add/edit/delete periods, drag players, save changes

---

### Visual Indicators (Optional Enhancement)

Consider adding a visual indicator that the view is read-only:
- A small "View Only" badge near the Formation tab title
- A lock icon in the header when in read-only mode

This helps users understand why they can't make changes.

---

### Verification Steps

1. Log in as a **pure parent** (no staff roles) for a team where `hideFormationFromParents` is set to `false` (i.e., "Show Formation to Parents" is ON)
2. Open an event's Team Selection
3. Navigate to the Formation tab
4. Verify:
   - Formation layout is visible
   - Player positions are shown
   - AI Builder button is hidden
   - Lock/Unlock button is hidden
   - Performance Category dropdown is hidden
   - Save button is hidden
   - Add Period (+) button is hidden
   - Cannot click on period tabs to edit duration
   - Cannot drag players to different positions
5. Repeat test for a pure **player** account
