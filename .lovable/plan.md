

## Plan: Staff Visibility Fix + Admin Edit Capabilities

### Problem 1: micky.mcpherson Not Showing in Staff Modal

The per-team **StaffManagementModal** only queries the `team_staff` table. micky.mcpherson is in `user_teams` with role `team_manager`, but has no record in `team_staff`. The admin-level **StaffManagementDashboard** uses the `team_staff_roles` view (which we just fixed to include `team_manager`), so micky will appear there — but not in the per-team staff modal.

**Fix**: Update `StaffManagementModal.loadStaff()` to also fetch users from `user_teams` who have staff-level roles (`team_manager`, `team_assistant_manager`, `team_coach`, etc.) and merge them into the staff list. This ensures the team creator appears as staff.

Also add `team_manager` to the `availableRoles` array in `StaffManagementDashboard` so it displays correctly in filters and labels.

### Problem 2: No In-App Admin Edit Functionality

Currently the admin can click a user card to see `UnifiedProfile` with `viewMode='admin'`, but the Edit Profile and Linked Accounts buttons only show for `isOwnProfile`. The `UserEditModal` exists and works (edits name, email, phone, roles) but isn't accessible from the admin view.

**Fix**: 
- Show "Edit Profile" button in `UnifiedProfile` when `viewMode === 'admin'`
- Add a new **"Team Associations"** section in the admin view showing all `user_teams` records with ability to:
  - Change a user's role within a team
  - Remove a user from a team
  - Add a user to a team
- Add a **"Player Links"** section showing `user_players` records with ability to remove incorrect parent-player links (the exact scenario that required manual SQL for Shona McDonald)

### Implementation Details

#### File 1: `src/components/teams/StaffManagementModal.tsx`

Update `loadStaff()` to also query `user_teams` for staff-role users and merge:

```typescript
// After loading from team_staff, also load from user_teams
const { data: userTeamStaff } = await supabase
  .from('user_teams')
  .select('user_id, role, created_at, profiles:user_id(name, email, phone)')
  .eq('team_id', team.id)
  .in('role', ['team_manager', 'team_assistant_manager', 'team_coach', 'team_helper', 'manager']);

// Merge into staff list, avoiding duplicates (by user_id)
```

#### File 2: `src/components/admin/StaffManagementDashboard.tsx`

Add `team_manager` to `availableRoles`:
```typescript
{ value: 'team_manager', label: 'Team Manager' },
```

#### File 3: `src/components/users/UnifiedProfile.tsx`

- Show edit buttons when `viewMode === 'admin'` (not just `isOwnProfile`)
- Add "Team Associations" tab/section for admin view showing `user_teams` records with edit/delete
- Add "Player Links" section showing `user_players` records with delete capability
- Use `EditProfileModal` or create an admin-specific edit flow

#### File 4: New component or inline in UnifiedProfile — Admin Association Manager

A section that shows:
- All `user_teams` records for this user (team name, role, joined date) with delete button and role change dropdown
- All `user_players` records (player name, team, relationship) with delete button
- Add to team form (select team + role)

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/teams/StaffManagementModal.tsx` | Merge `user_teams` staff-role users into staff list |
| `src/components/admin/StaffManagementDashboard.tsx` | Add `team_manager` to available roles |
| `src/components/users/UnifiedProfile.tsx` | Show admin edit controls; add team/player association management |

### Expected Result

- micky.mcpherson appears as Team Manager in Dundee Academy's staff modal
- System Admin can edit any user's profile, roles, team associations, and player links directly in the app
- No more need for manual SQL to fix incorrect associations

