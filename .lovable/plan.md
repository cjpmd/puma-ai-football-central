

## Plan: Apply Glass Design System Across All Mobile Screens, Modals & Toasts

Audit and convert any remaining surfaces still rendering with default white/light backgrounds so the entire mobile app matches the dark-purple glass system already in place on Dashboard and Team Selection.

### 1. Global primitives (one-time fixes that cascade everywhere)

These four shadcn primitives are used by virtually every modal/toast/sheet — converting them once fixes hundreds of surfaces.

| File | Change |
|------|--------|
| `src/components/ui/dialog.tsx` | DialogContent: `bg-background` → glass (`bg-[#1a0d2e]/95 backdrop-blur-2xl border-white/12 text-white`); DialogTitle/Description → white / white/70; overlay darker |
| `src/components/ui/sheet.tsx` | SheetContent: glass background + white text; close X → white/70 |
| `src/components/ui/sonner.tsx` | Toaster theme tokens → glass surface, white text, purple accent for actions; success/error variants tinted (green/red glass) instead of white |
| `src/components/ui/toast.tsx` (legacy) | Same treatment as sonner — glass bg, white text |
| `src/components/ui/alert-dialog.tsx` | Content + buttons → glass; destructive action keeps red but on glass |
| `src/components/ui/popover.tsx` + `dropdown-menu.tsx` + `select.tsx` + `command.tsx` | Content surfaces → `bg-[#1a0d2e]/95 backdrop-blur-xl border-white/12 text-white`; item hover → `bg-white/10`; check icons white |
| `src/components/ui/card.tsx` | Default Card → `.ios-card` styling (translucent white-on-purple, white text) when on mobile pages; keep desktop default |

### 2. Form controls used inside modals

| File | Change |
|------|--------|
| `src/components/ui/input.tsx` | bg → `bg-white/8`, border → `white/15`, text white, placeholder white/40 |
| `src/components/ui/textarea.tsx` | Same |
| `src/components/ui/select.tsx` (trigger) | Same as input |
| `src/components/ui/button.tsx` | Audit `outline` + `ghost` variants — outline gets `border-white/20 text-white hover:bg-white/10`; ghost text white on dark surfaces |
| `src/components/ui/tabs.tsx` | TabsList default → glass; TabsTrigger active → `bg-white/15 text-white` |
| `src/components/ui/badge.tsx` | `secondary` + `outline` variants tinted for glass surfaces |

### 3. Page-level audits (mobile pages still using `bg-card` / `bg-white` / default text)

Sweep each `*Mobile.tsx` page and replace any remaining:
- `bg-white`, `bg-card`, `bg-background` → remove (let page wallpaper show through) or `.ios-card`
- `bg-gray-50/100/200` → `bg-white/5` / `bg-white/10`
- `text-foreground` / `text-gray-900` → `text-white`
- `text-muted-foreground` / `text-gray-500` → `text-white/60`
- `border-border` / `border-gray-200` → `border-white/10`

Pages to sweep:
- `CalendarEventsMobile.tsx`
- `MyTeamMobile.tsx`
- `PlayerManagementMobile.tsx`
- `PlayerMobile.tsx`
- `StaffManagementMobile.tsx`
- `ClubManagementMobile.tsx` + `ClubDetailsMobile.tsx`
- `TrainingMobile.tsx` + `IndividualTrainingMobile.tsx`
- `AnalyticsMobile.tsx`
- `ChildProgressMobile.tsx`
- `UserManagementMobile.tsx`
- `SubscriptionManagementMobile.tsx`
- `TeamManagementMobile.tsx` + `TeamSettingsMobile.tsx`
- `GameDayMobile.tsx`
- `AdminPlayStylesMobile.tsx`

### 4. Mobile modals/sheets used inside those pages

- `src/components/players/mobile/*` (Edit / Stats / History / Attributes / Objectives / Parents / Comments / ActionSheet) — already use Sheet but contain inner Cards with default backgrounds — convert inner cards to `.ios-card`
- `src/components/teams/StaffManagementModal.tsx`, `TeamSettingsModal.tsx` and `settings/Team*Settings.tsx` — convert inner panels
- `src/components/clubs/ClubDetailsModal.tsx` and child managers — convert tab panels
- `src/components/events/MobileEventForm.tsx`, `EventForm.tsx` — input + section backgrounds
- `src/components/events/EventActionButtons.tsx`, `EventAvailabilitySection.tsx` etc — button surfaces

### 5. Contrast safety pass

After conversion, scan for the failure modes the user called out:
- White text on white/very-light buttons → fix variant
- Very-light text on very-light glass (e.g. `text-muted-foreground` left on `bg-white/8`) → bump to `white/70`
- Disabled buttons: ensure `disabled:opacity-50` still readable on glass (use `disabled:bg-white/5 disabled:text-white/40`)
- Status badges (success/warning/destructive): tinted glass variants so coloured pills don't disappear on dark bg

### 6. Out of scope

- Desktop layouts — primitives change affects desktop too but desktop pages stay on `bg-background`; we'll only flip Card defaults conditionally if regressions show
- Visual redesign of any feature — strictly a re-skin pass, no behaviour changes
- Email templates / printable views — keep light theme (intentional)

### 7. Verification

After implementation, spot-check via the preview at viewport 390x844 on:
- Dashboard, Calendar, an event details modal, Player edit sheet, Team Settings, a destructive confirm dialog, a sonner toast (success + error), a Select dropdown inside a sheet, the Team Selection screen.

