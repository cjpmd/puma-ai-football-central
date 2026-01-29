

## Plan: Disable Formation Selector for Read-Only Parent/Player Profiles

### Overview
The Formation tab's read-only mode for restricted parents/players is missing one restriction: the formation selector dropdown (e.g., "1-2-3-1", "4-3-3") can still be changed. This needs to be disabled.

---

### Current Issue

In `GameDayStyleFormationEditor.tsx` at line 550, the formation selector uses:

```typescript
disabled={isPositionsLocked}
```

However, the component already has `effectivelyLocked` defined at line 67:

```typescript
const effectivelyLocked = isPositionsLocked || readOnly;
```

The `effectivelyLocked` variable is correctly used for drag-and-drop restrictions, but the formation selector was missed.

---

### Solution

Update line 550 to use `effectivelyLocked` instead of `isPositionsLocked`:

```typescript
// Before:
disabled={isPositionsLocked}

// After:
disabled={effectivelyLocked}
```

This ensures the formation selector dropdown is disabled when:
1. Positions are manually locked by a coach (existing behavior)
2. The view is in read-only mode for restricted parents/players (new behavior)

---

### File to Modify

| File | Change |
|------|--------|
| `src/components/events/GameDayStyleFormationEditor.tsx` | Line 550: Change `disabled={isPositionsLocked}` to `disabled={effectivelyLocked}` |

---

### Expected Result

When a restricted parent or player views the Formation tab (if privacy settings allow it):
- Formation selector dropdown is disabled (grayed out, cannot be changed)
- All other existing read-only restrictions remain in place (no drag-drop, no period edit, no AI builder, etc.)

---

### Verification Steps

1. Log in as a pure parent (no staff roles) for a team where "Show Formation to Parents" is enabled
2. Open an event's Team Selection > Formation tab
3. Verify the formation selector dropdown (e.g., "1-2-3-1") is grayed out and cannot be clicked

