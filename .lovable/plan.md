# Fix Edit Profile avatar + button placement

Three related issues in Edit Profile (mobile):

1. New profile photo doesn't persist after Save
2. Cancel / Save buttons should sit inside the scrollable card (above Sign Out), not pinned beneath it
3. Home screen avatar still shows initials after the photo is changed

## Root causes

- `AuthContext` builds the `Profile` object but **omits `avatar_url`** when transforming the DB row (src/contexts/AuthContext.tsx ~L234-247). Even after `EditProfileModal` uploads to storage and writes `avatar_url` into the `profiles` table, `refreshUserData()` re-reads the row but discards that field, so `profile.avatar_url` stays `undefined` everywhere in the app.
- `DashboardMobile.tsx` (L742-746) reads `(profile as any).avatar_url` (works once context exposes it) but its fallback initials use `profile.first_name`, which doesn't exist on our profile schema (we use `name`). Should fall back to `profile.name`.
- `EditProfileModal` puts Sign Out inside the scrollable area and the Cancel/Save bar in a pinned footer (`border-t bg-background` outside the scroll container). User wants Cancel/Save to scroll with the card content and sit directly above Sign Out.

## Changes

### 1. `src/types/index.ts` (Profile type)
Add `avatar_url?: string | null` to the `Profile` interface so it's typed throughout the app.

### 2. `src/contexts/AuthContext.tsx`
In the `transformedProfile` object inside `fetchProfile`, include:
```ts
avatar_url: (profileData as any).avatar_url ?? null,
```
This makes the freshly uploaded URL flow into context after `refreshUserData()` is called by the modal's submit handler. No DB migration needed — column already exists (modal writes to it).

### 3. `src/components/users/EditProfileModal.tsx`
Restructure the form layout:
- Move the Cancel / Save Changes button row **into** the scrollable content area, placed immediately above the Sign Out section (i.e. between the Notifications block and the Sign Out block).
- Remove the pinned footer `<div className="flex gap-3 px-6 py-4 border-t bg-background">`.
- Keep the same button styling and `type="submit"` for Save Changes / `type="button"` for Cancel.
- Result: as the user scrolls, they see Name → Email → Phone → Password → Roles → Coaching Kit → Notifications → **Cancel/Save** → Sign Out, all scrolling together.

### 4. `src/pages/DashboardMobile.tsx`
- Line 746: replace `(profile as any)?.first_name` with `profile?.name` so initials render correctly when no avatar exists.
- Line 742-743: drop the `as any` cast now that `avatar_url` is on the typed Profile.
- Add a cache-buster on the `<AvatarImage src>` (e.g. `?t=${profile.updated_at}` or appended `Date.now()` captured at upload time) so the browser doesn't keep showing the old cached image after upload. Simplest: append `?v=${profile.updated_at ?? ''}` since `refreshUserData` will bump `updated_at`.

### 5. (Optional polish) `src/components/users/EditProfileModal.tsx` avatar preview
Already uses `avatarPreview || profile?.avatar_url`, so no change needed — once context updates, both modal and home reflect the new image immediately.

## Out of scope
- Other places that show user avatars (Header, EnhancedMultiRoleDashboard, etc.) will benefit automatically once `avatar_url` exists on `Profile`. We won't refactor those in this pass; if any still hardcode initials, we can address them in a follow-up.

## Verification after implementation
- Upload a new photo on mobile (camera + gallery), Save → modal closes, home avatar updates without refresh.
- Reopen Edit Profile → avatar shows the new image.
- Scroll modal → Cancel/Save sit above Sign Out and scroll with content.
- Hard refresh → avatar still shown (persisted).
