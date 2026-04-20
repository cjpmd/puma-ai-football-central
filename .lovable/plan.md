

## Plan: Fix mobile/desktop discrepancies, apply glass design to desktop, fix overflow & contrast

Three related fixes: (1) the year-group mismatch on Team Settings → Basic, (2) extending the dark-purple glass design to desktop pages and modals, (3) tightening overflow and contrast.

### 1. Fix year-group discrepancy (data bug)

`src/pages/TeamSettingsMobile.tsx` builds its `Team` object from a raw `teams` row but **omits `yearGroupId`**. As a result `TeamBasicSettings` always renders the "not assigned to a year group" warning on mobile, even when the team is linked. Desktop is correct because it gets the team from `ClubContext` which already includes the field.

Fix:
- In `TeamSettingsMobile.loadTeam()` add `yearGroupId: data.year_group_id` to the transformed object.
- While there, also include any other fields `TeamBasicSettings` / sibling settings rely on that are currently dropped: `userRole`, `userRoles`, `staff` (left undefined is fine), and ensure `team.id` is used consistently.

Audit pass for the same shape mismatch in: `TeamSettingsModal` (desktop, fine — uses passed team), and other Mobile pages that hand-build `Team` objects (`MyTeamMobile`, `TeamManagementMobile`) — add `yearGroupId` if missing.

### 2. Apply glass design to desktop layout

Currently `DashboardLayout.tsx` wraps everything in `bg-background` (light purple-white in light theme). The previous round only converted mobile pages and shadcn primitives. Because primitives (`Card`, `Dialog`, `Sheet`, `Input`, etc.) were converted globally to white-on-glass, they now look broken on the still-light desktop chrome.

Two-part fix:

a. **Force the dark glass theme app-wide** — add a permanent dark wallpaper to the desktop shell so the white-text primitives render correctly:
- `DashboardLayout.tsx`: replace `bg-background` on root, sidebar, and top header with `ios-wallpaper-twilight` on the root `<div>`, and translucent glass (`bg-white/[0.04] backdrop-blur-xl border-r border-white/10`) on sidebar + header.
- Sidebar inner text: muted-foreground → `text-white/70`; active item → `bg-white/15 text-white`; hover → `bg-white/10`; logo title → `text-white`.
- Sign-out button: keep red accent but on glass (`text-red-300 hover:bg-red-500/15`).

b. **Sweep desktop page wrappers** that still set `bg-background`, `bg-card`, `bg-white`, `text-foreground`, `text-gray-*`, `border-gray-*`, `bg-gray-50/100`. Scope: every page in `src/pages/*.tsx` that is **not** a `*Mobile.tsx` (already done):
- `TeamManagement.tsx`, `PlayerManagement.tsx`, `CalendarEvents.tsx`, `Analytics.tsx`, `Training.tsx`, `IndividualTraining.tsx`, `ClubManagement.tsx`, `StaffManagement.tsx`, `UserManagement.tsx`, `Dashboard.tsx`, `ChildProgress.tsx`, `SubscriptionManagement.tsx`, `AdminPlayStyles.tsx`, `Auth.tsx`, `ResetPassword.tsx`, `UserProfile.tsx`, `EmailTestPage.tsx`, `DataRecovery.tsx`, `Index.tsx`, `NotFound.tsx`, `AccountLinking.tsx`.
- Replace surface classes per the same map used previously (white → translucent, gray text → white/60-70, gray borders → white/10).

c. **Sweep settings sub-components** still using bare `<Card>` plus light-only modifiers like `bg-muted`, `text-muted-foreground`, `text-green-600`, `bg-red-50`:
- `src/components/teams/settings/*.tsx` (all 14 files)
- `src/components/teams/StaffManagementModal.tsx`, `KitDesigner.tsx`, `PerformanceCategoryManager.tsx`, `KitManagementModal.tsx`, `PlayerKitOverviewModal.tsx`, `TeamForm.tsx`, `TeamSplitWizard.tsx`
- `src/components/clubs/*.tsx`
- `src/components/players/*Modal.tsx` and `PlayerForm.tsx`, `PlayerLeaveForm.tsx`, `PlayerTransferForm.tsx`, `PlayerManagement.tsx`
- `src/components/events/EventForm.tsx` and other Form/Section components
- `src/components/users/*.tsx`
- `src/components/admin/*.tsx`

Specific replacements:
- `bg-muted` (used for "disabled" inputs like locked Age Group) → `bg-white/[0.04] text-white/60`
- `text-muted-foreground` → `text-white/60`
- `text-green-600` (success hint) → `text-emerald-300`
- `bg-red-50 text-red-600` → `bg-red-500/15 text-red-300`
- `<Alert>` default (white) — already converted in primitive but check inner `<Info>` icon contrast
- `bg-white/[0.95]` blocks inside dark modals — convert to `bg-white/[0.06]`

### 3. Overflow & width pass

Two failure modes the user called out:
- Boxes/outlines exceeding mobile width
- Text overflowing its container

Fixes:
- Add `overflow-hidden` + `max-w-full` to top-level `MobileLayout` content wrappers where missing.
- For text-heavy chips/badges: add `truncate min-w-0` on flex children, `break-words` on long-string descriptions.
- For grids inside mobile sheets: switch any `grid-cols-2` with long text to `grid-cols-1 sm:grid-cols-2`.
- `MobileLayout` outer: ensure `px-4` not paired with negative margins that overflow (audit `-mx-4` usages — used in `TeamSettingsMobile`, fine because parent has `px-4`, but verify on `PlayerManagementMobile`, `ClubManagementMobile`).
- Specific known offenders to check: 3-box hero in `EnhancedTeamSelectionManager` (right box opponent text can overflow → add `truncate`), chip rows in dashboard, calendar event cards, settings group cards in `TeamSettingsMobile`.

### 4. Contrast safety re-pass

After the desktop glass conversion, re-scan converted files for:
- White text on `bg-white` / `bg-white/95` button variants → switch to `bg-white/15 text-white` or primary purple.
- `Button variant="outline"` already fixed in primitive — verify nothing overrides `className="bg-white …"`.
- `disabled:` states: ensure not `disabled:bg-white disabled:text-white` — use `disabled:bg-white/5 disabled:text-white/40`.
- Status badges (success/warning/destructive) keep tinted-glass variants from primitive change.

### 5. Files modified (summary)

| Area | Files |
|------|-------|
| Year-group fix | `src/pages/TeamSettingsMobile.tsx` (+ audit `MyTeamMobile.tsx`, `TeamManagementMobile.tsx`) |
| Desktop chrome | `src/components/layout/DashboardLayout.tsx` |
| Desktop pages | All non-Mobile `src/pages/*.tsx` listed above (~20 files) |
| Settings & form components | `src/components/teams/**`, `src/components/clubs/**`, `src/components/players/**`, `src/components/events/EventForm.tsx`, `src/components/users/**`, `src/components/admin/**` |
| Overflow/contrast | targeted edits in mobile pages + Team Selection hero |

### 6. Out of scope
- Functional changes — purely visual + the one data bug
- Email templates and printable views (intentionally light)
- Any new components or routes

### 7. Verification
After implementation, spot-check via preview at 390x844 (mobile) and 1366x768 (desktop):
- Team Settings → Basic on mobile shows year group `2015s` (no warning) when linked
- Desktop Team Management page renders on dark wallpaper with glass cards, no light strips
- Desktop Team Settings modal: all tabs render correctly
- Long opponent name in Team Selection hero truncates rather than overflowing
- No card/button shows white-on-white text in either viewport

