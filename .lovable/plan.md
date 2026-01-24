
## What’s actually happening (root causes)

### 1) Play Styles *are saving* in the database, but the UI hides them on reload
In `src/components/players/FifaStylePlayerCard.tsx`, `parsePlayStyles()` filters saved play styles against `playStyles` (the list fetched async from the DB). On first render, `playStyles` is still empty, so the filter drops everything and returns `[]`.

Then, when `playStyles` finishes loading, the “sync” `useEffect` does **not** re-run because it doesn’t depend on `playStyles`. Result: the card shows no selected play styles and looks “not saved”, even though `players.play_style` is persisted.

Fix: make the parsing/sync logic react to `playStyles` finishing loading (or stop filtering during parse).

### 2) The Mobile Image Editor is “stuck” because it’s portaled to `document.body` while a Radix Dialog/Sheet is open
Radix Dialog/Sheet modal behavior can disable pointer events outside the dialog “portal” content. Your `MobileImageEditor` uses `createPortal(..., document.body)`, which makes it a sibling to the Radix portal rather than inside it.

Symptoms match exactly:
- Image loads (you see `[MobileImageEditor] Image loaded successfully...`)
- But you can’t pinch/drag or click Save/Cancel because pointer/touch events are blocked.

Fix: portal the editor into the **Radix portal container** (the element Radix creates, usually `[data-radix-portal]`) instead of always `document.body`, or render inline (no portal) with a high z-index.

---

## Implementation plan (code-only, no DB changes)

### A) Fix Play Styles persistence display (FifaStylePlayerCard)

1. Update `parsePlayStyles()` so it does not permanently drop values before the styles list is loaded.
   - Option 1 (recommended): Parse and return unique values without filtering by `playStyles` list (still slice to max 3).
   - Option 2: Keep filtering, but only filter once `playStyles.length > 0`.

2. Update the “sync player prop -> internal state” `useEffect` dependencies:
   - Add `playStyles` to dependencies so when the list loads, we re-parse saved play styles and update `selectedPlayStyles`.

3. Avoid dependency loops:
   - Remove `selectedPlayStyles` and `player` object reference from the dependency list (using the whole `player` object can cause re-renders and unnecessary resyncs).
   - Depend on specific primitives: `player.playStyle`, `player.funStats`, `player.cardDesignId`, and `playStyles`.

Result: reopening the card (or refreshing) will correctly show the saved play styles.

Files:
- `src/components/players/FifaStylePlayerCard.tsx`

---

### B) Fix MobileImageEditor interaction (pinch/drag + Save/Cancel buttons)

1. Modify `MobileImageEditor` to portal into a safer container:
   - Determine the portal root at runtime:
     - Prefer `document.querySelector('[data-radix-portal]')` if present (means a Radix modal is open).
     - Fallback to `document.body`.

2. Keep the portal behavior (so it still overlays everything), but ensure it lives inside Radix’s pointer-events-safe area.

3. Add small safety improvements:
   - Add `onPointerDown`/`onPointerMove` handling as a fallback (optional but helpful across devices).
   - Or at minimum ensure taps on buttons are not interfered with by the image-area touch handlers (currently OK because those handlers are only on the image container).

Result: the editor becomes interactive again while opened from within the FIFA card dialog/sheet.

Files:
- `src/components/players/MobileImageEditor.tsx`

---

## Verification checklist (what you’ll test after implementation)

### Play styles
1. Open a player card that already has a saved play style (e.g. “finisher”).
2. Confirm the badge(s) show immediately after the styles list loads (within a second).
3. Toggle a new play style, close card, reopen:
   - Selection should still be there.
4. Hard refresh the page and repeat:
   - Still persists.

### Image editor
1. Open player card → choose photo.
2. Editor appears:
   - Pinch zoom works
   - Drag works
   - Save and Cancel buttons respond instantly
3. Tap Save:
   - Upload runs
   - Card shows updated image immediately
4. Close/reopen card:
   - Image persists.

---

## If anything still fails after these fixes
We’ll capture:
- One screenshot of the stuck editor state (if it ever happens again)
- The network request list filtered by `players?` and `storage` during a save attempt
…and we’ll trace which exact modal (Dialog vs Sheet) is hosting the card and ensure the portal target matches that container.
