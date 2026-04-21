

## Plan: Polish Event Details + Edit Event mobile UX

Three small, targeted fixes to the mobile event flows.

### 1. Event Details — replace unreachable X with a visible "Save & Close" pill

The X close button comes from the shared `DialogContent` primitive (`absolute right-4 top-4`). On iOS standalone we anchor the dialog with `top-0`, so the X ends up under the status bar / Dynamic Island (visible in the screenshot — half-covered by the time/battery row). The screen has no Save button either; everything saves on change so "close" is the only action needed.

Fix in `src/pages/CalendarEventsMobile.tsx` (the Event Details `Dialog`, ~line 1234):

- Hide the inherited X on mobile only by adding `[&>button]:hidden` to the mobile-mode `DialogContent` className (matches the pattern already used in `EnhancedTeamSelectionManager`). Desktop keeps its X.
- Move the close affordance into the chip row at the top of the body (the row with the Friendly + Available badges, ~line 1243). On the right of that flex row, add a small pill button: `<Button variant="outline" size="sm" onClick={() => setShowEventDetails(false)}>Save & Close</Button>` with `ml-auto`. This sits on the same horizontal level as the chips, well below the safe-area inset, and is comfortably tappable.
- Keep the `DialogTitle` "Event Details" header as-is so the page still has a title.

No behaviour change to any other dialog.

### 2. Edit Event — fix overflowing inner boxes on mobile

The Edit Event dialog uses the small `sm:max-w-[425px]` `DialogContent` with default `p-6`, then mounts `EventForm`, which is itself a `Card` with its own border + padding, plus the "Match Details" and "Time Settings" sections each render as `p-4 border rounded-lg bg-muted/50` — so on a 390px viewport you get **three nested rounded boxes** and the date/time inputs visibly bleed past the inner border (IMG_2742, IMG_2741).

Fixes:

**`src/pages/CalendarEventsMobile.tsx` (~line 1482)** — promote the Edit/Create Event dialog to the same fullscreen treatment we just applied to Event Details:
- `DialogContent` className → `sm:max-w-[425px] sm:max-h-[90vh] sm:overflow-y-auto max-sm:top-0 max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:w-screen max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:max-w-none max-sm:rounded-none max-sm:border-0 max-sm:flex max-sm:flex-col max-sm:p-0 [&>button]:max-sm:hidden`.
- Wrap the existing `DialogHeader` + `EventForm` in the same flex/scroll pattern so the title is pinned and the form scrolls inside.
- Mirror the chip-row "Save & Close" idea: title row gets a right-aligned `<Button>Close</Button>` (since the actual save lives on the form's submit button).

**`src/components/events/EventForm.tsx`** (`Card` at line 638 and the inner panels at lines 786 and 871):
- Outer `Card`: add `border-0 shadow-none sm:border sm:shadow` + `bg-transparent sm:bg-card` so the form sits flush inside the dialog frame on mobile (no double-box).
- `CardContent`: add `px-4 sm:px-6` so it doesn't fight the dialog's own horizontal padding.
- "Match Details" panel (line 786) and "Time Settings" panel (line 871): change `p-4 border rounded-lg bg-muted/50` → `p-3 sm:p-4 border border-border/40 rounded-lg bg-muted/30 min-w-0` and add `min-w-0` to all internal `<div className="grid …">` rows, so date / time / number inputs (which have intrinsic widths from the native control) are forced to shrink instead of pushing the panel border out.
- Add `w-full min-w-0` to the date / time / duration `<Input>` elements (lines 673, 814, 884, 896, etc.) so iOS doesn't size them to their natural content width.

Net effect: one clean panel per section, all controls live inside their borders, no nested-box look.

### 3. Edit Event — correct submit-button labels when a squad already exists

Currently in edit mode the form's primary button reads "Pick Squad" (because `invitationType === 'pick_squad'`), and inside the squad picker the button reads "Create Event" (line 1167) even when editing. Should read "Update Squad" / "Update Event" when `actualIsEditing`.

Fix in `src/components/events/EventForm.tsx`:

- Squad picker footer (line 1167): change `'Creating...' : 'Create Event'` → `loading ? (actualIsEditing ? 'Updating...' : 'Creating...') : (actualIsEditing ? 'Update Squad' : 'Create Event')`.
- Main submit button (lines 1204-1208): collapse the nested ternary to:
  - `loading` → `actualIsEditing ? 'Updating...' : 'Saving...'`
  - else if `invitationType === 'pick_squad'` → `actualIsEditing ? 'Update Squad' : 'Pick Squad'`
  - else → `actualIsEditing ? 'Update Event' : 'Create Event'`
- Also relabel the "Back to Event Details" button (line 1160) → "Back" on mobile (`md:inline-flex hidden ...` for the long form) to keep both buttons single-line on a 390px viewport.

No logic change — the click handlers, `handleSubmit`, and `onEventCreated` callbacks stay identical. Pure label correctness.

### Files modified

| File | Change |
|------|--------|
| `src/pages/CalendarEventsMobile.tsx` | Hide inherited X on mobile in Event Details dialog and add a "Save & Close" pill on the chip row. Promote the Edit/Create Event dialog to fullscreen-on-mobile with its own visible Close button. |
| `src/components/events/EventForm.tsx` | Flatten outer Card on mobile, tighten inner Match Details / Time Settings panels (`min-w-0`, narrower padding), force `w-full min-w-0` on date/time/number inputs to stop overflow. Update submit-button labels to "Update Squad" / "Update Event" when editing. |

### Out of scope
- `MobileEventForm` (the *create*-only flow opened from the FAB) — the screenshots show the *edit* flow which uses `EventForm`. Create flow is already laid out correctly per earlier passes.
- Shared `DialogContent` primitive — leaving as-is to avoid global regressions.
- Server / persistence changes — the squad save logic in `handleSubmit` already handles update vs. create correctly; this is a label-only fix.

### Verification (390x844, iOS standalone)
- Open an event → dark card fills screen, "Save & Close" pill visible to the right of the Friendly + Available chips and tappable; tapping closes the dialog and refreshes the list.
- Tap Edit on a friendly → dialog goes fullscreen, "Edit Event" title pinned, all inner panels (Match Details, Time Settings) sit inside a single border with date / time / number inputs no longer overflowing the panel edge.
- In Edit mode with `Pick Squad` already selected → primary button reads "Update Squad"; tapping it opens the squad picker whose footer reads "Update Squad" (not "Create Event").
- Switching to "Everyone" in Edit mode → primary button reads "Update Event".
- Desktop ≥640px: both dialogs render exactly as today (X visible, centered modal, original button labels for create flow).

