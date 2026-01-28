
## Plan: Make Formation Tab Read-Only for Parent and Player Profiles

### Status: ✅ IMPLEMENTED

### Overview
When privacy settings allow parents or players (who don't have staff access) to view the Formation tab, they see a **read-only view**. This means they can see the formation, periods, and player placements but cannot modify anything.

---

### What Is Locked for Restricted Parents/Players

| Element | Location | Read-Only Behavior |
|---------|-----------------|-------------------|
| AI Builder button | EnhancedTeamSelectionManager | ✅ Hidden |
| Lock/Unlock button | EnhancedTeamSelectionManager | ✅ Hidden |
| Performance Category selector | EnhancedTeamSelectionManager | ✅ Hidden |
| Save button | EnhancedTeamSelectionManager | ✅ Hidden |
| Copy/Match Day Pack buttons | EnhancedTeamSelectionManager | ✅ Hidden |
| Add Period (+) button | GameDayStyleFormationEditor | ✅ Hidden |
| Delete Period option | GameDayStyleFormationEditor | ✅ Hidden (popover disabled) |
| Edit Period duration | GameDayStyleFormationEditor | ✅ Disabled (no popover) |
| Drag and drop of players | DraggablePitchPlayer + DndContext | ✅ Disabled |

---

### Implementation Details

#### EnhancedTeamSelectionManager.tsx
- Added `isFormationReadOnly = isRestrictedParent || isRestrictedPlayer`
- AI Builder, Lock/Unlock, Category selector, Copy, Match Day Pack, and Save buttons are hidden when `isFormationReadOnly` is true
- Passes `readOnly={isFormationReadOnly}` to GameDayStyleFormationEditor

#### GameDayStyleFormationEditor.tsx
- Added `readOnly?: boolean` prop
- Created `effectivelyLocked = isPositionsLocked || readOnly`
- Drag handlers check `effectivelyLocked` instead of just `isPositionsLocked`
- Period buttons show simple non-interactive buttons (no popover) when `readOnly` is true
- Add Period button is hidden when `readOnly` is true
- DraggablePitchPlayer receives `effectivelyLocked` as its `isPositionsLocked` prop

---

### User Experience

**For coaches/managers (staff access):**
- No change - full editing capability as before

**For parents/players WITH staff access:**
- No change - full editing capability (their staff role gives them permissions)

**For parents/players WITHOUT staff access (when Formation tab is visible via privacy settings):**
- ✅ Can view the formation layout and player positions
- ✅ Can navigate between periods using left/right arrows
- ✅ Can view the substitute bench
- ✅ Can view playing time summary
- ❌ Cannot: Use AI Builder, lock/unlock, change categories, add/edit/delete periods, drag players, save changes
