## Drill Library for Training

Add a player/coach-friendly Drill Library to the Training section. Read-only browsing experience (no edits — `DrillLibraryManager` already handles authoring).

### Where it lives

Add a new "Drill Library" entry in `src/pages/Training.tsx` (and `src/pages/TrainingMobile.tsx` for parity). Either:
- Replace the existing "Drill Library" tab content with the new browser component, OR
- Add it as an additional tab labelled "Browse Drills" so the existing manager stays for authors.

Recommendation: add as a new first tab "Browse" and keep "Manage" (existing `DrillLibraryManager`) for staff.

### New files

1. `src/components/training/drill-library/DrillLibraryBrowser.tsx`
   - Fetches drills via React Query joining `drills`, `drill_tag_assignments(drill_tags(*))`, and `drill_media`.
   - Tag filter chips row (multi-select, uses `drill_tags.color`).
   - Search input over `name` + `description` (client-side filter after fetch).
   - Responsive card grid. Each card: name, coloured tag pills, equipment count, media indicator.
   - Empty state.

2. `src/components/training/drill-library/DrillDetailModal.tsx`
   - Shadcn `Dialog` (desktop) / `Sheet` (mobile via `useIsMobile`).
   - Sections: Description, Practice Design, How to Play, Coach Tips (ul), Player Tips (ul), Variations (ul), Equipment (ul).
   - Video section: on open, if `drill_media[0]` exists, call `supabase.functions.invoke('drill-video-url', { body: { file_path: media.file_url } })`. Show `LoadingSpinner` while pending; render `<video controls>` with `data.url` on success; hide section entirely if no media or on error (with toast).
   - Uses React Query keyed on `['drill-video-url', drillId]` so it fetches only on open and caches per session.

3. `src/components/training/drill-library/DrillCard.tsx` — presentational card.

4. `src/components/training/drill-library/DrillTagPill.tsx` — small pill using `tag.color` as background (with alpha) and text.

### Edits

- `src/pages/Training.tsx`: add new tab + render `DrillLibraryBrowser`.
- `src/pages/TrainingMobile.tsx`: same.

### Data fetching shape

```ts
supabase
  .from('drills')
  .select(`
    id, name, description, practice_design, how_to_play,
    coach_tips, player_tips, variations, equipment,
    drill_tag_assignments(drill_tags(id, name, color)),
    drill_media(id, file_url, file_name, file_type)
  `)
  .order('name');
```

Flatten `drill_tag_assignments` → `tags[]` in the select callback.

### Video URL fetch (only on modal open)

```ts
useQuery({
  queryKey: ['drill-video-url', drill.id],
  enabled: open && !!media?.file_url,
  staleTime: 5 * 60 * 1000,
  queryFn: async () => {
    const { data, error } = await supabase.functions.invoke('drill-video-url', {
      body: { file_path: media.file_url },
    });
    if (error) throw error;
    return data.url as string;
  },
});
```

### Out of scope

- No DB migrations, no RLS changes, no edge function changes (already deployed).
- No edits to existing `DrillLibraryManager` / `DrillCreator` / `DrillEditModal`.
- No "add to session" buttons in this view (separate flow).
