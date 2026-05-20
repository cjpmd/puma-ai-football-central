## Root cause

Two different concepts are conflated in the UI:

- **Subscription tier** (`clubs.subscription_type`): `free / premium / pro / analytics_plus` — billing only.
- **Club level** (`clubs.user_group_tier`): `grassroots_junior / amateur_professional` — gates the Academy module.

Today, `ClubForm` only exposes Subscription Type with a "Professional" label. There's no UI anywhere to set `user_group_tier`, so every new club defaults to `grassroots_junior`. `ClubAcademySection` then refuses to enable Academy. (Confirmed in DB: Dundee FC has `subscription_type=pro`, `user_group_tier=grassroots_junior`.)

## Fix

### 1. Add a "Club Level" selector to `ClubForm`

New field above Subscription Type:

- Label: **Club Level**
- Help text: "Grassroots / Junior clubs cannot host an Academy. Amateur / Professional clubs can create and manage an Academy."
- Options:
  - **Grassroots / Junior** → `grassroots_junior`
  - **Amateur / Professional** → `amateur_professional`
- Default: existing value, else `grassroots_junior` for new clubs.

Wire through:
- `Club` type already has `userGroupTier?: UserGroupTier` — pass it in `formData`.
- `handleCreateClub` and `handleUpdateClub` in `src/pages/ClubManagement.tsx` (and the mobile equivalent in `src/pages/ClubManagementMobile.tsx`) write `user_group_tier: clubData.userGroupTier ?? 'grassroots_junior'` on insert and only when set on update.

### 2. Sanity-check existing entry points

- `ClubSetupWizard` (`src/components/auth/ClubSetupWizard.tsx`), `ClubTeamLinking`, `SplitTeamWizard` — these still hard-code `subscription_type: 'free'` and don't touch tier. Leave subscription as-is; just allow tier to remain DB default. Out of scope to add the selector to those flows unless you want it everywhere — happy to do that as a follow-up.

### 3. Keep the gate, improve the empty-state copy

In `ClubAcademySection`, when `userGroupTier !== 'amateur_professional'` and the user is a club admin, show an inline "Change Club Level" button that opens the Club edit form (or just sends them to Club Settings). Non-admins keep the current read-only message.

### 4. One-off fix for Dundee FC

After deploy, you (global admin) edit Dundee FC in `/clubs` and pick **Amateur / Professional** — saves to `user_group_tier='amateur_professional'`. No data backfill is needed for other clubs because none are intended to be academies.

## Out of scope

- Adding Club Level to every signup wizard.
- Renaming or restructuring `subscription_type`.
- Auto-deriving tier from subscription (they're orthogonal — a grassroots club can still be on a paid plan).
- Any RLS/migration changes (column + enum already exist).

## Files touched

- `src/components/clubs/ClubForm.tsx` — add Club Level field.
- `src/pages/ClubManagement.tsx` — write `user_group_tier` on create/update.
- `src/pages/ClubManagementMobile.tsx` — same.
- `src/components/clubs/ClubAcademySection.tsx` — add "Change Club Level" hint for club admins in the disabled-state card.

No database changes.
