

## Plan: Global Admin Visibility for All Teams and Staff

### Problem Summary

Two separate issues prevent a System Admin from seeing all teams and all staff:

1. **Staff Management**: The `team_staff_roles` database view excludes the `team_manager` role from its filter, so any user whose only role is `team_manager` (like micky.mcpherson with Dundee Academy) is invisible in the Staff Management dashboard.

2. **Team Management**: The `loadAllTeams` function correctly queries all teams when `currentView === 'global_admin'`, and RLS allows all authenticated users to SELECT teams. This should work — but if the view hasn't resolved to `global_admin` yet when `loadData` fires (race condition with SmartViewContext initialization), the wrong loader runs. We should add a safeguard.

### Root Cause Details

**Staff issue**: The `team_staff_roles` view definition:
```sql
WHERE ut.role = ANY (ARRAY['manager', 'team_assistant_manager', 'team_coach', 'team_helper', 'staff'])
```
Missing: `'team_manager'` — which is the role assigned to team creators (per the project's own convention).

**Teams issue**: `loadTeamsForCurrentRole()` dispatches based on `currentView`. If `currentView` is still `'parent'` (the default) when the effect fires, it calls `loadUserTeams()` instead of `loadAllTeams()`. The `isAdminUser` flag is correct, but the view-based dispatch doesn't use it as a fallback.

---

### Solution

#### Change 1: Database Migration — Fix `team_staff_roles` view

Recreate the view to include `team_manager` in the role filter:

```sql
CREATE OR REPLACE VIEW public.team_staff_roles AS
SELECT t.id AS team_id,
    t.name AS team_name,
    p.id AS user_id,
    p.name AS staff_name,
    p.email AS staff_email,
    ut.role,
    ut.created_at
FROM user_teams ut
JOIN profiles p ON p.id = ut.user_id
JOIN teams t ON t.id = ut.team_id
WHERE ut.role = ANY (ARRAY[
  'manager', 'team_manager', 'team_assistant_manager',
  'team_coach', 'team_helper', 'staff'
])
ORDER BY t.name, p.name;
```

#### Change 2: `src/pages/TeamManagement.tsx` — Use `isAdminUser` as primary dispatch

Update `loadTeamsForCurrentRole` to check `isAdminUser` first, before falling back to view-based dispatch:

```typescript
const loadTeamsForCurrentRole = async () => {
  // Global/club admins always see all teams regardless of current view
  if (isGlobalAdmin) return loadAllTeams();
  if (isClubAdmin()) return loadClubTeams();
  
  switch (currentView) {
    case 'team_manager':
    case 'coach':
      return loadUserTeams();
    case 'parent':
      return loadParentTeams();
    default:
      return loadUserTeams();
  }
};
```

Also update `loadAllTeams` to set `isReadOnly: false` for global admins (currently it checks `isUserTeamAdmin` which only matches teams the admin is directly a member of):

```typescript
isReadOnly: isGlobalAdmin ? false : !isUserTeamAdmin(team.id)
```

---

### Files to Modify

| File | Change |
|------|--------|
| **Database migration** | Recreate `team_staff_roles` view to include `team_manager` role |
| `src/pages/TeamManagement.tsx` | Use `isAdminUser`/`isGlobalAdmin` as primary check in `loadTeamsForCurrentRole`; make all teams editable for global admins |

### Expected Result

- **Teams page**: Global admin sees all 6 teams including Dundee Academy, all editable
- **Staff Management**: micky.mcpherson appears as team_manager for Dundee Academy
- No impact on non-admin users — their view dispatch remains unchanged

