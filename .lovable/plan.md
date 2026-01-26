

## Plan: Fix Calendar Timeout Errors and Kit Display

### Problem Summary
1. **"canceling statement due to statement timeout"** error appearing on mobile
2. **Wrong kit showing** in event details (e.g., "Away Kit" when it should show the correct kit for the event's team)

---

### Root Cause Analysis

#### Issue 1: Kit Display Using Wrong Team
In `CalendarEventsMobile.tsx`, the `getKitDesign()` function pulls from `teams?.[0]` (the first team in the club context) instead of looking up the kit from the **event's actual team**:

```typescript
// Current (WRONG):
const getKitDesign = (selection) => {
  const team = teams?.[0]; // <-- Uses first team from club filter
  if (!team?.kitDesigns) return undefined;
  ...
};
```

When viewing "All Teams", `teams?.[0]` might be a completely different team than the event belongs to, resulting in the wrong kit being displayed.

#### Issue 2: Expanded Team Selection View Uses Wrong teamId
At line 759-761, the expanded `MobileTeamSelectionView` receives:
```typescript
teamId={teams?.[0]?.id || ''}
```
This should use `selectedEvent.team_id` like the inline version does.

#### Issue 3: Excessive Database Queries Causing Timeouts
The functions `loadInvitedEvents()` and `loadEventTimeContexts()` loop through **every event** and make individual database calls. For users with many events, this causes statement timeouts and performance issues.

---

### Solution

#### Part 1: Fix Kit Design Lookup to Use Event's Team

Update `getKitDesign()` to find the correct team from `allTeams` or `authTeams` based on the selected event:

```typescript
const getKitDesign = (selection: 'home' | 'away' | 'training' | undefined): KitDesign | undefined => {
  // Use the event's team, not the first team in club context
  const eventTeamId = selectedEvent?.team_id;
  const team = (allTeams || authTeams || teams || []).find(t => t.id === eventTeamId) || teams?.[0];
  
  if (!team?.kitDesigns) return undefined;
  const kitDesigns = team.kitDesigns as Record<string, KitDesign>;
  return kitDesigns[selection || 'home'] || kitDesigns.home;
};
```

**Files:** `src/pages/CalendarEventsMobile.tsx`

#### Part 2: Fix Expanded Team Selection View teamId

Change line 761 from:
```typescript
teamId={teams?.[0]?.id || ''}
```
To:
```typescript
teamId={selectedEvent.team_id}
```

**Files:** `src/pages/CalendarEventsMobile.tsx`

#### Part 3: Optimize Event Loading to Reduce Database Queries

Batch the invitation and time context checks instead of making individual calls per event:

1. **For `loadInvitedEvents()`**: Fetch all user's linked players/staff once, then filter locally
2. **For `loadEventTimeContexts()`**: Process in parallel batches of 5-10 instead of sequentially

Current pattern (causes N+1 queries):
```typescript
for (const event of events) {
  const isInvited = await multiRoleAvailabilityService.isUserInvitedToEvent(event.id, user.id);
  ...
}
```

Optimized pattern:
```typescript
// Fetch user's links once
const [playerLinks, staffLinks] = await Promise.all([
  supabase.from('user_players').select('player_id').eq('user_id', user.id),
  supabase.from('user_staff').select('staff_id').eq('user_id', user.id)
]);

// Fetch all invitations for these events in one query
const eventIds = events.map(e => e.id);
const { data: invitations } = await supabase
  .from('event_invitations')
  .select('event_id, player_id, staff_id')
  .in('event_id', eventIds);

// Filter locally
const invitedIds = new Set<string>();
invitations?.forEach(inv => {
  if (linkedPlayerIds.includes(inv.player_id) || linkedStaffIds.includes(inv.staff_id)) {
    invitedIds.add(inv.event_id);
  }
});
```

**Files:** `src/pages/CalendarEventsMobile.tsx`

---

### Technical Changes Summary

| File | Change |
|------|--------|
| `src/pages/CalendarEventsMobile.tsx` | Update `getKitDesign()` to use `selectedEvent.team_id` and look up from `allTeams`/`authTeams` |
| `src/pages/CalendarEventsMobile.tsx` | Fix expanded MobileTeamSelectionView to use `selectedEvent.team_id` |
| `src/pages/CalendarEventsMobile.tsx` | Optimize `loadInvitedEvents()` to batch queries |
| `src/pages/CalendarEventsMobile.tsx` | Optimize `loadEventTimeContexts()` to process in parallel batches |

---

### Expected Results After Fix

1. **Kit Display**: When opening any event, the kit shown will match that specific event's team (not the first team in your club filter)
2. **No More Timeout Errors**: Reducing from N queries per event to a single batched query should eliminate statement timeouts
3. **Faster Page Load**: Calendar will load noticeably faster, especially with many events

---

### Verification Steps

1. Open Calendar in "All Teams" mode
2. Click on an event from Team A - verify kit shown matches Team A's kit settings
3. Click on an event from Team B - verify kit shown matches Team B's kit settings
4. Navigate around the calendar without seeing the timeout error toast

